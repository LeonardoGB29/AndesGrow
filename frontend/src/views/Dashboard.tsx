import { useState } from "react";
import {
  Thermometer,
  Droplets,
  AlertTriangle,
  CheckCircle2,
  MapPin,
  ChevronDown,
  ChevronUp,
  Play,
  Sparkles,
} from "lucide-react";
import {
  useAndesGrow,
  getResumen,
  severidadStyle,
  type Sensor,
} from "@/lib/sensorData";
import SensorChart from "@/components/SensorChart";
import HumidityChart from "@/components/HumidityChart";
import ParcelMap from "@/components/ParcelMap";

export default function Dashboard() {
  const { sensores, reading } = useAndesGrow();
  const resumen = getResumen(sensores, reading);
  const [selected, setSelected] = useState<string | null>(null);

  const heroColor =
    resumen.urgencia === "critico"
      ? "from-red-600 to-rose-500"
      : resumen.urgencia === "bajo"
        ? "from-orange-500 to-amber-500"
        : resumen.urgencia === "atencion"
          ? "from-amber-500 to-yellow-500"
          : "from-emerald-600 to-green-500";

  const urgencyLabel =
    resumen.urgencia === "critico"
      ? "URGENTE"
      : resumen.urgencia === "bajo"
        ? "ACCIÓN PRONTO"
        : resumen.urgencia === "atencion"
          ? "VIGILAR"
          : "TODO BIEN";

  return (
    <div className="p-4 app-content space-y-5">
      <header>
        <p className="text-xs text-gray-500 uppercase tracking-wider">
          Parcela Lote Norte
        </p>
        <h1 className="text-2xl font-bold text-gray-800">{resumen.mensajeEstado}</h1>
      </header>

      {/* HERO: Acción recomendada */}
      <section
        className={`relative overflow-hidden bg-gradient-to-br ${heroColor} text-white p-5 rounded-3xl shadow-xl`}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="bg-white/25 backdrop-blur px-3 py-1 rounded-full text-[11px] font-bold tracking-wider">
            {urgencyLabel}
          </span>
          {resumen.necesitaRiego ? (
            <AlertTriangle size={22} />
          ) : (
            <CheckCircle2 size={22} />
          )}
        </div>

        <p className="text-sm opacity-90 mb-1">Acción recomendada</p>
        <h2 className="text-3xl font-extrabold leading-tight mb-2">
          {resumen.necesitaRiego
            ? resumen.minutosRiego != null
              ? `Regar ${resumen.minutosRiego} min`
              : "Iniciar riego"
            : "No regar"}
        </h2>
        <p className="text-sm opacity-95 mb-4">
          {resumen.mensajeModelo ??
            (resumen.necesitaRiego
              ? `${resumen.secos} de ${resumen.total} zonas requieren riego (${resumen.pctSeco}% de la parcela).`
              : "Todas las zonas presentan humedad adecuada.")}
        </p>

        {resumen.necesitaRiego && resumen.zonasCriticas.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {resumen.zonasCriticas.map((z) => (
              <span
                key={z}
                className="bg-white/20 backdrop-blur px-2 py-0.5 rounded-full text-xs font-semibold"
              >
                {z}
              </span>
            ))}
          </div>
        )}

        <button
          className="w-full bg-white text-gray-900 font-bold py-3 rounded-2xl flex items-center justify-center gap-2 active:scale-[0.98] transition shadow-lg"
        >
          <Play size={18} fill="currentColor" />
          {resumen.necesitaRiego
            ? resumen.minutosRiego != null
              ? `Activar riego (${resumen.minutosRiego} min)`
              : "Activar riego ahora"
            : "Sin acción"}
        </button>

        <p className="text-[10px] opacity-80 mt-3 flex items-center gap-1">
          <Sparkles size={10} />
          {resumen.fuente === "modelo"
            ? "Decisión calculada por el modelo (Random Forest)"
            : "Sin conexión al backend · estimación local"}
        </p>
      </section>

      {/* Resumen ejecutivo en texto descriptivo */}
      <section className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
          <Sparkles size={12} /> Resumen ejecutivo
        </h3>
        <ul className="space-y-2 text-sm text-gray-700">
          <li className="flex items-start gap-2">
            <span className={`mt-1.5 h-2 w-2 rounded-full ${severidadStyle[resumen.urgencia].dot}`} />
            <span>
              <strong>{resumen.secos}</strong>{" "}
              {resumen.secos === 1 ? "zona requiere" : "zonas requieren"} riego
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1.5 h-2 w-2 rounded-full bg-emerald-500" />
            <span>
              <strong>{resumen.humedos}</strong>{" "}
              {resumen.humedos === 1 ? "zona se encuentra" : "zonas se encuentran"} en estado óptimo
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1.5 h-2 w-2 rounded-full bg-blue-500" />
            <span>
              <strong>{resumen.pctSeco}%</strong> de la parcela presenta baja humedad
            </span>
          </li>
          <li className="flex items-start gap-2">
            <Thermometer size={14} className="mt-0.5 text-red-500 shrink-0" />
            <span>
              Temperatura promedio <strong>{resumen.tempProm} °C</strong>
            </span>
          </li>
        </ul>
      </section>

      {/* Mapa de parcela */}
      <section className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
            <MapPin size={14} /> Mapa de la parcela
          </h3>
          <div className="flex gap-2 text-[10px]">
            <Legend color="bg-emerald-500" label="Óptimo" />
            <Legend color="bg-orange-500" label="Bajo" />
            <Legend color="bg-red-500" label="Crítico" />
          </div>
        </div>
        <ParcelMap
          sensores={sensores}
          selectedId={selected}
          onSelect={(s) => setSelected(selected === s.id ? null : s.id)}
        />
        <p className="text-[11px] text-gray-400 mt-2 text-center">
          Toca un sensor para ver su detalle abajo
        </p>
      </section>

      {/* Tendencia humedad simplificada */}
      <section className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
            <Droplets size={14} className="text-blue-500" /> Humedad últimas 24h
          </h3>
          <span className="text-[11px] text-gray-400">% húmedo</span>
        </div>
        <HumidityChart sensores={sensores} />
      </section>

      {/* Lista compacta de sensores */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-gray-700">Sensores ({resumen.total})</h3>
          <span className="text-xs text-gray-400">tiempo real</span>
        </div>
        <div className="space-y-2">
          {sensores.map((s: Sensor) => (
            <SensorRow
              key={s.id}
              sensor={s}
              open={selected === s.id}
              onToggle={() => setSelected(selected === s.id ? null : s.id)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1 text-gray-600">
      <span className={`h-2 w-2 rounded-full ${color}`} /> {label}
    </span>
  );
}

function SensorRow({
  sensor,
  open,
  onToggle,
}: {
  sensor: Sensor;
  open: boolean;
  onToggle: () => void;
}) {
  const st = severidadStyle[sensor.severidad];
  return (
    <div
      className={`bg-white rounded-2xl border shadow-sm transition ${
        open ? "border-blue-300 ring-2 ring-blue-100" : "border-gray-100"
      }`}
    >
      <button
        onClick={onToggle}
        className="w-full p-3 flex items-center gap-3 text-left"
      >
        <span className={`h-3 w-3 rounded-full ${st.dot} shrink-0`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-bold text-gray-800 text-sm truncate">{sensor.nombre}</p>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${st.bg} ${st.text}`}
            >
              {st.label}
            </span>
          </div>
          <p className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
            <MapPin size={10} /> {sensor.ubicacion}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-gray-800">
            {sensor.temperatura_c.toFixed(1)}°
          </p>
          <p className="text-[10px] text-gray-400">{sensor.actualizado}</p>
        </div>
        {open ? (
          <ChevronUp size={16} className="text-gray-400" />
        ) : (
          <ChevronDown size={16} className="text-gray-400" />
        )}
      </button>

      {open && (
        <div className="px-4 pb-4 pt-2 border-t border-gray-100 space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <Mini label="Temperatura" value={`${sensor.temperatura_c.toFixed(2)}°C`} />
            <Mini label="Estado" value={sensor.humedad_estado} />
            <Mini label="Digital" value={String(sensor.humedad_digital)} />
          </div>
          <SensorChart data={sensor.serie} />
          <p className="text-[10px] text-gray-400">ID {sensor.id}</p>
        </div>
      )}
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded-xl p-2">
      <p className="text-[10px] text-gray-500 mb-0.5">{label}</p>
      <p className="text-sm font-bold text-gray-800 capitalize truncate">{value}</p>
    </div>
  );
}