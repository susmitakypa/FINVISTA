import { AnalysisCard } from "@/components/dashboard/analysis-card";
import { Disclaimer } from "@/components/dashboard/disclaimer";
import { UploadSection } from "@/components/dashboard/upload-section";
import { ANALYSIS_OPTIONS } from "@/lib/constants";

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <section aria-labelledby="analysis-heading" className="mb-10">
        <div className="mb-6">
          <h2
            id="analysis-heading"
            className="text-sm font-semibold uppercase tracking-wider text-slate-400"
          >
            Analysis Modules
          </h2>
          <p className="mt-1 text-2xl font-semibold text-white">
            Choose an analysis path
          </p>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            Select one of four core analysis workflows. Upload your financial
            data below to prepare for analysis in each module.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {ANALYSIS_OPTIONS.map((option) => (
            <AnalysisCard key={option.id} option={option} />
          ))}
        </div>
      </section>

      <UploadSection />
      <Disclaimer />
    </div>
  );
}
