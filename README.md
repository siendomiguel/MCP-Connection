# MCP Webhook Server

Servidor MCP (Model Context Protocol) para enviar datos a webhooks via HTTP POST.  
Diseñado para ejecutarse en **Claude Code** — accesible **local y remotamente**.

## 🚀 Inicio Rápido

```bash
cd MCP
npm install
npm run build
```

---

## 🖥️ Modo Local (STDIO) — Un solo usuario

Para uso personal en tu máquina. Claude Code lo ejecuta directamente.

### Configurar en Claude Code
Agrega a `.mcp.json` en la raíz de tu proyecto:

```json
{
  "mcpServers": {
    "webhook-sender": {
      "command": "node",
      "args": ["e:/dev/proyectos/bitfinApp/MCP/dist/index.js"]
    }
  }
}
```

Reinicia Claude Code y la herramienta `send_webhook` estará disponible.

---

## 🌐 Modo HTTP (Remoto) — Acceso por equipo

Para compartir con compañeros de equipo en cualquier parte del mundo.

### 1. Ejecutar el servidor
```bash
# En tu servidor/VPS/cloud:
npm run start:http

# O con puerto personalizado:
node dist/index.js --http --port 8080

# O con variable de entorno:
PORT=8080 node dist/index.js --http
```

### 2. Desplegar (opciones recomendadas)

| Plataforma | Comando / Acción |
|------------|-----------------|
| **Railway** | Conecta el repo → `npm run start:http` |
| **Render** | Web Service → `npm run start:http` |
| **Fly.io** | `fly launch` → `npm run start:http` |
| **VPS** | `pm2 start dist/index.js -- --http` |

### 3. Configurar en Claude Code del equipo
Cada miembro del equipo agrega esto a su `.mcp.json`:

```json
{
  "mcpServers": {
    "webhook-sender": {
      "type": "url",
      "url": "https://tu-servidor.com/mcp"
    }
  }
}
```

> **Nota**: Reemplaza `https://tu-servidor.com` con la URL real de tu despliegue.

### 4. Endpoints disponibles

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/mcp` | POST, GET, DELETE | Endpoint MCP (Streamable HTTP) |
| `/health` | GET | Health check del servidor |

---

## 📡 Herramienta: `send_webhook`

### Parámetros

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `url` | string | ✅ | URL del webhook destino |
| `titulo` | string | ✅ | Título de la tarea/evento |
| `texto` | string | ✅ | Descripción o resumen |
| `autor` | string | ❌ | Default: "Claude Code" |
| `fuente` | string | ❌ | Default: "MCP Webhook Server" |
| `campos_extra` | object | ❌ | Campos personalizados clave-valor |
| `headers` | object | ❌ | Headers HTTP adicionales |

### Campos automáticos
- `fecha` — DD/MM/YYYY
- `hora` — HH:MM:SS
- `timestamp` — ISO 8601

### Ejemplo de payload
```json
{
  "titulo": "Deploy completado",
  "texto": "Se desplegó la versión 2.1.0 en producción",
  "fecha": "12/02/2026",
  "hora": "18:54:00",
  "autor": "Claude Code",
  "fuente": "MCP Webhook Server",
  "timestamp": "2026-02-12T23:54:00.000Z",
  "proyecto": "bitfinApp",
  "rama": "main"
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
      "command": "WEBHOOK_URL=https://tu-url.com node e:/dev/proyectos/bitfinApp/MCP/scripts/notify-webhook.js"
    }]
  }
}
```

---

## 📁 Estructura
```
MCP/
├── package.json
├── tsconfig.json
├── .mcp.json              ← Config ejemplo para Claude Code
├── src/
│   └── index.ts           ← Servidor MCP (STDIO + HTTP)
├── scripts/
│   └── notify-webhook.js  ← Hook automático
└── dist/                  ← Build compilado
    └── index.js
```
