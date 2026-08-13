import type { CreditMetric } from "@/lib/analysis/debt-sizing-analysis";

export function CreditMetricCard({ metric }: { metric: CreditMetric }) {
  return (
    <div
      className={`rounded-lg border px-4 py-3 ${
        metric.available
          ? "border-white/8 bg-white/[0.02]"
          : "border-white/5 bg-white/[0.01]"
      }`}
    >
      <p className="text-xs text-slate-500">{metric.label}</p>
      <p
        className={`mt-1 text-lg font-semibold ${
          metric.available ? "text-white" : "text-slate-600"
        }`}
      >
        {metric.formatted}
      </p>
      {!metric.available && metric.requiredHint && (
        <p className="mt-1 text-[11px] text-amber-400/80">{metric.requiredHint}</p>
      )}
      {metric.validationNote && (
        <p
          className={`mt-1 text-[11px] ${
            metric.validation === "validated"
              ? "text-emerald-400/90"
              : "text-amber-300/90"
          }`}
        >
          {metric.validationNote}
        </p>
      )}
      <p className="mt-2 text-[11px] text-slate-500">Source: {metric.source}</p>
      <p className="text-[11px] text-slate-600">Method: {metric.methodology}</p>
    </div>
  );
}
