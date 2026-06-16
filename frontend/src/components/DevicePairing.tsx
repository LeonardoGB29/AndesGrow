import { useEffect, useState } from "react";
import {
  Bluetooth,
  Loader2,
  Check,
  Plus,
  X,
  Cpu,
  Ruler,
  MapPin,
} from "lucide-react";
import {
  addDevice,
  getDevices,
  lotesSugeridos,
  type Device,
} from "@/lib/deviceStore";
import ParcelLayoutPicker from "./ParcelLayoutPicker";

type Stage = "scan" | "found" | "form" | "done";

interface Props {
  onClose: () => void;
  onAdded?: (d: Device) => void;
  firstRun?: boolean;
}

export default function DevicePairing({ onClose, onAdded, firstRun }: Props) {
  const [stage, setStage] = useState<Stage>("scan");
  const [detectedId, setDetectedId] = useState("");

  // Formulario
  const existing = getDevices();
  const nextNombre = `Sensor ${String.fromCharCode(65 + existing.length)}`;
  const [nombre, setNombre] = useState(nextNombre);
  const [lote, setLote] = useState(lotesSugeridos[0]);
  const [loteCustom, setLoteCustom] = useState("");
  const [profundidad, setProfundidad] = useState(20);
  const [x, setX] = useState(50);
  const [y, setY] = useState(30);

  // Simulación de escaneo BLE
  useEffect(() => {
    if (stage !== "scan") return;
    const t = setTimeout(() => {
      const id = `AG-${Math.floor(1000 + Math.random() * 9000)}`;
      setDetectedId(id);
      setStage("found");
    }, 1800);
    return () => clearTimeout(t);
  }, [stage]);

  function confirmAdd() {
    const finalLote = lote === "__custom" ? loteCustom.trim() || "Lote" : lote;
    const d = addDevice({
      nombre,
      lote: finalLote,
      profundidad,
      x,
      y,
    });
    setStage("done");
    onAdded?.(d);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center">
      <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-white/95 backdrop-blur border-b border-gray-100 px-5 py-3 flex items-center justify-between z-10">
          <h2 className="font-bold text-gray-800 flex items-center gap-2">
            <Bluetooth size={18} className="text-blue-600" />
            {firstRun ? "Configurar primer dispositivo" : "Conectar dispositivo"}
          </h2>
          {!firstRun && (
            <button onClick={onClose} className="text-gray-400">
              <X size={20} />
            </button>
          )}
        </div>

        <div className="p-5">
          {stage === "scan" && (
            <div className="text-center py-10">
              <div className="relative inline-flex">
                <span className="absolute inset-0 rounded-full bg-blue-400 animate-ping opacity-40" />
                <span className="relative bg-blue-600 text-white rounded-full p-5">
                  <Bluetooth size={32} />
                </span>
              </div>
              <p className="mt-6 font-bold text-gray-800">Buscando sensores…</p>
              <p className="text-sm text-gray-500 mt-1 flex items-center justify-center gap-1">
                <Loader2 size={12} className="animate-spin" />
                Acerca el sensor al teléfono
              </p>
            </div>
          )}

          {stage === "found" && (
            <div className="text-center py-6">
              <div className="inline-flex bg-emerald-100 text-emerald-700 rounded-full p-4">
                <Cpu size={28} />
              </div>
              <p className="mt-4 font-bold text-gray-800">Dispositivo encontrado</p>
              <p className="text-xs text-gray-500 mt-1 font-mono">{detectedId}</p>
              <p className="text-sm text-gray-600 mt-4">
                Sensor de humedad y temperatura compatible.
              </p>
              <div className="grid grid-cols-2 gap-2 mt-6">
                <button
                  onClick={() => setStage("scan")}
                  className="py-3 rounded-2xl bg-gray-100 text-gray-700 font-bold"
                >
                  Buscar otro
                </button>
                <button
                  onClick={() => setStage("form")}
                  className="py-3 rounded-2xl bg-blue-600 text-white font-bold shadow-lg shadow-blue-200"
                >
                  Vincular
                </button>
              </div>
            </div>
          )}

          {stage === "form" && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-600 flex items-center gap-1">
                  <Cpu size={12} /> Nombre del sensor
                </label>
                <input
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="mt-1 w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-600 flex items-center gap-1">
                  <MapPin size={12} /> Lote / zona
                </label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {lotesSugeridos.map((l) => (
                    <button
                      key={l}
                      onClick={() => setLote(l)}
                      className={`p-2 rounded-xl text-sm font-bold border ${
                        lote === l
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-gray-200 bg-white text-gray-700"
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                  <button
                    onClick={() => setLote("__custom")}
                    className={`col-span-2 p-2 rounded-xl text-sm font-bold border ${
                      lote === "__custom"
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-gray-200 bg-white text-gray-700"
                    }`}
                  >
                    + Otro lote
                  </button>
                  {lote === "__custom" && (
                    <input
                      placeholder="Nombre del lote"
                      value={loteCustom}
                      onChange={(e) => setLoteCustom(e.target.value)}
                      className="col-span-2 p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-600 flex items-center gap-1">
                  <Ruler size={12} /> Profundidad (cm)
                </label>
                <div className="grid grid-cols-4 gap-2 mt-1">
                  {[10, 20, 30, 40].map((p) => (
                    <button
                      key={p}
                      onClick={() => setProfundidad(p)}
                      className={`p-2 rounded-xl text-sm font-bold border ${
                        profundidad === p
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-gray-200 bg-white text-gray-700"
                      }`}
                    >
                      {p} cm
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-600">
                  Ubicación en el plano
                </label>
                <div className="mt-1">
                  <ParcelLayoutPicker
                    x={x}
                    y={y}
                    onChange={(nx, ny) => {
                      setX(nx);
                      setY(ny);
                    }}
                    existing={existing}
                  />
                </div>
              </div>

              <button
                onClick={confirmAdd}
                className="w-full bg-blue-600 text-white font-bold py-3 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-blue-200 active:scale-95 transition"
              >
                <Plus size={18} /> Registrar sensor
              </button>
            </div>
          )}

          {stage === "done" && (
            <div className="text-center py-8">
              <div className="inline-flex bg-emerald-100 text-emerald-700 rounded-full p-4">
                <Check size={28} />
              </div>
              <p className="mt-4 font-bold text-gray-800">Sensor registrado</p>
              <p className="text-sm text-gray-500 mt-1">
                Ya puedes ver sus mediciones en el panel.
              </p>
              <div className="grid grid-cols-2 gap-2 mt-6">
                <button
                  onClick={() => {
                    setStage("scan");
                    const e2 = getDevices();
                    setNombre(`Sensor ${String.fromCharCode(65 + e2.length)}`);
                  }}
                  className="py-3 rounded-2xl bg-gray-100 text-gray-700 font-bold"
                >
                  Añadir otro
                </button>
                <button
                  onClick={onClose}
                  className="py-3 rounded-2xl bg-blue-600 text-white font-bold shadow-lg shadow-blue-200"
                >
                  Terminar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}