#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import { createServer } from "http";

// ============================================================================
// MCP Webhook Server
// Servidor MCP que expone una herramienta para enviar datos a webhooks via POST
//
// Variables de entorno:
//   WEBHOOK_URL  — URL del webhook destino (requerido si no se pasa como parámetro)
//
// Modos de ejecución:
//   - STDIO (default): node dist/index.js
//   - HTTP  (remoto):  node dist/index.js --http [--port 3100]
// ============================================================================

// --- Definir la herramienta en el servidor MCP ---
function createWebhookServer(): McpServer {
    const server = new McpServer({
        name: "webhook-sender",
        version: "1.0.0",
    });

    server.tool(
        "send_webhook",
        "Envía datos a un webhook via HTTP POST. Incluye campos predeterminados como título, texto, fecha, hora, autor y fuente. También acepta campos personalizados adicionales. Usa esta herramienta al finalizar una tarea para notificar resultados.",
        {
            url: z.string().url().optional().describe("URL del webhook destino. Si no se proporciona, usa la variable de entorno WEBHOOK_URL."),
            titulo: z.string().describe("Título o nombre de la tarea/evento"),
            texto: z.string().describe("Descripción o resumen del contenido/tarea realizada"),
            autor: z.string().optional().default("Claude Code").describe("Autor o responsable de la acción (default: Claude Code)"),
            fuente: z.string().optional().default("MCP Webhook Server").describe("Fuente u origen de la notificación (default: MCP Webhook Server)"),
            campos_extra: z
                .record(z.string(), z.any())
                .optional()
                .describe("Campos adicionales personalizados como objeto clave-valor. Ej: { 'proyecto': 'bitfinApp', 'rama': 'main' }"),
            headers: z
                .record(z.string(), z.string())
                .optional()
                .describe("Headers HTTP adicionales para la petición (opcional)"),
        },
        async ({ url, titulo, texto, autor, fuente, campos_extra, headers }) => {
            // Resolver URL: parámetro > variable de entorno
            const webhookUrl = url ?? process.env.WEBHOOK_URL;

            if (!webhookUrl) {
                return {
                    content: [
                        {
                            type: "text" as const,
                            text: "❌ No se proporcionó URL del webhook. Pásala como parámetro 'url' o configura la variable de entorno WEBHOOK_URL.",
                        },
                    ],
                    isError: true,
                };
            }

            const ahora = new Date();
            const fecha = ahora.toLocaleDateString("es-ES", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
            });
            const hora = ahora.toLocaleTimeString("es-ES", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: false,
            });

            const body: Record<string, unknown> = {
                webhook_url: webhookUrl,
                titulo,
                texto,
                fecha,
                hora,
                autor: autor ?? "Claude Code",
                fuente: fuente ?? "MCP Webhook Server",
                timestamp: ahora.toISOString(),
            };

            if (campos_extra) {
                Object.assign(body, campos_extra);
            }

            const requestHeaders: Record<string, string> = {
                "Content-Type": "application/json",
                "User-Agent": "MCP-Webhook-Server/1.0",
                ...headers,
            };

            try {
                const response = await fetch(webhookUrl, {
                    method: "POST",
                    headers: requestHeaders,
                    body: JSON.stringify(body),
                });

                const statusCode = response.status;
                let responseText: string;
                try {
                    responseText = await response.text();
                } catch {
                    responseText = "(sin contenido en respuesta)";
                }

                if (response.ok) {
                    return {
                        content: [
                            {
                                type: "text" as const,
                                text: [
                                    `✅ Webhook enviado exitosamente`,
                                    ``,
                                    `📡 URL: ${url}`,
                                    `📊 Status: ${statusCode}`,
                                    `📅 Fecha: ${fecha}`,
                                    `🕐 Hora: ${hora}`,
                                    `📝 Título: ${titulo}`,
                                    `👤 Autor: ${autor}`,
                                    `📌 Fuente: ${fuente}`,
                                    ``,
                                    `📨 Datos enviados:`,
                                    JSON.stringify(body, null, 2),
                                    ``,
                                    `📥 Respuesta del servidor:`,
                                    responseText.substring(0, 500),
                                ].join("\n"),
                            },
                        ],
                    };
                } else {
                    return {
                        content: [
                            {
                                type: "text" as const,
                                text: [
                                    `❌ Error al enviar webhook`,
                                    ``,
                                    `📡 URL: ${url}`,
                                    `📊 Status: ${statusCode}`,
                                    ``,
                                    `📥 Respuesta del servidor:`,
                                    responseText.substring(0, 500),
                                ].join("\n"),
                            },
                        ],
                        isError: true,
                    };
                }
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                return {
                    content: [
                        {
                            type: "text" as const,
                            text: [
                                `❌ Error de conexión al webhook`,
                                ``,
                                `📡 URL: ${url}`,
                                `🔥 Error: ${errorMessage}`,
                            ].join("\n"),
                        },
                    ],
                    isError: true,
                };
            }
        }
    );

    return server;
}

