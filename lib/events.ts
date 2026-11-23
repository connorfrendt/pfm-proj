import { createHash } from "node:crypto";

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function hashEmail(email: string) {
    return createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
}

export async function sendServerEvent(url: string, event: object) {
    try {
        await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(event),
            signal: AbortSignal.timeout(5000),
        });
    }
    catch(err) {
        console.error(
            "Server Event Failed",
            err instanceof Error ? err.message : err
        );
    }
}