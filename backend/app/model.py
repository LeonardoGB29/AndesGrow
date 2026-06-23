"""Modelo temporal de riego: cada inferencia usa una hora de historial."""
from __future__ import annotations
import os
from datetime import datetime, timedelta
from pathlib import Path
import joblib
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from .clima import cargar as cargar_clima

cultivos = {
    "palta": {"nombre": "palta", "id": 0, "umbral": 35, "kc": .90, "zr": .5},
    "vid": {"nombre": "vid", "id": 1, "umbral": 25, "kc": .70, "zr": 1.0},
    "citrico": {"nombre": "citrico", "id": 2, "umbral": 30, "kc": .65, "zr": .9},
}
SENSORES = ("VWC_20cm_%", "VWC_40cm_%", "T_soil_C", "SWT_20cm_cBar",
            "SWT_40cm_cBar", "temperatura_ambiente")
HISTORIAL_MINUTOS, MIN_LECTURAS, INTERVALO_PREDICCION_MINUTOS = 60, 10, 15
features = [
    *(f"{s}_actual" for s in SENSORES), *(f"{s}_media" for s in SENSORES),
    *(f"{s}_std" for s in SENSORES), *(f"{s}_tendencia_h" for s in SENSORES),
    "hora_dia", "cultivo_id", "duracion_historial_min", "numero_lecturas",
]
TASA_GOTEO, EF_RIEGO, AGUA_DISP = 10., .9, .13
ruta_modelo = Path(os.getenv("ANDESGROW_MODEL_PATH", "models/riego_temporal_rf.pkl"))
_modelo = None

def _fecha(v):
    return v if isinstance(v, datetime) else datetime.fromisoformat(str(v))

def _tension(h):
    return 100 * (1 - h / 100) ** 2

def _minutos(humedad, hora, et0, temp, cultivo):
    deficit = max(0., (cultivo["umbral"] - humedad) / 100 *
                  (1000 * AGUA_DISP * cultivo["zr"]))
    if not deficit:
        return 0.
    fraccion = 1. if hora <= 6 else .1 if hora >= 18 else (18 - hora) / 12
    etc = et0 * cultivo["kc"] * (1 + (temp - 18) / 50)
    return (deficit + etc * fraccion) / EF_RIEGO / TASA_GOTEO * 60

def preparar_historial(historial, cultivo):
    """Resume nivel, promedio, variabilidad y tendencia de la ultima hora."""
    if len(historial) < MIN_LECTURAS:
        raise ValueError(f"se requieren al menos {MIN_LECTURAS} lecturas")
    filas = sorted(historial, key=lambda f: _fecha(f["timestamp"]))
    fin = _fecha(filas[-1]["timestamp"])
    filas = [f for f in filas if _fecha(f["timestamp"]) >=
             fin - timedelta(minutes=HISTORIAL_MINUTOS)]
    inicio = _fecha(filas[0]["timestamp"])
    t = np.array([(_fecha(f["timestamp"]) - inicio).total_seconds() / 60 for f in filas])
    if len(filas) < MIN_LECTURAS or float(t[-1]) < 48:
        raise ValueError("el historial debe tener 10 lecturas y cubrir al menos 48 minutos")
    actual, media, std, tendencia = [], [], [], []
    for sensor in SENSORES:
        v = np.array([float(f[sensor]) for f in filas])
        actual.append(float(v[-1])); media.append(float(v.mean()))
        std.append(float(v.std())); tendencia.append(float(np.polyfit(t, v, 1)[0] * 60))
    info = cultivos.get(cultivo, cultivos["palta"])
    x = np.array([*actual, *media, *std, *tendencia,
                  fin.hour + fin.minute / 60, info["id"], float(t[-1]), len(filas)])
    return x, {"inicio": inicio, "fin": fin, "lecturas": len(filas),
               "humedad": actual[0], "tendencia": tendencia[0]}

