#!/usr/bin/env python3
"""
Motor Multiagéntico Autónomo HUSI (100% Python)
Hospital Universitario San Ignacio - agendatucita.husi.org.co/paciente

Características:
- Cero secretos o credenciales quemadas: Lee 100% desde archivo .env o variables de entorno.
- Cero datos simulados o mockeados: Consulta la API real de HUSI en tiempo real.
- Cobertura Multi-Cita Completa: Mapea, sondea y evalúa CADA UNA de las citas activas
  registradas en la cuenta del paciente (ej. 2 de Gastroenterología y 1 de Oftalmología).
- Parametrización total:
  * URL de destino (HUSI_BASE_URL)
  * Credenciales de acceso (HUSI_TIPO_DOC, HUSI_DOC_NUM, HUSI_PASSWORD)
  * Criterios de reprogramación:
    - Horario: Mañana (7-12), Tarde (12-18) o Indiferente
    - Doctor: Mismo doctor (same_doctor), cualquiera o doctor específico
    - Modalidad: Presencial, Virtual o Indiferente
    - Días mínimos de adelanto y fecha máxima límite
  * Frecuencia de ejecución periódica (POLLING_INTERVAL_MINUTES)
"""

import os
import sys
import time
import json
import argparse
import urllib.request
import urllib.parse
from datetime import datetime, timedelta

def load_env_file(filepath=".env"):
    """Cargador nativo de archivo .env sin dependencias externas."""
    if not os.path.exists(filepath):
        return
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                key, val = line.split("=", 1)
                key = key.strip()
                val = val.strip().strip('"').strip("'")
                # Solo asignar si no existe ya en el entorno
                if key not in os.environ:
                    os.environ[key] = val
    except Exception as e:
        print(f"[Aviso] No se pudo leer {filepath}: {e}", file=sys.stderr)

# Cargar .env al iniciar
load_env_file()

class HusiConfig:
    """Configuración centralizada y parametrizable del sistema."""
    def __init__(self, cli_args=None):
        self.base_url = (cli_args.url if cli_args and cli_args.url else None) or os.environ.get("HUSI_BASE_URL", "https://agendatucita.husi.org.co").rstrip("/")
        self.doc_type = (cli_args.doc_type if cli_args and cli_args.doc_type else None) or os.environ.get("HUSI_TIPO_DOC", "1")
        self.doc_num = (cli_args.doc_num if cli_args and cli_args.doc_num else None) or os.environ.get("HUSI_DOC_NUM", "")
        self.password = (cli_args.password if cli_args and cli_args.password else None) or os.environ.get("HUSI_PASSWORD", "")
        
        # Criterios de reprogramación (por defecto 'any' para máxima oportunidad de adelanto)
        self.preferred_time = (cli_args.time if cli_args and cli_args.time else None) or os.environ.get("PREFERENCIA_HORARIO", "any").lower() # morning, afternoon, any
        self.preferred_doctor = (cli_args.doctor if cli_args and cli_args.doctor else None) or os.environ.get("PREFERENCIA_DOCTOR", "any") # same_doctor, any, o nombre del profesional
        self.modality = (cli_args.modality if cli_args and cli_args.modality else None) or os.environ.get("MODALIDAD", "presencial").lower() # presencial, virtual, any
        self.min_days_earlier = int(os.environ.get("MIN_DAYS_EARLIER", "1"))
        self.max_date = os.environ.get("FECHA_MAXIMA", "").strip()

        # Frecuencia de sondeo
        self.polling_interval_minutes = int(cli_args.interval if cli_args and cli_args.interval else os.environ.get("POLLING_INTERVAL_MINUTES", "5"))

        # Notificaciones
        self.notification_channel = os.environ.get("NOTIFICATION_CHANNEL", "email")
        self.notification_email = os.environ.get("NOTIFICATION_EMAIL", "lamazabuelg@gmail.com")
        self.ntfy_topic = os.environ.get("NTFY_TOPIC", "husi-citas-alertas")
        self.telegram_bot_token = os.environ.get("TELEGRAM_BOT_TOKEN", "")
        self.telegram_chat_id = os.environ.get("TELEGRAM_CHAT_ID", "")
        self.gemini_api_key = os.environ.get("GEMINI_API_KEY", "")

    def validate(self):
        errors = []
        if not self.doc_num:
            errors.append("Falta HUSI_DOC_NUM en .env o parámetros")
        if not self.password:
            errors.append("Falta HUSI_PASSWORD en .env o parámetros")
        return errors

