import express from "express";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { execFile } from "child_process";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: "10mb" }));

// Asegurar existencia de directorio data
const DATA_DIR = path.resolve(__dirname, "data");
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const EXECUTIONS_FILE = path.join(DATA_DIR, "executions.json");
const NOTIFICATIONS_FILE = path.join(DATA_DIR, "notifications.json");
const DOCTORS_FILE = path.join(DATA_DIR, "doctors.json");

function readJsonFile<T>(filePath: string, fallback: T): T {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(content);
    }
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err);
  }
  return fallback;
}

function writeJsonFile(filePath: string, data: any) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error(`Error writing ${filePath}:`, err);
  }
}

// Inicializar archivos si no existen
if (!fs.existsSync(EXECUTIONS_FILE)) {
  writeJsonFile(EXECUTIONS_FILE, []);
}
if (!fs.existsSync(NOTIFICATIONS_FILE)) {
  writeJsonFile(NOTIFICATIONS_FILE, []);
}
if (!fs.existsSync(DOCTORS_FILE)) {
  writeJsonFile(DOCTORS_FILE, [
    { name: "FREDY ALEXANDER AVILA ALMANZA", specialty: "Gastroenterología", service: "Gastro Adulto Control", source: "Cita Programada", isCurrent: true },
    { name: "JAVIER ALEXANDER BECERRA MATEUS", specialty: "Oftalmología", service: "Oftalmologia General Primera Vez", source: "Cita Programada", isCurrent: true },
    { name: "ALEXANDER CASTAÑEDA LADINO", specialty: "Gastroenterología", service: "Gastro Adulto Primera vez", source: "Cita Programada", isCurrent: true },
    { name: "INGRID TATHIANA PONCE ESPARZA", specialty: "Oftalmología", service: "Oftalmologia General", source: "Médico Histórico HUSI", isCurrent: false },
    { name: "MARIA CAMILA GONZALEZ NIETO", specialty: "Oftalmología", service: "Oftalmologia General Primera Vez", source: "Cupo Disponible en HUSI", isCurrent: false }
  ]);
}

// Estado del Watcher en Segundo Plano
interface WatcherState {
  isRunning: boolean;
  intervalMinutes: number;
  timerId: NodeJS.Timeout | null;
  lastRun: string | null;
  nextRun: string | null;
  lastResult: any | null;
}

const watcherState: WatcherState = {
  isRunning: false,
  intervalMinutes: parseInt(process.env.POLLING_INTERVAL_MINUTES || "5", 10),
  timerId: null,
  lastRun: null,
  nextRun: null,
  lastResult: null,
};

