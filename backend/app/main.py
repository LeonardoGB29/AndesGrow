"""api de andesgrow (fastapi).

    GET  /sensores      -> lectura cruda + decision (mismo shape que espera el front)
    POST /recomendacion -> salida del random forest: minutos + momento de riego
    GET  /modelo        -> importancia de variables y cultivos soportados
    GET  /salud         -> healthcheck
"""

from __future__ import annotations

import os
from collections import defaultdict, deque
from datetime import datetime, timedelta

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .model import cultivos, importancia, predecir_riego
from .schemas import (
    RecomendacionRequest,
    RecomendacionResponse,
    SensoresResponse,
)
from .sensors import leer_sensores

app = FastAPI(title="AndesGrow API", version="0.1.0")

# el frontend llama directo a este backend
_origins = os.getenv("ANDESGROW_CORS_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in _origins],
    allow_methods=["*"],
    allow_headers=["*"],
)

# cultivo configurado para la parcela (luego vendra de la config de usuario)
CULTIVO_PARCELA = os.getenv("ANDESGROW_CULTIVO", "palta")
SIMULADO = os.getenv("ANDESGROW_FAKE_SENSORS", "1") == "1"
_HISTORIALES = defaultdict(deque)


def _recomendar(cultivo, kit, timestamp, valores):
    """Acumula lecturas por kit y solo consulta el modelo con una hora de historia."""
    ahora = datetime.fromisoformat(timestamp)
    historial = _HISTORIALES[kit]
    historial.append({"timestamp": timestamp, **valores})
    while historial and (
        ahora - datetime.fromisoformat(historial[0]["timestamp"])
    ) > timedelta(minutes=60):
        historial.popleft()
    try:
        return predecir_riego(cultivo, list(historial))
    except ValueError as error:
        return {
            "minutos_riego": 0,
            "momento_optimo": None,
            "umbral_objetivo_pct": float(cultivos[cultivo]["umbral"]),
            "mensaje": f"recopilando historial temporal: {error}",
            "confianza": None,
        }


def _estado_riego(humedad_pct: float, umbral: float, minutos: int):
    # decision unica: los minutos del modelo mandan; la severidad se gradua alrededor
    if minutos > 0:
        if humedad_pct < umbral - 10:
            return "critico", "alta", "regar"
        return "bajo", "media", "regar"
    if humedad_pct < umbral + 8:
        return "vigilancia", "baja", "vigilar"
    return "optimo", "ninguna", "no_regar"


@app.get("/salud")
def salud():
    return {"ok": True, "servicio": "andesgrow-api", "version": app.version}


@app.get("/modelo")
def modelo():
    # para ver como funciona: peso de cada variable y cultivos disponibles
    return {"importancia": importancia(), "cultivos": cultivos}


@app.get("/sensores", response_model=SensoresResponse)
def sensores():
    ahora = datetime.now()
    lectura = leer_sensores(ahora.hour)

    # el modelo decide a partir de la humedad superficial y la tension
    rec = _recomendar(
        CULTIVO_PARCELA, "KIT_001", ahora.isoformat(timespec="seconds"),
        {
            "VWC_20cm_%": lectura.humedad_20cm_pct,
            "VWC_40cm_%": lectura.humedad_40cm_pct,
            "T_soil_C": lectura.temperatura_suelo_c,
            "SWT_20cm_cBar": lectura.swt_20cm_cbar,
            "SWT_40cm_cBar": lectura.swt_40cm_cbar,
            "temperatura_ambiente": lectura.temperatura_c,
        },
    )
    minutos = rec["minutos_riego"]
    estado, nivel, accion = _estado_riego(
        lectura.humedad_20cm_pct, rec["umbral_objetivo_pct"], minutos
    )
    modo = "simulado" if SIMULADO else "real"

    return SensoresResponse(
        timestamp=ahora.isoformat(timespec="seconds"),
        fecha=ahora.date().isoformat(),
        hora_dia=ahora.hour,
        dia=ahora.timetuple().tm_yday,
        temperatura_c=lectura.temperatura_c,
        humedad_20cm_pct=lectura.humedad_20cm_pct,
        humedad_20cm_digital=lectura.humedad_20cm_digital,
        humedad_20cm_estado=estado,
        humedad_20cm_modo=modo,
        humedad_40cm_pct=lectura.humedad_40cm_pct,
        humedad_40cm_digital=lectura.humedad_40cm_digital,
        humedad_40cm_estado=estado,
        humedad_40cm_modo=modo,
        swt_20cm_cbar=lectura.swt_20cm_cbar,
        presion_raw=lectura.presion_raw,
        sensor_presion_ok=lectura.sensor_presion_ok,
        presion_modo="ok" if lectura.sensor_presion_ok else "error",
        accion=accion,
        alerta=rec["mensaje"],
        nivel_alerta=nivel,
        estado_hidrico=estado,
        minutos_faltantes=minutos if minutos > 0 else None,
        fecha_estimada=rec["momento_optimo"],
    )


@app.post("/recomendacion", response_model=RecomendacionResponse)
def recomendacion(req: RecomendacionRequest):
    ahora = datetime.now()
    lectura = leer_sensores(ahora.hour)

    # usa lo que mande el cliente; lo que falte, lo toma de los sensores
    humedad_20 = req.vwc_20cm_pct if req.vwc_20cm_pct is not None else lectura.humedad_20cm_pct
    humedad_40 = req.vwc_40cm_pct if req.vwc_40cm_pct is not None else lectura.humedad_40cm_pct
    temp_suelo = req.t_soil_c if req.t_soil_c is not None else lectura.temperatura_suelo_c
    tension_20 = req.swt_20cm_cbar if req.swt_20cm_cbar is not None else lectura.swt_20cm_cbar
    tension_40 = req.swt_40cm_cbar if req.swt_40cm_cbar is not None else lectura.swt_40cm_cbar
    temperatura = req.temperatura_ambiente if req.temperatura_ambiente is not None else lectura.temperatura_c
    if req.hora_dia is not None:
        hora = req.hora_dia
    elif req.timestamp:
        hora = datetime.fromisoformat(req.timestamp).hour
    else:
        hora = ahora.hour

    timestamp = req.timestamp or ahora.isoformat(timespec="seconds")
    rec = _recomendar(
        req.cultivo, req.id_kit or "KIT_API", timestamp,
        {
            "VWC_20cm_%": humedad_20,
            "VWC_40cm_%": humedad_40,
            "T_soil_C": temp_suelo,
            "SWT_20cm_cBar": tension_20,
            "SWT_40cm_cBar": tension_40,
            "temperatura_ambiente": temperatura,
        },
    )
    return RecomendacionResponse(
        cultivo=req.cultivo,
        minutos_riego=rec["minutos_riego"],
        momento_optimo=rec["momento_optimo"],
        humedad_actual_pct=humedad_20,
        tension_cbar=tension_20,
        umbral_objetivo_pct=rec["umbral_objetivo_pct"],
        mensaje=rec["mensaje"],
        confianza=rec["confianza"],
    )
