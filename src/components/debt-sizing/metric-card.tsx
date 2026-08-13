import type {
  CreditMetric,
  InputOrigin,
} from "@/lib/analysis/debt-sizing-analysis";

const ORIGIN_STYLES: Record<InputOrigin, string> = {
  EXTRACTED: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  CALCULATED: "border-sky-500/30 bg-sky-500/10 text-sky-300",
  ASSUMED: "border-amber-500/30 bg-amber-500/10 text-amber-300",
};

export function OriginBadge({
  origin,
  label,
}: {
  origin?: InputOrigin;
  label?: string;
}) {
  if (!origin && !label) return null;
  const style = origin ? ORIGIN_STYLES[origin] : ORIGIN_STYLES.ASSUMED;
  return (
    <span
      className={`ml-2 inline-flex rounded border px-1.5 py-0.5 text-[10px] font-semibold tracking-wide ${style}`}
    >
      {label ?? origin}
    </span>
  );
}

export function CreditMetricCard({ metric }: { metric: CreditMetric }) {
  return (
    <div
      className={`rounded-lg border px-4 py-3 ${
        metric.available
          ? "border-white/8 bg-white/[0.02]"
          : "border-white/5 bg-white/[0.01]"
      }`}
    >
      <p className="text-xs text-slate-500">
        {metric.label}
        <OriginBadge origin={metric.origin} label={metric.originLabel} />
      </p>
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
