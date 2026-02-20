# MCP Webhook Server

Servidor MCP (Model Context Protocol) para enviar datos a webhooks via HTTP POST.  
Escrito en Python con `FastMCP`. Diseñado para ejecutarse en **Claude Code** — accesible **local y remotamente**.

## 🚀 Inicio Rápido

```bash
cd MCP
pip install -r requirements.txt
```

---

## 🖥️ Modo Local (Claude Desktop o uso personal)

Esta sección está pensada para la comunidad **Open Source** que desee utilizar este servidor de forma local en su propia máquina.

### 1. Clonar el repositorio y configurar dependencias

Para usar la herramienta directamente en tu computadora a través de **Claude Desktop** (la aplicación gráfica) o en una instancia local de Claude Code, primero debes descargar el código fuente y preparar el entorno de Python.

Abre tu terminal y ejecuta:

```bash
# Clonar el proyecto
git clone https://github.com/siendomiguel/MCP-Connection.git
cd MCP-Connection/MCP

# (Opcional pero recomendado) Crear un entorno virtual
python -m venv venv
# En Windows: venv\Scripts\activate
# En Mac/Linux: source venv/bin/activate

# Instalar dependencias
pip install -r requirements.txt
```

### 2. Configurar en Claude Desktop

Para que el servidor sepa a dónde enviar los datos por defecto, debes configurar la variable de entorno `WEBHOOK_URL` directamente en la configuración de la aplicación.

Abre el archivo de configuración de Claude Desktop:
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Mac**: `~/Library/Application Support/Claude/claude_desktop_config.json`

Agrega el siguiente bloque de configuración. Notarás que bajo `env` tú decides hacia qué webhook se mandarán los datos:

```json
{
  "mcpServers": {
    "webhook-sender": {
      "command": "python",
      "args": ["/ruta/absoluta/a/tu/proyecto/MCP/main.py"],
      "env": {
        "WEBHOOK_URL": "https://hook.us1.make.com/tu-webhook-secreto"
      }
    }
  }
}
```

> **Importante:** Recuerda cambiar `/ruta/absoluta/a/tu/proyecto/MCP/main.py` por la ruta real donde clonaste este repositorio y asignar el `WEBHOOK_URL` válido de N8N, Make.com, Zapier, etc.

Reinicia Claude Desktop y la herramienta `send_webhook` estará disponible.
---

## 🌐 Modo HTTP (Remoto) — Acceso por equipo

Para compartir con compañeros de equipo en cualquier parte del mundo. Como usa `FastMCP`, funciona nativamente con Server-Sent Events (SSE).

### 1. Ejecutar el servidor localmente
```bash
MCP_TRANSPORT=sse python main.py
```
*(Se levantará por defecto en el puerto 8000).*

### 2. Desplegar (Railway)

Este proyecto ya incluye `railway.json` y `Dockerfile`.
Solo tienes que conectar tu repositorio a Railway y se detectará automáticamente. Railway asignará el `PORT` y el `Dockerfile` ejecutará el servidor en modo SSE.

### 3. Configurar en el equipo

**Para Claude Code:**
Cada miembro del equipo agrega esto a su `.mcp.json` para conectarse a la nube:

```json
{
  "mcpServers": {
    "webhook-sender": {
      "type": "url",
      "url": "https://tu-url-de-railway.up.railway.app/sse"
    }
  }
}
```

> **⚠️ Importante para Claude Desktop:**  
> A diferencia de Claude Code, la aplicación gráfica **Claude Desktop NO soporta** conexiones remotas a URLs por el momento (causa que la app muestre el error "Claude Desktop failed to Launch"). Si necesitas usar tu herramienta `webhook-sender` dentro de Claude Desktop, tendrás que configurarla como un comando local usando `python` como especificamos en la sección "Modo Local".

---

## 📡 Herramienta: `send_webhook`

### Parámetros

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `url` | string | ✅ | URL del webhook destino (o configurar WEBHOOK_URL) |
| `titulo` | string | ✅ | Título de la tarea/evento |
| `texto` | string | ✅ | Descripción o resumen |
| `autor` | string | ❌ | Default: "Claude Code" |
| `fuente` | string | ❌ | Default: "MCP Webhook Server" |
| `campos_extra` | object | ❌ | Campos personalizados clave-valor |
| `headers` | object | ❌ | Headers HTTP adicionales |

### Ejemplo de respuesta enviada al webhook
```json
{
  "webhook_url": "https://...",
  "titulo": "Tarea Completada",
  "texto": "Se actualizó la base de datos.",
  "fecha": "20/02/2026",
  "hora": "18:54:00",
  "autor": "Claude Code",
  "fuente": "MCP Webhook Server",
  "timestamp": "2026-02-20T23:54:00.000000"
}
```

---

## 🪝 Hook Automático (Opcional)

Para enviar webhook automáticamente al terminar cada tarea, agrega a `~/.claude/settings.json`:

```json
{
  "hooks": {
    "Stop": [{
      "type": "command",
      "command": "WEBHOOK_URL=https://tu-url.com python e:/dev/proyectos/bitfinApp/MCP/scripts/notify_webhook.py"
    }]
  }
}
```
