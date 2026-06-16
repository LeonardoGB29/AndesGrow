import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
} from "recharts";
import type { SensorPoint } from "@/lib/sensorData";

export default function SensorChart({ data }: { data: SensorPoint[] }) {
  return (
    <div className="space-y-3">
      <div>
        <p className="text-[11px] text-gray-500 mb-1">Humedad (0 = seco · 1 = húmedo)</p>
        <div className="h-20">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="t" tick={{ fontSize: 9, fill: "#94a3b8" }} interval={3} />
              <YAxis
                tick={{ fontSize: 9, fill: "#94a3b8" }}
                width={28}
                domain={[0, 1]}
                ticks={[0, 1]}
              />
              <Tooltip
                contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e5e7eb" }}
                formatter={(v: number) => (v === 1 ? "húmedo" : "seco")}
              />
              <Area
                type="stepAfter"
                dataKey="humedad_digital"
                stroke="#3b82f6"
                fill="#3b82f6"
                fillOpacity={0.2}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div>
        <p className="text-[11px] text-gray-500 mb-1">Temperatura (°C)</p>
        <div className="h-24">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="t" tick={{ fontSize: 9, fill: "#94a3b8" }} interval={3} />
              <YAxis tick={{ fontSize: 9, fill: "#94a3b8" }} width={28} />
              <Tooltip
                contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e5e7eb" }}
              />
              <Line
                type="monotone"
                dataKey="temperatura_c"
                stroke="#ef4444"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}