// Función para ejecutar un sondeo con husi_agent_engine.py
async function runProbeOnce(triggerType: "auto" | "manual" = "manual"): Promise<any> {
  const startTime = Date.now();
  const pythonPath = "python3";
  const scriptPath = path.resolve(__dirname, "husi_agent_engine.py");

  return new Promise((resolve, reject) => {
    execFile(pythonPath, [scriptPath], { maxBuffer: 1024 * 1024 * 10 }, async (error, stdout, stderr) => {
      const durationMs = Date.now() - startTime;
      const nowStr = new Date().toISOString();

      watcherState.lastRun = nowStr;
      if (watcherState.isRunning) {
        watcherState.nextRun = new Date(Date.now() + watcherState.intervalMinutes * 60 * 1000).toISOString();
      }

      if (error) {
        console.error("Error ejecutando husi_agent_engine.py:", stderr || error.message);
        const failRecord = {
          id: `exec-${Date.now()}`,
          timestamp: nowStr,
          triggerType,
          status: "ERROR",
          error: stderr || error.message,
          slotsFound: 0,
          rescheduled: false,
          durationMs,
        };
        const executions = readJsonFile<any[]>(EXECUTIONS_FILE, []);
        executions.unshift(failRecord);
        writeJsonFile(EXECUTIONS_FILE, executions.slice(0, 150));
        return reject(new Error(stderr || error.message));
      }

      try {
        const parsed = JSON.parse(stdout);
        watcherState.lastResult = parsed;

        const isRescheduled = parsed.rescheduled === true;
        const slotsCount = parsed.slots_found_real_count || 0;
        const totalAppointments = parsed.total_appointments_tracked || (parsed.all_appointments ? parsed.all_appointments.length : 1);

        // Guardar o enriquecer lista de doctores descubiertos por el scraper
        if (parsed.discovered_doctors && Array.isArray(parsed.discovered_doctors) && parsed.discovered_doctors.length > 0) {
          const currentDocs = readJsonFile<any[]>(DOCTORS_FILE, []);
          const existingNames = new Set(currentDocs.map((d: any) => d.name.toUpperCase().trim()));
          let added = false;
          for (const newDoc of parsed.discovered_doctors) {
            const cleanName = newDoc.name?.toUpperCase().trim();
            if (cleanName && !existingNames.has(cleanName)) {
              existingNames.add(cleanName);
              currentDocs.push(newDoc);
              added = true;
            }
          }
          if (added) {
            writeJsonFile(DOCTORS_FILE, currentDocs);
          }
        }

        // Resumen descriptivo de los resultados por cita
        let summaryReasoning = "";
        if (parsed.appointments_evaluated && Array.isArray(parsed.appointments_evaluated)) {
          summaryReasoning = parsed.appointments_evaluated
            .map((a: any) => `[${a.specialty} (${a.service})]: ${a.slots_found_count} cupos detectados. ${a.validation?.decision === 'CONFIRM_RESCHEDULE' ? 'Aprobado para reprogramar' : 'Sin cambios'}`)
            .join(" | ");
        } else {
          summaryReasoning = parsed.validation?.reasoning || "";
        }

        const record = {
          id: `exec-${Date.now()}`,
          timestamp: nowStr,
          triggerType,
          patient: parsed.patient,
          docNumber: parsed.doc_number,
          totalAppointments,
          currentAppointment: parsed.current_appointment,
          allAppointments: parsed.all_appointments || [],
          appointmentsEvaluated: parsed.appointments_evaluated || [],
          slotsFound: slotsCount,
          decision: isRescheduled ? "CONFIRM_RESCHEDULE" : (parsed.validation?.decision || "KEEP_CURRENT"),
          reasoning: summaryReasoning || parsed.validation?.reasoning || "",
          rescheduled: isRescheduled,
          selectedSlot: parsed.validation?.selected_slot || null,
          durationMs,
        };

        const executions = readJsonFile<any[]>(EXECUTIONS_FILE, []);
        executions.unshift(record);
        writeJsonFile(EXECUTIONS_FILE, executions.slice(0, 150));

        // REGLA ESTRICTA: Notificación ÚNICAMENTE si hay reprogramación efectiva en alguna de las citas
        if (isRescheduled) {
          const recipientEmail = process.env.NOTIFICATION_EMAIL || "lamazabuelg@gmail.com";
          const notifications = readJsonFile<any[]>(NOTIFICATIONS_FILE, []);

          // Alertar para cada cita que haya sido reprogramada
          if (parsed.appointments_evaluated && Array.isArray(parsed.appointments_evaluated)) {
            for (const appt of parsed.appointments_evaluated) {
              if (appt.rescheduled && appt.validation?.selected_slot) {
                const slot = appt.validation.selected_slot;
                const notif = {
                  id: `notif-${Date.now()}-${appt.appointmentID || Math.random().toString(36).substring(7)}`,
                  timestamp: nowStr,
                  recipient: recipientEmail,
                  subject: `✅ ¡Cita de ${appt.specialty} en HUSI Reprogramada con Éxito al ${slot.date}!`,
                  patient: parsed.patient,
                  specialty: appt.specialty,
                  service: appt.service || appt.specialty,
                  doctor: slot.doctor,
                  newDate: slot.date,
                  newTime: slot.time,
                  oldDate: appt.date,
                  oldTime: appt.time,
                  location: slot.room || appt.location || "Consultorio HUSI",
                  daysEarlier: slot.daysEarlier || 0,
                  channel: process.env.NOTIFICATION_CHANNEL || "email",
                  read: false,
                  details: appt.execution || null,
                };
                notifications.unshift(notif);
                console.log(`[ALERTA OFICIAL] ¡Cita de ${appt.specialty} reprogramada exitosamente! Registrada para ${recipientEmail}.`);
              }
            }
          } else if (parsed.validation?.selected_slot) {
            const slot = parsed.validation.selected_slot;
            const old = parsed.current_appointment;
            const notif = {
              id: `notif-${Date.now()}`,
              timestamp: nowStr,
              recipient: recipientEmail,
              subject: `✅ ¡Cita Médica HUSI Reprogramada con Éxito al ${slot.date}!`,
              patient: parsed.patient,
              specialty: old?.specialty || "Cita Médica",
              service: old?.service || "Consulta Especializada",
              doctor: slot.doctor,
              newDate: slot.date,
              newTime: slot.time,
              oldDate: old?.date,
              oldTime: old?.time,
              location: slot.room || old?.location || "Consultorio HUSI",
              daysEarlier: slot.daysEarlier || 0,
              channel: process.env.NOTIFICATION_CHANNEL || "email",
              read: false,
              details: parsed.execution || null,
            };
            notifications.unshift(notif);
            console.log(`[ALERTA OFICIAL] ¡Cita médica reprogramada exitosamente! Registrada para ${recipientEmail}.`);
          }

          writeJsonFile(NOTIFICATIONS_FILE, notifications.slice(0, 100));
        } else {
          // Intentos fallidos o sin cupos válidos: NO SE ALERTA NADA POR CORREO
          console.log(`[Sondeo HUSI Multi-Cita] ${slotsCount} cupos totales evaluados en ${totalAppointments} citas. Citas actuales preservadas. Silencioso (sin alertas al correo).`);
        }

        resolve(parsed);
      } catch (parseError: any) {
        reject(new Error("Formato inválido de salida en motor Python: " + stdout));
      }
    });
  });
}

