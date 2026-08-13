type DataAvailabilityPanelProps = {
  coveragePercent: number;
  availableMetrics: number;
  totalMetrics: number;
  presentRawFields: string[];
  missingRawFields: string[];
};

export function DataAvailabilityPanel({
  coveragePercent,
  availableMetrics,
  totalMetrics,
  presentRawFields,
  missingRawFields,
}: DataAvailabilityPanelProps) {
  const tone =
    coveragePercent >= 60
      ? "text-emerald-300"
      : coveragePercent >= 30
        ? "text-amber-300"
        : "text-rose-300";

  return (
    <section className="rounded-xl border border-white/8 bg-[#0a0f1c]/60 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
            Data Availability
          </h3>
          <p className="mt-2 text-xs text-slate-500">
            Calculated long-term metrics versus raw fields extracted from the
            uploaded documents.
          </p>
        </div>
        <div className="text-right">
          <p className={`text-3xl font-bold ${tone}`}>{coveragePercent}%</p>
          <p className="text-xs text-slate-500">
            {availableMetrics} of {totalMetrics} calculated metrics
          </p>
        </div>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <p className="text-xs font-medium text-emerald-300">Raw fields present</p>
          <p className="mt-2 text-xs leading-relaxed text-slate-400">
            {presentRawFields.length > 0
              ? presentRawFields.join(" · ")
              : "None"}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium text-amber-300">Raw fields missing</p>
          <p className="mt-2 text-xs leading-relaxed text-slate-500">
            {missingRawFields.length > 0
              ? missingRawFields.join(" · ")
              : "None"}
          </p>
        </div>
      </div>
    </section>
  );
}
