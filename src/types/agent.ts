export interface Appointment {
  id: string;
  specialty: string;
  doctor: string;
  date: string;
  time: string;
  location: string;
  status: 'PROGRAMADA' | 'REPROGRAMADA' | 'CANCELADA';
}

export interface CandidateSlot {
  id: string;
  date: string;
  time: string;
  doctor: string;
  specialty: string;
  room: string;
  daysEarlier: number;
}

export interface UserPreferences {
  husiBaseUrl: string;
  docType: '1' | 'CC' | 'TI' | 'CE' | 'PASAPORTE';
  docNumber: string;
  password: string;
  preferredTimeSlot: 'afternoon' | 'morning' | 'any';
  preferredDoctor: string; // 'same_doctor', 'any', or specific doctor name
  modality: 'presencial' | 'virtual' | 'any';
  minDaysEarlier: number;
  maxDate: string;
  specialty: string;
  pollingIntervalMinutes: number;
  notificationChannel: 'email' | 'telegram' | 'ntfy' | 'all';
  notificationEmail: string;
  telegramChatId: string;
  telegramBotToken: string;
  ntfyTopic: string;
}

export interface AgentStepLog {
  id: string;
  agent: 'Scraper (Playwright)' | 'Validador (Gemini 3.8 Flash)' | 'Ejecutor / Notificador';
  action: string;
  status: 'pending' | 'running' | 'success' | 'warning' | 'error';
  timestamp: string;
  details?: string;
  payload?: any;
}

export interface ValidationResult {
  decision: 'CONFIRM_RESCHEDULE' | 'KEEP_CURRENT';
  selectedSlot: CandidateSlot | null;
  reasoning: string;
  meetsAllCriteria: boolean;
  daysEarlier?: number;
  modelUsed?: string;
}
