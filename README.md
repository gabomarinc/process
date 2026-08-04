# Kônsul Process

**Kônsul Process** es una aplicación MicroSaaS de la suite **Kônsul** que permite diseñar plantillas de procesos de negocio, ejecutar flujos operativos con seguimiento en tiempo real, gestionar proyectos estilo Kanban, y automatizar tareas con integración de IA — todo en un entorno multi-tenant con autenticación SSO.

> **Filosofía:** *"La app trabaja para el usuario, no el usuario para la app."*

---

## 🛠 Arquitectura y Stack Tecnológico

Monolito **serverless** preparado para Vercel:

| Capa | Tecnología | Detalles |
|------|-----------|----------|
| **Frontend** | React 19 + Vite 8 | CSS puro, Radix UI (primitivas accesibles), Framer Motion (animaciones), Lucide React (íconos), date-fns (calendario) |
| **Backend** | Express.js 5 (Node.js) | API REST monolítica desplegada como Vercel Serverless Function |
| **Base de Datos** | PostgreSQL (Neon Serverless) | Pool optimizado con `pg`, idle timeout de 1s para autosuspend rápido |
| **Autenticación** | Kinde SSO + JWT local + API Key | OAuth2 Authorization Code Flow, JWT de 30 días, API Keys `kp_live_*` |
| **IA** | Google Gemini API (`@google/generative-ai`) | Generación de plantillas desde documentos/voz, análisis de proyectos |
| **Email** | Resend API + Nodemailer (SMTP relay) | Emails transaccionales y relay personalizado por usuario |
| **Hosting** | Vercel | `vercel.json` para enrutamiento `/api/*` → serverless, fallback SPA |

### Optimización de Costos Neon

- **Pool Config:** `max: 6`, `idleTimeoutMillis: 1000ms` — conexiones se liberan en 1 segundo
- **Polling reducido:** Notificaciones cada 5 minutos (con refresh inmediato por visibilidad de pestaña)
- **Índices de BD:** Creados automáticamente en columnas de alta frecuencia de consulta
- **Efecto neto:** Autosuspend de Neon se activa casi instantáneamente tras cada request

---

## 🚀 Funcionalidades Completas

### 📋 Gestor de Plantillas de Procesos

- **Creación manual** paso a paso con wizard guiado de 4 pasos (Nombre, Objetivo, Hitos, Duración)
- **Generación con IA (Gemini):**
  - Sube un documento (PDF/DOCX/TXT) con drag-and-drop
  - Escribe un prompt descriptivo
  - **Entrada por voz** (Web Speech API / `webkitSpeechRecognition`)
  - Gemini genera la plantilla completa: pasos, descripciones, motivaciones, fechas, asignaciones
  - Modal de preview y edición antes de guardar
- **Importación desde ClickUp:** Importa tareas y listas directamente como plantillas
- Categorización por área (RRHH, Finanzas, Operaciones, etc.)
- Acompañante IA personalizable por plantilla (nombre + avatar emoji)
- **Sistema de aprobación:** Plantillas de gerentes quedan `pending_approval` hasta aprobación del admin; las del admin se aprueban automáticamente
- Detalle expandible de cada paso con motivación ("¿Por qué hacemos esto?")

### ▶️ Ejecuciones en Tiempo Real

- Lanzamiento de ejecuciones desde cualquier plantilla aprobada (modal con selector de plantilla, cliente, fecha, calendario con date-fns)
- Dos modos de vista:
  - **Enfoque 🔍:** Vista detallada con pasos expandibles, comentarios, adjuntos
  - **Vista de Pájaro 🦅:** Grid compacto de todas las ejecuciones
- **Filtros:** Por cliente, columna de estado, categoría y búsqueda de texto
- Checklist interactivo con checkboxes de completado por paso
- Notas/comentarios por paso con menciones `@miembro` (sincronizados entre vistas)
- Subida de archivos por paso con validación de formatos y preview de imágenes
- **Email directo desde pasos:** Sub-modal de email con credenciales SMTP del usuario
- **Solicitudes de ayuda:** Botón para pedir asistencia que notifica al gerente/departamento
- Banner del acompañante IA con mensajes motivacionales contextuales
- Análisis IA por paso (Gemini analiza y sugiere acciones)
- Animación de confetti al completar un proceso 🎉
- **Automatización ReactivaLeads:** Al completar todos los pasos, se dispara automáticamente un POST a ReactivaLeads API