// ============================================================================
// Modo STDIO — Para uso local con Claude Code (default)
// ============================================================================
async function startStdio() {
    const server = createWebhookServer();
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("🚀 MCP Webhook Server iniciado (transporte: stdio)");
}

// ============================================================================
// Modo HTTP — Para acceso remoto por equipo
// ============================================================================
async function startHttp(port: number) {
    // Mapa de sesiones activas
    const sessions = new Map<string, { server: McpServer; transport: StreamableHTTPServerTransport }>();

    const httpServer = createServer(async (req, res) => {
        const url = new URL(req.url ?? "/", `http://localhost:${port}`);

        // --- CORS para permitir acceso desde cualquier origen ---
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type, mcp-session-id");
        res.setHeader("Access-Control-Expose-Headers", "mcp-session-id");

        if (req.method === "OPTIONS") {
            res.writeHead(204);
            res.end();
            return;
        }

        // --- Health check ---
        if (url.pathname === "/health") {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({
                status: "ok",
                server: "mcp-webhook-server",
                version: "1.0.0",
                activeSessions: sessions.size,
                timestamp: new Date().toISOString(),
            }));
            return;
        }

        // --- MCP endpoint ---
        if (url.pathname === "/mcp") {
            // Leer el session ID del header
            const sessionId = req.headers["mcp-session-id"] as string | undefined;

            if (req.method === "POST") {
                // Leer body
                const chunks: Buffer[] = [];
                for await (const chunk of req) {
                    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
                }
                const bodyStr = Buffer.concat(chunks).toString("utf-8");
                const body = JSON.parse(bodyStr);

                // Si es un request de inicialización (sin session ID previo)
                if (!sessionId && body.method === "initialize") {
                    const server = createWebhookServer();
                    const transport = new StreamableHTTPServerTransport({
                        sessionIdGenerator: () => crypto.randomUUID(),
                        onsessioninitialized: (newSessionId) => {
                            sessions.set(newSessionId, { server, transport });
                            console.error(`📱 Nueva sesión: ${newSessionId}`);
                        },
                    });

                    transport.onclose = () => {
                        const sid = (transport as any).sessionId;
                        if (sid) {
                            sessions.delete(sid);
                            console.error(`👋 Sesión cerrada: ${sid}`);
                        }
                    };

                    await server.connect(transport);
                    await transport.handleRequest(req, res, body);
                    return;
                }

                // Request con session ID existente
                if (sessionId && sessions.has(sessionId)) {
                    const session = sessions.get(sessionId)!;
                    await session.transport.handleRequest(req, res, body);
                    return;
                }

                // Session no encontrada
                res.writeHead(400, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: "Sesión no encontrada. Envía un request 'initialize' primero." }));
                return;
            }

            if (req.method === "GET") {
                // SSE para notificaciones del servidor
                if (sessionId && sessions.has(sessionId)) {
                    const session = sessions.get(sessionId)!;
                    await session.transport.handleRequest(req, res);
                    return;
                }

                res.writeHead(400, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: "Session ID requerido para SSE" }));
                return;
            }

            if (req.method === "DELETE") {
                // Cerrar sesión
                if (sessionId && sessions.has(sessionId)) {
                    const session = sessions.get(sessionId)!;
                    await session.transport.handleRequest(req, res);
                    sessions.delete(sessionId);
                    return;
                }

                res.writeHead(404, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: "Sesión no encontrada" }));
                return;
            }
        }

        // --- 404 ---
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Not found", availableEndpoints: ["/mcp", "/health"] }));
    });

    httpServer.listen(port, () => {
        console.error(`🌐 MCP Webhook Server HTTP iniciado en puerto ${port}`);
        console.error(`   📡 Endpoint MCP: http://localhost:${port}/mcp`);
        console.error(`   💚 Health check: http://localhost:${port}/health`);
        console.error(`   🔗 Para conectar desde Claude Code remoto:`);
        console.error(`      URL: https://tu-dominio.com/mcp`);
    });
}

// ============================================================================
// Punto de entrada — detecta modo por argumentos
// ============================================================================
async function main() {
    const args = process.argv.slice(2);
    const isHttp = args.includes("--http");

    if (isHttp) {
        const portIndex = args.indexOf("--port");
        const port = portIndex !== -1 ? parseInt(args[portIndex + 1], 10) : parseInt(process.env.PORT ?? "3100", 10);
        await startHttp(port);
    } else {
        await startStdio();
    }
}

main().catch((error) => {
    console.error("Error fatal al iniciar el servidor MCP:", error);
    process.exit(1);
});
