# AndesGrow

Riego inteligente para cultivos de alto valor en los valles arequipeños
(palta, vid, cítricos). Los sensores miden el estado del suelo y un modelo
**Random Forest Regressor** decide **cuántos minutos regar y cuándo** — una
instrucción simple, no gráficos crudos. Esa es la propuesta de valor.

## Estructura (monorepo)

```
AndesGrow/
├── frontend/   # App TanStack Start + React (UI / dashboard). Consume la API.
└── backend/    # API FastAPI: lee sensores + corre el modelo. El "cerebro".
```

Cada carpeta tiene su propio README con detalles.

## Requisitos

- **Python 3.10+** (para el backend)
- **Bun** (para el frontend) — o `npm`, si prefieres
- Conexión a internet la primera vez (el backend descarga clima real para entrenar)

---

## Cómo levantar el proyecto

Son **dos servicios** que corren a la vez, cada uno en su terminal.

### 1. Backend (API + modelo) — terminal 1

```bash
cd backend

# crear el entorno de Python e instalar dependencias (solo la primera vez)
python3 -m venv .venv
source .venv/bin/activate          # en Windows: .venv\Scripts\activate
pip install -r requirements.txt

# (opcional) entrenar y ver cómo funciona el modelo
python train.py

# levantar la API en http://localhost:8000
ANDESGROW_FAKE_SENSORS=1 uvicorn app.main:app --reload --port 8000
```

- `ANDESGROW_FAKE_SENSORS=1` usa **sensores simulados** (no necesitas la Raspberry).
- La primera vez, el modelo se entrena solo (descarga clima real de Arequipa).
- Verifica que funciona abriendo **http://localhost:8000/docs** (Swagger).

### 2. Frontend (la app) — terminal 2

```bash
cd frontend

# instalar dependencias (solo la primera vez)
bun install

# apuntar la app al backend local
echo "VITE_API_BASE_URL=http://localhost:8000" > .env

# levantar la app (normalmente en http://localhost:3000)
bun run dev
```

Abre la URL que imprime Vite. El Dashboard mostrará la decisión real del modelo
(ej. *"Regar 52 min"*). Si el backend no está corriendo, la app usa una
estimación local de respaldo.

> **Nota:** `frontend/.env` por defecto apunta a la Raspberry (`192.168.2.2:8000`).
> Cámbialo a `http://localhost:8000` para probar contra el backend local.

---

## Solución de problemas (macOS)

Si el proyecto te llegó por **WhatsApp / un `.zip`**, `node_modules` viene roto
(los enlaces no sobreviven la compresión) y macOS pone los archivos en cuarentena.
Síntomas y arreglo:

| Error al correr `bun run dev` | Causa | Arreglo |
|-------------------------------|-------|---------|
| `bad interpreter: /usr/bin/env: Operation not permitted` | cuarentena de macOS | `xattr -dr com.apple.quarantine .` |
| `Cannot find module '.../node_modules/dist/node/cli.js'` | symlinks rotos por el `.zip` | `cd frontend && rm -rf node_modules && bun install` |

Regla general: **nunca compartas `node_modules`** dentro de un `.zip`. Comparte
solo el código (ya está en `.gitignore`) y que cada quien corra `bun install`.

---

## Arquitectura

```
FRONTEND (TanStack/React)  ──HTTP──►  BACKEND (FastAPI, Python)
  UI / dashboard                       GET  /sensores      lee sensores + decide
  consume la API                       POST /recomendacion Random Forest -> minutos
                                       GET  /modelo        importancia de variables
                                       (corre en la Raspberry Pi en producción)
```

El modelo se entrena con balance hídrico **FAO-56** y clima real de Arequipa.
Detalles del modelo, datos y endpoints en [`backend/README.md`](backend/README.md).
