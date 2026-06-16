import { severidadStyle, type Sensor } from "@/lib/sensorData";

interface ParcelMapProps {
  sensores: Sensor[];
  selectedId?: string | null;
  onSelect?: (s: Sensor) => void;
}

export default function ParcelMap({ sensores, selectedId, onSelect }: ParcelMapProps) {
  return (
    <div className="relative w-full aspect-[16/10] rounded-2xl overflow-hidden border border-emerald-200 bg-gradient-to-br from-emerald-50 via-lime-50 to-amber-50">
      {/* Surcos decorativos */}
      <svg
        className="absolute inset-0 w-full h-full opacity-30"
        preserveAspectRatio="none"
        viewBox="0 0 100 60"
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <path
            key={i}
            d={`M0 ${8 + i * 9} Q 50 ${4 + i * 9} 100 ${8 + i * 9}`}
            stroke="#65a30d"
            strokeWidth="0.4"
            fill="none"
          />
        ))}
      </svg>

      {/* Etiquetas de lotes */}
      <span className="absolute top-2 left-2 text-[10px] font-bold text-emerald-700/70 bg-white/60 px-2 py-0.5 rounded-full">
        Lote Norte
      </span>
      <span className="absolute bottom-2 left-2 text-[10px] font-bold text-emerald-700/70 bg-white/60 px-2 py-0.5 rounded-full">
        Lote Sur
      </span>

      {sensores.map((s: Sensor) => {
        const st = severidadStyle[s.severidad];
        const selected = selectedId === s.id;
        return (
          <button
            key={s.id}
            onClick={() => onSelect?.(s)}
            style={{ left: `${s.x}%`, top: `${s.y}%` }}
            className={`absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1 group focus:outline-none`}
          >
            <span
              className={`relative flex h-5 w-5 ${
                s.severidad === "critico" ? "" : ""
              }`}
            >
              {s.severidad === "critico" && (
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${st.dot} opacity-60`} />
              )}
              <span
                className={`relative inline-flex rounded-full h-5 w-5 ${st.dot} ring-2 ring-white shadow-md ${
                  selected ? "scale-125 ring-4 ring-blue-400" : ""
                } transition-transform`}
              />
            </span>
            <span className="text-[9px] font-bold text-gray-700 bg-white/80 px-1.5 rounded">
              {s.nombre.replace("Sensor ", "")}
            </span>
          </button>
        );
      })}
    </div>
  );
}