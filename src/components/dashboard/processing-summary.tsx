import type { NormalizedFinancialData } from "@/lib/financial-data-types";
import { metricCoverage } from "@/lib/financial-data-types";
import { DOCUMENT_SOURCE_LABELS } from "@/lib/upload-types";

type ProcessingSummaryProps = {
  data: NormalizedFinancialData;
};

export function ProcessingSummaryCard({ data }: ProcessingSummaryProps) {
  const { summary, sourceFiles, documentCoverage } = data;
  const coverage = documentCoverage ?? {
    screener: false,
    annualReport: false,
    investorPresentation: false,
    quarterlyResults: false,
  };

  const coverageItems = [
    { key: "screener", label: DOCUMENT_SOURCE_LABELS.screener, available: coverage.screener },
    { key: "annual-report", label: DOCUMENT_SOURCE_LABELS["annual-report"], available: coverage.annualReport },
    { key: "investor-presentation", label: DOCUMENT_SOURCE_LABELS["investor-presentation"], available: coverage.investorPresentation },
    { key: "quarterly-results", label: DOCUMENT_SOURCE_LABELS["quarterly-results"], available: coverage.quarterlyResults },
  ];

  const coverageCounts = metricCoverage(data);

  return (
    <div className="rounded-xl border border-white/8 bg-[#0a0f1c]/60 p-5">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
        Data Coverage
      </h3>
      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        {coverageItems.map((item) => (
          <div
            key={item.key}
            className="rounded-lg border border-white/8 bg-white/[0.02] px-4 py-3"
          >
            <p className="text-xs text-slate-500">{item.label}</p>
            <p
              className={`mt-1 text-sm font-semibold ${
                item.available ? "text-emerald-300" : "text-slate-500"
              }`}
            >
              {item.available ? "✓ Available" : "Not uploaded"}
            </p>
          </div>
        ))}
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        <SummaryStat label="Files Processed" value={summary.filesProcessed} />
        <SummaryStat
          label="Successfully Parsed"
          value={summary.filesSuccessfullyParsed}
          accent="emerald"
        />
        <SummaryStat
          label="Requiring Review"
          value={summary.filesRequiringReview}
          accent="amber"
        />
        <SummaryStat
          label="Fields Extracted"
          value={summary.totalFieldsExtracted}
          accent="sky"
        />
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <SummaryStat
          label="Metrics available"
          value={coverageCounts.available}
          accent="emerald"
        />
        <SummaryStat
          label="Metrics unavailable"
          value={coverageCounts.unavailable}
          accent="amber"
        />
      </div>
      {sourceFiles.length > 0 && (
        <ul className="mt-4 space-y-2">
          {sourceFiles.map((file) => (
            <li
              key={file.id}
              className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-xs"
            >
              <span className="truncate text-slate-300">
                {file.name}
                <span className="ml-2 text-slate-600">
                  {DOCUMENT_SOURCE_LABELS[file.category] ?? file.category}
                </span>
              </span>
              <span
                className={`ml-2 shrink-0 rounded-full px-2 py-0.5 font-medium ${
                  file.status === "success"
                    ? "bg-emerald-500/10 text-emerald-400"
                    : file.status === "failed"
                      ? "bg-rose-500/10 text-rose-400"
                      : "bg-amber-500/10 text-amber-400"
                }`}
              >
                {file.status === "failed"
                  ? file.error ?? "could not be processed"
                  : file.status}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SummaryStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: "emerald" | "amber" | "sky";
}) {
  const color =
    accent === "emerald"
      ? "text-emerald-400"
      : accent === "amber"
        ? "text-amber-400"
        : accent === "sky"
          ? "text-sky-400"
          : "text-white";

  return (
    <div className="rounded-lg border border-white/8 bg-white/[0.02] px-4 py-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}
