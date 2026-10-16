import React from "react";
import { Play, Square, Bell, RefreshCw } from "lucide-react";

interface HeaderProps {
  activeTab: "dashboard" | "notifications" | "config";
  setActiveTab: (tab: "dashboard" | "notifications" | "config") => void;
  isRunning: boolean;
  onToggleWatcher: () => void;
  isTogglingWatcher: boolean;
  unreadCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  isRunning,
  onToggleWatcher,
  isTogglingWatcher,
  unreadCount,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-8 h-16">
          {/* Zone 1: Brand title, one line */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-blue-700 text-white flex items-center justify-center font-bold text-xs tracking-wider shadow-xs">
              HUSI
            </div>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setActiveTab("dashboard");
              }}
              className="text-base font-bold text-slate-900 tracking-tight whitespace-nowrap"
            >
              Vigilancia de Citas Médicas
            </a>
          </div>

          {/* Zone 2: 3 clean single-line navigation links */}
          <nav className="flex items-center gap-6 text-sm font-medium">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`whitespace-nowrap transition-colors py-1 ${
                activeTab === "dashboard"
                  ? "text-blue-700 border-b-2 border-blue-700 font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Dashboard de Vigilancia
            </button>
            <button
              onClick={() => setActiveTab("notifications")}
              className={`whitespace-nowrap transition-colors py-1 flex items-center gap-1.5 ${
                activeTab === "notifications"
                  ? "text-blue-700 border-b-2 border-blue-700 font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>Notificaciones</span>
              {unreadCount > 0 && (
                <span className="text-[10px] font-bold font-mono text-white bg-amber-600 px-1.5 py-0.2 rounded-full">
                  {unreadCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("config")}
              className={`whitespace-nowrap transition-colors py-1 ${
                activeTab === "config"
                  ? "text-blue-700 border-b-2 border-blue-700 font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Configuración & Criterios
            </button>
          </nav>

          {/* Zone 3: 1 primary action */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={onToggleWatcher}
              disabled={isTogglingWatcher}
              className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-colors whitespace-nowrap shadow-xs ${
                isRunning
                  ? "bg-rose-700 hover:bg-rose-800 text-white"
                  : "bg-emerald-700 hover:bg-emerald-800 text-white"
              }`}
            >
              {isTogglingWatcher ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : isRunning ? (
                <Square className="w-3.5 h-3.5 fill-current" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current" />
              )}
              {isTogglingWatcher
                ? "Procesando..."
                : isRunning
                ? "Detener Vigilancia"
                : "Iniciar Vigilancia"}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
