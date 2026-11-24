export const ALLOWED_ATTRIBUTION_KEYS = [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_content",
    "utm_term",
    "gclid",
    "fbclid",
    "ttclid",
    "msclkid",
    "aff_id",
    "sub_id",
    "referrer",
    "landing_path",
]
const MAX_VALUE_LENGTH = 200;

export function cleanAttribution(raw: unknown): Record<string, string> {
    const clean: Record<string, string> = {};
    if(typeof raw !== "object" || raw === null) return clean;

    const source = raw as Record<string, unknown>;
    for(const key of ALLOWED_ATTRIBUTION_KEYS) {
        const value = source[key];
        if(typeof value === "string" && value.length > 0) {
            clean[key] = value.slice(0, MAX_VALUE_LENGTH);
        }
    }
    
    return clean;
}