export interface AndesGrowReading {
  timestamp: string;
  fecha: string;
  hora_dia: number;
  dia: number;

  temperatura_c: number | null;

  humedad_20cm_pct: number;
  humedad_20cm_digital: number;
  humedad_20cm_estado: string;
  humedad_20cm_modo: string;

  humedad_40cm_pct: number;
  humedad_40cm_digital: number | null;
  humedad_40cm_estado: string;
  humedad_40cm_modo: string;

  swt_20cm_cbar: number;
  presion_raw: number;
  sensor_presion_ok: boolean;
  presion_modo: string;

  accion: string;
  alerta: string;
  nivel_alerta: string;
  estado_hidrico: string;
  minutos_faltantes: number | null;
  fecha_estimada: string | null;
}

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

export async function getSensores(): Promise<AndesGrowReading> {
  const response = await fetch(`${API_BASE_URL}/sensores`);

  if (!response.ok) {
    throw new Error(`Error HTTP ${response.status}`);
  }

  return response.json();
}
