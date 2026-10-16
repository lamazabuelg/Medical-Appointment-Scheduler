import React, { useState } from "react";
import { Bell, CheckCircle2, Clock, Calendar, User, MapPin, Copy, Check, ShieldCheck, Mail } from "lucide-react";

interface NotificationItem {
  id: string;
  timestamp: string;
  recipient: string;
  subject: string;
  patient: string;
  service: string;
  doctor: string;
  newDate: string;
  newTime: string;
  oldDate?: string;
  oldTime?: string;
  location: string;
  daysEarlier: number;
  channel: string;
  read: boolean;
}

interface NotificationsViewProps {
  notifications: NotificationItem[];
  onMarkAllRead: () => void;
  targetEmail: string;
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({
  notifications,
  onMarkAllRead,
  targetEmail,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (item: NotificationItem) => {
    const text = `
COMPROBANTE OFICIAL DE REPROGRAMACIÓN HUSI
Paciente: ${item.patient}
Especialidad: ${item.service}
Médico: ${item.doctor}
NUEVA FECHA: ${item.newDate} a las ${item.newTime} hrs
Ubicación: ${item.location}
Fecha Anterior: ${item.oldDate || "N/A"} ${item.oldTime || ""}
Adelanto: ${item.daysEarlier} días antes
Fecha de Notificación: ${item.timestamp}
    `.trim();

    navigator.clipboard.writeText(text);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString("es-CO", {
        month: "long",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1 text-xs">
            <span className="font-bold text-blue-700 uppercase tracking-wide">
              Bandeja de Respaldo Local
            </span>
            <span className="text-slate-300">·</span>
            <span className="text-slate-500 font-mono">
              Destinatario: {targetEmail}
            </span>
          </div>
          <h2 className="text-lg font-bold text-slate-900">
            Notificaciones de Citas Reprogramadas
          </h2>
          <p className="text-xs text-slate-600 max-w-2xl mt-0.5">
            Registro permanente y a prueba de fallos de todas las reprogramaciones confirmadas. Si el correo experimenta retrasos, los detalles completos quedan respaldados en esta sección.
          </p>
        </div>

        {notifications.length > 0 && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onMarkAllRead}
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Marcar como leídas
            </button>
          </div>
        )}
      </div>

      {/* Policy Notice: Strict Silence on 0 slots */}
      <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start gap-3">
        <Mail className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong>Política de Cero Spam:</strong> El bot únicamente enviará un correo electrónico cuando capture y confirme de forma exitosa una nueva cita. Los sondeos periódicos en los que HUSI no tenga cupos abiertos se registran en el Dashboard pero <strong>no envían ningún correo</strong> para mantener tu bandeja limpia.
        </div>
      </div>

      {/* Notifications List */}
      {notifications.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-xs text-slate-500">
          <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
            <Bell className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800 mb-1">
            No hay notificaciones de reprogramación aún
          </h3>
          <p className="text-slate-500 max-w-md mx-auto text-xs leading-relaxed">
            El sistema de vigilancia está activo. Tan pronto como HUSI libere una cita para tu especialidad y el bot confirme el cambio, recibirás la alerta a <strong>{targetEmail}</strong> y el comprobante oficial aparecerá guardado aquí.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {notifications.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4 transition-all hover:border-blue-300"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                  <h4 className="text-sm font-bold text-slate-900">
                    {item.subject}
                  </h4>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
                  <span>{formatDate(item.timestamp)}</span>
                  <span className="text-slate-300">·</span>
                  <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Despachada a {item.recipient}
                  </span>
                </div>
              </div>

              {/* Appointment Comparison Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* New Slot */}
                <div className="p-3.5 rounded-lg bg-emerald-50/50 border border-emerald-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-emerald-800 tracking-wide">
                      Nueva Cita Confirmada (Adelantada)
                    </span>
                    <span className="text-[10px] font-bold font-mono text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                      -{item.daysEarlier} días antes
                    </span>
                  </div>
                  <div className="font-bold text-slate-900 font-mono text-sm text-emerald-800 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-emerald-600" />
                    <span>{item.newDate}</span>
                    <span className="text-slate-400">·</span>
                    <span>{item.newTime} hrs</span>
                  </div>
                  <div className="text-slate-600 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>{item.doctor}</span>
                  </div>
                  <div className="text-slate-600 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span className="truncate">{item.location}</span>
                  </div>
                </div>

                {/* Old Slot */}
                <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wide block">
                    Cita Anterior (Liberada en HUSI)
                  </span>
                  <div className="font-medium text-slate-500 font-mono text-sm line-through flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span>{item.oldDate || "2026-11-30"}</span>
                    <span className="text-slate-300">·</span>
                    <span>{item.oldTime || "14:05"} hrs</span>
                  </div>
                  <div className="text-slate-500 text-xs">
                    Servicio: {item.service}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Hospital Universitario San Ignacio
                  </div>
                </div>
              </div>

              {/* Action */}
              <div className="flex items-center justify-between pt-2 text-xs">
                <span className="text-slate-500 text-[11px]">
                  ID de Registro: <code className="font-mono">{item.id}</code>
                </span>
                <button
                  onClick={() => handleCopy(item)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  {copiedId === item.id ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{copiedId === item.id ? "¡Comprobante Copiado!" : "Copiar Comprobante"}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
