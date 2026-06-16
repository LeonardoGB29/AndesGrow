import { useState } from "react";
import { Sprout, Bluetooth, ShieldCheck, WifiOff } from "lucide-react";
import DevicePairing from "@/components/DevicePairing";

export default function Onboarding() {
  const [pairing, setPairing] = useState(false);

  return (
    <div className="p-6 app-content flex flex-col min-h-full">
      <header className="text-center mt-6">
        <div className="inline-flex bg-emerald-100 text-emerald-700 rounded-2xl p-4 mb-4">
          <Sprout size={36} />
        </div>
        <h1 className="text-2xl font-extrabold text-gray-800">
          Bienvenido a AndesGrow
        </h1>
        <p className="text-gray-500 mt-2 text-sm">
          Aún no tienes sensores registrados. Conecta tu primer dispositivo para
          empezar a monitorear tu parcela.
        </p>
      </header>

      <ul className="space-y-3 mt-8">
        <Item icon={<Bluetooth size={18} />} title="Conexión local" text="Vinculamos cada sensor por Bluetooth, sin necesidad de internet." />
        <Item icon={<WifiOff size={18} />} title="Funciona sin red" text="La parcela se dibuja como un plano fijo definido por ti." />
        <Item icon={<ShieldCheck size={18} />} title="Datos solo en tu equipo" text="Tu registro de dispositivos se guarda localmente." />
      </ul>

      <div className="mt-auto pt-8">
        <button
          onClick={() => setPairing(true)}
          className="w-full bg-blue-600 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-blue-200 active:scale-95 transition"
        >
          <Bluetooth size={18} /> Conectar primer sensor
        </button>
        <p className="text-[11px] text-gray-400 text-center mt-2">
          Esto inicia un escaneo de dispositivos cercanos
        </p>
      </div>

      {pairing && (
        <DevicePairing firstRun onClose={() => setPairing(false)} />
      )}
    </div>
  );
}

function Item({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <li className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex gap-3">
      <span className="bg-blue-50 text-blue-600 rounded-xl p-2 shrink-0 h-fit">{icon}</span>
      <div>
        <p className="font-bold text-gray-800 text-sm">{title}</p>
        <p className="text-xs text-gray-500 leading-snug">{text}</p>
      </div>
    </li>
  );
}