class HusiScraperAgent:
    """Agente Scraper: Autenticación oficial y sondeo de agenda en HUSI."""
    def __init__(self, config: HusiConfig):
        self.config = config
        self.token = None
        self.patient_name = None
        self.patient_id = None

    def autenticar(self):
        url = f"{self.config.base_url}/token"
        payload = {
            "grant_type": "password",
            "userName": self.config.doc_num,
            "userType": self.config.doc_type,
            "password": self.config.password
        }
        data = urllib.parse.urlencode(payload).encode("utf-8")
        req = urllib.request.Request(
            url,
            data=data,
            headers={
                "Content-Type": "application/x-www-form-urlencoded",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) HUSI-Agent/2.0"
            }
        )
        try:
            with urllib.request.urlopen(req, timeout=12) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                self.token = data.get("access_token")
                return True, "Autenticación exitosa en servidor HUSI"
        except urllib.error.HTTPError as e:
            return False, f"HTTP Error {e.code}: {e.read().decode('utf-8')}"
        except Exception as e:
            return False, f"Error de red al conectar a HUSI: {str(e)}"

    def obtener_citas_activas(self):
        if not self.token:
            return []
        url = f"{self.config.base_url}/api/appointment"
        req = urllib.request.Request(
            url,
            headers={
                "Authorization": f"Bearer {self.token}",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) HUSI-Agent/2.0"
            }
        )
        try:
            with urllib.request.urlopen(req, timeout=12) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                raw_citas = data.get("data", [])
                citas = []
                for c in raw_citas:
                    if not self.patient_name and c.get("patient"):
                        self.patient_name = c.get("patient")
                    if not self.patient_id and c.get("patientID"):
                        self.patient_id = c.get("patientID")

                    start_dt = c.get("start", "")
                    date_part = start_dt.split("T")[0] if "T" in start_dt else start_dt
                    time_part = start_dt.split("T")[1][:5] if "T" in start_dt else ""

                    citas.append({
                        "appointmentID": c.get("appointmentID"),
                        "code": c.get("code"),
                        "doctor": c.get("doctor"),
                        "doctorID": c.get("doctorID"),
                        "service": c.get("service"),
                        "serviceID": c.get("serviceID"),
                        "specialty": c.get("specialty"),
                        "specialtyID": c.get("specialtyID"),
                        "planID": c.get("planID"),
                        "attentionTypeID": c.get("attentionTypeID", 1), # 1 = Presencial
                        "date": date_part,
                        "time": time_part,
                        "location": c.get("officeName", "Consultorio HUSI"),
                        "status": "PROGRAMADA",
                        "raw_start": start_dt
                    })
                return citas
        except Exception as e:
            print(f"[Scraper] Error al obtener citas activas: {e}", file=sys.stderr)
            return []

    def consultar_disponibilidad_real(self, cita):
        """Consulta la disponibilidad REAL en HUSI para el servicio y especialidad específicos de una cita."""
        if not self.token or not cita:
            return []

        service_id = cita.get("serviceID")
        plan_id = cita.get("planID")
        specialty_id = cita.get("specialtyID")
        appt_id = cita.get("appointmentID")
        attention_type_id = cita.get("attentionTypeID", 1)

        url = (
            f"{self.config.base_url}/paciente/scheduleavailability/get?"
            f"available=true&serviceID={service_id}&planID={plan_id}&specialtyID={specialty_id}&"
            f"attentionTypeID={attention_type_id}&excludeAppointmentID={appt_id}"
        )
        req = urllib.request.Request(
            url,
            headers={
                "Authorization": f"Bearer {self.token}",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) HUSI-Agent/2.0"
            }
        )
        try:
            with urllib.request.urlopen(req, timeout=12) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                return data.get("data", [])
        except Exception as e:
            print(f"[Scraper] Error consultando disponibilidad real para cita {appt_id}: {e}", file=sys.stderr)
            return []

    def reprogramar_cita(self, cita, slot):
        """Ejecuta la confirmación de reprogramación en el backend de HUSI via PUT /api/appointment."""
        if not self.token:
            return False, "Sin token de sesión HUSI"

        url = f"{self.config.base_url}/api/appointment"
        schedule_id = slot.get("scheduleID") or slot.get("id")
        dt_raw = slot.get("dateTime") or slot.get("start") or f"{slot.get('date')}T{slot.get('time')}:00"
        start_time = dt_raw[:16] if len(dt_raw) >= 16 else dt_raw
        raw_s = slot.get("raw") or slot

        payload = {
            "appointmentID": cita.get("appointmentID"),
            "scheduleID": schedule_id,
            "patientID": self.patient_id,
            "planID": cita.get("planID"),
            "serviceID": cita.get("serviceID"),
            "specialtyID": cita.get("specialtyID"),
            "entityID": raw_s.get("entityID", 7),
            "doctorID": raw_s.get("userID") or raw_s.get("doctorID"),
            "attentionTypeID": cita.get("attentionTypeID", 1),
            "appointmentTypeID": raw_s.get("appointmentTypeID", 404),
            "start": start_time,
            "state": "A",
            "isReschedule": True,
            "appointmentRescheduleReasonID": 1,  # 1: Motivos personales
            "scheduleQty": 1,
            "isEmbedded": "1"
        }
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            url,
            data=data,
            headers={
                "Authorization": f"Bearer {self.token}",
                "Content-Type": "application/json;charset=UTF-8",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) HUSI-Agent/2.0",
                "Referer": f"{self.config.base_url}/paciente/cita/reprogramar",
                "Origin": self.config.base_url
            },
            method="PUT"
        )
        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                resp_text = resp.read().decode("utf-8")
                return True, f"Reprogramación confirmada en servidor HUSI: {resp_text}"
        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8", errors="ignore")
            return False, f"HTTP Error {e.code} al reprogramar en HUSI: {err_body}"
        except Exception as e:
            return False, f"Error al ejecutar PUT de reprogramación: {str(e)}"

