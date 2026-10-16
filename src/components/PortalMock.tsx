import React, { useState } from "react";
import { Appointment, CandidateSlot, UserPreferences } from "../types/agent";
import { Calendar, Clock, MapPin, User, LogIn, CheckCircle2, AlertCircle, X, ShieldCheck } from "lucide-react";

interface PortalMockProps {
  currentAppointment: Appointment;
  availableSlots: CandidateSlot[];
  preferences: UserPreferences;
  isLoggedIn: boolean;
  onLoginToggle: (loggedIn: boolean) => void;
  activeHighlight?: string; // e.g., 'btn-ingresar', 'input-doc', 'btn-reprogramar', 'slot-select', 'btn-confirm'
  onManualReschedule?: (slot: CandidateSlot) => void;
}

export const PortalMock: React.FC<PortalMockProps> = ({
  currentAppointment,
  availableSlots,
  preferences,
  isLoggedIn,
  onLoginToggle,
  activeHighlight,
  onManualReschedule,
}) => {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [selectedSlotForConfirm, setSelectedSlotForConfirm] = useState<CandidateSlot | null>(null);
  const [loginForm, setLoginForm] = useState({
    docType: preferences.docType || "CC",
    docNumber: preferences.docNumber || "1020304050",
    password: preferences.password || "••••••••",
  });

  const handleOpenLogin = () => {
    setShowLoginModal(true);
  };

  const handleDoLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setShowLoginModal(false);
    onLoginToggle(true);
  };

  const handleOpenReschedule = () => {
    setShowRescheduleModal(true);
  };

  const handleSelectSlot = (slot: CandidateSlot) => {
    setSelectedSlotForConfirm(slot);
  };

  const handleConfirmChange = () => {
    if (selectedSlotForConfirm && onManualReschedule) {
      onManualReschedule(selectedSlotForConfirm);
    }
    setShowRescheduleModal(false);
    setSelectedSlotForConfirm(null);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs flex flex-col h-full">
      {/* Mock Browser Header & URL bar */}
      <div className="bg-slate-100 border-b border-slate-200 px-4 py-2 flex items-center justify-between text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-slate-300"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-slate-300"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-slate-300"></div>
          </div>
          <span className="font-mono text-slate-400">|</span>
          <span className="inline-flex items-center gap-1 bg-white px-2.5 py-1 rounded border border-slate-200 text-slate-700 font-mono text-[11px] max-w-xs md:max-w-md truncate">
            <span className="text-emerald-600">https://</span>
            agendatucita.husi.org.co/paciente
          </span>
        </div>
        <div className="flex items-center gap-2 text-slate-500 font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
          <span className="hidden sm:inline">Portal Oficial HUSI</span>
        </div>
      </div>

      {/* HUSI Portal Nav */}
      <div className="bg-blue-800 text-white px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded bg-white text-blue-800 font-bold flex items-center justify-center text-sm shadow-xs">
            + HUSI
          </div>
          <div>
            <div className="font-bold text-sm tracking-tight leading-none">
              Hospital Universitario San Ignacio
            </div>
            <div className="text-[11px] text-blue-200">
              Portal Transaccional de Citas y Consulta Externa
            </div>
          </div>
        </div>

        {/* Top Right "Ingresar" button as described by user */}
        <div>
          {isLoggedIn ? (
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <div className="text-xs font-semibold">Paciente Autenticado</div>
                <div className="text-[10px] text-blue-200">
                  {preferences.docType} {preferences.docNumber}
                </div>
              </div>
              <button
                onClick={() => onLoginToggle(false)}
                className="px-3 py-1.5 text-xs font-medium bg-blue-900/60 hover:bg-blue-900 border border-blue-600 rounded transition-colors"
              >
                Cerrar Sesión
              </button>
            </div>
          ) : (
            <button
              id="btn-ingresar"
              onClick={handleOpenLogin}
              className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded transition-all shadow-xs ${
                activeHighlight === "btn-ingresar"
                  ? "ring-4 ring-amber-300 ring-offset-2 ring-offset-blue-800 scale-105"
                  : ""
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              Ingresar
            </button>
          )}
        </div>
      </div>

      {/* Portal Main Content Area */}
      <div className="p-5 flex-1 bg-slate-50 overflow-y-auto">
        {!isLoggedIn ? (
          <div className="py-12 px-4 text-center max-w-md mx-auto">
            <div className="w-14 h-14 mx-auto rounded-full bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center mb-4">
              <User className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Bienvenido al Portal de Citas HUSI
            </h3>
            <p className="text-xs text-slate-600 mb-6 leading-relaxed">
              Para consultar sus citas programadas o solicitar reprogramación,
              haga clic en el botón <strong className="text-slate-800 font-semibold">"Ingresar"</strong> en la esquina superior derecha. El agente autónomo automatizará este paso con sus credenciales.
            </p>
            <button
              onClick={handleOpenLogin}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold bg-blue-700 hover:bg-blue-800 text-white rounded-lg shadow-xs transition-colors"
            >
              <LogIn className="w-4 h-4" />
              Abrir Formulario de Ingreso
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Patient Header Card */}
            <div className="bg-white p-4 rounded-lg border border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-[11px] font-semibold text-blue-700 uppercase tracking-wide">
                  Módulo de Paciente
                </span>
                <h4 className="text-sm font-bold text-slate-900">
                  Citas Médicas Programadas
                </h4>
                <div className="text-xs text-slate-500">
                  Documento: {preferences.docType} · {preferences.docNumber} · Sede Bogotá Cra. 7 # 40 - 62
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1 text-emerald-700 font-medium bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Sesión Verificada
                </span>
              </div>
            </div>

            {/* Scheduled Appointments Table / Card */}
            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Cita Activa Asignada
                </span>
                <span className="text-xs font-mono text-slate-500">
                  ID: {currentAppointment.id}
                </span>
              </div>

              <div className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900">
                        {currentAppointment.specialty}
                      </span>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                          currentAppointment.status === "REPROGRAMADA"
                            ? "bg-purple-100 text-purple-800 border border-purple-200"
                            : "bg-blue-100 text-blue-800 border border-blue-200"
                        }`}
                      >
                        {currentAppointment.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-xs text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>{currentAppointment.doctor}</span>
                      </div>
                      <div className="flex items-center gap-1.5 font-mono">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-semibold text-slate-900">
                          {currentAppointment.date}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 font-mono">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{currentAppointment.time} hrs</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span className="truncate">{currentAppointment.location}</span>
                      </div>
                    </div>
                  </div>

                  {/* The Target Action: "Reprogramar" button */}
                  <div className="sm:self-center shrink-0">
                    <button
                      id="btn-reprogramar"
                      onClick={handleOpenReschedule}
                      className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold rounded-lg transition-all shadow-xs ${
                        activeHighlight === "btn-reprogramar"
                          ? "bg-amber-500 hover:bg-amber-400 text-slate-950 ring-4 ring-amber-300 ring-offset-2 scale-105"
                          : "bg-blue-700 hover:bg-blue-800 text-white"
                      }`}
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      Reprogramar Cita
                    </button>
                  </div>
                </div>

                {currentAppointment.status === "REPROGRAMADA" && (
                  <div className="mt-3 p-2.5 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-800 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      ¡Excelente! Esta cita fue adelantada con éxito por el agente inteligente a una fecha más cercana.
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Agenda Preview */}
            <div className="bg-white p-4 rounded-lg border border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-800">
                  Horarios en Agenda Abierta (Detectados en HUSI)
                </span>
                <span className="text-[11px] text-slate-500">
                  {availableSlots.length} cupos analizados
                </span>
              </div>

              {availableSlots.length === 0 ? (
                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-center text-xs text-slate-600">
                  <div className="font-bold text-slate-800 mb-1 flex items-center justify-center gap-1.5">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <span>0 Cupos Disponibles en HUSI para este servicio en este momento</span>
                  </div>
                  <p className="text-[11px] text-slate-500 max-w-md mx-auto leading-relaxed">
                    La agenda para Gastroenterología (Control) se encuentra actualmente copada en el portal. El bot permanece en escucha activa recurrente cada {preferences.pollingIntervalMinutes} minutos para capturar cualquier cancelación al instante.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {availableSlots.map((slot) => {
                    const isSelectedByAgent =
                      activeHighlight === "slot-select" && slot.id === "SLOT-001";
                    return (
                      <div
                        key={slot.id}
                        className={`p-3 rounded border text-xs flex items-center justify-between transition-all ${
                          isSelectedByAgent
                            ? "bg-emerald-50 border-emerald-400 ring-2 ring-emerald-300"
                            : "bg-slate-50/70 border-slate-200 hover:border-blue-300"
                        }`}
                      >
                        <div>
                          <div className="font-semibold text-slate-900 flex items-center gap-1.5 font-mono">
                            <span>{slot.date}</span>
                            <span className="text-slate-400">·</span>
                            <span className="text-blue-700">{slot.time}</span>
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {slot.doctor} · {slot.room}
                          </div>
                        </div>
                        <span className="text-[10px] font-bold font-mono text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded">
                          -{slot.daysEarlier}d
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* MODAL 1: Login Form (Target of Agent Scraper Step 1) */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-blue-800 text-white px-5 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold">Ingreso Pacientes HUSI</h3>
                <p className="text-[11px] text-blue-200">
                  Acceso a citas médicas y agenda personalizada
                </p>
              </div>
              <button
                onClick={() => setShowLoginModal(false)}
                className="text-white/80 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleDoLogin} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tipo de Documento
                </label>
                <select
                  value={loginForm.docType}
                  onChange={(e) =>
                    setLoginForm({ ...loginForm, docType: e.target.value as any })
                  }
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:bg-white focus:outline-blue-600"
                >
                  <option value="CC">Cédula de Ciudadanía (CC)</option>
                  <option value="TI">Tarjeta de Identidad (TI)</option>
                  <option value="CE">Cédula de Extranjería (CE)</option>
                  <option value="PASAPORTE">Pasaporte</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Número de Identificación
                </label>
                <input
                  type="text"
                  value={loginForm.docNumber}
                  onChange={(e) =>
                    setLoginForm({ ...loginForm, docNumber: e.target.value })
                  }
                  className={`w-full text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:bg-white focus:outline-blue-600 ${
                    activeHighlight === "input-doc"
                      ? "ring-2 ring-blue-500 bg-blue-50/50"
                      : ""
                  }`}
                  placeholder="Ej. 1020304050"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Contraseña o Fecha de Nacimiento
                </label>
                <input
                  type="password"
                  value={loginForm.password}
                  onChange={(e) =>
                    setLoginForm({ ...loginForm, password: e.target.value })
                  }
                  className="w-full text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:bg-white focus:outline-blue-600"
                  required
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowLoginModal(false)}
                  className="px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-lg shadow-xs"
                >
                  Iniciar Sesión
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Reschedule / Calendar Modal (Target of Agent Scraper Step 2 & Agent 3) */}
      {showRescheduleModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-blue-800 text-white px-5 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold">Reprogramar Cita Médica</h3>
                <p className="text-[11px] text-blue-200">
                  Seleccione el nuevo horario disponible en Hospital San Ignacio
                </p>
              </div>
              <button
                onClick={() => setShowRescheduleModal(false)}
                className="text-white/80 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Cita Actual:</strong> {currentAppointment.date} a las {currentAppointment.time} ({currentAppointment.doctor}).
                  Al confirmar un horario anterior, su cita original será liberada automáticamente.
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-2">
                  Horarios Disponibles Más Cercanos:
                </label>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {availableSlots.map((slot) => {
                    const isSelected = selectedSlotForConfirm?.id === slot.id;
                    return (
                      <div
                        key={slot.id}
                        onClick={() => handleSelectSlot(slot)}
                        className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${
                          isSelected
                            ? "bg-blue-50 border-blue-600 ring-2 ring-blue-300"
                            : "bg-slate-50 border-slate-200 hover:bg-slate-100 hover:border-slate-300"
                        }`}
                      >
                        <div>
                          <div className="font-bold text-xs text-slate-900 font-mono">
                            {slot.date} · {slot.time} hrs
                          </div>
                          <div className="text-[11px] text-slate-600">
                            {slot.doctor} ({slot.room})
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded font-mono">
                            Adelanta {slot.daysEarlier} días
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowRescheduleModal(false)}
                  className="px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={!selectedSlotForConfirm}
                  onClick={handleConfirmChange}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg shadow-xs transition-colors ${
                    selectedSlotForConfirm
                      ? "bg-blue-700 hover:bg-blue-800 text-white"
                      : "bg-slate-200 text-slate-400 cursor-not-allowed"
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Confirmar Cambio Automático
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
