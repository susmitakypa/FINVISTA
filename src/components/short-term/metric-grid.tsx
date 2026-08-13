import type { MetricValue } from "@/lib/analysis/short-term-analysis";

type MetricGridProps = {
  title: string;
  metrics: MetricValue[];
};

export function MetricGrid({ title, metrics }: MetricGridProps) {
  return (
    <div className="rounded-xl border border-white/8 bg-[#0a0f1c]/60 p-5">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
        {title}
      </h3>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {metrics.map((m) => (
          <div
            key={m.label}
            className={`rounded-lg border px-4 py-3 ${
              m.available
                ? "border-white/8 bg-white/[0.02]"
                : "border-white/5 bg-white/[0.01]"
            }`}
          >
            <p className="text-xs text-slate-500">{m.label}</p>
            <p
              className={`mt-1 text-lg font-semibold ${
                m.available ? "text-white" : "text-slate-600"
              }`}
            >
              {m.formatted}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
