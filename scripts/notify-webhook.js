#!/usr/bin/env node

// ============================================================================
// Hook Script: Notificación automática al terminar una tarea en Claude Code
// Se ejecuta como hook "Stop" de Claude Code
// 
// Configuración:
//   Variable de entorno WEBHOOK_URL = URL del webhook destino
//
// Claude Code pasa datos del evento por stdin en formato JSON
// ============================================================================

const WEBHOOK_URL = process.env.WEBHOOK_URL;

if (!WEBHOOK_URL) {
    console.error("⚠️  WEBHOOK_URL no está configurada. Saltando notificación.");
    process.exit(0);
}

async function main() {
    // Leer stdin (Claude Code envía contexto del evento)
    let stdinData = "";

    try {
        const chunks = [];
        for await (const chunk of process.stdin) {
            chunks.push(chunk);
        }
        stdinData = Buffer.concat(chunks).toString("utf-8");
    } catch {
        stdinData = "{}";
    }

    let eventData = {};
    try {
        eventData = JSON.parse(stdinData);
    } catch {
        eventData = { raw: stdinData };
    }

    // Generar fecha y hora
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

    // Construir payload
    const body = {
        titulo: "Tarea Completada - Claude Code",
        texto: `Claude Code ha finalizado una tarea automáticamente.`,
        fecha,
        hora,
        autor: "Claude Code (Hook Automático)",
        fuente: "Claude Code - Hook Stop",
        timestamp: ahora.toISOString(),
        evento: eventData,
    };

    try {
        const response = await fetch(WEBHOOK_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "User-Agent": "MCP-Webhook-Hook/1.0",
            },
            body: JSON.stringify(body),
        });

        if (response.ok) {
            console.error(`✅ Hook: Notificación enviada (${response.status})`);
        } else {
            console.error(`❌ Hook: Error al enviar (${response.status})`);
        }
    } catch (error) {
        console.error(`❌ Hook: Error de conexión - ${error.message}`);
    }
}

main().catch((err) => {
    console.error("Error en hook:", err);
    process.exit(0); // No bloquear Claude Code si falla el hook
});
