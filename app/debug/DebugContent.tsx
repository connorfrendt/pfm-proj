import { notFound } from "next/navigation";
import { timingSafeEqual } from "node:crypto";
import { sql } from "@/lib/db";

type Lead = {
    id: string,
    created_at: string | Date;
    name: string,
    email: string;
    phone: string;
    attribution: Record<string, string>;
    delivery_status: string;
    event_id: string | null;
};

type Attempt = {
    lead_id: string;
    attempt: number;
    status_code: number | null;
    ok: boolean;
    error: string | null;
    duration_ms: number;
}

type ConversionEvent = {
    event_id: string;
    source: string;
    received_at: string | Date;
    counted: boolean;
};

function isAuthorized(key: unknown) {
    const expected = process.env.DEBUG_VIEW_KEY;
    if(!expected || typeof key !== "string") return false;

    const received = Buffer.from(key); // what does Buffer do?
    const wanted = Buffer.from(expected);
    return received.length === wanted.length && timingSafeEqual(received, wanted);
}

function maskEmail(email: string) {
    const [local, domain] = email.split("@");
    if(!local || !domain) return "***";
    return `${local[0]}***@${domain}`;
}

function maskPhone(phone: string) {
    return `***-***-${phone.slice(-4)}`;
}

export default async function DebugContent({
    searchParams,
}: {
    searchParams: Promise<{ key?: string | string[] }>;
}) {
    const { key } = await searchParams;
    if(!isAuthorized(key)) notFound();

    const leads = (await sql`
        SELECT id, created_at, name, email, phone, attribution, delivery_status, event_id
        FROM leads
        ORDER BY id DESC
        LIMIT 25
    `) as Lead[];

    const attempts = (await sql`
        SELECT lead_id, attempt, status_code, ok, error, duration_ms
        FROM webhook_attempts
        WHERE lead_id IN (SELECT id FROM leads ORDER BY id DESC LIMIT 25)
        ORDER BY lead_id, attempt
    `) as Attempt[];

    const events = (await sql`
        SELECT event_id, source, received_at,
            ROW_NUMBER() OVER(PARTITION BY event_name, event_id ORDER BY received_at, id) = 1 AS counted
        FROM conversion_events
        WHERE event_id IN (SELECT event_id FROM leads ORDER BY id DESC LIMIT 25)
        ORDER BY received_at
    `) as ConversionEvent[];

    return (
        <main className="mx-auto max-w-3xl p-6">
            <h1 className="mb-6 text-2xl font-semibold">Lead Debug View</h1>

            {leads.map((lead) => {
                const leadAttempts = attempts.filter(
                    (a) => String(a.lead_id) === String(lead.id)
                );
                const leadEvents = events.filter((e) => e.event_id === lead.event_id);

                return (
                    <section key={lead.id} className="mb-4 rounded border p-4">
                        <h2 className="font-medium">
                            Lead #{lead.id} · {new Date(lead.created_at).toISOString()}
                        </h2>
                        <p>
                            {lead.name.split(" ")[0]} · {maskEmail(lead.email)} ·{" "}
                            {maskPhone(lead.phone)}
                        </p>
                        <p>Attribution: {JSON.stringify(lead.attribution)}</p>

                        <h3 className="mt-2 font-medium">
                            Delivery: {lead.delivery_status}
                        </h3>
                        <ul>
                            {leadAttempts.map((a) => (
                                <li key={a.attempt}>
                                    Attempt {a.attempt}: {a.ok ? "OK" : "FAILED"} ·{" "}
                                    {a.status_code ?? "no response"} · {a.duration_ms}ms
                                    {a.error ? ` · ${a.error}` : ""}
                                </li>
                            ))}
                        </ul>

                        <h3 className="mt-2 font-medium">Conversion Events</h3>
                        {leadEvents.length === 0 ? (
                            <p>None</p>
                        ): (
                            <ul>
                                {leadEvents.map((e, i) => (
                                    <li key={i}>
                                        {e.source} ·{" "}
                                        {new Date(e.received_at).toISOString()} ·{" "}
                                        {e.counted ? "COUNTED" : "duplicate"}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>
                );
            })}
        </main>
    );
}