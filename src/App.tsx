import React, { useState, useEffect } from "react";
import { Header } from "./components/Header";
import { DashboardView } from "./components/DashboardView";
import { NotificationsView } from "./components/NotificationsView";
import { ConfigPanel } from "./components/ConfigPanel";
import { defaultPreferences } from "./data/sampleSlots";
import { UserPreferences } from "./types/agent";

export default function App() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "notifications" | "config">("dashboard");
  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences);

  // Estado del Watcher y Métricas
  const [status, setStatus] = useState({
    isRunning: false,
    intervalMinutes: 5,
    lastRun: null as string | null,
    nextRun: null as string | null,
    stats: {
      totalProbes: 0,
      successfulReschedules: 0,
      probesWithSlots: 0,
      probesNoSlots: 0,
      unreadNotifications: 0,
    },
  });

  const [executions, setExecutions] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isTogglingWatcher, setIsTogglingWatcher] = useState(false);
  const [isRunningNow, setIsRunningNow] = useState(false);
  
  // Lista oficial de citas programadas en la cuenta HUSI del paciente
  const [trackedAppointments, setTrackedAppointments] = useState<any[]>([]);

  // Cargar datos del backend
  const fetchData = async () => {
    try {
      const [resStatus, resExecs, resNotifs, resConfig] = await Promise.all([
        fetch("/api/agent/status"),
        fetch("/api/agent/executions"),
        fetch("/api/agent/notifications"),
        fetch("/api/agent/config"),
      ]);

      if (resConfig.ok) {
        const cfg = await resConfig.json();
        setPreferences((prev) => ({
          ...prev,
          ...cfg,
        }));
      }

      if (resStatus.ok) {
        const s = await resStatus.json();
        setStatus(s);
        if (s.trackedAppointments && Array.isArray(s.trackedAppointments) && s.trackedAppointments.length > 0) {
          setTrackedAppointments(s.trackedAppointments);
        } else if (s.lastResult?.all_appointments && s.lastResult.all_appointments.length > 0) {
          setTrackedAppointments(s.lastResult.all_appointments);
        }
      }

      if (resExecs.ok) {
        const ex = await resExecs.json();
        setExecutions(ex);
      }

      if (resNotifs.ok) {
        const nt = await resNotifs.json();
        setNotifications(nt);
      }
    } catch (err) {
      console.warn("Error sincronizando con backend:", err);
    }
  };

  useEffect(() => {
    fetchData();
    const timer = setInterval(fetchData, 4000);
    return () => clearInterval(timer);
  }, []);

  const handleToggleWatcher = async () => {
    setIsTogglingWatcher(true);
    try {
      const endpoint = status.isRunning ? "/api/agent/stop" : "/api/agent/start";
      const res = await fetch(endpoint, { method: "POST" });
      if (res.ok) {
        await fetchData();
      }
    } catch (err: any) {
      alert("Error al alternar vigilancia: " + err.message);
    } finally {
      setIsTogglingWatcher(false);
    }
  };

  const handleRunNow = async () => {
    setIsRunningNow(true);
    try {
      const res = await fetch("/api/agent/run-now", { method: "POST" });
      if (res.ok) {
        await fetchData();
      }
    } catch (err: any) {
      alert("Error en sondeo manual: " + err.message);
    } finally {
      setIsRunningNow(false);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const res = await fetch("/api/agent/notifications/mark-read", { method: "POST" });
      if (res.ok) {
        await fetchData();
      }
    } catch (err) {
      console.warn("Error marcando notificaciones:", err);
    }
  };

  const handleSavePreferences = async (updated: UserPreferences) => {
    setPreferences(updated);
    await fetchData();
  };

  const handleSendTestNotification = async (channel: string, email: string) => {
    const res = await fetch("/api/agent/send-notification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        channel,
        recipient: email,
        appointmentDetails: {
          specialty: "Gastroenterología",
          doctor: "Dr. FREDY ALEXANDER AVILA ALMANZA",
          date: "2026-10-24",
          time: "15:40",
          room: "Consultorio 17 Edif Parqueaderos",
          daysEarlier: 37,
        },
        oldAppointment: trackedAppointments[0],
      }),
    });
    if (!res.ok) {
      throw new Error("No se pudo despachar la notificación de prueba");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Bar Navigation */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isRunning={status.isRunning}
        onToggleWatcher={handleToggleWatcher}
        isTogglingWatcher={isTogglingWatcher}
        unreadCount={status.stats.unreadNotifications}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === "dashboard" && (
          <DashboardView
            status={status}
            executions={executions}
            onToggleWatcher={handleToggleWatcher}
            isTogglingWatcher={isTogglingWatcher}
            onRunNow={handleRunNow}
            isRunningNow={isRunningNow}
            currentAppointment={trackedAppointments[0]}
            trackedAppointments={trackedAppointments}
          />
        )}

        {activeTab === "notifications" && (
          <NotificationsView
            notifications={notifications}
            onMarkAllRead={handleMarkAllRead}
            targetEmail={preferences.notificationEmail || "No configurado"}
          />
        )}

        {activeTab === "config" && (
          <ConfigPanel
            preferences={preferences}
            onSavePreferences={handleSavePreferences}
            onSendTestNotification={handleSendTestNotification}
          />
        )}
      </main>

      {/* Footer conforming strictly to zero-pill and quiet metadata rules */}
      <footer className="bg-white border-t border-slate-200 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span>Hospital Universitario San Ignacio (HUSI)</span>
            <span aria-hidden="true">·</span>
            <span>Vigilancia Continua de Citas</span>
            <span aria-hidden="true">·</span>
            <span>agendatucita.husi.org.co</span>
          </div>
          <div className="flex items-center gap-2">
            <span>Motor Python Nativo</span>
            <span aria-hidden="true">·</span>
            <span>Notificación Estricta en Éxito</span>
            <span aria-hidden="true">·</span>
            <span>Sondeo cada {status.intervalMinutes} min</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