### 📊 Tablero Kanban (Project Management)

- Vista de tablero tipo Trello/Notion dentro del submenu de Ejecuciones
- **HTML5 Drag & Drop nativo** entre columnas con persistencia en base de datos
- Columnas personalizables (agregar, renombrar inline con doble-clic, eliminar)
- **Búsqueda global** por nombre de instancia, plantilla o categoría
- Filtro por prioridad (Baja 🟢, Media 🟡, Alta 🟠, Urgente 🔴)
- **Tarjetas con información completa:**
  - Categoría, prioridad (badge animado para urgentes), progreso con barra
  - Fecha límite con indicador de estado (retrasado ⚠️ en rojo, hoy en amarillo)
  - Avatar del acompañante IA con tooltip
  - Stack de avatares de miembros asignados con overflow (+2)
- Modal de detalle al hacer clic en una tarjeta con **4 pestañas**:
  - **📋 Checklist:** Lista de tareas interactiva con expand/collapse, descripción, motivación, notas
  - **💬 Comentarios:** Feed unificado de comentarios por paso, totalmente sincronizado con vista normal
  - **📎 Adjuntos:** Subida libre de archivos con asociación opcional a pasos. Detección automática de tipo de archivo (PDF 📄, Imagen 🖼️, Spreadsheet 📊, Presentación 📋, ZIP 🗜️). Listado con metadatos, vista externa, eliminación
  - **📅 Calendario:** Calendario mensual visual con navegación mes/año, celdas coloreadas por estado (🔴 retrasado, 🔸 pendiente, 🟢 completado), lista de tareas del mes actual
- **Asistente IA de Proyectos:** Botón para análisis Gemini del estado actual con resumen y siguientes pasos

### 👥 Gestión de Equipo y Permisos

- Directorio de personal con roles, departamentos y avatares
- **Roles del sistema:** `admin` (fundador), `gerente`, `miembro`/`agent`, `guest` (invitado)
- Wizard de 3 pasos para crear/editar miembros (info personal, rol/departamento/jefe, asignación de procesos)
- **Asignación Matricial (RACI):** Panel Sí/No para asignar qué pasos de qué procesos opera cada miembro
- Invitación por email con link de activación (Resend API, token de 24h)
- Re-envío de invitación con token fresco
- Auto-inserción del admin como `team_member` en el bootstrap
- **Gestión de usuarios (Admin):** Crear, eliminar, cambiar rol. Límite de 10 invitados

### 🏢 Clientes

- Registro de clientes asociados a la organización
- Tarjetas visuales estilo "Destination Card" con colores HSL personalizados, banderas, imágenes de fondo y conteo de proyectos activos
- Filtrado de ejecuciones por cliente seleccionado
- Creación rápida desde el panel de ejecuciones o el modal de lanzamiento

### 🔔 Sistema de Notificaciones

- **Detección automática** de pasos vencidos (intervalo de 60s en frontend)
- **Notificaciones nativas del navegador** (Browser Notification API, solicita permisos automáticamente)
- **Panel de notificaciones:** Badge con conteo de no leídas (cap 9+), dropdown con tipos (message 💬, alert ⚠️, success ✅)
- **Acciones directas en notificación:**
  - **"Sí, listo"** → Marca el paso como completado inmediatamente
  - **"No, necesito ayuda"** → Envía solicitud de ayuda al equipo
  - Navegación directa a la ejecución al hacer clic
- Marcar como leída, eliminar
- **Emails automáticos:** Alertas de asignación de pasos, tareas vencidas, y solicitudes de ayuda vía Resend API
- Persistencia de logs en base de datos
- Sistema de toasts in-app (éxito, error, info)

### 🔗 Ecosistema de Integraciones

