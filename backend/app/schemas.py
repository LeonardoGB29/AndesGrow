"""Esquemas Pydantic de la API de AndesGrow.

`SensoresResponse` replica exactamente el shape que el frontend ya espera
(interfaz `AndesGrowReading` en frontend/src/lib/andesgrow-api.ts), de modo
que este backend es un reemplazo directo del endpoint que hoy corre en la Pi.
"""

from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, Field

TipoCultivo = Literal["palta", "vid", "citrico"]


class SensoresResponse(BaseModel):
    """Lectura cruda + decisión, tal como la consume el Dashboard."""

    timestamp: str
    fecha: str
    hora_dia: int
    dia: int

    temperatura_c: Optional[float] = None

    # Humedad capa superficial (20 cm)
    humedad_20cm_pct: float
    humedad_20cm_digital: int
    humedad_20cm_estado: str
    humedad_20cm_modo: str

    # Humedad zona radicular (40 cm)
    humedad_40cm_pct: float
    humedad_40cm_digital: Optional[int] = None
    humedad_40cm_estado: str
    humedad_40cm_modo: str

    # Tensión del suelo (tensiómetro) + sensor de presión
    swt_20cm_cbar: float
    presion_raw: float
    sensor_presion_ok: bool
    presion_modo: str

    # Decisión derivada del modelo
    accion: str
    alerta: str
    nivel_alerta: str
    estado_hidrico: str
    minutos_faltantes: Optional[int] = None
    fecha_estimada: Optional[str] = None


class RecomendacionRequest(BaseModel):
    """Inputs del Random Forest. Si no se envían, el backend toma la última
    lectura de los sensores y completa los faltantes."""

    cultivo: TipoCultivo = "palta"
    humedad_pct: Optional[float] = None
    tension_cbar: Optional[float] = None
    temperatura_c: Optional[float] = None
    hora_dia: Optional[int] = Field(default=None, ge=0, le=23)


class RecomendacionResponse(BaseModel):
    """Salida del modelo: la instrucción accionable, núcleo de AndesGrow."""

    cultivo: TipoCultivo
    minutos_riego: int
    momento_optimo: Optional[str] = None  # ISO datetime: cuándo se cruza el umbral
    humedad_actual_pct: float
    tension_cbar: float
    umbral_objetivo_pct: float
    mensaje: str
    confianza: Optional[float] = None