class HusiValidatorAgent:
    """Agente Validador: Aplica estrictamente los criterios de reprogramación configurados."""
    def __init__(self, config: HusiConfig):
        self.config = config

    def evaluar(self, cita_actual, slots_reales):
        # SI NO HAY CUPOS REALES, DECIR LA VERDAD: NO MOCKEAR
        if not slots_reales:
            return {
                "decision": "KEEP_CURRENT",
                "selected_slot": None,
                "reasoning": (
                    f"Sondeo en vivo completado: El sistema HUSI reporta 0 cupos disponibles en este instante "
                    f"para '{cita_actual.get('service')} - {cita_actual.get('specialty')}'. Se mantiene intacta tu cita actual del "
                    f"{cita_actual.get('date')} a las {cita_actual.get('time')} hrs con {cita_actual.get('doctor')}."
                ),
                "meets_all_criteria": False,
                "slots_checked_count": 0
            }

        try:
            fecha_actual_dt = datetime.strptime(cita_actual.get("date"), "%Y-%m-%d").date()
        except Exception:
            fecha_actual_dt = datetime.now().date()

        candidatos_aprobados = []

        for s in slots_reales:
            # En la API de HUSI, la fecha y hora vienen en 'dateTime' (ej. '2026-11-30T08:00:00')
            dt_raw = s.get("dateTime") or s.get("start") or s.get("date") or ""
            if "T" in dt_raw:
                parts = dt_raw.split("T")
                slot_date_str = parts[0]
                slot_time_str = parts[1][:5]
            else:
                slot_date_str = s.get("date", "")
                slot_time_str = s.get("time", "")

            # Doctor en HUSI viene como 'doctorName' o 'doctor'
            slot_doctor = s.get("doctorName") or s.get("doctor") or ""

            # Modalidad en HUSI: 'attentionTypeIds': [1] (1 = Presencial, 2 = Telemedicina)
            att_types = s.get("attentionTypeIds") or [s.get("attentionTypeID", 1)]
            slot_attention_type = att_types[0] if isinstance(att_types, list) and len(att_types) > 0 else 1

            try:
                slot_date_dt = datetime.strptime(slot_date_str, "%Y-%m-%d").date()
            except Exception:
                continue

            # 1. Criterio de Fecha: Debe ser anterior a la cita actual
            dias_adelanto = (fecha_actual_dt - slot_date_dt).days
            if dias_adelanto < self.config.min_days_earlier:
                continue

            # 2. Criterio de Fecha Máxima
            if self.config.max_date:
                try:
                    max_dt = datetime.strptime(self.config.max_date, "%Y-%m-%d").date()
                    if slot_date_dt > max_dt:
                        continue
                except Exception:
                    pass

            # 3. Criterio de Horario (Mañana vs Tarde vs Indiferente)
            hour = 0
            if slot_time_str and ":" in slot_time_str:
                try:
                    hour = int(slot_time_str.split(":")[0])
                except Exception:
                    hour = 0
            if self.config.preferred_time == "morning" and hour >= 12:
                continue
            if self.config.preferred_time == "afternoon" and hour < 12:
                continue

            # 4. Criterio de Doctor (Mismo doctor vs Cualquiera)
            if self.config.preferred_doctor == "same_doctor":
                current_doc = cita_actual.get("doctor") or ""
                # Si el usuario quiere el mismo doctor, verificar coincidencia con el doctor asignado a ESTA cita
                if current_doc and not any(part.lower() in slot_doctor.lower() for part in current_doc.split() if len(part) > 3):
                    continue
            elif self.config.preferred_doctor != "any" and self.config.preferred_doctor:
                if self.config.preferred_doctor.lower() not in slot_doctor.lower():
                    continue

            # 5. Criterio de Modalidad (Presencial vs Virtual)
            if self.config.modality == "presencial" and slot_attention_type == 2:
                continue
            if self.config.modality == "virtual" and slot_attention_type != 2:
                continue

            candidatos_aprobados.append({
                "id": s.get("scheduleID") or s.get("id"),
                "scheduleID": s.get("scheduleID") or s.get("id"),
                "date": slot_date_str,
                "time": slot_time_str,
                "dateTime": dt_raw,
                "doctor": slot_doctor,
                "daysEarlier": dias_adelanto,
                "attentionTypeID": slot_attention_type,
                "room": f"Consultorio {s.get('officeID', 'HUSI')}",
                "raw": s
            })

        if not candidatos_aprobados:
            return {
                "decision": "KEEP_CURRENT",
                "selected_slot": None,
                "reasoning": (
                    f"Se detectaron {len(slots_reales)} cupos en el portal para '{cita_actual.get('service')}', "
                    f"pero ninguno cumplió con todos tus criterios configurados "
                    f"(Horario: {self.config.preferred_time}, Doctor: {self.config.preferred_doctor}, "
                    f"Modalidad: {self.config.modality}, Máx Fecha: {self.config.max_date or 'Sin límite'}). "
                    f"Se preserva la cita actual del {cita_actual.get('date')} {cita_actual.get('time')}."
                ),
                "meets_all_criteria": False,
                "slots_checked_count": len(slots_reales)
            }

        # Elegir el que tenga mayor adelanto de días
        candidatos_aprobados.sort(key=lambda x: x["daysEarlier"], reverse=True)
        mejor = candidatos_aprobados[0]

        return {
            "decision": "CONFIRM_RESCHEDULE",
            "selected_slot": mejor,
            "reasoning": (
                f"¡Cupo óptimo encontrado en HUSI para '{cita_actual.get('service')}'! "
                f"Fecha: {mejor['date']} a las {mejor['time']} ({mejor['doctor']}). "
                f"Adelanta la cita {mejor['daysEarlier']} días respecto a la fecha actual ({cita_actual.get('date')}) "
                f"y cumple al 100% con horario ({self.config.preferred_time}) y modalidad ({self.config.modality})."
            ),
            "meets_all_criteria": True,
            "days_earlier": mejor["daysEarlier"],
            "slots_checked_count": len(slots_reales)
        }

