import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import type { SeriePoint } from "@/lib/sensorData";

export default function SensorChart({ data }: { data: SeriePoint[] }) {
  return (
    <div>
      <p className="text-[11px] text-gray-500 mb-1">Humedad (%) últimas horas</p>
      <div className="h-24">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="fecha" tick={{ fontSize: 9, fill: "#94a3b8" }} interval={3} />
            <YAxis
              tick={{ fontSize: 9, fill: "#94a3b8" }}
              width={28}
              domain={[0, 100]}
            />
            <Tooltip
              contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e5e7eb" }}
              formatter={(v: number) => [`${v}%`, "humedad"]}
            />
            <Area
              type="monotone"
              dataKey="humedad"
              stroke="#3b82f6"
              fill="#3b82f6"
              fillOpacity={0.2}
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
