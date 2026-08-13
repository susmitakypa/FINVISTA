import type { LongTermMetric } from "@/lib/analysis/long-term-analysis";

type MetricGridProps = {
  title: string;
  metrics: LongTermMetric[];
};

export function LongTermMetricGrid({ title, metrics }: MetricGridProps) {
  return (
    <div className="rounded-xl border border-white/8 bg-[#0a0f1c]/60 p-5">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
        {title}
      </h3>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {metrics.map((entry: LongTermMetric) => (
          <div
            key={entry.label}
            className={`rounded-lg border px-4 py-3 ${
              entry.available
                ? "border-white/8 bg-white/[0.02]"
                : "border-white/5 bg-white/[0.01]"
            }`}
          >
            <p className="text-xs text-slate-500">{entry.label}</p>
            <p
              className={`mt-1 text-lg font-semibold ${
                entry.available ? "text-white" : "text-slate-600"
              }`}
            >
              {entry.formatted}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
