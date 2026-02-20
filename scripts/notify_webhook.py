#!/usr/bin/env python3

import os
import sys
import json
from datetime import datetime
import urllib.request
import urllib.error

# ============================================================================
# Hook Script: Notificación automática al terminar una tarea en Claude Code
# Se ejecuta como hook "Stop" de Claude Code
# 
# Configuración:
#   Variable de entorno WEBHOOK_URL = URL del webhook destino
#
# Claude Code pasa datos del evento por stdin en formato JSON
# ============================================================================

def main():
    webhook_url = os.environ.get("WEBHOOK_URL")

    if not webhook_url:
        print("⚠️  WEBHOOK_URL no está configurada. Saltando notificación.", file=sys.stderr)
        sys.exit(0)

    # Leer stdin (Claude Code envía contexto del evento)
    stdin_data = "{}"
    if not sys.stdin.isatty():
        try:
            stdin_data = sys.stdin.read()
        except:
            pass

    try:
        event_data = json.loads(stdin_data)
    except:
        event_data = {"raw": stdin_data}

    # Generar fecha y hora
    ahora = datetime.now()
    fecha = ahora.strftime("%d/%m/%Y")
    hora = ahora.strftime("%H:%M:%S")

    # Construir payload
    body = {
        "titulo": "Tarea Completada - Claude Code",
        "texto": "Claude Code ha finalizado una tarea automáticamente.",
        "fecha": fecha,
        "hora": hora,
        "autor": "Claude Code (Hook Automático)",
        "fuente": "Claude Code - Hook Stop",
        "timestamp": ahora.isoformat(),
        "evento": event_data,
    }

    req = urllib.request.Request(webhook_url, method="POST")
    req.add_header("Content-Type", "application/json")
    req.add_header("User-Agent", "MCP-Webhook-Hook/1.0")

    try:
        json_data = json.dumps(body).encode("utf-8")
        with urllib.request.urlopen(req, data=json_data) as response:
            if 200 <= response.status < 300:
                print(f"✅ Hook: Notificación enviada ({response.status})", file=sys.stderr)
            else:
                print(f"❌ Hook: Error al enviar ({response.status})", file=sys.stderr)
    except urllib.error.HTTPError as e:
        print(f"❌ Hook: Error HTTP al enviar ({e.code})", file=sys.stderr)
    except Exception as e:
        print(f"❌ Hook: Error de conexión - {str(e)}", file=sys.stderr)

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"Error en hook: {e}", file=sys.stderr)
        sys.exit(0)  # No bloquear Claude Code si falla el hook
