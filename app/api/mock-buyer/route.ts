export async function POST() {
    const failRate = Number(process.env.MOCK_BUYER_FAIL_RATE ?? "0.3");

    if(Math.random() < failRate) {
        return Response.json({ accepted: false }, { status: 503 });
    }

    return Response.json({ accepted: true, buyerRef: crypto.randomUUID() });
}