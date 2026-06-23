"""lectura de sensores.

en la raspberry pi esto lee el sensor de humedad hl-69 (y luego el tensiometro
y el sensor de presion) por gpio. mientras no haya hardware, devuelve lecturas
simuladas para poder desarrollar sin la pi.
"""

from __future__ import annotations

import math
import os
from dataclasses import dataclass


@dataclass
class LecturaSensores:
    temperatura_c: float
    temperatura_suelo_c: float
    humedad_20cm_pct: float
    humedad_20cm_digital: int
    humedad_40cm_pct: float
    humedad_40cm_digital: int | None
    swt_20cm_cbar: float
    swt_40cm_cbar: float
    presion_raw: float
    sensor_presion_ok: bool


def _sol(hora: int) -> float:
    # radiacion solar: 0 de noche, pico ~mediodia
    if 6 <= hora <= 18:
        return math.sin((hora - 6) / 12 * math.pi)
    return 0.0


def leer_sensores(hora_dia: int) -> LecturaSensores:
    # punto unico de lectura: simulado o hardware real segun la variable de entorno
    if os.getenv("ANDESGROW_FAKE_SENSORS", "1") != "1":
        raise NotImplementedError(
            "lectura de hardware no implementada todavia; "
            "usa ANDESGROW_FAKE_SENSORS=1 para datos simulados"
        )

    # el suelo se seca durante las horas de sol
    s = _sol(hora_dia)
    humedad_20 = round(45 - 18 * s, 1)
    humedad_40 = round(52 - 10 * s, 1)
    return LecturaSensores(
        temperatura_c=round(14 + 12 * s, 1),
        temperatura_suelo_c=round(15 + 9 * s, 1),
        humedad_20cm_pct=humedad_20,
        humedad_20cm_digital=0 if humedad_20 >= 27 else 1,
        humedad_40cm_pct=humedad_40,
        humedad_40cm_digital=0 if humedad_40 >= 27 else 1,
        swt_20cm_cbar=round(10 + 50 * s, 1),
        swt_40cm_cbar=round(8 + 35 * s, 1),
        presion_raw=512.0,
        sensor_presion_ok=True,
    )
