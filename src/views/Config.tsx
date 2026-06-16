import { useState } from "react";
import {
  Settings,
  Save,
  MapPin,
  Droplets,
  Check,
  Sliders,
  Plus,
  Trash2,
  Cpu,
} from "lucide-react";
import { cropProfiles, type CropProfile } from "@/lib/sensorData";
import { useDevices, removeDevice } from "@/lib/deviceStore";
import DevicePairing from "@/components/DevicePairing";

export default function Config() {
  const devices = useDevices();
  const [pairing, setPairing] = useState(false);
  const [selected, setSelected] = useState<CropProfile>(cropProfiles[0]);
  const [manual, setManual] = useState(false);
  const [min, setMin] = useState(selected.minHumedad);
  const [max, setMax] = useState(selected.maxHumedad);

  const pickProfile = (p: CropProfile) => {
    setSelected(p);
    setMin(p.minHumedad);
    setMax(p.maxHumedad);
  };

  return (
    <div className="p-4 app-content space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Settings className="text-gray-600" /> Configuración
        </h1>
        <p className="text-gray-500 text-sm">
          Selecciona tu cultivo y el sistema ajusta los umbrales óptimos
        </p>
      </header>

      {/* Dispositivos registrados */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-bold text-gray-700 flex items-center gap-2">
            <Cpu size={16} /> Dispositivos ({devices.length})
          </h2>
          <button
            onClick={() => setPairing(true)}
            className="text-xs font-bold text-blue-700 bg-blue-50 px-3 py-1.5 rounded-full flex items-center gap-1"
          >
            <Plus size={12} /> Conectar
          </button>
        </div>
        <div className="space-y-2">
          {devices.map((d) => (
            <div
              key={d.id}
              className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3"
            >
              <span className="h-9 w-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Cpu size={16} />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-800 truncate">
                  {d.nombre}
                </p>
                <p className="text-[11px] text-gray-500 flex items-center gap-1">
                  <MapPin size={10} /> {d.lote} · {d.profundidad} cm
                </p>
              </div>
              <button
                onClick={() => {
                  if (confirm(`¿Eliminar ${d.nombre}?`)) removeDevice(d.id);
                }}
                className="text-gray-400 hover:text-red-500 p-2"
                aria-label="Eliminar"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
          <MapPin size={16} /> Nombre de la parcela
        </label>
        <input
          type="text"
          defaultValue="Lote Norte 01"
          className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
        />
      </div>

      {/* Perfiles de cultivo */}
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-2">
          Tipo de cultivo
        </label>
        <p className="text-xs text-gray-500 mb-3">
          El sistema usará rangos recomendados según el cultivo seleccionado.
        </p>
        <div className="grid grid-cols-2 gap-2">
          {cropProfiles.map((p) => {
            const active = selected.id === p.id;
            return (
              <button
                key={p.id}
                onClick={() => pickProfile(p)}
                className={`text-left p-3 rounded-2xl border-2 transition relative ${
                  active
                    ? "border-blue-500 bg-blue-50 shadow"
                    : "border-gray-200 bg-white"
                }`}
              >
                {active && (
                  <span className="absolute top-2 right-2 bg-blue-600 text-white rounded-full p-0.5">
                    <Check size={10} />
                  </span>
                )}
                <div className="text-2xl mb-1">{p.emoji}</div>
                <p className="font-bold text-sm text-gray-800">{p.nombre}</p>
                <p className="text-[10px] text-gray-500 leading-tight mt-0.5">
                  {p.descripcion}
                </p>
                <p className="text-[10px] font-bold text-blue-600 mt-1">
                  {p.minHumedad}–{p.maxHumedad}% humedad
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Umbrales (preview / opcional manual) */}
      <div className="bg-blue-50 p-4 rounded-2xl space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-blue-800 text-sm flex items-center gap-2">
            <Droplets size={16} /> Umbrales de riego
          </h3>
          <button
            onClick={() => setManual((m) => !m)}
            className="text-[11px] font-bold text-blue-700 flex items-center gap-1"
          >
            <Sliders size={11} />
            {manual ? "Usar recomendados" : "Ajuste manual"}
          </button>
        </div>

        {!manual ? (
          <div className="bg-white p-3 rounded-xl">
            <p className="text-xs text-gray-600 mb-1">Recomendado para {selected.nombre}</p>
            <p className="text-lg font-bold text-gray-800">
              {min}% <span className="text-gray-400 font-normal text-sm">a</span> {max}%
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-blue-700 font-bold">Mínimo (%)</label>
              <input
                type="number"
                value={min}
                onChange={(e) => setMin(+e.target.value)}
                className="w-full p-2 mt-1 rounded-lg border-none outline-none bg-white"
              />
            </div>
            <div>
              <label className="text-xs text-blue-700 font-bold">Máximo (%)</label>
              <input
                type="number"
                value={max}
                onChange={(e) => setMax(+e.target.value)}
                className="w-full p-2 mt-1 rounded-lg border-none outline-none bg-white"
              />
            </div>
          </div>
        )}
      </div>

      <button
        type="button"
        className="w-full bg-blue-600 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-blue-200 active:scale-95 transition-transform"
      >
        <Save size={20} /> Guardar cambios
      </button>

      {pairing && <DevicePairing onClose={() => setPairing(false)} />}
    </div>
  );
}