#### ClickUp
- Configuración de token y workspace con test de conexión
- Navegación jerárquica: Workspaces → Spaces → Folders → Lists → Statuses
- Creación de reglas: mapear listas/estatus de ClickUp → plantillas de Process
- Patrón de título configurable con variables (`{template_title}`, `{task_name}`, `{list_name}`, `{task_id}`)
- **Webhook receiver** (`POST /api/webhooks/clickup`) para auto-crear ejecuciones cuando cambia un estatus en ClickUp
- Aprobación de reglas por admin (gerentes crean reglas en `pending_approval`)
- Activar/desactivar/eliminar reglas

#### ReactivaLeads
- Configuración de API key con test de conexión
- Mapeo de reglas: plantilla Kônsul ↔ campaña ReactivaLeads con mapping JSONB
- **Webhook receiver** (`POST /api/reactivaleads/webhook`) para triggers externos
- **Auto-trigger:** Al completar todas las tareas de una ejecución, se envía automáticamente a ReactivaLeads

#### Email (SMTP/IMAP Personalizado)
- Configuración de credenciales SMTP e IMAP por usuario
- Test de conexión (SMTP via Nodemailer, IMAP via TCP/TLS socket)
- Relay de emails sin estado desde los pasos del proceso

#### API Tokens (Service-to-Service)
- Generación de API keys con formato `kp_live_[24_hex_bytes]`
- Gestión: crear, copiar, revocar
- Autenticación vía header `x-api-key`
- Registro de último uso (`last_used_at`)

#### Solicitudes On-Demand
- Modal para solicitar integraciones personalizadas (Salesforce, HubSpot, SAP, etc.)
- Envía email a `somos@konsul.digital`

#### Suite Hub
- Indicador de estado de conexión al Hub de Automatizaciones de Kônsul Suite

### ⚙️ Ajustes

- **Perfil:** Nombre, email, cambio de contraseña, selección de acompañante IA (nombre + avatar), emoji avatar personalizado
- **Email SMTP:** Configuración de host, puerto, usuario, contraseña, SSL/TLS para emails directos
- **Organización (solo admin):** Nombre de empresa, descripción, gestión de departamentos
- **API Tokens:** Crear, listar, copiar, revocar desde el panel
- **Gemini API Key:** Configurable por organización (BD) o por usuario (localStorage)
- **Preferencias de notificaciones** y configuración de temas

### 🎮 Gamificación

- Tarjetas de logros (`AchievementCard`) con badges, racha, y estadísticas de usuario

### 📱 Responsive

- Navegación desktop con mega-menu dropdowns
- Barra de navegación flotante para móviles
- Modals y vistas adaptados a pantallas pequeñas

---

## 🗄 Esquema de Base de Datos

PostgreSQL en **Neon Serverless**. Todas las tablas y columnas se crean/actualizan automáticamente en el arranque vía migraciones idempotentes (`IF NOT EXISTS`).

### Tablas

| Tabla | Descripción | Columnas Clave |
|-------|-------------|----------------|
| `organizations` | Tenants/empresas | `name`, `email`, `gemini_api_key`, `clickup_token`, `clickup_workspace_id`, `reactivaleads_api_key`, `description`, `departments` (JSONB), `kanban_columns` (JSONB) |
| `users` | Usuarios de la plataforma | `organization_id` (FK), `name`, `email`, `password`, `role`, `kinde_id`, `companion_name`, `companion_avatar`, `reset_token`, `reset_token_expiry` |
| `team_members` | Empleados del equipo | `organization_id` (FK), `name`, `role`, `email`, `avatar`, `department` |
| `templates` | Plantillas de procesos | `organization_id` (FK), `title`, `category`, `steps` (JSONB), `status`, `companion_*`, `created_at` |
| `instances` | Ejecuciones activas | `organization_id` (FK), `template_id`, `instance_name`, `steps` (JSONB), `status`, `priority`, `attachments` (JSONB), `started_at` |
| `clients` | Clientes de la organización | `organization_id` (FK), `name`, `created_at` |
| `clickup_rules` | Reglas de sync con ClickUp | `organization_id` (FK), `rule_name`, `clickup_list_id`, `clickup_list_name`, `clickup_status`, `template_id`, `title_pattern`, `active`, `status` |
| `reactivaleads_rules` | Reglas de ReactivaLeads | `organization_id` (FK), `rule_name`, `konsul_template_id`, `reactivaleads_template_id`, `mapping` (JSONB), `active` |
| `api_tokens` | Tokens de API externa | `organization_id` (FK), `name`, `token` (UNIQUE), `last_used_at` |
| `notifications` | Notificaciones in-app | `user_id` (FK), `type`, `message`, `instance_id`, `step_id`, `read`, `timestamp` |
| `notification_logs` | Logs de alertas de procesos | `organization_id` (FK), `instance_id`, `step_id`, `instance_name`, `step_title`, `message`, `logged_at` |

