# Kônsul Process

Kônsul Process es una aplicación MicroSaaS de la suite Kônsul que permite crear plantillas de procesos de negocio, asignar tareas al equipo de trabajo y automatizar ejecuciones en segundo plano de manera estructurada y 100% personalizada.

## 🛠 Arquitectura y Stack Tecnológico

El proyecto está estructurado como un monolito *serverless* preparado para Vercel:
- **Frontend:** React.js con Vite, usando CSS puro y componentes accesibles de Radix UI (`@radix-ui/react-*`), Framer Motion para animaciones, y Lucide React para íconos.
- **Backend:** Express.js para la API REST.
- **Base de Datos:** PostgreSQL alojado en Neon Serverless (usando la librería `pg`).
- **Autenticación:** SSO centralizado con **Kinde** utilizando flujo manual OAuth2 (Authorization Code Flow) para compatibilidad absoluta con entornos *serverless*.
- **Hosting:** Diseñado para desplegarse en Vercel, aprovechando `vercel.json` para enrutamiento `/api/*` y fallback al frontend SPA.

## 🚀 Características Principales

1. **Gestor de Procesos y Plantillas:** Permite diseñar plantillas de flujos de trabajo detallados.
2. **Gestión de Equipos:** Permite administrar usuarios y asignarles roles (`team_members`, `organizations`).
3. **Automatización e Integraciones:**
   - **ClickUp:** Sincronización mediante `clickup_rules`.
   - **ReactivaLeads:** Conexiones y reglas en `reactivaleads_rules`.
4. **Sistema de Notificaciones:** Seguimiento en vivo del estado de cada paso con `notifications` y `notification_logs`.
5. **Autenticación Unificada (SSO):** Inicios de sesión sin fricción a través de toda la suite de Kônsul.

## 🗄 Esquema de Base de Datos

La base de datos relacional utiliza PostgreSQL con las siguientes tablas principales:

- `organizations`: Contiene la información de los diferentes tenants/compañías y sus tokens (Clickup, Gemini, ReactivaLeads).
- `users`: Usuarios de la plataforma, roles y contraseñas (dummy en favor del JWT local).
- `team_members`: Registro de empleados dentro de cada organización, con departamento y rol.
- `templates`: Guarda la definición de cada proceso orquestado.
- `clients`: Almacenamiento de información de clientes de la organización.
- `api_tokens`: Tokens para la API externa para interacciones server-to-server.
- `reactivaleads_rules` y `clickup_rules`: Reglas de sincronización con ecosistemas de terceros.
- `notifications` y `notification_logs`: Historial y alertas de los procesos automatizados.

## 🔐 Autenticación Kinde SSO

Esta aplicación se integra como una app "Back-end web" en Kinde. No utiliza el middleware oficial por limitaciones del entorno serverless; en su lugar, implementa el estándar seguro de **Authorization Code Flow** con los siguientes endpoints en `api/index.js`:

- `GET /api/auth/login`: Construye la URL de Kinde con `prompt=none` (opcional) para inicio de sesión continuo.
- `GET /api/auth/register`: Inicia el flujo de registro en Kinde (`prompt=create`).
- `GET /api/auth/kinde_callback`: Intercambia el *auth code* por el *access token*, obtiene el perfil de Kinde, y finalmente sincroniza/crea el usuario en PostgreSQL generando un JWT local válido por 30 días.
- `GET /api/auth/logout`: Elimina la sesión y redirige al *logout* de Kinde.

## 💻 Instalación y Desarrollo Local

### 1. Variables de Entorno

Debes crear un archivo `.env` en la raíz con las siguientes variables:

```env
# Database
DATABASE_URL=postgres://...

# Auth
JWT_SECRET=super_secreto_2026

# Kinde SSO
KINDE_ISSUER_URL=https://tu-dominio.kinde.com
KINDE_CLIENT_ID=tu_client_id
KINDE_CLIENT_SECRET=tu_client_secret
KINDE_SITE_URL=http://localhost:3000
KINDE_POST_LOGOUT_REDIRECT_URL=http://localhost:3000
```

### 2. Levantar el Entorno

El proyecto usa `concurrently` para levantar tanto el frontend (Vite) como el backend (Express) de manera simultánea.

```bash
npm install
npm run dev
```

Esto abrirá la aplicación en `http://localhost:3000` (el puerto de Vite) y ruteará todas las peticiones `/api/*` hacia el servidor de Express (mediante las configuraciones de proxy de `vite.config.js`).

## ☁️ Despliegue en Vercel

1. Crea un nuevo proyecto en Vercel conectado al repositorio.
2. Asegúrate de configurar **todas** las variables de entorno listadas arriba en el dashboard de Vercel.
3. Para `KINDE_SITE_URL` y `KINDE_POST_LOGOUT_REDIRECT_URL`, utiliza la URL de producción (ej. `https://process.konsul.digital`).
4. Vercel utilizará las reglas de reescritura en `vercel.json` para ejecutar la API en `api/index.js` como Serverless Functions, y servirá el frontend como archivos estáticos luego de correr `vite build`.
