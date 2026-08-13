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
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs text-slate-500">{entry.label}</p>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                  entry.available
                    ? "bg-emerald-500/10 text-emerald-300"
                    : "bg-slate-500/10 text-slate-500"
                }`}
              >
                {entry.available ? "Calculated" : "Unavailable"}
              </span>
            </div>
            <p
              className={`mt-1 text-lg font-semibold ${
                entry.available ? "text-white" : "text-slate-600"
              }`}
            >
              {entry.formatted}
            </p>
            <p className="mt-2 text-[11px] text-slate-500">{entry.formula}</p>
            {entry.inputsUsed.length > 0 && (
              <ul className="mt-2 space-y-1">
                {entry.inputsUsed.map((input: string) => (
                  <li key={input} className="text-[11px] text-slate-400">
                    Used: {input}
                  </li>
                ))}
              </ul>
            )}
            {entry.missingInputs.length > 0 && (
              <ul className="mt-2 space-y-1">
                {entry.missingInputs.map((input: string) => (
                  <li key={input} className="text-[11px] text-amber-400/80">
                    Missing: {input}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
