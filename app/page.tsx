import LeadForm from "./components/LeadForm";

export default function Home() {
    return (
        <main className="min-h-screen bg-slate-100 px-4 py-10 sm:py-16">
            <div className="mx-auto max-w-md">
                <h1 className="mb-6 text-center text-3xl font-bold tracking-tight text-slate-900">
                    Get a Quote
                </h1>
                <LeadForm />
            </div>
        </main>
    );
}