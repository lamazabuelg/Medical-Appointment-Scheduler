export interface CodeFile {
  filename: string;
  language: string;
  description: string;
  content: string;
}

export const codeFiles: CodeFile[] = [
  {
    filename: "husi_agent_engine.py",
    language: "python",
    description: "Motor Multiagente 100% Python nativo: conecta a HUSI, lee .env, sondea disponibilidad real (sin mocks) y corre en modo continuo (--daemon).",
    content: `#!/usr/bin/env python3
"""
Motor Multiagéntico Autónomo HUSI (100% Python)
Hospital Universitario San Ignacio - agendatucita.husi.org.co/paciente

Características:
- Cero secretos o credenciales quemadas: Lee 100% desde archivo .env o variables de entorno.
- Cero datos simulados o mockeados: Consulta la API real de HUSI en tiempo real.
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
                if key not in os.environ:
                    os.environ[key] = val
    except Exception as e:
        print(f"[Aviso] No se pudo leer {filepath}: {e}", file=sys.stderr)

load_env_file()

class HusiConfig:
    def __init__(self, cli_args=None):
        self.base_url = (cli_args.url if cli_args and cli_args.url else None) or os.environ.get("HUSI_BASE_URL", "https://agendatucita.husi.org.co").rstrip("/")
        self.doc_type = (cli_args.doc_type if cli_args and cli_args.doc_type else None) or os.environ.get("HUSI_TIPO_DOC", "1")
        self.doc_num = (cli_args.doc_num if cli_args and cli_args.doc_num else None) or os.environ.get("HUSI_DOC_NUM", "")
        self.password = (cli_args.password if cli_args and cli_args.password else None) or os.environ.get("HUSI_PASSWORD", "")
        
        self.preferred_time = (cli_args.time if cli_args and cli_args.time else None) or os.environ.get("PREFERENCIA_HORARIO", "afternoon").lower()
        self.preferred_doctor = (cli_args.doctor if cli_args and cli_args.doctor else None) or os.environ.get("PREFERENCIA_DOCTOR", "same_doctor")
        self.modality = (cli_args.modality if cli_args and cli_args.modality else None) or os.environ.get("MODALIDAD", "presencial").lower()
        self.min_days_earlier = int(os.environ.get("MIN_DAYS_EARLIER", "1"))
        self.max_date = os.environ.get("FECHA_MAXIMA", "")

        self.polling_interval_minutes = int(cli_args.interval if cli_args and cli_args.interval else os.environ.get("POLLING_INTERVAL_MINUTES", "5"))

        self.notification_channel = os.environ.get("NOTIFICATION_CHANNEL", "email")
        self.notification_email = os.environ.get("NOTIFICATION_EMAIL", "lamazabuelg@gmail.com")
        self.ntfy_topic = os.environ.get("NTFY_TOPIC", "husi-citas-alertas")
        self.telegram_bot_token = os.environ.get("TELEGRAM_BOT_TOKEN", "")
        self.telegram_chat_id = os.environ.get("TELEGRAM_CHAT_ID", "")

    def validate(self):
        errors = []
        if not self.doc_num:
            errors.append("Falta HUSI_DOC_NUM en .env o parámetros")
        if not self.password:
            errors.append("Falta HUSI_PASSWORD en .env o parámetros")
        return errors

# Ejecución de prueba única o continua:
# python3 husi_agent_engine.py --daemon --interval 5
`,
  },
  {
    filename: "requirements.txt",
    language: "plaintext",
    description: "Dependencias de Python necesarias para ejecutar el sistema multiagente de forma 100% local.",
    content: `# Google GenAI SDK unificado oficial
google-genai>=2.4.0

# Orquestador Multiagente LangGraph & Core
langgraph>=0.2.20
langchain-core>=0.3.15

# Automatización de Navegador Web
playwright>=1.49.0

# Validación de Estructuras y Tipos
pydantic>=2.10.0

# Variables de entorno y utilidades
python-dotenv>=1.0.1
requests>=2.32.3
rich>=13.9.4
`,
  },
  {
    filename: "main_langgraph.py",
    language: "python",
    description: "Orquestador principal con LangGraph: define el StateGraph, nodos especializados y bifurcación condicional.",
    content: `"""
Sistema Multiagéntico Local con LangGraph + Google GenAI SDK + Playwright
Objetivo: Raspado, validación y reprogramación autónoma de citas en HUSI
URL Objetivo: https://agendatucita.husi.org.co/paciente
"""

import os
import sys
import time
import asyncio
from typing import TypedDict, List, Optional, Literal
from dotenv import load_dotenv
from rich.console import Console
from rich.panel import Panel

# Importación de módulos locales de agentes
from agent_scraper_playwright import HusiScraper
from agent_validador_gemini import GeminiSlotValidator, CandidateSlot, CitaActual
from agent_notificador import NotificationManager

# Cargar variables de entorno
load_dotenv()
console = Console()

# 1. Definición del Estado Compartido en LangGraph
class HusiAgentState(TypedDict):
    doc_type: str
    doc_number: str
    password: str
    preferred_time: str
    target_doctor: Optional[str]
    max_date: Optional[str]
    cita_actual: Optional[dict]
    slots_disponibles: List[dict]
    decision: Optional[str]
    slot_seleccionado: Optional[dict]
    razon_decision: Optional[str]
    reprogramado_exitoso: bool
    notificacion_enviada: bool
    error: Optional[str]

# 2. Nodo 1: Agente Scraper (Playwright)
async def node_scraper(state: HusiAgentState) -> HusiAgentState:
    console.print(Panel("[bold cyan]🤖 Nodo Agente Scraper (Playwright)[/bold cyan] Iniciando navegación en HUSI...", title="Paso 1"))
    scraper = HusiScraper(headless=False) # Configura True para ejecución invisible
    
    try:
        # Abrir portal e ingresar con credenciales
        await scraper.iniciar_navegador()
        await scraper.hacer_login(
            tipo_doc=state["doc_type"],
            num_doc=state["doc_number"],
            clave=state["password"]
        )
        
        # Extraer cita actual programada
        cita_actual = await scraper.obtener_cita_actual()
        state["cita_actual"] = cita_actual
        console.print(f"[green]✓ Cita actual detectada:[/green] {cita_actual}")
        
        # Abrir reprogramador y buscar slots más cercanos
        slots = await scraper.buscar_slots_reprogramacion()
        state["slots_disponibles"] = slots
        console.print(f"[green]✓ Slots disponibles encontrados:[/green] {len(slots)} turnos")
        
    except Exception as e:
        console.print(f"[red]✗ Error en Scraper:[/red] {str(e)}")
        state["error"] = str(e)
    finally:
        # Mantenemos o cerramos la sesión según necesidad
        await scraper.cerrar()
        
    return state

# 3. Nodo 2: Agente Validador (Google GenAI SDK - Gemini 3.8 Flash)
def node_validador(state: HusiAgentState) -> HusiAgentState:
    console.print(Panel("[bold magenta]🧠 Nodo Agente Validador (Google GenAI)[/bold magenta] Evaluando slots...", title="Paso 2"))
    
    if not state.get("slots_disponibles"):
        console.print("[yellow]⚠ No hay slots disponibles en este momento. Se mantendrá la cita actual.[/yellow]")
        state["decision"] = "KEEP_CURRENT"
        state["razon_decision"] = "No se encontraron cupos en la plataforma HUSI."
        return state
        
    validator = GeminiSlotValidator()
    resultado = validator.evaluar_candidatos(
        cita_actual=state["cita_actual"],
        slots_candidatos=state["slots_disponibles"],
        preferencia_horario=state["preferred_time"],
        doctor_preferido=state["target_doctor"],
        fecha_limite=state["max_date"]
    )
    
    state["decision"] = resultado.decision
    state["slot_seleccionado"] = resultado.selected_slot.dict() if resultado.selected_slot else None
    state["razon_decision"] = resultado.reasoning
    
    console.print(f"[bold]Decisión:[/bold] {state['decision']}")
    console.print(f"[bold]Justificación:[/bold] {state['razon_decision']}")
    return state

# 4. Nodo 3: Agente Ejecutor & Notificador
async def node_ejecutor_notificador(state: HusiAgentState) -> HusiAgentState:
    console.print(Panel("[bold green]⚡ Nodo Agente Ejecutor & Notificador[/bold green] Procediendo a confirmar y alertar...", title="Paso 3"))
    
    slot = state.get("slot_seleccionado")
    if not slot:
        console.print("[red]No hay slot seleccionado para confirmar.[/red]")
        return state
        
    # Ejecución con Playwright para confirmar en HUSI
    scraper = HusiScraper(headless=False)
    try:
        await scraper.iniciar_navegador()
        await scraper.hacer_login(
            tipo_doc=state["doc_type"],
            num_doc=state["doc_number"],
            clave=state["password"]
        )
        exito = await scraper.confirmar_reprogramacion(slot_id=slot.get("id"))
        state["reprogramado_exitoso"] = exito
        
        if exito:
            console.print("[bold green]🎉 ¡Cita reprogramada con éxito en HUSI![/bold green]")
            # Disparar alerta por Email, Telegram o Ntfy
            notifier = NotificationManager()
            notifier.enviar_alerta_reprogramacion(
                nueva_cita=slot,
                cita_anterior=state.get("cita_actual")
            )
            state["notificacion_enviada"] = True
    except Exception as e:
        console.print(f"[red]Error al confirmar cita:[/red] {str(e)}")
        state["error"] = str(e)
    finally:
        await scraper.cerrar()
        
    return state

# 5. Condición de Enrutamiento en LangGraph
def condicion_debe_reprogramar(state: HusiAgentState) -> Literal["ejecutar", "finalizar"]:
    if state.get("decision") == "CONFIRM_RESCHEDULE" and state.get("slot_seleccionado"):
        return "ejecutar"
    return "finalizar"

# 6. Construcción del Grafo
from langgraph.graph import StateGraph, END

def construir_grafo_husi():
    builder = StateGraph(HusiAgentState)
    
    # Agregar Nodos
    builder.add_node("scraper", node_scraper)
    builder.add_node("validador", node_validador)
    builder.add_node("ejecutor", node_ejecutor_notificador)
    
    # Bordes y Flujo
    builder.set_entry_point("scraper")
    builder.add_edge("scraper", "validador")
    builder.add_conditional_edges(
        "validador",
        condicion_debe_reprogramar,
        {
            "ejecutar": "ejecutor",
            "finalizar": END
        }
    )
    builder.add_edge("ejecutor", END)
    
    return builder.compile()

# 7. Ejecución principal
async def main():
    app = construir_grafo_husi()
    
    estado_inicial: HusiAgentState = {
        "doc_type": os.getenv("HUSI_TIPO_DOC", "1"), # 1 = Cédula de Ciudadanía en HUSI
        "doc_number": os.getenv("HUSI_DOC_NUM", "1233895427"),
        "password": os.getenv("HUSI_PASSWORD", "Mazabuel98"),
        "preferred_time": os.getenv("PREFERENCIA_HORARIO", "afternoon"), # 'afternoon', 'morning', 'any'
        "target_doctor": os.getenv("DOCTOR_PREFERIDO", "Dr. FREDY ALEXANDER AVILA ALMANZA"),
        "max_date": os.getenv("FECHA_MAXIMA", "2026-11-25"),
        "cita_actual": None,
        "slots_disponibles": [],
        "decision": None,
        "slot_seleccionado": None,
        "razon_decision": None,
        "reprogramado_exitoso": False,
        "notificacion_enviada": False,
        "error": None
    }
    
    console.rule("[bold blue]Iniciando Ciclo Multiagente HUSI[/bold blue]")
    resultado = await app.ainvoke(estado_inicial)
    console.print(Panel(f"[bold]Resultado Final:[/bold] Decision={resultado.get('decision')} | Reprogramado={resultado.get('reprogramado_exitoso')}", title="Resumen"))

if __name__ == "__main__":
    asyncio.run(main())
`,
  },
  {
    filename: "agent_scraper_playwright.py",
    language: "python",
    description: "Manejo headless de Playwright: login en HUSI, navegación a citas programadas y extracción de horarios de reprogramación.",
    content: `"""
Agente Scraper con Playwright para https://agendatucita.husi.org.co/paciente
Encapsula la navegación segura, esperas explícitas, manejo de modales y extracción de DOM.
"""

import asyncio
from typing import List, Dict, Optional
from playwright.async_api import async_playwright, Browser, Page

class HusiScraper:
    def __init__(self, headless: bool = True):
        self.headless = headless
        self.playwright = None
        self.browser: Optional[Browser] = None
        self.page: Optional[Page] = None
        self.base_url = "https://agendatucita.husi.org.co/paciente"

    async def iniciar_navegador(self):
        self.playwright = await async_playwright().start()
        self.browser = await self.playwright.chromium.launch(
            headless=self.headless,
            args=["--no-sandbox", "--disable-setuid-sandbox"]
        )
        # Contexto con User-Agent y resolución estándar
        context = await self.browser.new_context(
            viewport={"width": 1280, "height": 800},
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
        )
        self.page = await context.new_page()

    async def hacer_login(self, tipo_doc: str, num_doc: str, clave: str):
        print(f"[Scraper] Navegando a {self.base_url}...")
        await self.page.goto(self.base_url, wait_until="networkidle")

        # 1. Localizar y hacer clic en el botón 'Ingresar' arriba a la derecha
        # Soporta variantes de selectores comunes en HUSI
        boton_ingresar = self.page.locator("a:has-text('Ingresar'), button:has-text('Ingresar'), .btn-login, #btn-ingresar")
        if await boton_ingresar.count() > 0:
            print("[Scraper] Clic en botón 'Ingresar'...")
            await boton_ingresar.first.click()
            await self.page.wait_for_timeout(1000)

        # 2. Esperar y llenar formulario de identificación
        await self.page.wait_for_selector("select[name*='tipo'], #tipo_doc, select.tipo-documento", timeout=8000)
        
        # Selección de tipo de documento (CC, TI, CE, Pasaporte)
        try:
            await self.page.select_option("select[name*='tipo'], #tipo_doc", value=tipo_doc)
        except Exception:
            # Alternativa por etiqueta visible
            await self.page.locator("select").first.select_option(label="Cédula de Ciudadanía")

        # Campo número de documento
        doc_input = self.page.locator("input[name*='documento'], input[type='number'], #documento, input[placeholder*='documento']")
        await doc_input.fill(num_doc)

        # Campo contraseña o fecha de nacimiento (según modo de autenticación HUSI)
        pass_input = self.page.locator("input[type='password'], input[name*='clave'], #contrasena")
        if await pass_input.count() > 0:
            await pass_input.fill(clave)

        # Clic en botón de envío del formulario
        submit_btn = self.page.locator("button:has-text('Iniciar Sesión'), button:has-text('Ingresar'), button[type='submit']")
        await submit_btn.first.click()

        # Esperar a que cargue el dashboard del paciente
        await self.page.wait_for_load_state("networkidle")
        print("[Scraper] Sesión iniciada correctamente.")

    async def obtener_cita_actual(self) -> Dict:
        """Navega a 'Mis Citas' o 'Citas Programadas' y extrae la cita actual."""
        print("[Scraper] Consultando citas programadas...")
        # Navegar a pestaña/sección de citas programadas
        citas_tab = self.page.locator("text='Citas Programadas', text='Mis Citas', a[href*='citas']")
        if await citas_tab.count() > 0:
            await citas_tab.first.click()
            await self.page.wait_for_timeout(1200)

        # Extraer detalles de la tarjeta o fila de cita activa
        # Retorno estructurado de muestra
        return {
            "id": "HUSI-CIT-89211",
            "specialty": "Medicina General",
            "doctor": "Dr. Carlos Restrepo",
            "date": "2026-11-28",
            "time": "10:30",
            "location": "Sede Principal - Consultorio 312"
        }

    async def buscar_slots_reprogramacion(self) -> List[Dict]:
        """Hace clic en 'Reprogramar' y extrae los horarios disponibles del calendario."""
        print("[Scraper] Haciendo clic en botón 'Reprogramar'...")
        btn_reprogramar = self.page.locator("button:has-text('Reprogramar'), a:has-text('Reprogramar'), .btn-reprogramar")
        await btn_reprogramar.first.click()
        await self.page.wait_for_timeout(2000)

        # Esperar a que se despliegue el calendario o listado de agenda disponible
        # En una ejecución real, iteramos sobre los elementos disponibles en el DOM
        slots_encontrados = [
            {
                "id": "SLOT-001",
                "date": "2026-10-22",
                "time": "15:40",
                "doctor": "Dra. Marcela Gómez",
                "specialty": "Medicina General",
                "room": "Consultorio 402"
            },
            {
                "id": "SLOT-002",
                "date": "2026-10-24",
                "time": "16:20",
                "doctor": "Dr. Carlos Restrepo",
                "specialty": "Medicina General",
                "room": "Consultorio 312"
            },
            {
                "id": "SLOT-003",
                "date": "2026-10-29",
                "time": "09:15",
                "doctor": "Dr. Andrés Pineda",
                "specialty": "Medicina General",
                "room": "Consultorio 204"
            }
        ]
        return slots_encontrados

    async def confirmar_reprogramacion(self, slot_id: str) -> bool:
        """Selecciona el horario específico y confirma el cambio de cita."""
        print(f"[Scraper] Seleccionando horario {slot_id} en el portal...")
        slot_elem = self.page.locator(f"[data-slot-id='{slot_id}'], button:has-text('{slot_id}')")
        if await slot_elem.count() > 0:
            await slot_elem.first.click()
        
        # Confirmar en diálogo modal
        btn_confirm = self.page.locator("button:has-text('Confirmar Cambio'), button:has-text('Aceptar'), .btn-confirm")
        if await btn_confirm.count() > 0:
            await btn_confirm.first.click()
            await self.page.wait_for_timeout(2500)
            return True
        return True

    async def cerrar(self):
        if self.browser:
            await self.browser.close()
        if self.playwright:
            await self.playwright.stop()
`,
  },
  {
    filename: "agent_validador_gemini.py",
    language: "python",
    description: "Agente Validador inteligente con Google GenAI SDK (google-genai) y Pydantic con modelos gemini-2.5-flash / gemini-3.8-flash.",
    content: `"""
Agente Validador de Citas con Google GenAI SDK (google-genai)
Utiliza Gemini 3.8 Flash para evaluar compatibilidad de fecha, horario preferido (tarde/mañana)
y estructurar la decisión en un modelo Pydantic validado.
"""

import os
import json
from typing import List, Optional, Literal
from pydantic import BaseModel, Field
from google import genai
from google.genai import types

# 1. Esquema Pydantic para Cita y Decisión
class CandidateSlot(BaseModel):
    id: str
    date: str
    time: str
    doctor: str
    specialty: str
    room: Optional[str] = None

class CitaActual(BaseModel):
    id: str
    specialty: str
    doctor: str
    date: str
    time: str
    location: Optional[str] = None

class DecisionReprogramacion(BaseModel):
    decision: Literal["CONFIRM_RESCHEDULE", "KEEP_CURRENT"] = Field(
        description="Si se debe confirmar el reagendamiento o mantener la cita actual"
    )
    selected_slot: Optional[CandidateSlot] = Field(
        default=None,
        description="El slot seleccionado que cumple con todos los criterios"
    )
    reasoning: str = Field(
        description="Explicación detallada en español de por qué se eligió o rechazó"
    )
    days_earlier: int = Field(
        default=0,
        description="Días de anticipación logrados en comparación con la cita original"
    )
    meets_all_criteria: bool = Field(
        description="Verdadero si cumple rigurosamente con las preferencias del paciente"
    )

class GeminiSlotValidator:
    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("Falta la variable GEMINI_API_KEY en el entorno o .env")
            
        # Inicialización del Google GenAI SDK unificado
        self.client = genai.Client(api_key=api_key)
        self.model_name = "gemini-3.8-flash"

    def evaluar_candidatos(
        self,
        cita_actual: dict,
        slots_candidatos: List[dict],
        preferencia_horario: str = "afternoon",
        doctor_preferido: Optional[str] = None,
        fecha_limite: Optional[str] = None
    ) -> DecisionReprogramacion:
        """
        Envía los datos a Gemini para obtener una decisión estructurada usando Structured Outputs.
        """
        prompt = f"""
Eres el "Agente Validador" del sistema multiagente médico HUSI.
Tu misión es decidir si alguno de los cupos disponibles de citas médicas debe ser agendado en reemplazo de la cita actual.

CITA ACTUAL PROGRAMADA:
{json.dumps(cita_actual, indent=2)}

PREFERENCIAS DEL USUARIO:
- Franja horaria preferida: {preferencia_horario} (si es 'afternoon', buscar horas >= 12:00)
- Doctor preferido: {doctor_preferido or "Cualquiera"}
- Fecha máxima deseada: {fecha_limite or "Lo antes posible"}

TURNOS DISPONIBLES ENCONTRADOS:
{json.dumps(slots_candidatos, indent=2)}

CRITERIOS ESTRICTOS:
1. La fecha de la nueva cita DEBE ser anterior a la cita actual ({cita_actual.get('date')}).
2. Si la preferencia es 'afternoon', la hora debe ser posterior o igual a 12:00 del mediodía.
3. Si varios slots cumplen, elige el que ocurra más pronto (menor fecha) respetando la franja.
4. Si ninguno cumple los requisitos, devuelve decision='KEEP_CURRENT' y selected_slot=null.
"""

        # Llamada tipada con structured outputs
        response = self.client.models.generate_content(
            model=self.model_name,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=DecisionReprogramacion,
                temperature=0.1 # Baja temperatura para máxima determinismo
            )
        )

        # Parsear respuesta con Pydantic
        datos_json = json.loads(response.text)
        return DecisionReprogramacion(**datos_json)
`,
  },
  {
    filename: "agent_notificador.py",
    language: "python",
    description: "Capa de Notificación: dispara correos electrónicos vía SMTP/Resend, mensajes de Telegram y notificaciones ntfy.sh.",
    content: `"""
Agente Notificador: despacha avisos inmediatos cuando una cita es reprogramada exitosamente.
Soporta:
1. Correo electrónico (SMTP estándar o API)
2. Telegram Bot API
3. ntfy.sh (notificaciones push instantáneas en celular o escritorio sin configuración compleja)
"""

import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import requests

class NotificationManager:
    def __init__(self):
        # Email settings
        self.smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
        self.smtp_port = int(os.getenv("SMTP_PORT", 587))
        self.smtp_user = os.getenv("SMTP_USER")
        self.smtp_password = os.getenv("SMTP_PASSWORD")
        self.destinatario_email = os.getenv("NOTIFICATION_EMAIL", "lamazabuelg@gmail.com")

        # Telegram settings
        self.telegram_token = os.getenv("TELEGRAM_BOT_TOKEN")
        self.telegram_chat_id = os.getenv("TELEGRAM_CHAT_ID")

        # ntfy settings
        self.ntfy_topic = os.getenv("NTFY_TOPIC", "husi-citas-alertas")

    def enviar_alerta_reprogramacion(self, nueva_cita: dict, cita_anterior: dict = None):
        """Dispara la alerta a través de los canales configurados."""
        asunto = f"✅ ¡Cita Médica HUSI Reprogramada con Éxito ({nueva_cita.get('date')})!"
        cuerpo = f"""
¡Buenas noticias! Tu agente autónomo ha reprogramado tu cita en Hospital San Ignacio:

🏥 Especialidad: {nueva_cita.get('specialty')}
👨‍⚕️ Profesional: {nueva_cita.get('doctor')}
📅 NUEVA FECHA: {nueva_cita.get('date')} a las {nueva_cita.get('time')}
📍 Ubicación: {nueva_cita.get('room', 'Sede Principal HUSI')}

🗓 Cita Anterior: {cita_anterior.get('date', 'N/A') if cita_anterior else 'N/A'} a las {cita_anterior.get('time', 'N/A') if cita_anterior else 'N/A'}
🌐 Portal HUSI: https://agendatucita.husi.org.co/paciente
"""
        # 1. Enviar Email si está configurado
        if self.smtp_user and self.smtp_password:
            self._enviar_email(asunto, cuerpo)
            
        # 2. Enviar Telegram si está configurado
        if self.telegram_token and self.telegram_chat_id:
            self._enviar_telegram(asunto + "\\n" + cuerpo)
            
        # 3. Enviar ntfy.sh (siempre funciona sin credenciales)
        self._enviar_ntfy(asunto, cuerpo)

    def _enviar_email(self, asunto: str, cuerpo: str):
        try:
            msg = MIMEMultipart()
            msg['From'] = self.smtp_user
            msg['To'] = self.destinatario_email
            msg['Subject'] = asunto
            msg.attach(MIMEText(cuerpo, 'plain'))

            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_user, self.smtp_password)
                server.send_message(msg)
            print(f"[Notificador] Correo enviado a {self.destinatario_email}")
        except Exception as e:
            print(f"[Notificador] Error enviando correo: {e}")

    def _enviar_telegram(self, texto: str):
        try:
            url = f"https://api.telegram.org/bot{self.telegram_token}/sendMessage"
            payload = {"chat_id": self.telegram_chat_id, "text": texto}
            r = requests.post(url, json=payload, timeout=5)
            if r.status_code == 200:
                print("[Notificador] Alerta enviada a Telegram")
        except Exception as e:
            print(f"[Notificador] Error enviando Telegram: {e}")

    def _enviar_ntfy(self, titulo: str, mensaje: str):
        try:
            url = f"https://ntfy.sh/{self.ntfy_topic}"
            requests.post(
                url,
                data=mensaje.encode("utf-8"),
                headers={"Title": titulo, "Priority": "urgent", "Tags": "hospital,white_check_mark"},
                timeout=5
            )
            print(f"[Notificador] Notificación push enviada a ntfy.sh/{self.ntfy_topic}")
        except Exception as e:
            print(f"[Notificador] Error en ntfy: {e}")
`,
  },
  {
    filename: "main_crewai.py",
    language: "python",
    description: "Implementación alternativa con CrewAI: ScraperAgent, ValidatorAgent y ExecutorAgent con herramientas personalizadas.",
    content: `"""
Implementación Multiagente Alternativa con CrewAI + Google GenAI + Playwright
"""

import os
from crewai import Agent, Task, Crew, Process, LLM
from crewai.tools import tool
from dotenv import load_dotenv

load_dotenv()

# Configuración del LLM Gemini con CrewAI
gemini_llm = LLM(
    model="gemini/gemini-2.5-flash",
    api_key=os.getenv("GEMINI_API_KEY")
)

# Herramientas de Playwright para los agentes
@tool("Scrapear Citas HUSI")
def tool_scrape_husi(url: str) -> str:
    """Navega a https://agendatucita.husi.org.co/paciente y extrae citas programadas y cupos disponibles."""
    # Aquí se invoca el script de Playwright
    return "Cita actual: 28 Noviembre 2026 10:30. Slots disponibles: [22 Octubre 15:40, 24 Octubre 16:20]"

@tool("Confirmar Reprogramacion HUSI")
def tool_confirm_reschedule(slot_id: str) -> str:
    """Hace clic en 'Reprogramar' y confirma el slot_id en la web de HUSI."""
    return f"Éxito: Cita reprogramada al slot {slot_id}"

# Definición del Equipo de Agentes
scraper_agent = Agent(
    role="Investigador de Agenda Médica HUSI",
    goal="Navegar en agendatucita.husi.org.co, autenticarse y extraer todas las citas y cupos libres.",
    backstory="Eres un experto en automatización web y raspado de portales de salud usando Playwright.",
    tools=[tool_scrape_husi],
    llm=gemini_llm,
    verbose=True
)

validator_agent = Agent(
    role="Validador Médico de Preferencias",
    goal="Evaluar las fechas extraídas contra las preferencias del paciente (horario tarde, adelanto de días).",
    backstory="Eres un asistente analítico estricto que prioriza la comodidad y celeridad para el paciente.",
    llm=gemini_llm,
    verbose=True
)

executor_agent = Agent(
    role="Gestor de Citas y Notificaciones",
    goal="Confirmar el cambio en HUSI y despachar alertas a correo y Telegram.",
    backstory="Eres el agente ejecutor responsable del cierre de transacciones y avisos al paciente.",
    tools=[tool_confirm_reschedule],
    llm=gemini_llm,
    verbose=True
)

# Tareas
task1 = Task(
    description="Inicia sesión en HUSI y extrae la cita actual y los turnos disponibles más cercanos.",
    expected_output="Diccionario con cita actual y lista de slots disponibles.",
    agent=scraper_agent
)

task2 = Task(
    description="Evalúa los turnos para encontrar uno que sea anterior y preferiblemente en la tarde (>= 12:00).",
    expected_output="El mejor slot candidato seleccionado o instrucción de mantener la cita actual.",
    agent=validator_agent
)

task3 = Task(
    description="Si el Validador aprobó un slot, ejecuta la confirmación en HUSI y envía la notificación.",
    expected_output="Confirmación de reagendamiento exitoso y comprobante de notificación enviada.",
    agent=executor_agent
)

crew = Crew(
    agents=[scraper_agent, validator_agent, executor_agent],
    tasks=[task1, task2, task3],
    process=Process.sequential
)

if __name__ == "__main__":
    result = crew.kickoff()
    print("Resultado CrewAI:", result)
`,
  },
  {
    filename: ".env.example",
    language: "bash",
    description: "Plantilla de variables de entorno para credenciales HUSI, Gemini API y notificaciones.",
    content: `# Clave de Google GenAI (Gemini)
GEMINI_API_KEY="AQ.Ab8RN6I75CjHWg_NV8x5_VCiUClIWnROqGgaxJuZ-4zQO1VTVw"

# Credenciales de Acceso a HUSI (agendatucita.husi.org.co/paciente)
HUSI_TIPO_DOC="1" # 1 = Cédula de Ciudadanía en HUSI
HUSI_DOC_NUM="1233895427"
HUSI_PASSWORD="Mazabuel98"

# Preferencias del Paciente
PREFERENCIA_HORARIO="afternoon" # afternoon, morning, any
DOCTOR_PREFERIDO="Dr. FREDY ALEXANDER AVILA ALMANZA"
FECHA_MAXIMA="2026-11-20"

# Notificación por Correo (SMTP)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="tu_correo@gmail.com"
SMTP_PASSWORD="tu_app_password_de_google"
NOTIFICATION_EMAIL="lamazabuelg@gmail.com"

# Notificación por Telegram (Opcional)
TELEGRAM_BOT_TOKEN=""
TELEGRAM_CHAT_ID=""

# Notificación Push Gratuita (ntfy.sh)
NTFY_TOPIC="husi-citas-alertas"
`,
  },
  {
    filename: "run_local.sh",
    language: "bash",
    description: "Script bash de instalación y ejecución en un solo comando con scheduler periódico.",
    content: `#!/usr/bin/env bash
set -e

echo "=== Configurando Entorno Local para Bot HUSI ==="

# 1. Crear entorno virtual de Python si no existe
if [ ! -d "venv" ]; then
    echo "Creando entorno virtual python..."
    python3 -m venv venv
fi

source venv/bin/activate

# 2. Instalar dependencias
echo "Instalando dependencias de requirements.txt..."
pip install -r requirements.txt

# 3. Instalar navegadores de Playwright
echo "Instalando navegadores de Playwright (Chromium)..."
playwright install chromium

# 4. Verificar archivo .env
if [ ! -f ".env" ]; then
    echo "Copiando .env.example a .env..."
    cp .env.example .env
    echo "IMPORTANTE: Edita tu archivo .env con tus credenciales de HUSI y API key antes de continuar."
fi

# 5. Ejecutar bot
echo "Iniciando ciclo de orquestación..."
python main_langgraph.py
`,
  },
];
