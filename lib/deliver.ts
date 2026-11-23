import { sql } from "@/lib/db";

const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 1000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function deliverLead(
    leadId: string | number,
    buyerUrl: string,
    payload: object,
) {
    const secret = process.env.BUYER_WEBHOOK_SECRET;

    for(let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        const started = Date.now();
        let statusCode: number | null = null;
        let error: string | null = null;
        let ok = false;

        try{
            const response = await fetch(buyerUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
                },
                body: JSON.stringify(payload),
                signal: AbortSignal.timeout(5000),
            });
            statusCode = response.status;
            ok = response.ok;
            if(!ok) error = `Buyer responded ${response.status}`;
        }
        catch(err) {
            error = err instanceof Error ? err.message : "Unknown error";
        }

        await sql`
            INSERT INTO webhook_attempts (lead_id, attempt, status_code, ok, error, duration_ms)
            VALUES(${leadId}, ${attempt}, ${statusCode}, ${ok}, ${error}, ${Date.now() - started})
        `;

        if(ok) {
            await sql`UPDATE leads SET delivery_status = 'delivered' WHERE id = ${leadId}`;
            return;
        }

        const retryable = statusCode === null || statusCode >= 500 || statusCode === 429;
        if(!retryable) break;

        if(attempt < MAX_ATTEMPTS) {
            await sleep(BASE_DELAY_MS * 2 ** (attempt - 1));
        }
    }

    await sql`UPDATE leads SET delivery_status = 'failed' WHERE id = ${leadId}`;
}