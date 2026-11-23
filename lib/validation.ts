export type LeadFields = {
    name: string;
    email: string;
    phoneNumber: string;
}

export function validateLead(fields: LeadFields): Record<string, string> {
    const errors: Record<string, string> = {};
    const name = fields.name.trim();
    const email = fields.email.trim();
    const phoneDigits = fields.phoneNumber.replace(/\D/g, "");

    if(name.length < 2 || name.length > 100) {
        errors.name = "Enter your full name";
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
        errors.email = "Enter a valid email address";
    }
    if(phoneDigits.length !== 10) {
        errors.phoneNumber = "Enter a 10-digit US phone number";
    }

    return errors;
}