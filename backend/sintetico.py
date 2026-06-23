import pandas as pd
import numpy as np
from datetime import datetime, timedelta

# ==============================
# Configuración
# ==============================

ARCHIVO_ENTRADA = "resultados medio dia.csv"
ARCHIVO_SALIDA = "dataset_expandido_5_dias_1_minuto.csv"

ID_KIT = "KIT_001"
DIAS_HACIA_ATRAS = 5
FRECUENCIA = "1min"

np.random.seed(42)

# ==============================
# Leer CSV real
# ==============================

df = pd.read_csv(ARCHIVO_ENTRADA)

df["timestamp"] = pd.to_datetime(df["timestamp"], errors="coerce")
df = df.dropna(subset=["timestamp"])

# ==============================
# Eliminar fechas futuras
# ==============================

fecha_fin = datetime.now().replace(second=0, microsecond=0)

df = df[df["timestamp"] <= fecha_fin].copy()

if df.empty:
    raise ValueError("No hay datos válidos hasta la fecha actual. Todo el CSV parece estar en fechas futuras.")

df = df.sort_values("timestamp").reset_index(drop=True)

# ==============================
# Conservar columnas reales
# ==============================

columnas_reales = [
    "VWC_20cm_%",
    "VWC_40cm_%",
    "T_soil_C",
    "SWT_20cm_cBar",
    "SWT_40cm_cBar"
]

# Verificar que existan las columnas necesarias
for col in columnas_reales:
    if col not in df.columns:
        raise ValueError(f"Falta la columna requerida: {col}")

# ==============================
# Crear temperatura ambiente estimada
# ==============================

# Como el CSV no tiene temperatura ambiente,
# se estima a partir de la temperatura del suelo.
hora_decimal = df["timestamp"].dt.hour + df["timestamp"].dt.minute / 60

df["temperatura_ambiente"] = (
    df["T_soil_C"]
    + 2.5 * np.sin((hora_decimal - 7) * np.pi / 12)
    + np.random.normal(0, 0.4, len(df))
)

# Agregar id del kit
df["id_kit"] = ID_KIT

# Dataset real con columnas finales
df_real = df[
    [
        "id_kit",
        "timestamp",
        "VWC_20cm_%",
        "VWC_40cm_%",
        "T_soil_C",
        "SWT_20cm_cBar",
        "SWT_40cm_cBar",
        "temperatura_ambiente"
    ]
].copy()

# ==============================
# Convertir datos reales a 1 minuto
# ==============================

df_real = df_real.set_index("timestamp")

columnas_numericas = [
    "VWC_20cm_%",
    "VWC_40cm_%",
    "T_soil_C",
    "SWT_20cm_cBar",
    "SWT_40cm_cBar",
    "temperatura_ambiente"
]

df_real_1min = df_real.resample(FRECUENCIA).asfreq()

df_real_1min[columnas_numericas] = (
    df_real_1min[columnas_numericas]
    .interpolate(method="time")
)

df_real_1min["id_kit"] = ID_KIT

df_real_1min = df_real_1min.reset_index()

# ==============================
# Crear rango desde hace 5 días hasta ahora
# ==============================

fecha_inicio = fecha_fin - timedelta(days=DIAS_HACIA_ATRAS)

rango_completo = pd.date_range(
    start=fecha_inicio,
    end=fecha_fin,
    freq=FRECUENCIA
)

df_completo = pd.DataFrame({
    "timestamp": rango_completo
})

# ==============================
# Unir datos reales con rango completo
# ==============================

df_expandido = df_completo.merge(
    df_real_1min,
    on="timestamp",
    how="left"
)

# ==============================
# Expandir datos hacia atrás usando patrón real
# ==============================

base = df_real_1min[columnas_numericas].copy()

if base.empty:
    raise ValueError("No hay suficientes datos reales para expandir.")

filas_faltantes = df_expandido["VWC_20cm_%"].isna().sum()

repeticiones = int(np.ceil(filas_faltantes / len(base))) + 1

patron_expandido = pd.concat(
    [base] * repeticiones,
    ignore_index=True
)

patron_expandido = patron_expandido.tail(filas_faltantes).reset_index(drop=True)

# Pequeñas variaciones para no copiar exactamente el patrón
ruido = {
    "VWC_20cm_%": 0.35,
    "VWC_40cm_%": 0.30,
    "T_soil_C": 0.20,
    "SWT_20cm_cBar": 0.25,
    "SWT_40cm_cBar": 0.25,
    "temperatura_ambiente": 0.25
}

for col in columnas_numericas:
    patron_expandido[col] = (
        patron_expandido[col]
        + np.random.normal(0, ruido[col], len(patron_expandido))
    )

# Limitar valores
patron_expandido["VWC_20cm_%"] = patron_expandido["VWC_20cm_%"].clip(0, 100)
patron_expandido["VWC_40cm_%"] = patron_expandido["VWC_40cm_%"].clip(0, 100)
patron_expandido["SWT_20cm_cBar"] = patron_expandido["SWT_20cm_cBar"].clip(0, 100)
patron_expandido["SWT_40cm_cBar"] = patron_expandido["SWT_40cm_cBar"].clip(0, 100)

# Insertar valores donde faltan datos
indices_faltantes = df_expandido[df_expandido["VWC_20cm_%"].isna()].index

for col in columnas_numericas:
    df_expandido.loc[indices_faltantes, col] = patron_expandido[col].values

df_expandido["id_kit"] = df_expandido["id_kit"].fillna(ID_KIT)

# ==============================
# Redondear valores
# ==============================

for col in columnas_numericas:
    df_expandido[col] = df_expandido[col].round(2)

# Orden final
df_expandido = df_expandido[
    [
        "id_kit",
        "timestamp",
        "VWC_20cm_%",
        "VWC_40cm_%",
        "T_soil_C",
        "SWT_20cm_cBar",
        "SWT_40cm_cBar",
        "temperatura_ambiente"
    ]
]

# ==============================
# Guardar CSV
# ==============================

df_expandido.to_csv(ARCHIVO_SALIDA, index=False)

print("Dataset expandido generado correctamente")
print(f"Archivo generado: {ARCHIVO_SALIDA}")
print(f"Fecha inicio: {df_expandido['timestamp'].min()}")
print(f"Fecha fin: {df_expandido['timestamp'].max()}")
print(f"Cantidad de registros: {len(df_expandido)}")
print()
print(df_expandido.head())
print()
print(df_expandido.tail())