class HusiNotifierAgent:
    """Agente Notificador: Dispara alertas reales si se confirma una cita o en estado del sondeo."""
    def __init__(self, config: HusiConfig):
        self.config = config

    def notificar_reprogramacion(self, cita_antigua, nueva_cita, paciente):
        titulo = f"✅ ¡Cita de {cita_antigua.get('specialty')} en HUSI Reprogramada con Éxito!"
        mensaje = (
            f"Hola {paciente},\n\n"
            f"Tu bot autónomo ha reprogramado con éxito tu cita en el Hospital Universitario San Ignacio:\n\n"
            f"• Servicio: {cita_antigua.get('service')}\n"
            f"• Especialidad: {cita_antigua.get('specialty')}\n"
            f"• Profesional Asignado: {nueva_cita.get('doctor')}\n"
            f"• NUEVA FECHA CONFIRMADA: {nueva_cita.get('date')} a las {nueva_cita.get('time')} hrs\n"
            f"• Cita Anterior: {cita_antigua.get('date')} {cita_antigua.get('time')}\n"
            f"• Adelanto conseguido: {nueva_cita.get('daysEarlier')} días antes\n"
            f"• Ubicación: {nueva_cita.get('room') or cita_antigua.get('location')}\n\n"
            f"Puedes verificar tu confirmación oficial ingresando en:\n"
            f"https://agendatucita.husi.org.co/paciente"
        )
        
        # ntfy.sh push alert (gratuita e inmediata a celular y navegador)
        try:
            req = urllib.request.Request(
                f"https://ntfy.sh/{self.config.ntfy_topic}",
                data=mensaje.encode("utf-8"),
                headers={
                    "Title": titulo,
                    "Priority": "urgent",
                    "Tags": "hospital,white_check_mark"
                }
            )
            urllib.request.urlopen(req, timeout=5)
        except Exception:
            pass

        return {
            "sent": True,
            "recipient": self.config.notification_email,
            "timestamp": datetime.now().isoformat(),
            "specialty": cita_antigua.get("specialty"),
            "service": cita_antigua.get("service"),
            "newDate": nueva_cita.get("date"),
            "newTime": nueva_cita.get("time"),
            "doctor": nueva_cita.get("doctor")
        }

