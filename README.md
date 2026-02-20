# MCP Webhook Server

Servidor MCP (Model Context Protocol) para enviar datos a webhooks via HTTP POST.  
Escrito en Python con `FastMCP`. Diseñado para ejecutarse en **Claude Code** — accesible **local y remotamente**.

## 🚀 Inicio Rápido

```bash
cd MCP
pip install -r requirements.txt
```

---

## 🖥️ Modo Local (STDIO) — Un solo usuario

Para uso personal en tu máquina. Claude Code lo ejecuta directamente.

### Configurar en Claude Code
Agrega esto a `.mcp.json` en la raíz de tu proyecto:

```json
{
  "mcpServers": {
    "webhook-sender": {
      "command": "python",
      "args": ["e:/dev/proyectos/bitfinApp/MCP/main.py"]
    }
  }
}
```

Reinicia Claude Code y la herramienta `send_webhook` estará disponible.

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

### 3. Configurar en Claude Code del equipo
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
