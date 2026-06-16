"""modelo de riego: random forest regressor.

convierte el estado del suelo + el cultivo en minutos de riego.
los datos de entrenamiento se generan con balance hidrico fao-56 alimentado
con ET0 y temperatura reales de arequipa (ver clima.py). asi el modelo aprende
de fisica agronomica real, no de una formula inventada.
"""

from __future__ import annotations

import os
from datetime import datetime
from pathlib import Path

import joblib
import numpy as np
from sklearn.ensemble import RandomForestRegressor

from .clima import cargar as cargar_clima

# cultivos soportados (parametros fao-56):
#   umbral = humedad objetivo (%), la meta de cada cultivo
#   kc     = coeficiente de cultivo (cuanta agua demanda vs la referencia)
#   zr     = profundidad de raiz (m) -> cuanta agua cabe en la zona radicular
# palta: sensible, riega seguido (umbral alto), raiz superficial
# vid: tolera estres (umbral bajo), raiz profunda
# citrico: intermedio
cultivos = {
    "palta":   {"nombre": "palta",   "emoji": "🥑", "id": 0, "umbral": 35, "kc": 0.90, "zr": 0.5},
    "vid":     {"nombre": "vid",     "emoji": "🍇", "id": 1, "umbral": 25, "kc": 0.70, "zr": 1.0},
    "citrico": {"nombre": "cítrico", "emoji": "🍊", "id": 2, "umbral": 30, "kc": 0.65, "zr": 0.9},
}

# variables que entran al modelo
features = ["humedad_pct", "tension_cbar", "temperatura_c", "hora_dia", "cultivo_id"]

# parametros del riego por goteo
TASA_GOTEO = 10.0   # mm/h que aplica el sistema
EF_RIEGO = 0.9      # eficiencia del goteo (parte que aprovecha la planta)
AGUA_DISP = 0.13    # agua disponible del suelo (m3/m3), suelo franco tipico

ruta_modelo = Path(os.getenv("ANDESGROW_MODEL_PATH", "models/riego_rf.pkl"))

_modelo = None


def _taw(zr: float) -> float:
    # agua total disponible en la zona radicular (mm)
    return 1000 * AGUA_DISP * zr


def _tension(humedad: float) -> float:
    # curva de retencion simple: la tension sube cuando baja la humedad
    return round(100 * (1 - humedad / 100) ** 2, 1)


def _frac_dia(hora: int) -> float:
    # fraccion del dia (y de la evaporacion) que aun queda por delante
    if hora <= 6:
        return 1.0
    if hora >= 18:
        return 0.1
    return (18 - hora) / 12


def _minutos_fao56(moist, hora, et0, temp, cult) -> float:
    # cuanto regar segun fao-56: reponer el deficit + cubrir la evaporacion del dia
    deficit = max(0.0, (cult["umbral"] - moist) / 100 * _taw(cult["zr"]))  # mm a reponer
    if deficit <= 0:
        return 0.0
    # demanda del cultivo: ET0 real ajustada por el calor del momento y la hora
    etc = et0 * cult["kc"] * (1 + (temp - 18) / 50)  # mm/dia
    lamina = deficit + etc * _frac_dia(hora)         # mm netos a aplicar
    bruta = lamina / EF_RIEGO                         # mm reales (descontando ineficiencia)
    return bruta / TASA_GOTEO * 60                    # minutos de riego


def generar_datos(n: int = 4000):
    # genera n situaciones (suelo + dia real de arequipa) con sus minutos fao-56
    rng = np.random.default_rng(42)
    clima = cargar_clima()
    nombres = list(cultivos)
    X, y = [], []
    for _ in range(n):
        cult = cultivos[nombres[rng.integers(len(nombres))]]
        dia = clima[rng.integers(len(clima))]                   # un dia real
        moist = rng.uniform(10, 70)                             # estado real del suelo (latente)
        hora = int(rng.integers(0, 24))
        temp = dia["temp"] + rng.normal(0, 2)
        # dos sensores que miden el mismo suelo con ruido independiente
        humedad = float(np.clip(moist + rng.normal(0, 4), 5, 80))
        tension = float(np.clip(_tension(moist) + rng.normal(0, 8), 0, 95))
        minutos = _minutos_fao56(moist, hora, dia["et0"], temp, cult)
        minutos = max(0.0, minutos + rng.normal(0, 1.0))        # ruido de medicion
        X.append([humedad, tension, temp, hora, cult["id"]])
        y.append(minutos)
    return np.array(X), np.array(y)


def entrenar(X=None, y=None) -> RandomForestRegressor:
    # entrena el random forest y lo guarda en disco
    if X is None or y is None:
        X, y = generar_datos()
    rf = RandomForestRegressor(n_estimators=200, random_state=42)
    rf.fit(X, y)
    ruta_modelo.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(rf, ruta_modelo)
    return rf


def get_modelo() -> RandomForestRegressor:
    # carga el modelo del disco, o lo entrena la primera vez
    global _modelo
    if _modelo is None:
        _modelo = joblib.load(ruta_modelo) if ruta_modelo.exists() else entrenar()
    return _modelo


def importancia() -> dict:
    # peso de cada variable en la decision: que sensor pesa mas
    m = get_modelo()
    return {f: round(float(p), 3) for f, p in zip(features, m.feature_importances_)}


def predecir_riego(cultivo, humedad_pct, tension_cbar, temperatura_c, hora_dia) -> dict:
    # predice los minutos de riego para el estado actual del cultivo
    info = cultivos.get(cultivo, cultivos["palta"])
    m = get_modelo()
    x = [[humedad_pct, tension_cbar, temperatura_c, hora_dia, info["id"]]]
    pred = float(m.predict(x)[0])
    # menos de 2 min es ruido del modelo: se considera "no regar"
    minutos = int(round(pred)) if pred >= 2 else 0

    # confianza: que tanto coinciden los arboles entre si
    preds = np.array([arbol.predict(x)[0] for arbol in m.estimators_])
    confianza = round(float(max(0.0, 1 - preds.std() / (preds.mean() + 1e-6))), 2)

    umbral = info["umbral"]
    if minutos == 0:
        mensaje = f"no regar (humedad {humedad_pct:.0f}% ≥ meta {umbral}%)"
        momento = None
    else:
        mensaje = f"regar {minutos} min para llegar al {umbral}% de humedad"
        momento = datetime.now().isoformat(timespec="minutes")

    return {
        "minutos_riego": minutos,
        "momento_optimo": momento,
        "umbral_objetivo_pct": float(umbral),
        "mensaje": mensaje,
        "confianza": confianza if minutos > 0 else None,
    }