### Índices

```sql
CREATE INDEX IF NOT EXISTS idx_instances_org ON instances(organization_id);
CREATE INDEX IF NOT EXISTS idx_team_members_org ON team_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_clients_org ON clients(organization_id);
CREATE INDEX IF NOT EXISTS idx_api_tokens_token ON api_tokens(token);
```

### Estructura JSONB de `steps`

```json
{
  "id": "step_uuid",
  "title": "Nombre del paso",
  "description": "Descripción detallada",
  "motivation": "¿Por qué hacemos esto?",
  "dueDate": "2026-08-15",
  "durationDays": 3,
  "assignedTo": "member_id o email",
  "isCompleted": false,
  "acceptedFormats": [".pdf", ".docx"],
  "uploadedFileName": "contrato_firmado.pdf",
  "comments": [
    {
      "id": "comment_timestamp",
      "author": "Nombre",
      "text": "Contenido del comentario",
      "timestamp": "2026-08-04T10:00:00Z"
    }
  ]
}
```

### Estructura JSONB de `attachments`

```json
[
  {
    "id": "att_timestamp",
    "name": "archivo.pdf",
    "type": "application/pdf",
    "url": "blob:...",
    "stepId": "step_uuid o null",
    "uploadedAt": "2026-08-04T10:00:00Z",
    "uploadedBy": "Nombre del usuario"
  }
]
```

---

## 🔐 Autenticación

### 1. Kinde SSO (OAuth2 Authorization Code Flow)

| Endpoint | Función |
|----------|---------|
| `GET /api/auth/login` | Construye URL de Kinde con `prompt=none` para login continuo |
| `GET /api/auth/register` | Inicia registro en Kinde (`prompt=create`) |
| `GET /api/auth/kinde_callback` | Intercambia auth code → access token → perfil Kinde → sync/create usuario en PostgreSQL → genera JWT local (30 días) |
| `GET /api/auth/logout` | Limpia sesión y redirige a Kinde logout |

### 2. JWT Token (Interno)

- Generado en el callback de Kinde o login local
- Almacenado en `localStorage` del navegador
- Payload: `{ id, email, organizationId, role, companionName?, companionAvatar? }`
- Validado por middleware `authenticateToken` en cada request protegido
- **Auto-inyección global:** Un interceptor de `window.fetch` añade el header `Authorization: Bearer <token>` automáticamente a todas las llamadas `/api/`
- Sesiones sin `organizationId` se invalidan automáticamente por seguridad

### 3. API Key (Service-to-Service)

- Header: `x-api-key: kp_live_...` o `Authorization: Bearer kp_live_...`
- Validado contra tabla `api_tokens`
- Genera usuario sintético: `{ role: 'admin', email: 'api-caller@konsul.digital' }`
- Actualiza `last_used_at` de forma asíncrona (no bloquea el request)
- Error response:
  ```json
  {
    "success": false,
    "error": {
      "code": "UNAUTHORIZED",
      "message": "API key inválida o revocada."
    }
  }
  ```

### 4. Recuperación de Contraseña

| Endpoint | Función |
|----------|---------|
| `POST /api/auth/forgot-password` | Genera token de reset (1h), envía link por email via Resend |
| `POST /api/auth/reset-password` | Valida token, hashea nueva contraseña con bcrypt (10 rounds) |

---

## 📡 API REST — Referencia Completa

Base URL: `https://process.konsul.digital/api`

