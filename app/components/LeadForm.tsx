"use client";

import { useEffect, useState } from "react";

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

// type alias.  Name for a shape of data. Exists only at compile time and disappears
// from the JS that actually runs
type Attribution = Record<string, string>;


export default function LeadForm() {
    const [step, setStep] = useState(1);
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [phoneNumber, setPhoneNumber] = useState("");
    const [attribution, setAttribution] = useState<Attribution>({});

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

    return (
        <div>
            {step === 1 &&  (
                <>
                    <div>
                        <h2>Step 1: Your Name</h2>
                        <input
                            type="text"
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                            placeholder="Full Name"
                        />
                    </div>
                </>
            )}

            {step === 2 && (
                <>
                    <h2>Step 2: Contact Info</h2>
                    <div>
                        <h2>Your Email:</h2>
                        <input
                            type="email"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            placeholder="hello@example.com"
                        />
                        <h2>Phone Number:</h2>
                        <input
                            type="tel"
                            value={phoneNumber}
                            onChange={(event) => setPhoneNumber(event.target.value)}
                            placeholder="555-555-5555"
                        />
                    </div>
                </>
            )}

            {step === 3 && (
                <>
                    <h2>Step 3: Review. Hi {name}!</h2>
                    <h3>Your email: {email}</h3>
                    <h3>Your phone number: {phoneNumber}</h3>
                    <pre>{JSON.stringify(attribution, null, 2)}</pre>
                </>
            )}

            <button onClick={() => setStep(step - 1)} disabled={step === 1}>
                Back
            </button>
            <button onClick={() => setStep(step + 1)} disabled={step === 3}>
                Next
            </button>
        </div>
    )
}