function startWatcher() {
  if (watcherState.isRunning) return;

  dotenv.config(); // refrescar variables de .env
  const intervalMins = parseInt(process.env.POLLING_INTERVAL_MINUTES || "5", 10) || 5;
  watcherState.intervalMinutes = intervalMins;
  watcherState.isRunning = true;
  watcherState.nextRun = new Date(Date.now() + intervalMins * 60 * 1000).toISOString();

  console.log(`[Watcher HUSI] Vigilancia iniciada. Intervalo: cada ${intervalMins} minutos.`);

  // Ejecución inicial inmediata
  runProbeOnce("auto").catch((e) => console.error("[Watcher] Error en sondeo inicial:", e.message));

  // Loop recurrente
  watcherState.timerId = setInterval(() => {
    console.log(`[Watcher HUSI] Ejecutando sondeo recurrente programado (${new Date().toLocaleTimeString()})...`);
    runProbeOnce("auto").catch((e) => console.error("[Watcher] Error en sondeo periódico:", e.message));
  }, intervalMins * 60 * 1000);
}

function stopWatcher() {
  if (watcherState.timerId) {
    clearInterval(watcherState.timerId);
    watcherState.timerId = null;
  }
  watcherState.isRunning = false;
  watcherState.nextRun = null;
  console.log("[Watcher HUSI] Vigilancia detenida por el usuario.");
}

// Endpoints del Dashboard y Monitoreo
app.get("/api/agent/status", (req, res) => {
  const executions = readJsonFile<any[]>(EXECUTIONS_FILE, []);
  const notifications = readJsonFile<any[]>(NOTIFICATIONS_FILE, []);

  const totalProbes = executions.length;
  const successfulReschedules = executions.filter((e) => e.rescheduled).length;
  const probesWithSlots = executions.filter((e) => (e.slotsFound || 0) > 0).length;
  const probesNoSlots = executions.filter((e) => (e.slotsFound || 0) === 0).length;
  const unreadNotifications = notifications.filter((n) => !n.read).length;

  const trackedAppointments = watcherState.lastResult?.all_appointments || (executions.length > 0 && executions[0].allAppointments?.length > 0 ? executions[0].allAppointments : []);
  const totalTrackedAppointments = watcherState.lastResult?.total_appointments_tracked || (trackedAppointments.length || 3);

  const doctors = readJsonFile<any[]>(DOCTORS_FILE, []);

  return res.json({
    isRunning: watcherState.isRunning,
    intervalMinutes: watcherState.intervalMinutes,
    lastRun: watcherState.lastRun,
    nextRun: watcherState.nextRun,
    lastResult: watcherState.lastResult,
    trackedAppointments,
    discoveredDoctors: doctors,
    stats: {
      totalProbes,
      successfulReschedules,
      probesWithSlots,
      probesNoSlots,
      unreadNotifications,
      totalTrackedAppointments,
    },
  });
});

app.get("/api/agent/doctors", (req, res) => {
  const doctors = readJsonFile<any[]>(DOCTORS_FILE, []);
  return res.json(doctors);
});

app.post("/api/agent/start", (req, res) => {
  startWatcher();
  return res.json({ success: true, isRunning: true, message: `Vigilancia iniciada cada ${watcherState.intervalMinutes} minutos` });
});

app.post("/api/agent/stop", (req, res) => {
  stopWatcher();
  return res.json({ success: true, isRunning: false, message: "Vigilancia detenida" });
});