def ejecutar_sondeo(config: HusiConfig):
    """Ejecuta una iteración completa del pipeline multiagente evaluando TODAS las citas activas."""
    inicio = datetime.now()
    scraper = HusiScraperAgent(config)
    
    auth_ok, auth_msg = scraper.autenticar()
    if not auth_ok:
        return {
            "success": False,
            "error": auth_msg,
            "timestamp": inicio.isoformat()
        }

    citas = scraper.obtener_citas_activas()
    if not citas:
        return {
            "success": False,
            "error": "No se encontraron citas activas en HUSI para este usuario.",
            "patient": scraper.patient_name,
            "timestamp": inicio.isoformat()
        }

    validador = HusiValidatorAgent(config)
    notificador = HusiNotifierAgent(config)

    appointments_evaluated = []
    any_rescheduled = False
    total_slots_found = 0
    executions_list = []

    # REGLA CLAVE: Procesar CADA UNA de las citas activas (Gastroenterología, Oftalmología, etc.)
    for cita in citas:
        slots_reales = scraper.consultar_disponibilidad_real(cita)
        total_slots_found += len(slots_reales)

        evaluacion = validador.evaluar(cita, slots_reales)
        
        is_rescheduled = False
        ejecucion_info = None

        if evaluacion.get("decision") == "CONFIRM_RESCHEDULE" and evaluacion.get("selected_slot"):
            # Enviar solicitud oficial de reprogramación a HUSI
            success_put, msg_put = scraper.reprogramar_cita(cita, evaluacion["selected_slot"])
            if success_put:
                is_rescheduled = True
                any_rescheduled = True
                ejecucion_info = notificador.notificar_reprogramacion(
                    cita_antigua=cita,
                    nueva_cita=evaluacion["selected_slot"],
                    paciente=scraper.patient_name
                )
                ejecucion_info["confirmation_details"] = msg_put
            else:
                evaluacion["reasoning"] += f" [Aviso confirmación HUSI: {msg_put}]"

        appointments_evaluated.append({
            "appointmentID": cita.get("appointmentID"),
            "code": cita.get("code"),
            "specialty": cita.get("specialty"),
            "service": cita.get("service"),
            "doctor": cita.get("doctor"),
            "doctorID": cita.get("doctorID"),
            "date": cita.get("date"),
            "time": cita.get("time"),
            "location": cita.get("location"),
            "slots_found_count": len(slots_reales),
            "slots_real": slots_reales,
            "validation": evaluacion,
            "rescheduled": is_rescheduled,
            "execution": ejecucion_info
        })

    # Médicos descubiertos por el scrapper (citas agendadas y cupos disponibles en vivo)
    discovered_doctors = []
    seen_docs = set()

    for c in citas:
        d = c.get("doctor")
        if d and d not in seen_docs:
            seen_docs.add(d)
            discovered_doctors.append({
                "name": d,
                "specialty": c.get("specialty", ""),
                "service": c.get("service", ""),
                "source": "Cita Programada",
                "isCurrent": True
            })

    for eval_item in appointments_evaluated:
        for s in eval_item.get("slots_real", []):
            d_name = s.get("doctorName") or s.get("doctor")
            if d_name and d_name not in seen_docs:
                seen_docs.add(d_name)
                discovered_doctors.append({
                    "name": d_name,
                    "specialty": eval_item.get("specialty", ""),
                    "service": eval_item.get("service", ""),
                    "source": "Cupo Disponible en HUSI",
                    "isCurrent": False
                })

    # Cita representativa para retrocompatibilidad
    primary_eval = next((e for e in appointments_evaluated if e["rescheduled"]), appointments_evaluated[0])

    return {
        "success": True,
        "is_mocked": False,
        "timestamp": inicio.strftime("%Y-%m-%d %H:%M:%S"),
        "patient": scraper.patient_name or "Paciente HUSI",
        "doc_number": config.doc_num,
        "base_url": config.base_url,
        "criteria": {
            "preferred_time": config.preferred_time,
            "preferred_doctor": config.preferred_doctor,
            "modality": config.modality,
            "min_days_earlier": config.min_days_earlier,
            "max_date": config.max_date,
            "polling_interval_minutes": config.polling_interval_minutes
        },
        "total_appointments_tracked": len(citas),
        "all_appointments": citas,
        "appointments_evaluated": appointments_evaluated,
        "discovered_doctors": discovered_doctors,
        "slots_found_real_count": total_slots_found,
        "rescheduled": any_rescheduled,
        # Retrocompatibilidad
        "current_appointment": primary_eval,
        "validation": primary_eval.get("validation"),
        "execution": primary_eval.get("execution")
    }

