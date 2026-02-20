from fastmcp import FastMCP
import httpx
from typing import Optional, Dict, Any
import os
from datetime import datetime
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# Initialize the MCP server
mcp = FastMCP("webhook-sender")

@mcp.tool()
async def send_webhook(
    titulo: str,
    texto: str,
    url: Optional[str] = None,
    autor: str = "Claude Code",
    fuente: str = "MCP Webhook Server",
    campos_extra: Optional[Dict[str, Any]] = None,
    headers: Optional[Dict[str, str]] = None
) -> str:
    """Envía datos a un webhook via HTTP POST. Incluye campos predeterminados como título, texto, fecha, hora, autor y fuente. También acepta campos personalizados adicionales. Usa esta herramienta al finalizar una tarea para notificar resultados."""
    webhook_url = url or os.getenv("WEBHOOK_URL")
    
    if not webhook_url:
        return "❌ No se proporcionó URL del webhook. Opciones: (1) parámetro 'url', (2) variable de entorno WEBHOOK_URL."
    
    ahora = datetime.now()
    fecha = ahora.strftime("%d/%m/%Y")
    hora = ahora.strftime("%H:%M:%S")
    
    body = {
        "webhook_url": webhook_url,
        "titulo": titulo,
        "texto": texto,
        "fecha": fecha,
        "hora": hora,
        "autor": autor,
        "fuente": fuente,
        "timestamp": ahora.isoformat()
    }
    
    if campos_extra:
        body.update(campos_extra)
        
    req_headers = {
        "Content-Type": "application/json",
        "User-Agent": "MCP-Webhook-Server/1.0"
    }
    if headers:
        req_headers.update(headers)
        
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(webhook_url, json=body, headers=req_headers)
            
            status_code = response.status_code
            response_text = response.text or "(sin contenido en respuesta)"
            response_display = response_text[:500] if len(response_text) > 500 else response_text
            
            if response.is_success:
                return (
                    f"✅ Webhook enviado exitosamente\n\n"
                    f"📡 URL: {webhook_url}\n"
                    f"📊 Status: {status_code}\n"
                    f"📅 Fecha: {fecha}\n"
                    f"🕐 Hora: {hora}\n"
                    f"📝 Título: {titulo}\n"
                    f"👤 Autor: {autor}\n"
                    f"📌 Fuente: {fuente}\n\n"
                    f"📨 Datos enviados:\n{body}\n\n"
                    f"📥 Respuesta del servidor:\n{response_display}"
                )
            else:
                return (
                    f"❌ Error al enviar webhook\n\n"
                    f"📡 URL: {webhook_url}\n"
                    f"📊 Status: {status_code}\n\n"
                    f"📥 Respuesta del servidor:\n{response_display}"
                )
    except Exception as e:
        logger.error(f"Webhook connection error: {e}")
        return f"❌ Error de conexión al webhook\n\n📡 URL: {webhook_url}\n🔥 Error: {str(e)}"

if __name__ == "__main__":
    logger.info("Starting Webhook MCP Server...")
    
    # Get transport mode from environment, defaulting to stdio (local)
    transport_mode = os.getenv("MCP_TRANSPORT", "stdio")
    
    if transport_mode == "sse":
        # SSE mode for Railway or remote deployments
        port = int(os.getenv("PORT", os.getenv("MCP_SERVER_PORT", "8000")))
        host = os.getenv("HOST", "0.0.0.0")
        logger.info(f"Starting SSE server on {host}:{port}")
        mcp.run(transport="sse", host=host, port=port)
    else:
        # stdio mode for local deployments (e.g. Claude Code Desktop)
        logger.info("Starting stdio server")
        mcp.run(transport="stdio")
