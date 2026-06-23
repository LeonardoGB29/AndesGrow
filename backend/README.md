# AndesGrow — Backend

API Python (FastAPI) que lee los sensores y corre el modelo de decisión de riego
(Random Forest Regressor). Es el "cerebro" del sistema; el frontend solo lo consume.

## Endpoints

| Método | Ruta             | Descripción                                                  |
|--------|------------------|--------------------------------------------------------------|
| GET    | `/sensores`      | Lectura cruda + decisión. Drop-in del endpoint de la Pi.     |
| POST   | `/recomendacion` | Salida del Random Forest: minutos de riego + momento óptimo. |
| GET    | `/modelo`        | Importancia de variables y cultivos soportados.              |
| GET    | `/salud`         | Healthcheck.                                                 |
| GET    | `/docs`          | Swagger UI (autogenerado por FastAPI).                       |

## Cómo correr (desarrollo)

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # ANDESGROW_FAKE_SENSORS=1 usa datos simulados
uvicorn app.main:app --reload --port 8000
```

Apunta el frontend a este backend con `VITE_API_BASE_URL=http://localhost:8000`
en `frontend/.env`.

## El modelo (primera fase)

`GET /sensores` ya devuelve la decisión de un **RandomForestRegressor** real. Como
todavía no hay datos de campo, el modelo se entrena con **balance hídrico FAO-56**
alimentado por **clima real de Arequipa** (ET₀ + temperatura, vía Open-Meteo):

```
ET0 real (open-meteo)  ──►  ETc = ET0 × Kc  ──►  minutos = (déficit + ETc) / goteo
estado del suelo (%)        Kc por cultivo        del cultivo específico
```

Ver y reentrenar con métricas + importancia de variables:

```bash
python train.py
# r2, error medio, peso de cada variable y ejemplos por cultivo
```

El `.pkl` se guarda en `models/` y `model.py` lo carga solo (si no existe, se
entrena en el primer arranque). El clima se cachea en `data/clima_arequipa.json`.

Features del modelo: `[VWC_20cm_%, VWC_40cm_%, T_soil_C, SWT_20cm_cBar, SWT_40cm_cBar, temperatura_ambiente, hora_dia, cultivo_id]`.
`hora_dia` se extrae de `timestamp` y `cultivo_id` viene de la configuración; `id_kit` identifica el dispositivo pero no entra al Random Forest.

### Ejecutar el modelo sobre el dataset

El dataset se encuentra en `data/dataset_suelo.csv`. Desde la carpeta
`backend`, ejecuta:

```bash
python predict_dataset.py --cultivo palta
```

El resultado se guarda en `data/predicciones_riego.csv`. Para una prueba rápida:

```bash
python predict_dataset.py --cultivo palta --limite 10
```
→ target `minutos_riego`. Cultivos y sus parámetros FAO-56 (Kc, raíz, umbral) en `model.py`.

## Estructura

```
backend/
├── app/
│   ├── main.py      # FastAPI: rutas /sensores, /recomendacion, /modelo, /salud
│   ├── schemas.py   # Pydantic: SensoresResponse replica AndesGrowReading del front
│   ├── sensors.py   # lectura de sensores (simulada o GPIO real en la Pi)
│   ├── clima.py     # descarga ET0 + temperatura reales (FAO-56, Open-Meteo)
│   └── model.py     # RandomForestRegressor + datos FAO-56 + cultivos
├── train.py         # entrena y reporta métricas / importancia (primera fase)
├── data/            # cache de clima (clima_arequipa.json)
├── models/          # .pkl entrenados (gitignored)
├── requirements.txt
└── .env.example
```

## Próximos pasos

- **Datos reales**: la Pi registra cada lectura + cada riego → se acumula el dataset
  real y se reentrena (`train.py`). Ahí la importancia de la tensión reflejará la realidad.
- **Hardware real**: implementar la lectura GPIO en `sensors.py` (HL-69, tensiómetro,
  presión) y arrancar con `ANDESGROW_FAKE_SENSORS=0`.
- **Prophet** (opcional): curva futura de humedad con bandas de confianza.