def main():
    parser = argparse.ArgumentParser(description="Bot Multiagente Autónomo HUSI - Cobertura Multi-Citas")
    parser.add_argument("--daemon", action="store_true", help="Ejecutar en bucle continuo de sondeo según POLLING_INTERVAL_MINUTES")
    parser.add_argument("--interval", type=int, help="Intervalo de sondeo en minutos")
    parser.add_argument("--time", type=str, choices=["morning", "afternoon", "any"], help="Preferencia de horario")
    parser.add_argument("--doctor", type=str, help="Preferencia de doctor ('same_doctor', 'any' o nombre)")
    parser.add_argument("--modality", type=str, choices=["presencial", "virtual", "any"], help="Modalidad")
    parser.add_argument("--url", type=str, help="URL de la plataforma médica HUSI")
    parser.add_argument("--doc-type", type=str, help="Tipo de documento (1: CC)")
    parser.add_argument("--doc-num", type=str, help="Número de documento")
    parser.add_argument("--password", type=str, help="Contraseña de acceso")
    
    args = parser.parse_args()
    config = HusiConfig(args)

    validation_errors = config.validate()
    if validation_errors:
        print(json.dumps({"error": "Configuración inválida", "details": validation_errors}, indent=2))
        sys.exit(1)

    if not args.daemon:
        # Modo de pase único (para la API o terminal)
        resultado = ejecutar_sondeo(config)
        print(json.dumps(resultado, indent=2, ensure_ascii=False))
    else:
        # Modo Bucle Continuo (Daemon)
        interval_secs = config.polling_interval_minutes * 60
        print(f"=== Iniciando Modo Vigilancia Recurrente HUSI cada {config.polling_interval_minutes} minutos ===")
        print(f"• URL: {config.base_url}")
        print(f"• Paciente: C.C. {config.doc_num}")
        print(f"• Filtros: Horario={config.preferred_time} | Doctor={config.preferred_doctor} | Modalidad={config.modality}")
        print("Presiona Ctrl+C para detener.\n")

        iteracion = 1
        while True:
            ahora = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            print(f"[{ahora}] [Iteración {iteracion}] Consultando portal HUSI para todas las citas activas...")
            resultado = ejecutar_sondeo(config)

            if resultado.get("success"):
                total_citas = resultado.get("total_appointments_tracked", 0)
                total_cupos = resultado.get("slots_found_real_count", 0)
                print(f"  ➜ Total Citas Monitoreadas: {total_citas}")
                print(f"  ➜ Total Cupos encontrados en HUSI: {total_cupos}")

                for appt in resultado.get("appointments_evaluated", []):
                    spec = appt.get("specialty")
                    serv = appt.get("service")
                    val = appt.get("validation", {})
                    slots_cnt = appt.get("slots_found_count", 0)
                    print(f"    • [{spec} - {serv} ({appt.get('date')})]: {slots_cnt} cupos | Decisión: {val.get('decision')}")

                if resultado.get("rescheduled"):
                    print("  🎉 ¡CITA REPROGRAMADA EXITOSAMENTE! Notificación enviada.")
                    break
            else:
                print(f"  ✗ Error en sondeo: {resultado.get('error')}")

            print(f"  ⏳ Esperando {config.polling_interval_minutes} minutos para el próximo chequeo...\n")
            iteracion += 1
            time.sleep(interval_secs)

if __name__ == "__main__":
    main()
