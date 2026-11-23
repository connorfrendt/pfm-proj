import { timingSafeEqual } from "node:crypto";

function isAuthorized(request: Request) {
    const secret = process.env.BUYER_WEBHOOK_SECRET;
    if(!secret) return false;

    const received = Buffer.from(request.headers.get("authorization") ?? "");
    const expected = Buffer.from(`Bearer ${secret}`);

    return (
        received.length === expected.length &&
        timingSafeEqual(received, expected)
    );
}

export async function POST(request: Request) {
    if(!isAuthorized(request)) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const failRate = Number(process.env.MOCK_BUYER_FAIL_RATE ?? "0.3");

    if(Math.random() < failRate) {
        return Response.json({ accepted: false }, { status: 503 });
    }

    return Response.json({ accepted: true, buyerRef: crypto.randomUUID() });
}