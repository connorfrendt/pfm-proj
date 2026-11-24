import AdSimulator from "./AdSimulator";

export const metadata = { robots: { index: false } };

export default function SimPage() {
    return (
        <main className="min-h-screen bg-slate-100 px-4 py-10 sm:py-16">
            <div className="mx-auto max-w-md">
                <h1 className="mb-2 text-center text-2xl font-bold text-slate-900">
                    Ad Click Simulator
                </h1>
                <p className="mb-6 text-center text-sm text-slate-600">
                    Demo tool: pretend you clicked an ad. Each click builds the
                    URL an ad platform would generate, with a fresh click ID.
                </p>
                <AdSimulator />
            </div>
        </main>
    );
}