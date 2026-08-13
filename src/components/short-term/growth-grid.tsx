import type { GrowthMetric } from "@/lib/analysis/short-term-analysis";

type GrowthGridProps = {
  metrics: GrowthMetric[];
};

export function GrowthGrid({ metrics }: GrowthGridProps) {
  return (
    <div className="rounded-xl border border-white/8 bg-[#0a0f1c]/60 p-5">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
        Growth Metrics
      </h3>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {metrics.map((m) => (
          <div
            key={m.label}
            className="rounded-lg border border-white/8 bg-white/[0.02] px-4 py-3"
          >
            <p className="text-xs text-slate-500">{m.label}</p>
            <p
              className={`mt-1 text-lg font-semibold ${
                m.available ? "text-white" : "text-slate-600"
              }`}
            >
              {m.formatted}
            </p>
            {m.growthPercent !== null ? (
              <p
                className={`mt-1 text-xs font-medium ${
                  m.growthPercent >= 0 ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {m.growthPercent >= 0 ? "+" : ""}
                {m.growthPercent.toFixed(1)}% vs prior period
              </p>
            ) : (
              <p className="mt-1 text-xs text-slate-600">
                Growth: Not available
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