### Auth y Perfil

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `GET` | `/api/auth/login` | — | Redirect a login Kinde |
| `GET` | `/api/auth/register` | — | Redirect a registro Kinde |
| `GET` | `/api/auth/kinde_callback` | — | Callback OAuth, emite JWT |
| `GET` | `/api/auth/logout` | — | Logout y redirect |
| `POST` | `/api/auth/forgot-password` | — | Envía email de reset |
| `POST` | `/api/auth/reset-password` | — | Resetea contraseña con token |
| `PUT` | `/api/auth/profile` | JWT | Actualiza perfil (nombre, email, password, companion). Re-emite JWT |
| `PUT` | `/api/auth/email-settings` | JWT | Configura SMTP/IMAP del usuario |

### Dashboard Bootstrap

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `GET` | `/api/bootstrap` | JWT | Retorna en un solo request: usuario, organización, plantillas, ejecuciones, equipo, logs, clientes, reglas ClickUp/ReactivaLeads, API tokens, notificaciones |

### Plantillas

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `GET` | `/api/templates` | JWT | Lista plantillas (filtrado por rol) |
| `POST` | `/api/templates` | JWT | Crear plantilla (status auto-asignado por rol) |
| `PUT` | `/api/templates/:id` | JWT | Actualizar plantilla |
| `PUT` | `/api/templates/:id/status` | JWT (admin) | Aprobar/rechazar plantilla |
| `DELETE` | `/api/templates/:id` | JWT | Eliminar plantilla |

### Ejecuciones

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `GET` | `/api/instances` | JWT | Lista ejecuciones (filtrado para guests) |
| `POST` | `/api/instances` | JWT | Crear ejecución desde plantilla |
| `PUT` | `/api/instances/:id` | JWT | Actualizar (steps, status, priority, attachments). Auto-trigger ReactivaLeads al completar |
| `DELETE` | `/api/instances/:id` | JWT | Eliminar ejecución |

### Equipo

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `GET` | `/api/team` | JWT | Lista miembros (join con users) |
| `POST` | `/api/team` | JWT | Crear miembro + cuenta guest + email de invitación |
| `POST` | `/api/team/:id/resend-invite` | JWT | Re-enviar invitación con token fresco |
| `PUT` | `/api/team/:id` | JWT | Actualizar miembro |
| `DELETE` | `/api/team/:id` | JWT (admin) | Eliminar miembro y cuenta |

### Usuarios

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `GET` | `/api/users` | JWT (admin) | Lista usuarios con auto-healing de cuentas |
| `POST` | `/api/users` | JWT (admin) | Crear usuario (límite 10 guests) |
| `DELETE` | `/api/users/:id` | JWT (admin) | Eliminar usuario (protege auto-eliminación) |
| `PUT` | `/api/users/:id/role` | JWT (admin) | Cambiar rol de usuario |

### Clientes

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `GET` | `/api/clients` | JWT | Lista clientes |
| `POST` | `/api/clients` | JWT | Crear cliente |
| `DELETE` | `/api/clients/:id` | JWT | Eliminar cliente |

### Notificaciones

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `GET` | `/api/notifications` | JWT | Logs de notificaciones de la org |
| `POST` | `/api/notifications` | JWT | Crear notificación (resuelve destinatarios, envía email vía Resend) |
| `GET` | `/api/notifications/:userId` | JWT | Top 50 notificaciones in-app del usuario |
| `PUT` | `/api/notifications/:id/read` | JWT | Marcar como leída |
| `DELETE` | `/api/notifications/:id` | JWT | Eliminar notificación |
| `POST` | `/api/notification-logs` | JWT | Crear log de alerta |

### Organización

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `GET` | `/api/organization` | JWT | Obtener datos de la organización |
| `PUT` | `/api/organization` | JWT (admin) | Actualizar (nombre, Gemini key, descripción, departamentos) |
| `PUT` | `/api/organization/kanban-columns` | JWT (admin) | Configurar columnas del Kanban |

