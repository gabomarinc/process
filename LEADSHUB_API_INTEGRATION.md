# 🔌 Guía de Integración API: Kônsul Process + LeadsHUB (Suite de IA & CRM)

Kônsul Process cuenta con una **API REST pública y estandarizada** expuesta a través de Vercel Serverless Functions (`/api/v1/...`). Esta API permite a **LeadsHUB** (tu suite de chatbots con IA, CRM y WhatsApp), así como a cualquier otra herramienta externa (Zapier, n8n, scripts, etc.), consultar plantillas operativas, disparar ejecuciones de procesos automáticos y dar seguimiento a los pasos en tiempo real.

---

## 🔐 Autenticación

Todas las solicitudes deben incluir la clave de API (API Key) mediante alguno de los siguientes métodos en los Headers HTTP:

- **Header HTTP Recomendado:** `x-api-key: TU_API_KEY`
- **Header Authorization:** `Authorization: Bearer TU_API_KEY`

> **Nota:** Las API Keys se generan desde **Ajustes → API & Integración LeadsHUB** y comienzan con el prefijo `kp_live_`.

---

## 🚀 Endpoints Disponibles

### 1. Plantillas de Procesos

#### **`GET /api/v1/templates`** (Listar Plantillas Aprobadas)
Obtiene el catálogo de plantillas operativas de la organización para que tu Agente de IA o integraciones conozcan qué procesos están disponibles para iniciar.

**Ejemplo de Respuesta:**
```json
{
  "success": true,
  "data": [
    {
      "id": "tpl_onboarding_cliente",
      "title": "Onboarding de Nuevo Cliente",
      "description": "Flujo operativo de bienvenida, recolección de accesos y configuración inicial.",
      "durationDays": 7,
      "category": "Operaciones",
      "steps": [
        { "id": "step_1", "label": "Enviar formulario de bienvenida", "type": "form", "assignedTo": "Admin" },
        { "id": "step_2", "label": "Configurar accesos de plataforma", "type": "manual", "assignedTo": "Soporte" }
      ]
    }
  ],
  "meta": {
    "app": "konsulprocess",
    "version": "1"
  }
}
```

---

### 2. Ejecuciones de Procesos (Instances)

#### **`POST /api/v1/executions`** (Iniciar una Ejecución)
Inicia una nueva instancia de proceso asignada a un cliente o proyecto específico.

**Ejemplo de Payload:**
```json
{
  "templateId": "tpl_onboarding_cliente",
  "instanceName": "Onboarding - Empresa Ejemplo S.A."
}
```

**Ejemplo de Respuesta (HTTP 201):**
```json
{
  "success": true,
  "data": {
    "id": "inst_9f8e7d6c5b4a",
    "title": "Onboarding de Nuevo Cliente",
    "instanceName": "Onboarding - Empresa Ejemplo S.A.",
    "startedAt": "2026-09-14T09:00:00.000Z",
    "steps": [
      {
        "id": "step_1",
        "label": "Enviar formulario de bienvenida",
        "type": "form",
        "assignedTo": "Admin",
        "isCompleted": false,
        "dueDate": "2026-09-15T09:00:00.000Z"
      }
    ]
  },
  "meta": {
    "app": "konsulprocess",
    "version": "1"
  }
}
```

#### **`GET /api/v1/executions/:id`** (Consultar Estado de una Ejecución)
Permite consultar el progreso, los pasos completados y los pendientes de una ejecución en curso.

---

### 3. Webhook de LeadsHUB

#### **`POST /api/v1/leadshub`**
Configura esta URL (`https://tu-dominio-process.vercel.app/api/v1/leadshub`) como Webhook en LeadsHUB CRM o en tus flujos de automatización.

Recibe eventos automáticos:
- `lead.created` / `contact.created` -> Sincroniza el cliente en el directorio de Kônsul Process.
- `process.start` -> Inicia automáticamente la plantilla de proceso correspondiente para el nuevo cliente.

---

## 🤖 Configuración para Agentes de IA en LeadsHUB (Function Calling)

Copia este esquema de herramienta directamente en el panel de configuración de tu Agente de IA en **LeadsHUB**:

```json
{
  "name": "iniciar_proceso_konsul",
  "description": "Inicia una nueva ejecución de proceso operativo para un cliente en Kônsul Process",
  "parameters": {
    "type": "object",
    "properties": {
      "templateId": {
        "type": "string",
        "description": "ID de la plantilla de proceso a ejecutar (ej. tpl_onboarding)"
      },
      "instanceName": {
        "type": "string",
        "description": "Nombre de la ejecución o cliente asignado al proceso"
      },
      "category": {
        "type": "string",
        "description": "Categoría o departamento del proceso (opcional)"
      }
    },
    "required": ["templateId", "instanceName"]
  }
}
```

---

## 💻 Ejemplos de Implementación

### JavaScript / Fetch
```javascript
const response = await fetch("https://tu-process.vercel.app/api/v1/executions", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": "kp_live_tu_clave_aqui"
  },
  body: JSON.stringify({
    templateId: "tpl_onboarding_cliente",
    instanceName: "Cliente Acme Corp"
  })
});

const result = await response.json();
console.log("Proceso iniciado:", result.data);
```

### cURL
```bash
curl -X POST https://tu-process.vercel.app/api/v1/executions \
  -H "Content-Type: application/json" \
  -H "x-api-key: kp_live_tu_clave_aqui" \
  -d '{"templateId": "tpl_onboarding_cliente", "instanceName": "Cliente Acme Corp"}'
```

### Python
```python
import requests

url = "https://tu-process.vercel.app/api/v1/executions"
headers = {
    "Content-Type": "application/json",
    "x-api-key": "kp_live_tu_clave_aqui"
}
payload = {
    "templateId": "tpl_onboarding_cliente",
    "instanceName": "Cliente Acme Corp"
}

response = requests.post(url, json=payload, headers=headers)
print(response.json())
```
