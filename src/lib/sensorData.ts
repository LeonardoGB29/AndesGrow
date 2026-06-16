import { useEffect, useState } from "react";

export type Severidad = "ok" | "atencion" | "bajo" | "critico";

export type SeriePoint = {
  fecha: string;
  humedad: number;
};

export type Sensor = {
  id: string;
  nombre: string;
  ubicacion: string;
  lote: string;
  profundidad: number;
  x: number;
  y: number;

  humedad_pct: number;
  humedad_estado: string;
  humedad_digital: number | null;
  temperatura_c: number;
  swt_cbar: number;

  severidad: Severidad;
  actualizado: string;
  serie: SeriePoint[];
};

export type AndesGrowApiResponse = {
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
};

export type CropProfile = {
  id: string;
  nombre: string;
  emoji: string;
  descripcion: string;
  minHumedad: number;
  maxHumedad: number;
};

export const cropProfiles: CropProfile[] = [
  {
    id: "arandanos",
    nombre: "Arándanos",
    emoji: "🫐",
    descripcion: "Cultivo sensible al exceso y falta de agua.",
    minHumedad: 27,
    maxHumedad: 70,
  },
  {
    id: "papa",
    nombre: "Papa",
    emoji: "🥔",
    descripcion: "Requiere humedad estable en zona radicular.",
    minHumedad: 30,
    maxHumedad: 75,
  },
  {
    id: "maiz",
    nombre: "Maíz",
    emoji: "🌽",
    descripcion: "Mayor demanda hídrica en crecimiento.",
    minHumedad: 25,
    maxHumedad: 65,
  },
  {
    id: "cebolla",
    nombre: "Cebolla",
    emoji: "🧅",
    descripcion: "Prefiere humedad moderada y controlada.",
    minHumedad: 22,
    maxHumedad: 60,
  },
];

export const severidadStyle: Record<
  Severidad,
  {
    label: string;
    dot: string;
    bg: string;
    text: string;
  }
> = {
  ok: {
    label: "Óptimo",
    dot: "bg-emerald-500",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
  },
  atencion: {
    label: "Vigilar",
    dot: "bg-amber-500",
    bg: "bg-amber-50",
    text: "text-amber-700",
  },
  bajo: {
    label: "Bajo",
    dot: "bg-orange-500",
    bg: "bg-orange-50",
    text: "text-orange-700",
  },
  critico: {
    label: "Crítico",
    dot: "bg-red-500",
    bg: "bg-red-50",
    text: "text-red-700",
  },
};

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

function clasificarSeveridad(humedad: number): Severidad {
  if (humedad < 20) return "critico";
  if (humedad < 27) return "bajo";
  if (humedad < 40) return "atencion";
  return "ok";
}

function horaActualCorta(fechaIso?: string) {
  const date = fechaIso ? new Date(fechaIso) : new Date();

  if (Number.isNaN(date.getTime())) {
    return "ahora";
  }

  const h = date.getHours().toString().padStart(2, "0");
  const m = date.getMinutes().toString().padStart(2, "0");

  return `${h}:${m}`;
}

function generarSerie(base: number): SeriePoint[] {
  const ahora = new Date();

  return Array.from({ length: 12 }).map((_, i) => {
    const d = new Date(ahora);
    d.setHours(ahora.getHours() - (11 - i) * 2);

    const variacion = Math.sin(i / 2) * 4 - (11 - i) * 0.25;
    const humedad = Math.max(0, Math.min(100, base + variacion));

    return {
      fecha: `${d.getHours().toString().padStart(2, "0")}:00`,
      humedad: Number(humedad.toFixed(1)),
    };
  });
}

function mapApiToSensores(data: AndesGrowApiResponse): Sensor[] {
  const temperatura = data.temperatura_c ?? 0;

  const h20 = Number(data.humedad_20cm_pct ?? 0);
  const h40 = Number(data.humedad_40cm_pct ?? 0);

  return [
    {
      id: "S-20",
      nombre: "Sensor 20 cm",
      ubicacion: "Lote Norte · capa superficial",
      lote: "Lote Norte",
      profundidad: 20,
      x: 35,
      y: 42,

      humedad_pct: h20,
      humedad_estado: data.humedad_20cm_estado,
      humedad_digital: data.humedad_20cm_digital,
      temperatura_c: temperatura,
      swt_cbar: Number(data.swt_20cm_cbar ?? 0),

      severidad: clasificarSeveridad(h20),
      actualizado: horaActualCorta(data.timestamp),
      serie: generarSerie(h20),
    },
    {
      id: "S-40",
      nombre: "Sensor 40 cm",
      ubicacion: "Lote Norte · zona radicular",
      lote: "Lote Norte",
      profundidad: 40,
      x: 68,
      y: 58,

      humedad_pct: h40,
      humedad_estado: data.humedad_40cm_estado,
      humedad_digital: data.humedad_40cm_digital,
      temperatura_c: temperatura,
      swt_cbar: Number(data.swt_20cm_cbar ?? 0),

      severidad: clasificarSeveridad(h40),
      actualizado: horaActualCorta(data.timestamp),
      serie: generarSerie(h40),
    },
  ];
}

