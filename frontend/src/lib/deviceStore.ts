import { useSyncExternalStore } from "react";

export interface Device {
  id: string;
  nombre: string;
  lote: string;
  profundidad: number; // cm
  x: number; // 0..100 % en el plano
  y: number;
  pairedAt: string; // ISO
}

const KEY = "andesgrow.devices.v1";
const EVT = "andesgrow:devices-changed";

function read(): Device[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Device[]) : [];
  } catch {
    return [];
  }
}

function write(list: Device[]) {
  window.localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new Event(EVT));
}

function subscribe(cb: () => void) {
  window.addEventListener(EVT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVT, cb);
    window.removeEventListener("storage", cb);
  };
}

export function useDevices(): Device[] {
  return useSyncExternalStore(
    subscribe,
    () => {
      // cachear el snapshot por contenido para evitar loops
      const raw = window.localStorage.getItem(KEY) ?? "[]";
      if (cachedRaw !== raw) {
        cachedRaw = raw;
        try {
          cachedList = JSON.parse(raw) as Device[];
        } catch {
          cachedList = [];
        }
      }
      return cachedList;
    },
    () => [],
  );
}

let cachedRaw = "";
let cachedList: Device[] = [];

export function getDevices(): Device[] {
  return read();
}

export function addDevice(d: Omit<Device, "id" | "pairedAt"> & { id?: string }): Device {
  const list = read();
  const id =
    d.id ??
    `S-${String(list.length + 1).padStart(2, "0")}`;
  const dev: Device = {
    id,
    nombre: d.nombre,
    lote: d.lote,
    profundidad: d.profundidad,
    x: d.x,
    y: d.y,
    pairedAt: new Date().toISOString(),
  };
  write([...list, dev]);
  return dev;
}

export function removeDevice(id: string) {
  write(read().filter((d) => d.id !== id));
}

export function updateDevice(id: string, patch: Partial<Device>) {
  write(read().map((d) => (d.id === id ? { ...d, ...patch } : d)));
}

export const lotesSugeridos = ["Lote Norte", "Lote Sur", "Lote Este", "Lote Oeste"];