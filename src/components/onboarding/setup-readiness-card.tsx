import Link from "next/link";
import { Card } from "@/components/ui/card";
import type { SetupReadiness } from "@/lib/onboarding/readiness";

export function SetupReadinessCard({ readiness }: { readiness: SetupReadiness }) {
  if (readiness.isThresholdReached || readiness.missingItems.length === 0) {
    return null;
  }

  return (
    <section className="rounded-xl border-2 border-amber-300 bg-amber-50 p-4 shadow-sm">
      <Card title="Setup Readiness">
        <p className="text-sm text-slate-700">
          Completion: <span className="font-semibold">{readiness.completionPercent}%</span> (target {readiness.thresholdPercent}%).
          Complete these essentials to get the workspace fully production-ready.
        </p>
        <ul className="mt-3 space-y-2 text-sm">
          {readiness.missingItems.map((item) => (
            <li key={item.key} className="flex items-center justify-between gap-2 rounded border border-amber-200 bg-white px-3 py-2">
              <span className="text-slate-800">{item.label}</span>
              <Link href={item.href} className="whitespace-nowrap font-medium text-amber-800 underline">
                Fix now
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    </section>
  );
}
