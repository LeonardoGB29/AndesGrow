import { useState } from "react";
import { Calendar, TrendingUp, TrendingDown } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceArea,
} from "recharts";
import { getHistorico } from "@/lib/sensorData";

type Rango = "24h" | "7d" | "30d";

export default function History() {
  const [rango, setRango] = useState<Rango>("7d");
  const data = getHistorico(rango);

  const prom = +(data.reduce((a, d) => a + d.humedad, 0) / data.length).toFixed(1);
  const min = Math.min(...data.map((d) => d.humedad));
  const max = Math.max(...data.map((d) => d.humedad));
  const tendencia = data[data.length - 1].humedad - data[0].humedad;

  return (
    <div className="p-4 app-content space-y-5">
      <header>
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Calendar className="text-blue-600" /> Historial
        </h1>
        <p className="text-gray-500 text-sm">
          Evolución de la humedad del suelo y comparación con umbrales
        </p>
      </header>

      {/* Filtros de rango */}
      <div className="grid grid-cols-3 gap-2">
        {(["24h", "7d", "30d"] as Rango[]).map((r) => (
          <button
            key={r}
            onClick={() => setRango(r)}
            className={`py-2 rounded-xl text-sm font-bold transition ${
              rango === r
                ? "bg-blue-600 text-white shadow"
                : "bg-white text-gray-600 border border-gray-200"
            }`}
          >
            {r === "24h" ? "24 horas" : r === "7d" ? "7 días" : "30 días"}
          </button>
        ))}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-2">
        <KPI label="Promedio" value={`${prom}%`} />
        <KPI label="Mínimo" value={`${min}%`} tone="orange" />
        <KPI label="Máximo" value={`${max}%`} tone="blue" />
      </div>

      {/* Gráfico de tendencia */}
      <section className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-gray-700">Humedad vs. umbrales</h3>
          <span
            className={`text-xs font-bold flex items-center gap-1 ${
              tendencia >= 0 ? "text-emerald-600" : "text-orange-600"
            }`}
          >
            {tendencia >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {tendencia >= 0 ? "+" : ""}
            {tendencia.toFixed(1)}%
          </span>
        </div>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="okZone" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="fecha" tick={{ fontSize: 10, fill: "#94a3b8" }} />
              <YAxis
                tick={{ fontSize: 10, fill: "#94a3b8" }}
                width={28}
                tickFormatter={(v) => `${v}%`}
                domain={[0, 60]}
              />
              <Tooltip
                contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e5e7eb" }}
                formatter={(v: number) => [`${v}%`, "Humedad"]}
              />
              <ReferenceArea y1={20} y2={45} fill="url(#okZone)" />
              <Line
                type="monotone"
                dataKey="humedad"
                stroke="#3b82f6"
                strokeWidth={2.5}
                dot={{ r: 3, fill: "#3b82f6" }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center justify-center gap-4 mt-2 text-[10px] text-gray-500">
          <span className="flex items-center gap-1">
            <span className="w-3 h-2 rounded bg-emerald-200" /> Rango óptimo (20–45%)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-0.5 bg-blue-500" /> Humedad medida
          </span>
        </div>
      </section>

      {/* Listado de eventos */}
      <section>
        <h3 className="text-sm font-bold text-gray-700 mb-2">Eventos recientes</h3>
        <div className="space-y-2">
          {data
            .slice()
            .reverse()
            .slice(0, 6)
            .map((d, i) => {
              const estado =
                d.humedad < 15
                  ? { label: "Crítico", c: "text-red-600 bg-red-50" }
                  : d.humedad < d.umbralMin
                    ? { label: "Bajo", c: "text-orange-600 bg-orange-50" }
                    : d.humedad > d.umbralMax
                      ? { label: "Alto", c: "text-blue-600 bg-blue-50" }
                      : { label: "Óptimo", c: "text-emerald-600 bg-emerald-50" };
              return (
                <div
                  key={i}
                  className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex justify-between items-center"
                >
                  <div>
                    <p className="text-sm font-bold text-gray-800">{d.fecha}</p>
                    <p className="text-[11px] text-gray-500">
                      Humedad {d.humedad}% · umbral {d.umbralMin}–{d.umbralMax}%
                    </p>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${estado.c}`}
                  >
                    {estado.label}
                  </span>
                </div>
              );
            })}
        </div>
      </section>
    </div>
  );
}

function KPI({
  label,
  value,
  tone = "gray",
}: {
  label: string;
  value: string;
  tone?: "gray" | "orange" | "blue";
}) {
  const c =
    tone === "orange"
      ? "text-orange-600"
      : tone === "blue"
        ? "text-blue-600"
        : "text-gray-800";
  return (
    <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm">
      <p className="text-[10px] text-gray-500 uppercase tracking-wide">{label}</p>
      <p className={`text-xl font-bold ${c}`}>{value}</p>
    </div>
  );
}