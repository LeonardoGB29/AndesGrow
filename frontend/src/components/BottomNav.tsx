import { LayoutDashboard, History, Settings } from "lucide-react";

type TabId = "dash" | "hist" | "conf";

interface BottomNavProps {
  active: TabId;
  setActive: (id: TabId) => void;
}

export default function BottomNav({ active, setActive }: BottomNavProps) {
  const tabs: { id: TabId; icon: React.ReactNode; label: string }[] = [
    { id: "dash", icon: <LayoutDashboard />, label: "Estado" },
    { id: "hist", icon: <History />, label: "Historial" },
    { id: "conf", icon: <Settings />, label: "Config" },
  ];

  return (
    <nav className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around py-3 pb-6">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActive(tab.id)}
          className={`flex flex-col items-center ${
            active === tab.id ? "text-blue-600" : "text-gray-400"
          }`}
        >
          {tab.icon}
          <span className="text-xs mt-1">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}