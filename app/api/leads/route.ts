const ALLOWED_ATTRIBUTION_KEYS = [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_content",
    "utm_term",
    "gclid",
    "fbclid",
    "ttclid",
    "msclkid",
];
const MAX_VALUE_LENGTH = 200;

type LeadInput = {
    name?: unknown;
    email?: unknown;
    phoneNumber?: unknown;
    attribution?: unknown;
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

    const errors: Record<string, string> = {};

    if(name.length < 2 || name.length > 100) {
        errors.name = "Enter your full name";
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
        errors.email = "Enter a valid email address";
    }
    if(phoneDigits.length !== 10) {
        errors.phoneNumber = "Enter a 10-digit US phone number";
    }

    if(Object.keys(errors).length > 0) {
        return Response.json({ errors }, { status: 400 });
    }

    const attribution: Record<string, string> = {};
    if(typeof body.attribution === "object" && body.attribution !== null) {
        const raw = body.attribution as Record<string, unknown>;
        for(const key of ALLOWED_ATTRIBUTION_KEYS) {
            const value = raw[key];
            if(typeof value === "string" && value.length > 0) {
                attribution[key] = value.slice(0, MAX_VALUE_LENGTH);
            }
        }
    }

    // TODO: save the lead to the database (next up)

    return Response.json({
        ok: true,
        attributionKeys: Object.keys(attribution),
    });
}