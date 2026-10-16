import React from "react";
import { Mail, CheckCircle2, X, Calendar, Clock, MapPin, User, ExternalLink } from "lucide-react";

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  details: {
    channel: string;
    recipient: string;
    newSlot: any;
    oldAppointment: any;
  } | null;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({
  isOpen,
  onClose,
  details,
}) => {
  if (!isOpen || !details) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="bg-emerald-700 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-200" />
            <div>
              <h3 className="text-sm font-bold">
                ¡Notificación Despachada con Éxito!
              </h3>
              <p className="text-[11px] text-emerald-100">
                Alerta urgente enviada a {details.recipient}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900">
            <strong>Canal:</strong> Correo Electrónico ({details.channel.toUpperCase()})
            <br />
            <strong>Asunto:</strong> ✅ ¡Cita Médica HUSI Reprogramada con Éxito!
          </div>

          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-2 text-xs">
            <div className="font-semibold text-slate-800 pb-1 border-b border-slate-200 flex items-center justify-between">
              <span>Comparación de Cita:</span>
              <span className="text-[10px] font-mono text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded">
                Adelantada con éxito
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="p-2.5 rounded bg-white border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                  Nueva Cita Confirmada:
                </span>
                <div className="font-bold text-slate-900 font-mono text-xs text-blue-700">
                  {details.newSlot?.date || "2026-10-22"}
                </div>
                <div className="font-mono text-[11px] text-slate-600">
                  {details.newSlot?.time || "15:40"} hrs
                </div>
                <div className="text-[11px] text-slate-600 mt-1">
                  {details.newSlot?.doctor || "Dra. Marcela Gómez"}
                </div>
              </div>

              <div className="p-2.5 rounded bg-white border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                  Cita Anterior (Liberada):
                </span>
                <div className="font-medium text-slate-500 font-mono text-xs line-through">
                  {details.oldAppointment?.date || "2026-11-28"}
                </div>
                <div className="font-mono text-[11px] text-slate-500 line-through">
                  {details.oldAppointment?.time || "10:30"} hrs
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  {details.oldAppointment?.doctor || "Dr. Carlos Restrepo"}
                </div>
              </div>
            </div>

            <div className="pt-2 text-[11px] text-slate-500">
              📍 Ubicación: Hospital Universitario San Ignacio - Carrera 7 # 40 - 62, Bogotá
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <a
              href="https://agendatucita.husi.org.co/paciente"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-blue-700 hover:underline font-medium"
            >
              Comprobar en Web HUSI
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-lg shadow-xs transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
