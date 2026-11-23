import { sql } from "@/lib/db";
import { after } from "next/server";
import { deliverLead } from "@/lib/deliver";
import { cleanAttribution } from "@/lib/attribution";
import { UUID_RE, hashEmail, sendServerEvent } from "@/lib/events";
import { validateLead } from "@/lib/validation";

type LeadInput = {
    name?: unknown;
    email?: unknown;
    phoneNumber?: unknown;
    attribution?: unknown;
    eventId?: unknown;
};

export async function POST(request: Request) {
    let body: LeadInput;
    try {
        body = await request.json();
    }
    catch {
        return Response.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const phoneNumber = typeof body.phoneNumber === "string" ? body.phoneNumber : "";
    const phoneDigits = phoneNumber.replace(/\D/g, "");

    const eventId =
        typeof body.eventId === "string" && UUID_RE.test(body.eventId)
        ? body.eventId
        : null;

    const errors = validateLead({ name, email, phoneNumber });

    if(Object.keys(errors).length > 0) {
        return Response.json({ errors }, { status: 400 });
    }

    const attribution = cleanAttribution(body.attribution);

    try {
        const rows = await sql`
            INSERT INTO leads (name, email, phone, attribution, event_id)
            VALUES (${name}, ${email}, ${phoneDigits}, ${JSON.stringify(attribution)}::jsonb, ${eventId})
            RETURNING id
        `;
        // The above is not string concatenation. The driver sends each ${...} as a separate param,
        // so malicious names like "; DROP TABLE leads;" is stored as plain text and never executed

        const leadId = rows[0].id;
        const buyerUrl = process.env.BUYER_WEBHOOK_URL ?? new URL("/api/mock-buyer", request.url).toString();

        after(() =>
            deliverLead(leadId, buyerUrl, {
                leadId,
                name,
                email,
                phone: phoneDigits,
                attribution,
            })
        );

        if(eventId) {
            const platformUrl = new URL(
                "/api/mock-platform/events",
                request.url
            ).toString();
            
            after(() =>
                sendServerEvent(platformUrl, {
                    eventId,
                    eventName: "Lead",
                    source: "server",
                    hashedEmail: hashEmail(email),
                    clickIds: attribution,
                })
            );
        }


        return Response.json({ ok: true, leadId });
    }
    catch(error) {
        console.error(
            "Lead save failed: ",
            error instanceof Error ? error.message : error
        )
        return Response.json({ error: "Could not save lead" }, { status: 500 });
        // try/catch returns a generic 500. DB errors can leak table names and internals,
        // so detail goes in server logs, not in the response
    }
}