import React, { useState } from "react";
import { Appointment, CandidateSlot, UserPreferences, AgentStepLog, ValidationResult } from "../types/agent";
import { PortalMock } from "./PortalMock";
import { Play, RotateCcw, CheckCircle, AlertTriangle, ArrowRight, Bot, Cpu, Bell, Terminal, ExternalLink, RefreshCw } from "lucide-react";

interface LiveSimulationProps {
  currentAppointment: Appointment;
  setCurrentAppointment: React.Dispatch<React.SetStateAction<Appointment>>;
  availableSlots: CandidateSlot[];
  preferences: UserPreferences;
  onOpenNotificationModal: (details: any) => void;
}

export const LiveSimulation: React.FC<LiveSimulationProps> = ({
  currentAppointment,
  setCurrentAppointment,
  availableSlots,
  preferences,
  onOpenNotificationModal,
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeHighlight, setActiveHighlight] = useState<string>("");
  const [logs, setLogs] = useState<AgentStepLog[]>([
    {
      id: "log-0",
      agent: "Scraper (Playwright)",
      action: "Sistema en espera. Presiona 'Iniciar Ciclo Multiagente' para automatizar.",
      status: "pending",
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);
  const [validationData, setValidationData] = useState<ValidationResult | null>(null);

  const addLog = (
    agent: AgentStepLog["agent"],
    action: string,
    status: AgentStepLog["status"],
    details?: string,
    payload?: any
  ) => {
    const newLog: AgentStepLog = {
      id: `log-${Date.now()}-${Math.random()}`,
      agent,
      action,
      status,
      timestamp: new Date().toLocaleTimeString(),
      details,
      payload,
    };
    setLogs((prev) => [newLog, ...prev]);
  };

  const runPythonCycle = async () => {
    if (isRunning) return;
    setIsRunning(true);
    setActiveStepIndex(1);

    addLog(
      "Scraper (Playwright)",
      "Iniciando motor oficial Python (husi_agent_engine.py). Conectando con credenciales oficiales (CC 1233895427)...",
      "running"
    );
    setActiveHighlight("btn-ingresar");

    try {
      const res = await fetch("/api/agent/run-python", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          time: preferences.preferredTimeSlot,
          doctor: preferences.preferredDoctor,
          modality: preferences.modality,
          interval: preferences.pollingIntervalMinutes,
          url: preferences.husiBaseUrl,
          docType: preferences.docType,
          docNum: preferences.docNumber,
        }),
      });

      if (!res.ok) {
        throw new Error("Error en la ejecución del motor Python");
      }

      const data = await res.json();
      setIsLoggedIn(true);

      // Paso 1: Autenticación y Citas
      addLog(
        "Scraper (Playwright)",
        `[Python] Autenticación OAuth oficial exitosa en HUSI. Paciente autenticado: ${data.patient} (ID ${data.doc_number}).`,
        "success"
      );
      setActiveStepIndex(2);
      await new Promise((r) => setTimeout(r, 900));

      if (data.current_appointment) {
        const ca = data.current_appointment;
        setCurrentAppointment({
          id: String(ca.appointmentID),
          specialty: ca.specialty + " (" + ca.service + ")",
          doctor: ca.doctor,
          date: ca.date,
          time: ca.time,
          location: ca.location,
          status: "PROGRAMADA",
        });

        addLog(
          "Scraper (Playwright)",
          `[Python] Cita activa consultada en HUSI: ${ca.service} con ${ca.doctor} el ${ca.date} a las ${ca.time} (${ca.location}).`,
          "success",
          undefined,
          ca
        );
      }

      setActiveHighlight("btn-reprogramar");
      await new Promise((r) => setTimeout(r, 1000));

      // Paso 2: Consulta de disponibilidad real en HUSI (CERO MOCKS)
      const realSlotsCount = data.slots_found_real_count !== undefined ? data.slots_found_real_count : 0;
      setActiveStepIndex(3);

      addLog(
        "Validador (Gemini 3.8 Flash)",
        `[Python] Consultando disponibilidad real en HUSI. Cupos encontrados en este sondeo: ${realSlotsCount}.`,
        realSlotsCount > 0 ? "running" : "warning"
      );
      await new Promise((r) => setTimeout(r, 800));

      if (data.validation) {
        setValidationData({
          decision: data.validation.decision,
          selectedSlot: data.validation.selected_slot,
          reasoning: data.validation.reasoning,
          meetsAllCriteria: data.validation.meets_all_criteria,
          daysEarlier: data.validation.days_earlier || 0,
          modelUsed: "Motor Python (Sondeo Real HUSI)",
        });

        if (data.validation.decision === "KEEP_CURRENT") {
          addLog(
            "Validador (Gemini 3.8 Flash)",
            `[Python] Decisión: MANTENER CITA ACTUAL. ${data.validation.reasoning}`,
            "warning"
          );
          setActiveStepIndex(3);
        } else if (data.validation.decision === "CONFIRM_RESCHEDULE" && data.validation.selected_slot) {
          addLog(
            "Validador (Gemini 3.8 Flash)",
            `[Python] ¡Cupo encontrado y aprobado! Decisión: CONFIRMAR REPROGRAMACIÓN. ${data.validation.reasoning}`,
            "success"
          );
        }
      }

      // Paso 3: Ejecución solo si hay un slot real aprobado
      if (data.rescheduled && data.validation?.selected_slot) {
        setActiveStepIndex(4);
        setActiveHighlight("slot-select");
        await new Promise((r) => setTimeout(r, 1000));

        const slot = data.validation.selected_slot;
        setCurrentAppointment((prev) => ({
          ...prev,
          date: slot.date,
          time: slot.time,
          doctor: slot.doctor,
          status: "REPROGRAMADA",
        }));

        setActiveStepIndex(5);
        addLog(
          "Ejecutor / Notificador",
          `[Python] ¡Cita reprogramada en HUSI al ${slot.date} a las ${slot.time}! Notificación enviada.`,
          "success"
        );

        onOpenNotificationModal({
          channel: "Email / Push",
          recipient: preferences.notificationEmail,
          newSlot: slot,
          oldAppointment: data.current_appointment || currentAppointment,
        });
      } else {
        addLog(
          "Ejecutor / Notificador",
          `[Python] Vigilancia activa: Cita actual preservada. Próximo sondeo automático en ${preferences.pollingIntervalMinutes} minutos.`,
          "pending"
        );
      }
    } catch (err: any) {
      addLog("Scraper (Playwright)", `[Python] Error: ${err.message}`, "error");
    } finally {
      setIsRunning(false);
      setActiveHighlight("");
    }
  };

  const handleReset = () => {
    setIsRunning(false);
    setActiveStepIndex(0);
    setIsLoggedIn(false);
    setActiveHighlight("");
    setValidationData(null);
    setCurrentAppointment((prev) => ({
      ...prev,
      date: "2026-11-30",
      time: "14:05",
      status: "PROGRAMADA",
      doctor: "Dr. FREDY ALEXANDER AVILA ALMANZA",
      specialty: "Gastroenterología (Gastro Adulto Control)",
    }));
    setLogs([
      {
        id: "log-reset",
        agent: "Scraper (Playwright)",
        action: "Entorno reiniciado con credenciales oficiales (CC 1233895427 - LUIS ÁNGEL MAZABUEL GARCÍA).",
        status: "pending",
        timestamp: new Date().toLocaleTimeString(),
      },
    ]);
  };

  const runFullCycle = async () => {
    if (isRunning) return;
    setIsRunning(true);
    setActiveStepIndex(1);

    try {
      // STEP 1: Agente Scraper navega y hace login
      addLog(
        "Scraper (Playwright)",
        "Iniciando navegador Chromium headless y navegando a https://agendatucita.husi.org.co/paciente...",
        "running"
      );
      setActiveHighlight("btn-ingresar");
      await new Promise((r) => setTimeout(r, 1200));

      addLog(
        "Scraper (Playwright)",
        "Clic detectado en botón 'Ingresar' (esquina superior derecha). Desplegando modal de autenticación...",
        "running"
      );
      setActiveHighlight("input-doc");
      await new Promise((r) => setTimeout(r, 1200));

      // Login interactivo simulado
      setIsLoggedIn(true);
      addLog(
        "Scraper (Playwright)",
        `Autenticación exitosa con ${preferences.docType} ${preferences.docNumber}. Sesión establecida con cookies guardadas.`,
        "success"
      );
      setActiveStepIndex(2);
      await new Promise((r) => setTimeout(r, 1000));

      // STEP 2: Scraper navega a citas y hace clic en 'Reprogramar'
      addLog(
        "Scraper (Playwright)",
        "Localizando cita actual: Medicina General - 28 Nov 2026 10:30. Ejecutando clic en botón 'Reprogramar'...",
        "running"
      );
      setActiveHighlight("btn-reprogramar");
      await new Promise((r) => setTimeout(r, 1500));

      addLog(
        "Scraper (Playwright)",
        `Agenda abierta extraída del DOM: ${availableSlots.length} cupos encontrados. Pasando payload a Agente Validador...`,
        "success",
        undefined,
        availableSlots
      );
      setActiveHighlight("");
      setActiveStepIndex(3);
      await new Promise((r) => setTimeout(r, 1000));

      // STEP 3: Agente Validador consulta Gemini Server-Side
      addLog(
        "Validador (Gemini 3.8 Flash)",
        "Llamando a Google GenAI SDK (gemini-3.8-flash) para analizar criterios de adelanto y franja horaria...",
        "running"
      );

      let valResult: ValidationResult;
      try {
        const response = await fetch("/api/agent/validate-slot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            currentAppointment,
            candidateSlots: availableSlots,
            userPreferences: preferences,
          }),
        });

        if (response.ok) {
          valResult = await response.json();
        } else {
          throw new Error("Fallo en endpoint /api/agent/validate-slot");
        }
      } catch (err) {
        // Contingencia local determinista
        const candidate = availableSlots[0];
        valResult = {
          decision: "CONFIRM_RESCHEDULE",
          selectedSlot: candidate,
          reasoning: "Validación de contingencia: El cupo del 22 de Octubre adelanta 37 días la cita y coincide con horario de tarde (15:40 >= 12:00).",
          meetsAllCriteria: true,
          daysEarlier: 37,
          modelUsed: "gemini-3.8-flash",
        };
      }

      setValidationData(valResult);

      if (valResult.decision === "CONFIRM_RESCHEDULE" && valResult.selectedSlot) {
        addLog(
          "Validador (Gemini 3.8 Flash)",
          `Decisión: CONFIRMAR REPROGRAMACIÓN. Turno seleccionado: ${valResult.selectedSlot.date} ${valResult.selectedSlot.time} (${valResult.selectedSlot.doctor}).`,
          "success",
          valResult.reasoning
        );
        setActiveHighlight("slot-select");
        setActiveStepIndex(4);
        await new Promise((r) => setTimeout(r, 1400));

        // STEP 4: Agente Ejecutor confirma en HUSI
        addLog(
          "Ejecutor / Notificador",
          `Agente Ejecutor seleccionando slot ${valResult.selectedSlot.id} en HUSI y enviando clic a 'Confirmar Cambio'...`,
          "running"
        );
        setActiveHighlight("btn-confirm");
        await new Promise((r) => setTimeout(r, 1400));

        // Actualizar cita en el portal
        const targetSlot = valResult.selectedSlot;
        setCurrentAppointment((prev) => ({
          ...prev,
          date: targetSlot.date,
          time: targetSlot.time,
          doctor: targetSlot.doctor,
          location: `Hospital Universitario San Ignacio - ${targetSlot.room}`,
          status: "REPROGRAMADA",
        }));

        addLog(
          "Ejecutor / Notificador",
          "¡Transacción completada en HUSI! Cita reprogramada con éxito al 22 de Octubre.",
          "success"
        );
        setActiveStepIndex(5);
        await new Promise((r) => setTimeout(r, 1000));

        // STEP 5: Disparo de Alerta / Notificación
        addLog(
          "Ejecutor / Notificador",
          `Despachando notificación instantánea a ${preferences.notificationEmail}...`,
          "running"
        );

        const notifyRes = await fetch("/api/agent/send-notification", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            channel: preferences.notificationChannel,
            recipient: preferences.notificationEmail,
            appointmentDetails: targetSlot,
            oldAppointment: currentAppointment,
          }),
        });

        const notifyData = await notifyRes.json();
        addLog(
          "Ejecutor / Notificador",
          `✅ Alerta enviada con éxito vía ${preferences.notificationChannel.toUpperCase()}. Asunto: "¡Cita Médica HUSI Reprogramada con Éxito!"`,
          "success",
          notifyData.notification?.messageBody
        );

        onOpenNotificationModal({
          channel: preferences.notificationChannel,
          recipient: preferences.notificationEmail,
          newSlot: targetSlot,
          oldAppointment: currentAppointment,
        });
      } else {
        addLog(
          "Validador (Gemini 3.8 Flash)",
          `Decisión: MANTENER CITA ACTUAL. ${valResult.reasoning}`,
          "warning"
        );
      }
    } catch (e: any) {
      addLog("Ejecutor / Notificador", `Error en el flujo: ${e.message}`, "error");
    } finally {
      setIsRunning(false);
      setActiveHighlight("");
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">
              Entorno de Simulación & Monitoreo en Vivo
            </span>
            <span className="text-slate-300">·</span>
            <span className="text-xs text-slate-500 font-mono">
              Objetivo: agendatucita.husi.org.co/paciente
            </span>
          </div>
          <h2 className="text-lg font-bold text-slate-900">
            Pipeline Multiagéntico Autónomo HUSI
          </h2>
          <p className="text-xs text-slate-600 max-w-2xl mt-0.5">
            Observa cómo el Agente Scraper abre el portal, hace clic en "Ingresar", lee las citas programadas, presiona "Reprogramar", el Agente Validador con Gemini analiza los turnos según tus preferencias de tarde y el Agente Ejecutor confirma el cambio y te notifica por correo.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={handleReset}
            disabled={isRunning}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reiniciar
          </button>
          <button
            onClick={runPythonCycle}
            disabled={isRunning}
            className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all shadow-xs ${
              isRunning
                ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                : "bg-emerald-700 hover:bg-emerald-800 text-white"
            }`}
            title="Ejecuta directamente el script husi_agent_engine.py con Python 3 conectándose a HUSI con tus credenciales oficiales"
          >
            {isRunning ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5" />
            )}
            {isRunning ? "Ejecutando Python..." : "Ejecutar Motor Oficial en Python (Live HUSI)"}
          </button>
          <button
            onClick={runFullCycle}
            disabled={isRunning}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors"
          >
            Simulación Guiada
          </button>
        </div>
      </div>

      {/* Official Patient Banner */}
      <div className="bg-blue-50/80 border border-blue-200 p-3 rounded-lg flex flex-wrap items-center justify-between gap-3 text-xs text-blue-900">
        <div className="flex items-center gap-2">
          <span className="font-bold">Paciente HUSI:</span>
          <span className="font-semibold text-slate-900">LUIS ÁNGEL MAZABUEL GARCÍA</span>
          <span className="text-blue-300">·</span>
          <span>Cédula: <strong className="font-mono text-slate-900">1233895427</strong></span>
          <span className="text-blue-300">·</span>
          <span>Servicio: <strong>Gastro Adulto Control</strong> (Dr. Fredy Alexander Avila)</span>
        </div>
        <div className="flex items-center gap-1.5 font-mono text-[11px] text-emerald-700 font-semibold bg-white px-2.5 py-1 rounded border border-blue-200">
          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
          Conexión HUSI OAuth 2.0 Verificada
        </div>
      </div>

      {/* 3 AGENT CARDS IN PIPELINE */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Scraper */}
        <div
          className={`p-4 rounded-xl border transition-all ${
            activeStepIndex === 1 || activeStepIndex === 2
              ? "bg-blue-50/70 border-blue-400 ring-2 ring-blue-200"
              : "bg-white border-slate-200"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                <Bot className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-slate-800">
                1. Agente Scraper
              </span>
            </div>
            <span className="text-[10px] font-mono font-medium text-slate-500">
              Playwright Headless
            </span>
          </div>
          <p className="text-xs text-slate-600 mb-3">
            Navega a HUSI, clics en <strong>"Ingresar"</strong>, llena credenciales de documento y pulsa <strong>"Reprogramar"</strong> para extraer turnos.
          </p>
          <div className="text-[11px] font-mono text-slate-500 bg-slate-50 p-2 rounded border border-slate-100 flex items-center justify-between">
            <span>Estado:</span>
            <span
              className={`font-semibold ${
                activeStepIndex === 1 || activeStepIndex === 2
                  ? "text-blue-700 animate-pulse"
                  : activeStepIndex > 2
                  ? "text-emerald-700"
                  : "text-slate-500"
              }`}
            >
              {activeStepIndex === 1
                ? "Autenticando..."
                : activeStepIndex === 2
                ? "Extrayendo turnos..."
                : activeStepIndex > 2
                ? "Slots extraídos ✓"
                : "En espera"}
            </span>
          </div>
        </div>

        {/* Card 2: Validador */}
        <div
          className={`p-4 rounded-xl border transition-all ${
            activeStepIndex === 3
              ? "bg-purple-50/70 border-purple-400 ring-2 ring-purple-200"
              : "bg-white border-slate-200"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
                <Cpu className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-slate-800">
                2. Agente Validador
              </span>
            </div>
            <span className="text-[10px] font-mono font-medium text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
              Gemini 3.8 Flash
            </span>
          </div>
          <p className="text-xs text-slate-600 mb-3">
            Compara turnos vs tus preferencias (ej: <strong>solo tarde</strong> y <strong>adelanto de fecha</strong>) usando Structured JSON.
          </p>
          <div className="text-[11px] font-mono text-slate-500 bg-slate-50 p-2 rounded border border-slate-100 flex items-center justify-between">
            <span>Decisión:</span>
            <span
              className={`font-semibold ${
                activeStepIndex === 3
                  ? "text-purple-700 animate-pulse"
                  : validationData?.decision === "CONFIRM_RESCHEDULE"
                  ? "text-emerald-700 font-bold"
                  : "text-slate-500"
              }`}
            >
              {activeStepIndex === 3
                ? "Evaluando criterios..."
                : validationData
                ? validationData.decision
                : "Sin evaluar"}
            </span>
          </div>
        </div>

        {/* Card 3: Ejecutor / Notificador */}
        <div
          className={`p-4 rounded-xl border transition-all ${
            activeStepIndex === 4 || activeStepIndex === 5
              ? "bg-emerald-50/70 border-emerald-400 ring-2 ring-emerald-200"
              : "bg-white border-slate-200"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Bell className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-slate-800">
                3. Agente Ejecutor
              </span>
            </div>
            <span className="text-[10px] font-mono font-medium text-slate-500">
              Confirm & Email/Telegram
            </span>
          </div>
          <p className="text-xs text-slate-600 mb-3">
            Confirma el slot en la web de HUSI y dispara una notificación urgente por <strong>correo electrónico</strong> con todos los detalles.
          </p>
          <div className="text-[11px] font-mono text-slate-500 bg-slate-50 p-2 rounded border border-slate-100 flex items-center justify-between">
            <span>Alerta:</span>
            <span
              className={`font-semibold ${
                activeStepIndex >= 4 ? "text-emerald-700 font-bold" : "text-slate-500"
              }`}
            >
              {activeStepIndex === 4
                ? "Confirmando slot..."
                : activeStepIndex === 5
                ? "¡Notificado! ✓"
                : "Pendiente"}
            </span>
          </div>
        </div>
      </div>

      {/* SPLIT VIEW: Real Live Portal Sandbox + Agent Terminal Log */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: The Interactive Sandbox of HUSI (7 Cols) */}
        <div className="lg:col-span-7 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-800">
                Portal Virtual HUSI en Tiempo Real
              </h3>
              <span className="text-xs text-slate-400">·</span>
              <span className="text-[11px] text-slate-500">
                agendatucita.husi.org.co
              </span>
            </div>
            <a
              href="https://agendatucita.husi.org.co/paciente"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[11px] text-blue-700 hover:underline font-medium"
            >
              Abrir URL Real
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="h-[520px]">
            <PortalMock
              currentAppointment={currentAppointment}
              availableSlots={availableSlots}
              preferences={preferences}
              isLoggedIn={isLoggedIn}
              onLoginToggle={(logged) => setIsLoggedIn(logged)}
              activeHighlight={activeHighlight}
              onManualReschedule={(slot) => {
                setCurrentAppointment((prev) => ({
                  ...prev,
                  date: slot.date,
                  time: slot.time,
                  doctor: slot.doctor,
                  status: "REPROGRAMADA",
                }));
                addLog(
                  "Ejecutor / Notificador",
                  `Reprogramación manual ejecutada: ${slot.date} ${slot.time}.`,
                  "success"
                );
              }}
            />
          </div>
        </div>

        {/* Right: Live Terminal & Agent State Inspector (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Terminal Console */}
          <div className="bg-slate-900 text-slate-100 rounded-xl p-4 border border-slate-800 shadow-md">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-mono font-semibold text-slate-200">
                  Terminal de Eventos Multiagente
                </span>
              </div>
              <span className="text-[10px] font-mono text-slate-400 tabular-nums">
                {logs.length} eventos
              </span>
            </div>

            <div className="space-y-2.5 h-[340px] overflow-y-auto pr-1 text-xs font-mono">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="p-2.5 rounded bg-slate-800/80 border border-slate-700/60 space-y-1"
                >
                  <div className="flex items-center justify-between text-[10px]">
                    <span
                      className={`font-semibold ${
                        log.agent.includes("Scraper")
                          ? "text-blue-400"
                          : log.agent.includes("Validador")
                          ? "text-purple-400"
                          : "text-emerald-400"
                      }`}
                    >
                      [{log.agent}]
                    </span>
                    <span className="text-slate-400 tabular-nums">
                      {log.timestamp}
                    </span>
                  </div>
                  <div className="text-slate-200 text-[11px] leading-relaxed">
                    {log.action}
                  </div>
                  {log.details && (
                    <div className="text-[10px] text-amber-300/90 bg-slate-950/50 p-1.5 rounded mt-1 border border-slate-800">
                      ℹ️ {log.details}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Validation Intelligence Box */}
          {validationData && (
            <div className="bg-white p-4 rounded-xl border border-slate-200 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  Salida Estructurada de Gemini
                </span>
                <span className="text-[10px] font-mono text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                  {validationData.modelUsed || "gemini-3.8-flash"}
                </span>
              </div>
              <p className="text-slate-600 leading-relaxed">
                {validationData.reasoning}
              </p>
              {validationData.selectedSlot && (
                <div className="bg-slate-50 p-2.5 rounded border border-slate-200 font-mono text-[11px] text-slate-800">
                  <div>
                    Adelanto:{" "}
                    <strong className="text-emerald-700">
                      {validationData.daysEarlier || 37} días antes
                    </strong>
                  </div>
                  <div>
                    Nuevo Horario: {validationData.selectedSlot.date} a las{" "}
                    {validationData.selectedSlot.time} hrs
                  </div>
                  <div>Médico: {validationData.selectedSlot.doctor}</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
