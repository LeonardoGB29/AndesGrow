import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import Dashboard from "@/views/Dashboard";
import History from "@/views/History";
import Config from "@/views/Config";
import BottomNav from "@/components/BottomNav";
import Onboarding from "@/views/Onboarding";
import { useDevices } from "@/lib/deviceStore";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AndesGrow" },
      { name: "description", content: "Monitoreo de humedad y riego inteligente para cultivos andinos." },
      { property: "og:title", content: "AndesGrow" },
      { property: "og:description", content: "Monitoreo de humedad y riego inteligente para cultivos andinos." },
    ],
  }),
  component: Index,
});

function Index() {
  const [activeTab, setActiveTab] = useState<"dash" | "hist" | "conf">("dash");
  const devices = useDevices();
  const empty = devices.length === 0;

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center">
      <div className="w-full max-w-md bg-gray-50 min-h-screen relative shadow-2xl overflow-hidden flex flex-col">
        <div className="h-10 bg-white flex justify-between px-6 items-end pb-2 text-xs font-bold text-gray-800">
          <span>9:41</span>
          <div className="flex gap-2">
            <span>📶</span>
            <span>🔋</span>
          </div>
        </div>

        <main className="flex-1 overflow-y-auto pb-24 flex flex-col">
          {empty ? (
            <Onboarding />
          ) : (
            <>
              {activeTab === "dash" && <Dashboard />}
              {activeTab === "hist" && <History />}
              {activeTab === "conf" && <Config />}
            </>
          )}
        </main>

        {!empty && <BottomNav active={activeTab} setActive={setActiveTab} />}
      </div>
    </div>
  );
}
