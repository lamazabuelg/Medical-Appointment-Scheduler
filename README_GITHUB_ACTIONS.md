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

## 3. ¿Cómo cambiar el repositorio de Privado a Público en GitHub?

En tu captura de pantalla se observa el candado 🔒 junto a `lamazabuelg / Medical-Appointment-Scheduler`, indicando que está en Privado. Para cambiarlo a Público y tener minutos ilimitados:

1. En la barra superior de tu repositorio, haz clic en la pestaña **Settings** (es la última pestaña a la derecha, al lado de *Insights*).
2. En la página general de configuración, baja hasta el final del todo hasta la sección roja llamada **Danger Zone**.
3. En la primera opción, haz clic en el botón **Change visibility** (o **Change repository visibility**).
4. Selecciona **Make public**.
5. Te pedirá confirmar escribiendo el nombre de tu repositorio: `lamazabuelg/Medical-Appointment-Scheduler`.
6. Haz clic en **I understand, make this repository public**. ¡Listo! Ahora el repositorio es público y GitHub Actions no te cobrará ningún minuto.

---

## 4. ¿Dónde ver el resumen de citas evaluadas en cada ejecución?

Tienes **dos lugares directos** dentro de la pestaña **Actions**:

### A. En la pestaña "Summary" de la ejecución (Tabla Visual Formateada)
1. En la pantalla donde estás ahora (ver tu captura), en el menú de la izquierda haz clic en **🏠 Summary** (arriba de *All jobs*).
2. GitHub mostrará inmediatamente una **tabla formateada con insignias y estados** que detalla:
   - Paciente y documento.
   - Cada una de tus citas agendadas (Oftalmología, Gastroenterología Control, Gastroenterología Primera Vez).
   - Cuántos cupos encontró en el portal HUSI para cada una.
   - Diagnóstico (si no hay cupos o si los existentes son más lejanos que tu cita actual).
   - Si se logró una reprogramación efectiva al adelantar días.

### B. En el log del paso "Ejecutar motor multiagente HUSI"
1. En la vista de jobs, haz clic en el paso: **`> Ejecutar motor multiagente HUSI`**.
2. El paso se desplegará mostrando la consola en texto plano con el banner:
   ```text
   🏥 HUSI MULTI-AGENT APPOINTMENT MONITOR - RESUMEN DE EJECUCIÓN
   ================================================================================
   👤 Paciente: ... | Cédula: CC ...
   📊 Citas en Monitoreo: 3 | Cupos Detectados en HUSI: 48
   --------------------------------------------------------------------------------
   1. [Oftalmología] Oftalmologia General Primera Vez
      • Cita Actual: 2026-11-30 08:00
      • Cupos en Portal HUSI: 48 cupo(s) encontrado(s)
      • Diagnóstico: Los cupos existentes son para diciembre de 2026. Tu cita ya es la más cercana.
   ...
   ```

---

## 5. Paso a Paso para Activar en GitHub

### Paso 1: Subir el proyecto a tu GitHub
```bash
git init
git add .
git commit -m "feat: Bot multiagente HUSI con GitHub Actions"
git remote add origin https://github.com/lamazabuelg/Medical-Appointment-Scheduler.git
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
