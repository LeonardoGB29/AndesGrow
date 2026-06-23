"""Genera recomendaciones temporales sobre dataset_suelo.csv."""
from __future__ import annotations
import argparse
import csv
from collections import defaultdict, deque
from datetime import datetime
from pathlib import Path
from app.model import (
    HISTORIAL_MINUTOS, INTERVALO_PREDICCION_MINUTOS, predecir_riego,
)

BASE = Path(__file__).resolve().parent
ENTRADA_PREDETERMINADA = BASE / "data" / "dataset_suelo.csv"
SALIDA_PREDETERMINADA = BASE / "data" / "predicciones_riego.csv"

def ejecutar(entrada: Path, salida: Path, cultivo: str, limite: int | None) -> int:
    """Emite una prediccion cada 15 min usando los 60 min anteriores por kit."""
    salida.parent.mkdir(parents=True, exist_ok=True)
    historiales, ultima_prediccion = defaultdict(deque), {}
    with entrada.open("r", encoding="utf-8-sig", newline="") as origen:
        lector = csv.DictReader(origen)
        extras = [
            "cultivo", "minutos_riego", "momento_optimo", "umbral_objetivo_pct",
            "mensaje", "confianza", "ventana_inicio", "ventana_fin",
            "lecturas_ventana", "tendencia_humedad_pct_h",
        ]
        with salida.open("w", encoding="utf-8-sig", newline="") as destino:
            escritor = csv.DictWriter(destino, fieldnames=[*(lector.fieldnames or []), *extras])
            escritor.writeheader()
            procesadas = 0
            for fila in lector:
                kit = fila.get("id_kit") or "KIT_SIN_ID"
                ahora = datetime.fromisoformat(fila["timestamp"])
                historial = historiales[kit]
                historial.append(fila)
                while historial and (
                    ahora - datetime.fromisoformat(historial[0]["timestamp"])
                ).total_seconds() > HISTORIAL_MINUTOS * 60:
                    historial.popleft()

                anterior = ultima_prediccion.get(kit)
                if anterior and (ahora - anterior).total_seconds() < INTERVALO_PREDICCION_MINUTOS * 60:
                    continue
                try:
                    prediccion = predecir_riego(cultivo, list(historial))
                except ValueError:
                    continue

                escritor.writerow({**fila, "cultivo": cultivo, **prediccion})
                ultima_prediccion[kit] = ahora
                procesadas += 1
                if limite is not None and procesadas >= limite:
                    break
    return procesadas

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--entrada", type=Path, default=ENTRADA_PREDETERMINADA)
    parser.add_argument("--salida", type=Path, default=SALIDA_PREDETERMINADA)
    parser.add_argument("--cultivo", choices=("palta", "vid", "citrico"), default="palta")
    parser.add_argument("--limite", type=int, default=None,
                        help="numero maximo de predicciones, no de lecturas")
    args = parser.parse_args()
    total = ejecutar(args.entrada, args.salida, args.cultivo, args.limite)
    print(f"{total} ventanas temporales predichas")
    print(f"resultado: {args.salida.resolve()}")

if __name__ == "__main__":
    main()