import { Appointment, CandidateSlot, UserPreferences } from "../types/agent";

export const initialAppointment: Appointment = {
  id: "1047239",
  specialty: "Gastroenterología (Gastro Adulto Control)",
  doctor: "Dr. FREDY ALEXANDER AVILA ALMANZA",
  date: "2026-11-30",
  time: "14:05",
  location: "Hospital Universitario San Ignacio - Consultorio 17 Edif Parqueaderos",
  status: "PROGRAMADA",
};

export const sampleCandidateSlots: CandidateSlot[] = [];

export const defaultPreferences: UserPreferences = {
  husiBaseUrl: "https://agendatucita.husi.org.co",
  docType: "1",
  docNumber: "1233895427",
  password: "••••••••",
  preferredTimeSlot: "any", // "Cualquier Horario" por defecto
  preferredDoctor: "any", // "Cualquier Profesional" por defecto
  modality: "presencial", // Presencial en HUSI
  minDaysEarlier: 1,
  maxDate: "", // Sin límite de fecha máxima por defecto para no filtrar cupos válidos
  specialty: "Todas las Especialidades Mapeadas",
  pollingIntervalMinutes: 5,
  notificationChannel: "email",
  notificationEmail: "lamazabuelg@gmail.com",
  telegramChatId: "",
  telegramBotToken: "",
  ntfyTopic: "husi-citas-alertas",
};
