# 🏥 HUSI Medical Appointment Monitor & Auto-Rescheduler

Sistema multiagente autónomo en **Python** para el monitoreo continuo y la reprogramación automática de citas médicas en el portal oficial del **Hospital Universitario San Ignacio** ([agendatucita.husi.org.co](https://agendatucita.husi.org.co)).

---

## 🚀 Características Principales

* **Motor 100% Python Nativo:** Todo el scraping, autenticación, consulta de disponibilidad, evaluación de criterios y confirmación de reprogramación está escrito en un único script autónomo (`husi_agent_engine.py`) utilizando únicamente la biblioteca estándar de Python (sin dependencias complejas).
* **Cobertura Multi-Cita Completa:** Detecta y vigila **cada una** de tus citas agendadas activas en la institución médica (ej. citas de Gastroenterología, Controles, etc.) en cada iteración.
* **Consulta en Vivo (Cero Caché):** Utiliza los parámetros oficiales de la interfaz web de HUSI (`getActiveStates=true`, `onlyMain=true`), descartando automáticamente citas canceladas o históricas, e inyecta parámetros anti-caché en cada petición.
* **Reprogramación Automática Segura:** Si detecta un cupo que adelanta tu cita y cumple con tus preferencias (horario, doctor, modalidad), ejecuta la solicitud oficial de reprogramación (`PUT /api/appointment`) de forma inmediata.
* **Alertas Reales Estrictas:** Solo envía notificaciones (correo electrónico vía SMTP y notificaciones push vía `ntfy.sh`) cuando ocurre una **reprogramación efectiva** con éxito. Los intentos sin cupos son silenciosos.
* **Sesiones Continuas de 3 Horas en GitHub Actions:** En lugar de levantar y destruir servidores cada 5 minutos, una sola máquina virtual gratuita ejecuta una sesión continua de 3 horas haciendo chequeos precisos cada 5 minutos exactos sin tiempos muertos de cola.

---

## ⚙️ Configuración de Credenciales y Criterios

Tanto para ejecución local como en GitHub Actions, el bot se parametriza mediante variables de entorno (en local vía archivo `.env` y en GitHub vía **Repository Secrets**):

| Variable / Secret | Requerido | Descripción | Valor por Defecto |
| :--- | :---: | :--- | :--- |
| `HUSI_DOC_NUM` | **Sí** | Número de documento de identidad del paciente | *(Tu documento)* |
| `HUSI_PASSWORD` | **Sí** | Contraseña de acceso al portal de HUSI | *(Tu contraseña)* |
| `HUSI_TIPO_DOC` | No | Tipo de documento (`1`: C.C., `2`: T.I., `4`: C.E.) | `1` |
| `PREFERENCIA_HORARIO` | No | Franja horaria requerida (`any`, `morning`, `afternoon`) | `any` *(Cualquier Horario)* |
| `PREFERENCIA_DOCTOR` | No | Preferencia de profesional (`any`, `same_doctor`, o nombre) | `any` *(Cualquier Profesional)* |
| `MODALIDAD` | No | Modalidad de atención (`presencial`, `virtual`, `any`) | `presencial` |
| `MIN_DAYS_EARLIER` | No | Mínimo de días que debe adelantarse la cita para aprobar | `1` |
| `FECHA_MAXIMA` | No | Fecha límite máxima tolerada (`YYYY-MM-DD`) | *(Vacío: sin límite)* |
| `NOTIFICATION_EMAIL` | No | Correo receptor de la alerta de reprogramación | *(Tu correo)* |
| `SMTP_USER` | No | Correo emisor SMTP (ej. cuenta de Gmail) | *(Tu correo)* |
| `SMTP_PASS` | No | Contraseña de aplicación para envío SMTP | *(Contraseña App)* |
| `NTFY_TOPIC` | No | Canal de alertas push gratuitas para celular / web | `husi-citas-alertas` |

---

## 💻 Ejecución Local con Python

Puedes ejecutar el motor directamente en tu máquina:

```bash
# 1. Pase único de verificación (evalúa todas las citas y muestra resumen)
python3 husi_agent_engine.py --mode reschedule --summary

# 2. Modo continuo (Vigilancia en bucle cada 5 minutos durante 3 horas)
python3 husi_agent_engine.py --daemon --duration-hours 3.0 --interval 5
```

---

## ☁️ Ejecución Automática Gratuita en GitHub Actions

El repositorio incluye el workflow configurado en `.github/workflows/husi-monitor.yml`:

### 1. ¿Cómo funciona?
* Se ejecuta automáticamente en bloques programados cada 3 horas (`cron: '0 */3 * * *'`).
* Cada sesión mantiene la máquina virtual activa durante **3 horas**, ejecutando un chequeo en vivo en HUSI **cada 5 minutos exactos**.
* Al ser un repositorio **Público**, GitHub otorga minutos **ilimitados y 100% gratuitos**.

### 2. Configurar los Secretos en GitHub
1. En tu repositorio en GitHub, ve a **Settings** > **Secrets and variables** > **Actions**.
2. Haz clic en **New repository secret**.
3. Agrega tus credenciales (`HUSI_DOC_NUM`, `HUSI_PASSWORD`, `NOTIFICATION_EMAIL`, etc.).
4. **Seguridad Garantizada:** GitHub almacena los secretos encriptados con Libsodium; nunca son visibles en el código ni en los logs.

### 3. Iniciar una Sesión Manualmente
1. Entra a la pestaña **Actions** de tu repositorio.
2. Selecciona **HUSI Continuous Appointment Monitor (3-Hour Live Sessions)** en la barra lateral.
3. Haz clic en **Run workflow** > **Run workflow**.

### 4. ¿Dónde ver los resultados?
* **En el log en vivo:** Haz clic en el paso `> Ejecutar motor continuo cada 5 minutos` para ver la consola en tiempo real iteración por iteración.
* **En el Resumen Visual:** Haz clic en **🏠 Summary** (en el menú lateral de la ejecución) para ver la tabla Markdown formateada con el estado de cada cita médica agendada y los cupos disponibles en el hospital.

---

## 📁 Estructura del Proyecto

```text
├── husi_agent_engine.py       # Motor 100% Python: Agentes Scraper, Validador y Notificador
├── .github/
│   └── workflows/
│       └── husi-monitor.yml   # Workflow para sesiones continuas de 3 horas en GitHub Actions
├── .env.example               # Plantilla de variables de entorno para configuración local
├── .gitignore                 # Exclusión estricta de credenciales (.env) y bases de datos locales
├── README.md                  # Documentación oficial del repositorio
├── server.ts                  # Servidor Express opcional para la interfaz web interactiva
└── src/                       # Frontend React opcional (Dashboard visual en AI Studio)
```

---

## 🔒 Privacidad y Seguridad

* El archivo `.gitignore` excluye permanentemente `.env`, `data/` y cualquier caché local.
* Nunca subas tus credenciales de HUSI o contraseñas al código fuente; utiliza exclusivamente los **Secrets de GitHub**.