def generar_datos(n=4000):
    """Genera secuencias; el objetivo considera la humedad dentro de una hora."""
    rng, clima = np.random.default_rng(42), cargar_clima()
    X, y, base = [], [], datetime(2025, 1, 1)
    for i in range(n):
        nombre = list(cultivos)[rng.integers(3)]
        cultivo, dia = cultivos[nombre], clima[rng.integers(len(clima))]
        hora, humedad = int(rng.integers(24)), rng.uniform(10, 70)
        dh, temp, dt = rng.uniform(-4, 2), dia["temp"] + rng.normal(0, 2), rng.uniform(-1.5, 1.5)
        fin, historial = base + timedelta(days=i % 365, hours=hora), []
        for atras in range(60, -1, -5):
            f, h = -atras / 60, humedad + dh * (-atras / 60)
            ta = temp + dt * f + rng.normal(0, .25)
            historial.append({
                "timestamp": fin - timedelta(minutes=atras),
                "VWC_20cm_%": np.clip(h + rng.normal(0, .7), 5, 80),
                "VWC_40cm_%": np.clip(h + 5 + dh * .35 * f + rng.normal(0, .5), 5, 80),
                "T_soil_C": ta - 1.5 + rng.normal(0, .2),
                "SWT_20cm_cBar": np.clip(_tension(h) + rng.normal(0, 1.5), 0, 95),
                "SWT_40cm_cBar": np.clip(_tension(h + 5) + rng.normal(0, 1), 0, 95),
                "temperatura_ambiente": ta,
            })
        X.append(preparar_historial(historial, nombre)[0])
        futura = np.clip(humedad + dh, 5, 80)
        y.append(max(0., _minutos(futura, hora, dia["et0"], temp, cultivo) + rng.normal(0, .7)))
    return np.array(X), np.array(y)

def entrenar(X=None, y=None):
    X, y = generar_datos() if X is None or y is None else (X, y)
    modelo = RandomForestRegressor(n_estimators=200, random_state=42, n_jobs=-1)
    modelo.fit(X, y)
    ruta_modelo.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(modelo, ruta_modelo)
    return modelo

def get_modelo():
    global _modelo
    if _modelo is None:
        if ruta_modelo.exists():
            candidato = joblib.load(ruta_modelo)
            _modelo = candidato if candidato.n_features_in_ == len(features) else entrenar()
        else:
            _modelo = entrenar()
    return _modelo

def importancia():
    return {f: round(float(p), 3) for f, p in zip(features, get_modelo().feature_importances_)}

def predecir_riego(cultivo, historial):
    """Predice con una ventana temporal, nunca con un registro aislado."""
    x, contexto = preparar_historial(historial, cultivo)
    modelo, matriz = get_modelo(), x.reshape(1, -1)
    pred = float(modelo.predict(matriz)[0])
    minutos = int(round(pred)) if pred >= 2 else 0
    arboles = np.array([a.predict(matriz)[0] for a in modelo.estimators_])
    confianza = round(float(np.clip(1 - arboles.std() / max(abs(arboles.mean()), 2), 0, 1)), 2)
    tendencia = contexto["tendencia"]
    mensaje = (f"regar {minutos} min" if minutos else "no regar")
    mensaje += f"; humedad cambia {tendencia:+.2f}%/h en la ultima hora"
    info = cultivos.get(cultivo, cultivos["palta"])
    return {
        "minutos_riego": minutos,
        "momento_optimo": contexto["fin"].isoformat(timespec="minutes") if minutos else None,
        "umbral_objetivo_pct": float(info["umbral"]), "mensaje": mensaje,
        "confianza": confianza if minutos else None,
        "ventana_inicio": contexto["inicio"].isoformat(timespec="minutes"),
        "ventana_fin": contexto["fin"].isoformat(timespec="minutes"),
        "lecturas_ventana": contexto["lecturas"],
        "tendencia_humedad_pct_h": round(tendencia, 3),
    }