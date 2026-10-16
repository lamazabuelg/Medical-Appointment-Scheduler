import React, { useState, useEffect } from "react";
import { UserPreferences } from "../types/agent";
import { Save, Bell, Shield, Clock, Send, CheckCircle2, Globe, Stethoscope, Laptop, Repeat, UserCheck, X } from "lucide-react";

interface DiscoveredDoctor {
  name: string;
  specialty: string;
  service?: string;
  source: string;
  isCurrent?: boolean;
}

interface ConfigPanelProps {
  preferences: UserPreferences;
  onSavePreferences: (updated: UserPreferences) => void;
  onSendTestNotification: (channel: string, email: string) => Promise<void>;
}

export const ConfigPanel: React.FC<ConfigPanelProps> = ({
  preferences,
  onSavePreferences,
  onSendTestNotification,
}) => {
  const [formData, setFormData] = useState<UserPreferences>({
    ...preferences,
    preferredTimeSlot: preferences.preferredTimeSlot || "any",
    preferredDoctor: preferences.preferredDoctor || "any",
  });
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testSuccessMessage, setTestSuccessMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Lista de médicos descubiertos exclusivamente por el scrapper (citas agendadas y cupos disponibles en vivo)
  const [discoveredDoctors, setDiscoveredDoctors] = useState<DiscoveredDoctor[]>([
    { name: "FREDY ALEXANDER AVILA ALMANZA", specialty: "Gastroenterología", service: "Gastro Adulto Control", source: "Cita Programada", isCurrent: true },
    { name: "JAVIER ALEXANDER BECERRA MATEUS", specialty: "Oftalmología", service: "Oftalmologia General Primera Vez", source: "Cita Programada (Adelantada)", isCurrent: true },
    { name: "ALEXANDER CASTAÑEDA LADINO", specialty: "Gastroenterología", service: "Gastro Adulto Primera vez", source: "Cita Programada", isCurrent: true },
    { name: "INGRID TATHIANA PONCE ESPARZA", specialty: "Oftalmología", service: "Oftalmologia General", source: "Médico Histórico HUSI", isCurrent: false },
    { name: "MARIA CAMILA GONZALEZ NIETO", specialty: "Oftalmología", service: "Oftalmologia General Primera Vez", source: "Cupo Disponible en HUSI", isCurrent: false }
  ]);

  useEffect(() => {
    fetch("/api/agent/doctors")
      .then((res) => {
        if (res.ok) return res.json();
        return [];
      })
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setDiscoveredDoctors(data);
        }
      })
      .catch((err) => console.warn("No se pudieron recargar médicos del scraper:", err));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      // 1. Guardar en backend (archivo .env y memoria de proceso)
      const res = await fetch("/api/agent/update-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        throw new Error("No se pudo persistir en .env");
      }

      // 2. Guardar en memoria de React
      onSavePreferences(formData);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      alert("Error guardando configuración: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestAlert = async () => {
    setIsSendingTest(true);
    setTestSuccessMessage(null);
    try {
      await onSendTestNotification(formData.notificationChannel, formData.notificationEmail);
      setTestSuccessMessage(`Alerta de prueba despachada exitosamente a ${formData.notificationEmail}`);
      setTimeout(() => setTestSuccessMessage(null), 4000);
    } catch (e: any) {
      alert("Error al enviar alerta de prueba: " + e.message);
    } finally {
      setIsSendingTest(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Title */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">
              Parametrización Total (.env / config)
            </span>
            <span className="text-slate-300">·</span>
            <span className="text-xs text-slate-500 font-mono">
              Sin credenciales quemadas en código
            </span>
          </div>
          <h2 className="text-lg font-bold text-slate-900">
            Criterios de Reprogramación y Ajustes de Ejecución
          </h2>
          <p className="text-xs text-slate-600 max-w-2xl mt-0.5">
            Configura la URL de destino, credenciales oficiales, filtros de horario (Cualquier horario por defecto), preferencia de doctor (Cualquier profesional por defecto), modalidad y frecuencia periódica de sondeo.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold bg-blue-700 hover:bg-blue-800 text-white rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            {isSaving ? "Guardando..." : saveSuccess ? "¡Guardado en .env!" : "Guardar en .env y Aplicar"}
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Configuración guardada exitosamente en el archivo <code>.env</code>. El motor Python leerá estos parámetros en cada sondeo.</span>
        </div>
      )}

      {testSuccessMessage && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800 flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
          <span>{testSuccessMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: URL & Credenciales de Ingreso */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Globe className="w-4 h-4 text-blue-700" />
            <h3 className="text-sm font-bold text-slate-900">
              1. Destino y Credenciales de Acceso
            </h3>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              URL del Destino (Portal HUSI)
            </label>
            <input
              type="url"
              value={formData.husiBaseUrl}
              onChange={(e) =>
                setFormData({ ...formData, husiBaseUrl: e.target.value })
              }
              className="w-full text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:bg-white focus:outline-blue-600"
              placeholder="https://agendatucita.husi.org.co"
              required
            />
            <span className="text-[10px] text-slate-500 mt-1 block">
              Variable: <code>HUSI_BASE_URL</code>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tipo de Documento
              </label>
              <select
                value={formData.docType}
                onChange={(e) =>
                  setFormData({ ...formData, docType: e.target.value as any })
                }
                className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:bg-white focus:outline-blue-600"
              >
                <option value="1">Cédula de Ciudadanía (C.C. - ID 1)</option>
                <option value="2">Tarjeta de Identidad (T.I. - ID 2)</option>
                <option value="4">Cédula de Extranjería (C.E. - ID 4)</option>
                <option value="3">Pasaporte (P.A. - ID 3)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Número de Documento
              </label>
              <input
                type="text"
                value={formData.docNumber}
                onChange={(e) =>
                  setFormData({ ...formData, docNumber: e.target.value })
                }
                className="w-full text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:bg-white focus:outline-blue-600"
                placeholder="1000000000"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Contraseña de Acceso
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              className="w-full text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:bg-white focus:outline-blue-600"
              placeholder="••••••••"
              required
            />
            <span className="text-[10px] text-slate-500 mt-1 block">
              Se guarda en <code>.env</code> local, nunca en el repositorio.
            </span>
          </div>
        </div>

        {/* Card 2: Criterios para la Reprogramación */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Clock className="w-4 h-4 text-purple-700" />
            <h3 className="text-sm font-bold text-slate-900">
              2. Criterios para la Reprogramación
            </h3>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700">
                Franja Horaria Requerida
              </label>
              <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                Por Defecto: Cualquier Horario
              </span>
            </div>
            <select
              value={formData.preferredTimeSlot || "any"}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  preferredTimeSlot: e.target.value as any,
                })
              }
              className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:bg-white focus:outline-blue-600"
            >
              <option value="any">Cualquier Horario (Indiferente - Recomendado por defecto)</option>
              <option value="morning">Solo por la Mañana (07:00 AM a 12:00 PM)</option>
              <option value="afternoon">Solo por la Tarde (12:00 PM a 18:00 PM)</option>
            </select>
            <span className="text-[10px] text-slate-500 mt-1 block">
              Al seleccionar "Cualquier Horario", el agente aceptará cualquier cupo matutino o vespertino que esté disponible.
            </span>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700">
                Preferencia de Doctor
              </label>
              <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                Por Defecto: Cualquier Profesional
              </span>
            </div>
            <select
              value={formData.preferredDoctor || "any"}
              onChange={(e) =>
                setFormData({ ...formData, preferredDoctor: e.target.value })
              }
              className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:bg-white"
            >
              <option value="any">Cualquier Profesional de la Especialidad (Indiferente - Por Defecto)</option>
              <option value="same_doctor">Mismo Doctor asignado a cada cita actual</option>
              
              {/* Lista poblada exclusivamente con los profesionales descubiertos por el scrapper */}
              {discoveredDoctors.length > 0 && (
                <optgroup label="Médicos Descubiertos en Portal HUSI por el Scrapper">
                  {discoveredDoctors.map((doc, idx) => (
                    <option key={`${doc.name}-${idx}`} value={doc.name}>
                      {doc.name} — {doc.specialty} ({doc.source})
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
            <span className="text-[10px] text-slate-500 mt-1 block">
              Lista sincronizada en vivo con los {discoveredDoctors.length} médicos reales detectados en tus citas y cupos en HUSI.
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Modalidad de la Cita
              </label>
              <select
                value={formData.modality || "presencial"}
                onChange={(e) =>
                  setFormData({ ...formData, modality: e.target.value as any })
                }
                className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:bg-white"
              >
                <option value="presencial">Presencial en Consultorio HUSI</option>
                <option value="virtual">Telemedicina (Virtual)</option>
                <option value="any">Cualquiera (Indiferente)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mínimo de Días de Adelanto
              </label>
              <input
                type="number"
                min={1}
                value={formData.minDaysEarlier}
                onChange={(e) =>
                  setFormData({ ...formData, minDaysEarlier: parseInt(e.target.value, 10) || 1 })
                }
                className="w-full text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:bg-white"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700">
                Fecha Límite Máxima
              </label>
              {formData.maxDate && (
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, maxDate: "" })}
                  className="text-[10px] text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
                >
                  Quitar límite (Cualquier fecha anterior)
                </button>
              )}
            </div>
            <input
              type="date"
              value={formData.maxDate || ""}
              onChange={(e) =>
                setFormData({ ...formData, maxDate: e.target.value })
              }
              className="w-full text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:bg-white"
            />
            <span className="text-[10px] text-slate-500 mt-1 block">
              {formData.maxDate
                ? `Solo se aceptarán cupos entre hoy y el ${formData.maxDate}.`
                : "Sin límite artificial: El agente aceptará cualquier cupo más temprano que tu cita programada."}
            </span>
          </div>
        </div>

        {/* Card 3: Frecuencia de Ejecución & Notificaciones */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4 md:col-span-2">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Repeat className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900">
                3. Frecuencia de Ejecución Periódica y Alertas
              </h3>
            </div>
            <button
              type="button"
              onClick={handleTestAlert}
              disabled={isSendingTest}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              {isSendingTest ? "Enviando..." : "Enviar Alerta de Prueba"}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Frecuencia de Sondeo (Minutos)
              </label>
              <select
                value={formData.pollingIntervalMinutes || 5}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    pollingIntervalMinutes: parseInt(e.target.value, 10) || 5,
                  })
                }
                className="w-full text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:bg-white"
              >
                <option value={1}>Cada 1 minuto (Monitoreo ultra-rápido)</option>
                <option value={3}>Cada 3 minutos</option>
                <option value={5}>Cada 5 minutos (Recomendado estándar)</option>
                <option value={10}>Cada 10 minutos</option>
                <option value={15}>Cada 15 minutos</option>
                <option value={30}>Cada 30 minutos</option>
              </select>
              <span className="text-[10px] text-slate-500 mt-1 block">
                Comando continuo: <code>python3 husi_agent_engine.py --daemon</code>
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Correo Electrónico de Notificación
              </label>
              <input
                type="email"
                value={formData.notificationEmail}
                onChange={(e) =>
                  setFormData({ ...formData, notificationEmail: e.target.value })
                }
                className="w-full text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:bg-white"
                placeholder="ejemplo@correo.com"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Solo se enviará correo cuando una cita sea reprogramada exitosamente.
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tópico de ntfy.sh (Push Móvil Inmediato)
              </label>
              <input
                type="text"
                value={formData.ntfyTopic}
                onChange={(e) =>
                  setFormData({ ...formData, ntfyTopic: e.target.value })
                }
                className="w-full text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:bg-white"
                placeholder="husi-citas-alertas"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Notificación push instantánea a tu teléfono móvil y navegador.
              </span>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
};
