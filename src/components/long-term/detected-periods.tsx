import type { DetectedPeriod } from "@/lib/analysis/long-term-analysis";

type PeriodsPanelProps = {
  periods: DetectedPeriod[];
};

export function DetectedPeriodsPanel({ periods }: PeriodsPanelProps) {
  return (
    <section className="rounded-xl border border-white/8 bg-[#0a0f1c]/60 p-5">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
        Detected Financial Periods
      </h3>
      <p className="mt-2 text-xs text-slate-500">
        Periods come from the existing processed upload dataset. No additional
        files are required.
      </p>
      <div className="mt-4 space-y-3">
        {periods.map((period: DetectedPeriod) => {
          const present = period.fields.filter((field) => field.present);
          const missing = period.fields.filter((field) => !field.present);
          return (
            <article
              key={`${period.label}-${period.year ?? "na"}`}
              className="rounded-lg border border-white/8 bg-white/[0.02] p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-sm font-medium text-white">{period.label}</h4>
                <span className="text-xs text-slate-500">
                  {period.fieldCount} raw field
                  {period.fieldCount === 1 ? "" : "s"} present
                </span>
              </div>
              {present.length > 0 && (
                <p className="mt-2 text-xs text-emerald-300/80">
                  Present:{" "}
                  {present
                    .map((field) => `${field.name} (${field.value})`)
                    .join(" · ")}
                </p>
              )}
              {missing.length > 0 && (
                <p className="mt-1 text-xs text-slate-600">
                  Missing: {missing.map((field) => field.name).join(" · ")}
                </p>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
