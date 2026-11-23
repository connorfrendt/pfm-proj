import { sql } from "@/lib/db";
import { cleanAttribution } from "@/lib/attribution";
import { UUID_RE } from "@/lib/events";

export async function POST(request: Request) {
    let body: Record<string, unknown>;
    try {
        body = await request.json();
    }
    catch {
        return Response.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const eventId = typeof body.eventId === "string" ? body.eventId : "";
    const eventName = typeof body.eventName === "string" ? body.eventName : "";
    const source = typeof body.source === "string" ? body.source : "";
    const hashedEmail =
        typeof body.hashedEmail === "string" && /^[0-9a-f]{64}$/.test(body.hashedEmail)
        ? body.hashedEmail
        : null;
    
    if(
        !UUID_RE.test(eventId) ||
        eventName !== "Lead" ||
        (source !== "browser" && source !== "server")
    ) {
        return Response.json({ error: "Invalid event" }, { status: 400 });
    }

    try {
        await sql`
            INSERT INTO conversion_events (event_id, event_name, source, click_ids, hashed_email)
            VALUES(${eventId}, ${eventName}, ${source}, ${JSON.stringify(cleanAttribution(body.clickIds))}::jsonb, ${hashedEmail})
        `;
        return Response.json({ received: true });
    }
    catch(error) {
        console.error(
            "Event Save Failed",
            error instanceof Error ? error.message : error
        );
        return Response.json({ error: "Could not save event" }, { status: 500 });
    }
}