app.post("/api/agent/run-now", async (req, res) => {
  try {
    const result = await runProbeOnce("manual");
    return res.json({ success: true, result });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/agent/executions", (req, res) => {
  const executions = readJsonFile<any[]>(EXECUTIONS_FILE, []);
  return res.json(executions);
});

app.get("/api/agent/notifications", (req, res) => {
  const notifications = readJsonFile<any[]>(NOTIFICATIONS_FILE, []);
  return res.json(notifications);
});

app.post("/api/agent/notifications/mark-read", (req, res) => {
  const notifications = readJsonFile<any[]>(NOTIFICATIONS_FILE, []);
  const updated = notifications.map((n) => ({ ...n, read: true }));
  writeJsonFile(NOTIFICATIONS_FILE, updated);
  return res.json({ success: true });
});

// Endpoint: Leer configuración actual desde .env
app.get("/api/agent/config", (req, res) => {
  dotenv.config();
  return res.json({
    husiBaseUrl: process.env.HUSI_BASE_URL || "https://agendatucita.husi.org.co",
    docType: process.env.HUSI_TIPO_DOC || "1",
    docNumber: process.env.HUSI_DOC_NUM || "",
    password: process.env.HUSI_PASSWORD || "",
    preferredTimeSlot: process.env.PREFERENCIA_HORARIO || "any",
    preferredDoctor: process.env.PREFERENCIA_DOCTOR || "any",
    modality: process.env.MODALIDAD || "presencial",
    minDaysEarlier: parseInt(process.env.MIN_DAYS_EARLIER || "1", 10),
    maxDate: process.env.FECHA_MAXIMA || "",
    pollingIntervalMinutes: parseInt(process.env.POLLING_INTERVAL_MINUTES || "5", 10),
    notificationChannel: process.env.NOTIFICATION_CHANNEL || "email",
    notificationEmail: process.env.NOTIFICATION_EMAIL || "lamazabuelg@gmail.com",
    ntfyTopic: process.env.NTFY_TOPIC || "husi-citas-alertas",
  });
});

// Endpoint: Guardar configuración en .env
const saveConfigHandler = async (req: any, res: any) => {
  try {
    const config = req.body || {};
    const envPath = path.resolve(__dirname, ".env");

    let envContent = "";
    try {
      if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, "utf-8");
      }
    } catch {
      envContent = "";
    }

    const lines = envContent.split("\n");
    const updatedMap = new Map<string, string>();

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
        const [k, ...v] = trimmed.split("=");
        updatedMap.set(k.trim(), v.join("=").trim().replace(/^["']|["']$/g, ""));
      }
    }

    if (config.husiBaseUrl) updatedMap.set("HUSI_BASE_URL", config.husiBaseUrl);
    if (config.docType) updatedMap.set("HUSI_TIPO_DOC", config.docType);
    if (config.docNumber) updatedMap.set("HUSI_DOC_NUM", config.docNumber);
    if (config.password) updatedMap.set("HUSI_PASSWORD", config.password);
    if (config.preferredTimeSlot) updatedMap.set("PREFERENCIA_HORARIO", config.preferredTimeSlot);
    if (config.preferredDoctor) updatedMap.set("PREFERENCIA_DOCTOR", config.preferredDoctor);
    if (config.modality) updatedMap.set("MODALIDAD", config.modality);
    if (config.minDaysEarlier !== undefined) updatedMap.set("MIN_DAYS_EARLIER", String(config.minDaysEarlier));
    if (config.maxDate !== undefined) updatedMap.set("FECHA_MAXIMA", config.maxDate);
    if (config.pollingIntervalMinutes) updatedMap.set("POLLING_INTERVAL_MINUTES", String(config.pollingIntervalMinutes));
    if (config.notificationEmail) updatedMap.set("NOTIFICATION_EMAIL", config.notificationEmail);
    if (config.ntfyTopic) updatedMap.set("NTFY_TOPIC", config.ntfyTopic);

    let newEnvFile = "";
    for (const [k, v] of updatedMap.entries()) {
      newEnvFile += `${k}="${v}"\n`;
      process.env[k] = v;
    }

    fs.writeFileSync(envPath, newEnvFile, "utf-8");

    // Si el watcher estaba corriendo con otro intervalo, actualizarlo
    if (watcherState.isRunning && config.pollingIntervalMinutes) {
      stopWatcher();
      startWatcher();
    }

    return res.json({ success: true, message: "Parámetros actualizados exitosamente en .env" });
  } catch (error: any) {
    return res.status(500).json({ error: "Error guardando configuración", details: error.message });
  }
};

app.post("/api/agent/config", saveConfigHandler);
app.post("/api/agent/update-config", saveConfigHandler);

// Vite integration
async function startServer() {
  const isProd = process.env.NODE_ENV === "production";

  if (!isProd) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, "dist")));
    app.get("*", (_req, res) => {
      res.sendFile(path.resolve(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`HUSI Multi-Agent Production Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
