import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import { getHumedadSerie, type Sensor } from "@/lib/sensorData";

export default function HumidityChart({ sensores }: { sensores: Sensor[] }) {
  const data = getHumedadSerie(sensores);
  return (
    <div className="h-40">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id="humGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.5} />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#f1f5f9" vertical={false} />
          <XAxis dataKey="t" tick={{ fontSize: 10, fill: "#94a3b8" }} interval={3} />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 10, fill: "#94a3b8" }}
            width={28}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip
            contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e5e7eb" }}
            formatter={(v: number) => [`${v}%`, "Húmedo"]}
          />
          <ReferenceLine y={50} stroke="#10b981" strokeDasharray="3 3" />
          <Area
            type="monotone"
            dataKey="pctHumedo"
            stroke="#3b82f6"
            strokeWidth={2}
            fill="url(#humGrad)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}