### ClickUp

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `GET` | `/api/organization/clickup` | JWT | Obtener token/workspace guardados |
| `PUT` | `/api/organization/clickup` | JWT | Guardar token/workspace |
| `POST` | `/api/integrations/clickup/test` | JWT | Test de conexión ClickUp API |
| `GET` | `/api/integrations/clickup/teams` | JWT | Proxy: listar workspaces |
| `GET` | `/api/integrations/clickup/spaces` | JWT | Proxy: listar spaces |
| `GET` | `/api/integrations/clickup/folders-and-lists` | JWT | Proxy: folders + folderless lists |
| `GET` | `/api/integrations/clickup/lists` | JWT | Proxy: listar lists |
| `GET` | `/api/integrations/clickup/list-details` | JWT | Proxy: detalles y statuses |
| `GET` | `/api/integrations/clickup/rules` | JWT | Listar reglas |
| `POST` | `/api/integrations/clickup/rules` | JWT | Crear regla (pending para gerentes) |
| `PUT` | `/api/integrations/clickup/rules/:id` | JWT | Actualizar title_pattern |
| `PUT` | `/api/integrations/clickup/rules/:id/status` | JWT (admin) | Aprobar/rechazar regla |
| `DELETE` | `/api/integrations/clickup/rules/:id` | JWT | Eliminar regla |
| `POST` | `/api/webhooks/clickup` | — | Webhook receiver (auto-crea ejecuciones) |

### ReactivaLeads

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `POST` | `/api/integrations/reactivaleads/test` | JWT | Test de API key |
| `POST` | `/api/integrations/reactivaleads/token` | JWT (admin) | Guardar API key |
| `GET` | `/api/integrations/reactivaleads/templates` | JWT | Listar templates de ReactivaLeads |
| `GET` | `/api/integrations/reactivaleads/rules` | JWT | Listar reglas |
| `POST` | `/api/integrations/reactivaleads/rules` | JWT | Crear regla de mapeo |
| `DELETE` | `/api/integrations/reactivaleads/rules/:id` | JWT | Eliminar regla |
| `POST` | `/api/reactivaleads/webhook` | — | Webhook receiver |

### Email

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `POST` | `/api/email/test-connection` | JWT | Test de conexión SMTP/IMAP |
| `POST` | `/api/email/send-email` | JWT | Enviar email vía SMTP del usuario |
| `POST` | `/api/ondemand-request` | JWT | Enviar solicitud de integración custom |

### API Tokens

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `GET` | `/api/developer/tokens` | JWT (admin) | Listar tokens |
| `POST` | `/api/developer/tokens` | JWT (admin) | Generar token `kp_live_*` |
| `DELETE` | `/api/developer/tokens/:id` | JWT (admin) | Revocar token |

### API Pública v1 (Auth: `x-api-key`)

Para integración con el **Hub de Automatizaciones de Kônsul Suite** y servicios externos.

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `GET` | `/api/v1/health` | — | Health check (`{ status: "ok" }`) |
| `GET` | `/api/v1/templates` | API Key | Plantillas aprobadas con variables `{placeholder}` detectadas |
| `POST` | `/api/v1/templates/execute` | API Key | Ejecutar plantilla con sustitución de variables |
| `GET` | `/api/v1/team-members` | API Key | Listar miembros del equipo (id, name, email) |
| `POST` | `/api/v1/executions` | API Key | Crear ejecución directa por template_id |
| `GET` | `/api/v1/executions/:id` | API Key | Detalle de ejecución con pasos y meta |

#### Ejemplo: Ejecutar plantilla con variables

```bash
curl -X POST https://process.konsul.digital/api/v1/templates/execute \
  -H "x-api-key: kp_live_abc123..." \
  -H "Content-Type: application/json" \
  -d '{
    "template_id": "tmpl_onboarding_2026",
    "variables": {
      "Cliente / Nombre de la Ejecución": "Acme Corp",
      "Fecha de Inicio": "2026-08-15",
      "nombre_empleado": "Juan Pérez"
    }
  }'
```

```json
{
  "success": true,
  "message": "Ejecución creada exitosamente",
  "execution_id": "inst_a1b2c3d4e5f6"
}
```

---

## 💻 Instalación y Desarrollo Local

### 1. Variables de Entorno

Crea un archivo `.env` en la raíz:

