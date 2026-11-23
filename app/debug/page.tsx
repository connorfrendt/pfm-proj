import { Suspense } from "react";
import DebugContent from "./DebugContent";

export const metadata = { robots: { index: false } };

export default function DebugPage({
    searchParams,
}: {
    searchParams: Promise<{ key?: string | string[] }>;
}) {
    return (
        <Suspense fallback={<p>Loading...</p>}>
            <DebugContent searchParams={searchParams} />
        </Suspense>
    );
}