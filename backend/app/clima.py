"""clima real para entrenar el modelo (open-meteo).

descarga un año de ET0 (evapotranspiracion de referencia) y temperatura diaria
de un valle de arequipa y lo cachea en data/clima_arequipa.json. la ET0 viene
ya calculada con el metodo fao-56 penman-monteith, asi no hay que computarla.
"""

from __future__ import annotations

import json
import urllib.request
from pathlib import Path

# la joya, arequipa: valle real con riego por goteo
LAT, LON = -16.58, -71.92

ruta_cache = Path(__file__).resolve().parent.parent / "data" / "clima_arequipa.json"


def descargar(start: str = "2023-01-01", end: str = "2023-12-31") -> list[dict]:
    # baja ET0 + temperatura media diaria y guarda el cache
    url = (
        "https://archive-api.open-meteo.com/v1/archive"
        f"?latitude={LAT}&longitude={LON}"
        f"&start_date={start}&end_date={end}"
        "&daily=et0_fao_evapotranspiration,temperature_2m_mean"
        "&timezone=America/Lima"
    )
    with urllib.request.urlopen(url, timeout=60) as r:
        d = json.load(r)["daily"]

    dias = [
        {"et0": et0, "temp": temp}
        for et0, temp in zip(d["et0_fao_evapotranspiration"], d["temperature_2m_mean"])
        if et0 is not None and temp is not None
    ]
    ruta_cache.parent.mkdir(parents=True, exist_ok=True)
    ruta_cache.write_text(json.dumps(dias))
    return dias


def cargar() -> list[dict]:
    # usa el cache si existe; si no, lo descarga una vez
    if ruta_cache.exists():
        return json.loads(ruta_cache.read_text())
    return descargar()
