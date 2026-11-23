"use client";

import { useEffect, useState, type FormEvent } from "react";
import { validateLead } from "@/lib/validation";

const TRACKED_PARAMS = [
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

const inputClass = "mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-base text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/30";
const primaryButton = "rounded-lg bg-blue-600 px-5 py-3 text-base font-semibold text-white transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";
const secondaryButton = "rounded-lg border border-slate-300 bg-white px-5 py-3 text-base font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

// type alias.  Name for a shape of data. Exists only at compile time and disappears
// from the JS that actually runs
type Attribution = Record<string, string>;


export default function LeadForm() {
    const [step, setStep] = useState(1);
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [phoneNumber, setPhoneNumber] = useState("");
    const [attribution, setAttribution] = useState<Attribution>({});
    const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const found: Attribution = {};

        for(const key of TRACKED_PARAMS) {
            const value = params.get(key);
            if(value) found[key] = value;
        }

        if(Object.keys(found).length > 0) {
            sessionStorage.setItem("attribution", JSON.stringify(found));
            setAttribution(found);
        }
        else {
            const saved = sessionStorage.getItem("attribution");
            if(saved) setAttribution(JSON.parse(saved));
        }
    }, []);

    async function handleSubmit() {
        const eventId = crypto.randomUUID();
        setStatus("sending");
        setErrors({});

        try {
            const response = await fetch("/api/leads", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, email, phoneNumber, attribution, eventId }),
            });
            const data = await response.json();

            if(!response.ok) {
                // setErrors(data.errors ?? {});
                const fieldErrors: Record<string, string> = data.errors ?? {};
                setErrors(fieldErrors);
                if(fieldErrors.name) setStep(1);
                else if(fieldErrors.email || fieldErrors.phoneNumber) setStep(2);
                return;
            }

            fetch("/api/mock-platform/events", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    eventId,
                    eventName: "Lead",
                    source: "browser",
                    clickIds: attribution,
                }),
                keepalive: true,
            }).catch(() => {});

            setStatus("success");
        }
        catch {
            setStatus("error");
        }
    }

    function handleFormSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        
        const allErrors = validateLead({ name, email, phoneNumber });
        const fieldsOnThisStep = 
            step === 1
                ? ["name"]
                : step === 2
                    ? ["email", "phoneNumber"]
                    : ["name", "email", "phoneNumber"];
        
        const stepErrors: Record<string, string> = {};
        for(const field of fieldsOnThisStep) {
            if(allErrors[field]) stepErrors[field] = allErrors[field];
        }

        setErrors(stepErrors);
        if(Object.keys(stepErrors).length > 0) return;

        if(step < 3) setStep(step + 1);

        else handleSubmit();
    }

    if(status === "success") {
        return (
            <div
                role="status"
                className="mx-auto w-full max-w-md rounded-2xl bg-white p-8 text-center text-slate-900 shadow-lg"
            >
                <h2 className="text-2xl font-bold">
                    Thanks, {name.split(" ")[0]}!
                </h2>
                <p className="mt-2 text-slate-600">
                    We&apos;ve received your request.
                </p>
            </div>
        )
    }

    return (
        <form
            onSubmit={handleFormSubmit}
            noValidate
            className="mx-auto w-full max-w-md rounded-2xl bg-white p-6 text-slate-900 shadow-lg sm:p-8"
        >
            <p className="text-sm font-medium text-slate-500">Step {step} of 3</p>
            <div
                role="progressbar"
                aria-label="Form progress"
                aria-valuemin={1}
                aria-valuemax={3}
                aria-valuenow={step}
                className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200"
            >
                <div
                    className="h-full rounded-full bg-blue-600 transition-all"
                    style={{ width: `${(step /3 ) * 100}%` }}
                />
            </div>

            {step === 1 && (
                <div className="mt-6">
                    <h2 className="text-xl font-semibold">What&apos;s your name?</h2>
                    <label
                        htmlFor="name"
                        className="mt-4 block text-sm font-medium text-slate-700"
                    >
                        Full name
                    </label>
                    <input
                        id="name"
                        name="name"
                        type="text"
                        autoComplete="name"
                        required
                        minLength={2}
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        placeholder="Jane Smith"
                        aria-invalid={Boolean(errors.name)}
                        aria-describedby={errors.name ? "name-error" : undefined}
                        className={inputClass}
                    />
                    {errors.name && (
                        <p id="name-error" className="mt-1 text-sm text-red-600">
                            {errors.name}
                        </p>
                    )}
                </div>
            )}

            {step === 2 && (
                <div className="mt-6">
                    <h2 className="text-xl font-semibold">How can we reach you?</h2>

                    <label
                        htmlFor="email"
                        className="mt-4 block text-sm font-medium text-slate-700"
                    >
                        Email
                    </label>
                    <input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="hello@example.com"
                        aria-invalid={Boolean(errors.email)}
                        aria-describedby={errors.email ? "email-error" : undefined}
                        className={inputClass}
                    />
                    {errors.email && (
                        <p id="email-error" className="mt-1 text-sm text-red-600">
                            {errors.email}
                        </p>
                    )}

                    <label
                        htmlFor="phone"
                        className="mt-4 block text-sm font-medium text-slate-700"
                    >
                        Phone number
                    </label>
                    <input
                        id="phone"
                        name="phone"
                        type="tel"
                        autoComplete="tel"
                        required
                        value={phoneNumber}
                        onChange={(event) => setPhoneNumber(event.target.value)}
                        placeholder="555-555-5555"
                        aria-invalid={Boolean(errors.phoneNumber)}
                        aria-describedby={errors.phoneNumber ? "phone-error" : undefined }
                        className={inputClass}
                    />
                    {errors.phoneNumber && (
                        <p id="phone-error" className="mt-1 text-sm text-red-600">
                            {errors.phoneNumber}
                        </p>
                    )}

                </div>
            )}

            {step === 3 && (
                <div className="mt-6">
                    <h2 className="text-xl font-semibold">Review your details</h2>
                    <dl className="mt-4 space-y-3 text-sm">
                        <div>
                            <dt className="text-slate-500">Name</dt>
                            <dd className="font-medium">{name}</dd>
                        </div>
                        <div>
                            <dt className="text-slate-500">Email</dt>
                            <dd className="font-medium">{email}</dd>
                        </div>
                        <div>
                            <dt className="text-slate-500">Phone</dt>
                            <dd className="font-medium">{phoneNumber}</dd>
                        </div>
                    </dl>
                </div>
            )}

            <div aria-live="polite" className="mt-4 min-h-5 text-sm">
                {status === "error" && Object.keys(errors).length === 0 && (
                    <p className="text-red-600">
                        Something went wrong. Please try again.
                    </p>
                )}
            </div>

            <div className="mt-4 flex gap-3">
                <button
                    type="button"
                    onClick={() => setStep(step - 1)}
                    disabled={step === 1}
                    className={`${secondaryButton} flex-1`}
                >
                    Back
                </button>
                <button
                    type="submit"
                    disabled={status === "sending"}
                    className={`${primaryButton} flex-1`}
                >
                    {step < 3 ? "Next" : status === "sending" ? "Submitting..." : "Submit"}
                </button>
            </div>
        </form>
    );
}