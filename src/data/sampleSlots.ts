import { Appointment, CandidateSlot, UserPreferences } from "../types/agent";

export const initialAppointment: Appointment = {
  id: "1000000",
  specialty: "Consulta Médica Especializada",
  doctor: "Profesional Médico Asignado",
  date: "2026-12-15",
  time: "08:00",
  location: "Hospital Universitario San Ignacio",
  status: "PROGRAMADA",
};

export const sampleCandidateSlots: CandidateSlot[] = [];

export const defaultPreferences: UserPreferences = {
  husiBaseUrl: "https://agendatucita.husi.org.co",
  docType: "1",
  docNumber: "",
  password: "",
  preferredTimeSlot: "any", // "Cualquier Horario" por defecto
  preferredDoctor: "any", // "Cualquier Profesional" por defecto
  modality: "presencial", // Presencial en HUSI
  minDaysEarlier: 1,
  maxDate: "", // Sin límite de fecha máxima por defecto para no filtrar cupos válidos
  specialty: "Todas las Especialidades Mapeadas",
  pollingIntervalMinutes: 5,
  notificationChannel: "email",
  notificationEmail: "",
  telegramChatId: "",
  telegramBotToken: "",
  ntfyTopic: "husi-citas-alertas",
};
