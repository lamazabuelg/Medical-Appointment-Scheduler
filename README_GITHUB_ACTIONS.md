# Guía de Ejecución Continua con Recursos Gratuitos (GitHub Actions)

Esta guía explica en detalle cómo configurar el bot multiagente de **Hospital Universitario San Ignacio (HUSI)** para ejecutarse en GitHub Actions con recursos gratuitos.

---

## 1. ¿Es posible ejecutarlo cada 5 minutos gratis con GitHub Actions?

### **Respuesta corta: SÍ, pero con una consideración clave según el tipo de repositorio.**

| Tipo de Repositorio en GitHub | Minutos Gratuitos Incluidos | ¿Soporta cada 5 minutos 24/7? |
| :--- | :--- | :--- |
| **Repositorio PÚBLICO** | **ILIMITADOS (100% Gratis)** | **SÍ, 100% viable y gratuito.** En repositorios públicos, GitHub no cobra ni descuenta minutos de Actions. |
| **Repositorio PRIVADO** | **2,000 minutos / mes** | **Consumiría la cuota en ~7 días.** (12 ejecuciones/h × 24h = 288 runs/día × 1 min = 288 min/día. 2,000 ÷ 288 ≈ 7 días). |

> ⚠️ **IMPORTANTE SOBRE SEGURIDAD EN REPOSITORIO PÚBLICO:**
> Si utilizas un repositorio público para tener minutos ilimitados, **NUNCA subas tus contraseñas o documento en el código o en el archivo `.env`**.
> Todas tus credenciales (`HUSI_DOC_NUM`, `HUSI_PASSWORD`, `SMTP_PASS`, etc.) deben guardarse en los **GitHub Secrets** (que son 100% encriptados y privados, invisibles para el público). El archivo `.gitignore` de este proyecto ya excluye `.env` para protegerte.

---

## 2. Archivo de Workflow ya Incluido

Ya se ha creado el archivo listo para usar en tu proyecto:
`.github/workflows/husi-monitor.yml`

Este workflow:
1. Se dispara automáticamente con el cron `*/5 * * * *` (cada 5 minutos).
2. Permite ejecución manual inmediata con un clic ("Run workflow" desde la pestaña *Actions*).
3. Utiliza `concurrency` para que nunca se crucen dos ejecuciones simultáneas.
4. Ejecuta el sondeo de **todas tus citas activas** (Gastroenterología, Oftalmología, etc.).
5. Si detecta un cupo más cercano que cumpla tus criterios, **reprograma de inmediato en HUSI** y dispara la alerta real a tu correo o notificación push.

---

## 3. Paso a Paso para Activar en GitHub

### Paso 1: Subir el proyecto a tu GitHub
```bash
git init
git add .
git commit -m "feat: Bot multiagente HUSI con GitHub Actions"
git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git
git branch -M main
git push -u origin main
```

### Paso 2: Configurar los Secretos Encriptados (GitHub Secrets)
En tu repositorio de GitHub:
1. Ve a **Settings** > **Secrets and variables** > **Actions**.
2. Haz clic en **New repository secret**.
3. Agrega las siguientes variables:

| Nombre del Secreto | Descripción | Ejemplo / Valor |
| :--- | :--- | :--- |
| `HUSI_DOC_NUM` *(Obligatorio)* | Tu número de identificación | `1000000000 (Tu número real)` |
| `HUSI_PASSWORD` *(Obligatorio)* | Tu contraseña del portal HUSI | `TuContraseña` |
| `HUSI_TIPO_DOC` | Tipo de documento | `1` (Cédula de Ciudadanía) |
| `PREFERENCIA_HORARIO` | Franja horaria requerida | `any` (Cualquier Horario por defecto) |
| `PREFERENCIA_DOCTOR` | Preferencia de médico | `any` (Cualquier Profesional por defecto) |
| `MODALIDAD` | Modalidad de atención | `presencial` |
| `MIN_DAYS_EARLIER` | Mínimo de días de adelanto | `1` |
| `FECHA_MAXIMA` | Límite máximo de fecha | *(Dejar vacío si no hay límite)* |
| `NOTIFICATION_EMAIL` | Correo donde recibir la alerta | `tu_correo@gmail.com` |
| `SMTP_USER` | Correo emisor para alertas | `tu_correo@gmail.com` |
| `SMTP_PASS` | Contraseña de aplicación Gmail | `xxxx xxxx xxxx xxxx` |

### Paso 3: Probar la Ejecución
1. En tu repositorio, entra a la pestaña **Actions**.
2. En el menú izquierdo verás: **HUSI Appointment Poller & Auto-Rescheduler**.
3. Haz clic en **Run workflow** > **Run workflow**.
4. Verás la ejecución en verde con el registro detallado del sondeo. A partir de allí, correrá cada 5 minutos automáticamente.

---

## 4. Alternativas Gratuitas para Repositorio Privado

Si prefieres mantener tu repositorio en modo **Privado** y no agotar los 2,000 minutos mensuales:

### Alternativa A: Ajustar el cron a horarios útiles
El 99% de las citas y cancelaciones médicas en HUSI ocurren en días hábiles y horario laboral:
- Cambiar el cron a cada **15 minutos** de lunes a viernes entre las 6:00 a.m. y 7:00 p.m. UTC-5:
  ```yaml
  schedule:
    - cron: '*/15 11-23 * * 1-5'
  ```
  Esto consume únicamente ~400 minutos al mes (muy por debajo de los 2,000 gratuitos).

### Alternativa B: GitHub Self-Hosted Runner (100% Gratis en repo privado)
Puedes registrar tu propio equipo (computador, laptop o Raspberry Pi) como un *Self-Hosted Runner* en GitHub:
- En tu repo: **Settings** > **Actions** > **Runners** > **New self-hosted runner**.
- Los minutos ejecutados en tu propio runner son **completamente ilimitados y gratuitos** en repositorios privados.

### Alternativa C: Servicio Free Tier Externo (Render / Cron-job.org)
- Desplegar el servidor Node/Express en un servicio gratuito como **Render.com** o **Railway**.
- Usar un servicio gratuito de cron externo como **cron-job.org** para enviar una solicitud `POST /api/agent/probe` cada 5 minutos.