```env
# Database
DATABASE_URL=postgres://usuario:password@ep-xxxxx.us-east-2.aws.neon.tech/neondb?sslmode=require

# Auth
JWT_SECRET=super_secreto_2026

# Kinde SSO
KINDE_ISSUER_URL=https://tu-dominio.kinde.com
KINDE_CLIENT_ID=tu_client_id
KINDE_CLIENT_SECRET=tu_client_secret
KINDE_SITE_URL=http://localhost:3000
KINDE_POST_LOGOUT_REDIRECT_URL=http://localhost:3000

# Email (opcional)
RESEND_API_KEY=re_xxxxx

# Integraciones (opcionales)
# Se configuran desde la UI del Ecosistema
```

### 2. Levantar el Entorno

```bash
npm install
npm run dev
```

Utiliza `concurrently` para levantar:
- **Vite** (frontend) en `http://localhost:5173` con proxy `/api` → Express
- **Express** (backend) en `http://localhost:3001`

### 3. Build de Producción

```bash
npm run build
```

Genera los assets estáticos en `/dist`.

---

## ☁️ Despliegue en Vercel

1. Crea un proyecto en Vercel conectado al repositorio de GitHub.
2. Configura **todas** las variables de entorno en el dashboard de Vercel.
3. Para `KINDE_SITE_URL` y `KINDE_POST_LOGOUT_REDIRECT_URL`, usa la URL de producción (ej. `https://process.konsul.digital`).
4. Vercel utiliza las reglas de reescritura en `vercel.json`:
   - `/api/*` → ejecuta `api/index.js` como Serverless Function
   - Todo lo demás → sirve `dist/index.html` (SPA fallback)

---

## 🗂 Estructura del Proyecto

```
├── api/
│   └── index.js                         # Backend completo (Express, 69 endpoints, migraciones)
├── src/
│   ├── App.jsx                          # Componente principal (state, routing, vistas)
│   ├── index.css                        # Estilos globales y sistema de diseño
│   ├── main.jsx                         # Entry point de React
│   └── components/ui/
│       ├── ActiveExecutionModal.jsx      # Modal detallado de ejecución activa
│       ├── AddUserModal.jsx             # Modal de invitación de usuarios
│       ├── DestinationCard.jsx/.css     # Tarjeta visual de cliente
│       ├── KanbanBoard.jsx/.css         # Tablero Kanban con drag & drop
│       ├── LandingPage.jsx/.css         # Landing page pública
│       ├── LaunchExecutionModal.jsx/.css # Modal de lanzamiento de ejecución
│       ├── MatrixModal.jsx/.css         # Matriz de asignación RACI
│       ├── MemberModal.jsx              # Modal CRUD de miembros
│       ├── OnDemandModal.jsx            # Modal de solicitud de integración
│       ├── ProjectDetailsModal.jsx      # Modal Kanban con tabs (4 pestañas)
│       ├── ReactivaLeadsModal.jsx       # Modal de integración ReactivaLeads
│       ├── SuccessTicketModal.jsx/.css  # Modal de celebración con confetti
│       ├── TemplateDetailsModal.jsx/.css # Modal de detalle de plantilla
│       ├── TemplatePreviewModal.jsx/.css # Preview de plantilla generada por IA
│       ├── TemplateWizardModal.jsx/.css  # Wizard de creación manual
│       ├── notifications.jsx/.css       # Componente de notificaciones
│       ├── achievement-card.tsx         # Tarjeta de gamificación
│       ├── alert.jsx/.css               # Toast/alert animado
│       ├── button.jsx                   # Botón (Radix Slot + CVA)
│       ├── card.jsx                     # Componente Card estructural
│       ├── checkbox.jsx                 # Checkbox (Radix)
│       ├── dialog.jsx/.css              # Dialog modal (Radix)
│       ├── dropdown-menu.jsx/.css       # Dropdown menu (Radix)
│       ├── input.jsx                    # Input estilizado
│       ├── label.jsx                    # Label (Radix)
│       ├── radio-group.jsx              # Radio group (Radix)
│       ├── select.jsx                   # Select dropdown (Radix)
│       └── textarea.jsx                 # Textarea estilizado
├── vercel.json                          # Config de Vercel (rewrites)
├── vite.config.js                       # Config de Vite (proxy dev → :3001)
├── package.json                         # Dependencias y scripts
└── .env                                 # Variables de entorno (no en repo)
```

---

## 📄 Licencia

Propiedad de **Kônsul Digital** — Todos los derechos reservados.
