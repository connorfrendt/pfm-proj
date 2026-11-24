"use client";

type Ad = {
    label: string;
    description: string;
    clickIdKey: string;
    params: Record<string, string>;
}

const ADS: Ad[] = [
    {
        label: "Google",
        description: "Search ad",
        clickIdKey: "gclid",
        params: {
            utm_source: "google",
            utm_medium: "cpc",
            utm_campaign: "auto-insurance-q4",
            utm_content: "headline-a",
        },
    },
        {
        label: "Microsoft",
        description: "Bing search ad",
        clickIdKey: "msclkid",
        params: {
            utm_source: "bing",
            utm_medium: "cpc",
            utm_campaign: "auto-insurance-q4",
            utm_content: "headline-a",
        },
    },
    {
        label: "Meta",
        description: "Facebook / Instagram feed ad",
        clickIdKey: "fbclid",
        params: {
            utm_source: "facebook",
            utm_medium: "paid_social",
            utm_campaign: "auto-insurance-q4",
            utm_content: "video-b",
        },
    },
];

function randomClickId() {
    return crypto.randomUUID().replace(/-/g, "").slice(0, 20);
}

export default function AdSimulator() {
    function clickAd(ad: Ad) {
        const params = new URLSearchParams({
            ...ad.params,
            [ad.clickIdKey]: randomClickId(),
        });
        window.location.assign(`/?${params.toString()}`);
    }

    return (
        <div className="space-y-3">
            {ADS.map((ad) => (
                <button
                    key={ad.label}
                    type="button"
                    onClick={() => clickAd(ad)}
                    className="w-full rounded-xl bg-white p-4 text-left text-slate-900 shadow transition hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                >
                    <span className="block text-lg font-semibold">{ad.label}</span>
                    <span className="block text-sm text-slate-500">{ad.description}</span>
                </button>
            ))}
        </div>
    )
}