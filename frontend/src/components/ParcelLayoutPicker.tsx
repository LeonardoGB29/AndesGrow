import { useRef } from "react";

interface Props {
  x: number;
  y: number;
  onChange: (x: number, y: number) => void;
  existing?: { id: string; x: number; y: number; nombre: string }[];
}

/**
 * Plano fijo de la parcela. El usuario toca para colocar el sensor.
 * Mitad superior = Lote Norte, mitad inferior = Lote Sur (referencia visual).
 */
export default function ParcelLayoutPicker({ x, y, onChange, existing = [] }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  function handle(e: React.MouseEvent | React.TouchEvent) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const point =
      "touches" in e ? e.touches[0] : (e as React.MouseEvent);
    const px = ((point.clientX - rect.left) / rect.width) * 100;
    const py = ((point.clientY - rect.top) / rect.height) * 100;
    onChange(
      Math.max(4, Math.min(96, +px.toFixed(1))),
      Math.max(4, Math.min(96, +py.toFixed(1))),
    );
  }

  return (
    <div>
      <div
        ref={ref}
        onClick={handle}
        onTouchStart={handle}
        className="relative w-full aspect-[16/10] rounded-2xl overflow-hidden border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 via-lime-50 to-amber-50 cursor-crosshair select-none"
      >
        <svg
          className="absolute inset-0 w-full h-full opacity-30 pointer-events-none"
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
          <line
            x1="0"
            y1="30"
            x2="100"
            y2="30"
            stroke="#84cc16"
            strokeDasharray="2 2"
            strokeWidth="0.3"
          />
        </svg>

        <span className="absolute top-2 left-2 text-[10px] font-bold text-emerald-700/70 bg-white/70 px-2 py-0.5 rounded-full pointer-events-none">
          Lote Norte
        </span>
        <span className="absolute bottom-2 left-2 text-[10px] font-bold text-emerald-700/70 bg-white/70 px-2 py-0.5 rounded-full pointer-events-none">
          Lote Sur
        </span>

        {existing.map((s) => (
          <span
            key={s.id}
            style={{ left: `${s.x}%`, top: `${s.y}%` }}
            className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          >
            <span className="block h-3 w-3 rounded-full bg-gray-400 ring-2 ring-white shadow" />
            <span className="absolute left-1/2 -translate-x-1/2 mt-1 text-[8px] font-bold text-gray-600 whitespace-nowrap">
              {s.nombre}
            </span>
          </span>
        ))}

        <span
          style={{ left: `${x}%`, top: `${y}%` }}
          className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        >
          <span className="block h-5 w-5 rounded-full bg-blue-600 ring-4 ring-blue-200 shadow-lg animate-pulse" />
        </span>
      </div>
      <p className="text-[11px] text-gray-500 mt-2 text-center">
        Toca el plano para ubicar el sensor
      </p>
    </div>
  );
}