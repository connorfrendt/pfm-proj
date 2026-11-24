import { notFound } from "next/navigation";
import { timingSafeEqual } from "node:crypto";
import { sql } from "@/lib/db";
import { ReactNode } from "react";

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

const timeFormat = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    fractionalSecondDigits: 3,
    hour12: false,
});

function formatTime(value: string | Date) {
    return timeFormat.format(new Date(value));
}

const tones = {
    green: "bg-green-100 text-green-800",
    red: "bg-red-100 text-red-800",
    amber: "bg-amber-100 text-amber-800",
    slate: "bg-slate-200 text-slate-700"
};
type Tone = keyof typeof tones;

function Badge({ tone, children}: { tone: Tone; children: ReactNode }) {
    return (
        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${tones[tone]}`}>
            {children}
        </span>
    )
}

function deliveryTone(status: string): Tone {
    if(status === "delivered") return "green";
    if(status === "failed") return "red";
    return "amber";
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

    const attemptsFor = (leadId: string) => attempts.filter((a) => String(a.lead_id) === String(leadId));

    const stats = [
        {
            label: "Delivered",
            value: leads.filter((l) => l.delivery_status === "delivered").length,
        },
        {
            label: "Failed",
            value: leads.filter((l) => l.delivery_status === "failed").length,
        },
        {
            label: "Needed retries",
            value: leads.filter((l) => attemptsFor(l.id).length > 1).length,
        },
        {
            label: "Duplicate events caught",
            value: events.filter((e) => !e.counted).length,
        },
    ];

    return (
        <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900">
            <div className="mx-auto max-w-4xl">
                <header className="mb-6">
                    <h1 className="text-2xl font-bold">Lead Debug View</h1>
                    <p className="text-sm text-slate-600">
                        Latest {leads.length} leads · Contact Info Masked · Times in
                        PST
                    </p>
                </header>

                <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {stats.map((stat) => (
                        <div
                            key={stat.label}
                            className="rounded-xl bg-white p-4 shadow-sm"
                        >
                            <p className="text-2xl font-bold">{stat.value}</p>
                            <p className="text-xs text-slate-500">{stat.label}</p>
                        </div>
                    ))}
                </div>

                <div className="space-y-4">
                    {leads.map((lead) => {
                        const leadAttempts = attemptsFor(lead.id);
                        const leadEvents = events.filter(
                            (e) => e.event_id === lead.event_id
                        );
                        const attributionEntries = Object.entries(lead.attribution);

                        return(
                            <section
                                key={lead.id}
                                className="rounded-xl bg-white p-5 shadow-sm"
                            >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <h2 className="text-lg font-semibold">
                                        Lead #{lead.id}
                                    </h2>
                                    <Badge tone={deliveryTone(lead.delivery_status)}>
                                        {lead.delivery_status}
                                    </Badge>
                                </div>
                                <p className="text-sm text-slate-500">
                                    {formatTime(lead.created_at)}
                                </p>
                                <p className="mt-2 text-sm">
                                    {lead.name.split(" ")[0]} ·{" "}
                                    {maskEmail(lead.email)} · {maskPhone(lead.phone)}
                                </p>

                                <div className="mt-3 flex flex-wrap gap-2">
                                    {attributionEntries.length === 0 ? (
                                        <span className="text-xs text-slate-400">
                                            No attribution captured
                                        </span>
                                    ) : (
                                        attributionEntries.map(([key, value]) => (
                                            <span
                                                key={key}
                                                title={value}
                                                className="max-w-full break-all rounded-md bg-slate-100 px-2 py-1 text-xs"
                                            >
                                                <span className="text-slate-500">
                                                    {key}
                                                </span>{" "}
                                                {value}
                                            </span>
                                        ))
                                    )}
                                </div>

                                <div className="mt-4 grid gap-4 border-t border-slate-100 pt-4 md:grid-cols-2">
                                    <div>
                                        <h3 className="mb-2 text-sm font-semibold">
                                            Delivery attempts
                                        </h3>
                                        <ol className="space-y-2 text-sm">
                                            {leadAttempts.map((a) => (
                                                <li
                                                    key={a.attempt}
                                                    className="flex flex-wrap items-center gap-2"
                                                >
                                                    <span className="text-slate-500">
                                                        #{a.attempt}
                                                    </span>
                                                    <Badge tone={a.ok ? "green" : "red"}>
                                                        {a.status_code ?? "no response"}
                                                    </Badge>
                                                    <span className="text-slate-500">
                                                        {a.duration_ms}ms
                                                    </span>
                                                    {a.error && (
                                                        <span className="text-red-600">
                                                            {a.error}
                                                        </span>
                                                    )}
                                                </li>
                                            ))}
                                        </ol>
                                    </div>

                                    <div>
                                        <h3 className="mb-2 text-sm font-semibold">
                                            Conversion events
                                        </h3>
                                        {leadEvents.length === 0 ? (
                                            <p className="text-sm text-slate-400">None</p>
                                        ) : (
                                            <ul className="space-y-2 text-sm">
                                                {leadEvents.map((e, i) => (
                                                    <li
                                                        key={i}
                                                        className="flex flex-wrap items-center gap-2"
                                                    >
                                                        <Badge tone="slate">
                                                            {e.source}
                                                        </Badge>
                                                        <span className="text-slate-500">
                                                            {formatTime(e.received_at)}
                                                        </span>
                                                        <Badge
                                                            tone={
                                                                e.counted
                                                                    ? "green"
                                                                    : "amber"
                                                            }
                                                        >
                                                            {e.counted
                                                                ? "counted"
                                                                : "duplicate"}
                                                        </Badge>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                </div>
                            </section>
                        )
                    })}
                </div>
            </div>
        </main>
    )
}