async function fetchSensores(): Promise<Sensor[]> {
  const response = await fetch(`${API_BASE_URL}/sensores`);

  if (!response.ok) {
    throw new Error(`Error HTTP ${response.status}`);
  }

  const data = (await response.json()) as AndesGrowApiResponse;
  return mapApiToSensores(data);
}

const fallbackSensores: Sensor[] = [
  {
    id: "S-20",
    nombre: "Sensor 20 cm",
    ubicacion: "Lote Norte · capa superficial",
    lote: "Lote Norte",
    profundidad: 20,
    x: 35,
    y: 42,
    humedad_pct: 25,
    humedad_estado: "demo",
    humedad_digital: 1,
    temperatura_c: 19,
    swt_cbar: 30,
    severidad: "bajo",
    actualizado: "demo",
    serie: generarSerie(25),
  },
  {
    id: "S-40",
    nombre: "Sensor 40 cm",
    ubicacion: "Lote Norte · zona radicular",
    lote: "Lote Norte",
    profundidad: 40,
    x: 68,
    y: 58,
    humedad_pct: 45,
    humedad_estado: "simulado",
    humedad_digital: null,
    temperatura_c: 19,
    swt_cbar: 30,
    severidad: "ok",
    actualizado: "demo",
    serie: generarSerie(45),
  },
];

export function useSensores(): Sensor[] {
  const [sensores, setSensores] = useState<Sensor[]>(fallbackSensores);

  useEffect(() => {
    let activo = true;

    async function cargar() {
      try {
        const data = await fetchSensores();

        if (activo) {
          setSensores(data);
        }
      } catch (error) {
        console.error("No se pudo leer la Raspberry:", error);
      }
    }

    cargar();

    const interval = window.setInterval(() => {
      cargar();
    }, 3000);

    return () => {
      activo = false;
      window.clearInterval(interval);
    };
  }, []);

  return sensores;
}

export function getResumen(sensores: Sensor[]) {
  const total = sensores.length;

  const secos = sensores.filter(
    (s) => s.severidad === "critico" || s.severidad === "bajo",
  ).length;

  const humedos = total - secos;

  const pctSeco = total === 0 ? 0 : Math.round((secos / total) * 100);

  const tempProm =
    total === 0
      ? 0
      : Number(
          (
            sensores.reduce((acc, s) => acc + s.temperatura_c, 0) / total
          ).toFixed(1),
        );

  const zonasCriticas = sensores
    .filter((s) => s.severidad === "critico" || s.severidad === "bajo")
    .map((s) => s.nombre);

  let urgencia: Severidad = "ok";

  if (sensores.some((s) => s.severidad === "critico")) {
    urgencia = "critico";
  } else if (sensores.some((s) => s.severidad === "bajo")) {
    urgencia = "bajo";
  } else if (sensores.some((s) => s.severidad === "atencion")) {
    urgencia = "atencion";
  }

  const necesitaRiego = urgencia === "critico" || urgencia === "bajo";

  const mensajeEstado = necesitaRiego
    ? "Riego recomendado"
    : urgencia === "atencion"
      ? "Humedad en vigilancia"
      : "Humedad estable";

  return {
    total,
    secos,
    humedos,
    pctSeco,
    tempProm,
    zonasCriticas,
    urgencia,
    necesitaRiego,
    mensajeEstado,
  };
}

export function getHistorico(rango: "24h" | "7d" | "30d") {
  const puntos = rango === "24h" ? 12 : rango === "7d" ? 7 : 30;

  return Array.from({ length: puntos }).map((_, i) => {
    const humedad = Math.max(
      5,
      Math.min(90, 45 + Math.sin(i / 2) * 12 - i * 0.3),
    );

    return {
      fecha:
        rango === "24h"
          ? `${String(i * 2).padStart(2, "0")}:00`
          : `D${i + 1}`,
      humedad: Number(humedad.toFixed(1)),
      umbralMin: 27,
      umbralMax: 70,
    };
  });
}
export function getHumedadSerie(sensores: Sensor[]) {
  if (sensores.length === 0) return [];

  const maxLen = Math.max(...sensores.map((s) => s.serie.length));

  return Array.from({ length: maxLen }).map((_, i) => {
    const puntos = sensores
      .map((s) => s.serie[i])
      .filter(Boolean);

    const humedadPromedio =
      puntos.length === 0
        ? 0
        : puntos.reduce((acc, p) => acc + p.humedad, 0) / puntos.length;

    return {
      fecha: puntos[0]?.fecha ?? `${i}`,
      humedad: Number(humedadPromedio.toFixed(1)),
      umbralMin: 27,
      umbralMax: 70,
    };
  });
}