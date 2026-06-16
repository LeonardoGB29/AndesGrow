"""api de andesgrow (fastapi).

    GET  /sensores      -> lectura cruda + decision (mismo shape que espera el front)
    POST /recomendacion -> salida del random forest: minutos + momento de riego
    GET  /modelo        -> importancia de variables y cultivos soportados
    GET  /salud         -> healthcheck
"""

from __future__ import annotations

import os
from datetime import datetime

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
    rec = predecir_riego(
        cultivo=CULTIVO_PARCELA,
        humedad_pct=lectura.humedad_20cm_pct,
        tension_cbar=lectura.swt_20cm_cbar,
        temperatura_c=lectura.temperatura_c,
        hora_dia=ahora.hour,
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
    humedad = req.humedad_pct if req.humedad_pct is not None else lectura.humedad_20cm_pct
    tension = req.tension_cbar if req.tension_cbar is not None else lectura.swt_20cm_cbar
    temperatura = req.temperatura_c if req.temperatura_c is not None else lectura.temperatura_c
    hora = req.hora_dia if req.hora_dia is not None else ahora.hour

    rec = predecir_riego(
        cultivo=req.cultivo,
        humedad_pct=humedad,
        tension_cbar=tension,
        temperatura_c=temperatura,
        hora_dia=hora,
    )

    return RecomendacionResponse(
        cultivo=req.cultivo,
        minutos_riego=rec["minutos_riego"],
        momento_optimo=rec["momento_optimo"],
        humedad_actual_pct=humedad,
        tension_cbar=tension,
        umbral_objetivo_pct=rec["umbral_objetivo_pct"],
        mensaje=rec["mensaje"],
        confianza=rec["confianza"],
    )
