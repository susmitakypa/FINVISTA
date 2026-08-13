"use client";

import { useMemo } from "react";
import { useFinancialSession } from "@/context/financial-session-context";
import { analyzeShortTermInvestment } from "@/lib/analysis/short-term-analysis";
import { AssessmentBadge } from "./assessment-badge";
import { BarChart, MarginTrendChart } from "./bar-chart";
import { GrowthGrid } from "./growth-grid";
import { MetricGrid } from "./metric-grid";
import { NoDataState } from "./no-data-state";

export function ShortTermInvestmentView() {
  const { financialData, isSessionReady } = useFinancialSession();
  const analysis = useMemo(
    () => analyzeShortTermInvestment(financialData),
    [financialData],
  );

  if (!isSessionReady) {
    return (
      <div className="mx-auto max-w-2xl rounded-xl border border-white/8 bg-[#0a0f1c]/60 px-6 py-16 text-center">
        <p className="text-sm text-slate-400">Loading saved financial data…</p>
      </div>
    );
  }

  if (!analysis) {
    return <NoDataState />;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* Company Summary */}
      <section className="rounded-xl border border-white/8 bg-gradient-to-br from-[#0f1629]/80 to-[#0a0f1c]/80 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Company Analysis
            </p>
            <h2 className="mt-1 text-2xl font-bold text-white">
              {analysis.company ?? "Unknown Company"}
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              {analysis.periodsAvailable} period
              {analysis.periodsAvailable === 1 ? "" : "s"} available
              {analysis.latestPeriod?.period
                ? ` · Latest: ${analysis.latestPeriod.period}`
                : ""}
            </p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-right">
            <p className="text-xs text-slate-500">Data Coverage</p>
            <p className="text-2xl font-bold text-sky-400">
              {analysis.dataCoverage.coveragePercent}%
            </p>
            <p className="text-xs text-slate-600">
              {analysis.dataCoverage.availableMetrics} of{" "}
              {analysis.dataCoverage.totalMetrics} metrics
            </p>
          </div>
        </div>
      </section>

      {/* Assessment */}
      <AssessmentBadge
        rating={analysis.assessment}
        reasoning={analysis.assessmentReasoning}
      />

      {/* Metrics */}
      <div className="grid gap-5 lg:grid-cols-2">
        <MetricGrid title="Valuation & Market" metrics={analysis.valuationMetrics} />
        <GrowthGrid metrics={analysis.growthMetrics} />
        <MetricGrid
          title="Profitability"
          metrics={analysis.profitabilityMetrics}
        />
        <MetricGrid title="Leverage & Liquidity" metrics={analysis.leverageMetrics} />
        <MetricGrid
          title="Ownership"
          metrics={analysis.ownershipMetrics}
        />
      </div>

      {/* Charts */}
      <div className="grid gap-5 lg:grid-cols-3">
        <BarChart
          title="Revenue by Period"
          data={analysis.chartData.revenueByPeriod}
          color="#38bdf8"
          unit=" Cr"
        />
        <BarChart
          title="Net Profit by Period"
          data={analysis.chartData.profitByPeriod}
          color="#818cf8"
          unit=" Cr"
        />
        <MarginTrendChart
          title="Margin Trend"
          data={analysis.chartData.marginTrend}
        />
      </div>

      {/* Positives & Risks */}
      <div className="grid gap-5 md:grid-cols-2">
        <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/[0.04] p-5">
          <h3 className="text-sm font-semibold text-emerald-300">
            Key Positives
          </h3>
          <ul className="mt-4 space-y-2">
            {analysis.positives.map((item) => (
              <li
                key={item}
                className="flex items-start gap-2 text-sm text-emerald-100/80"
              >
                <span className="mt-1.5 text-emerald-400">+</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-rose-500/15 bg-rose-500/[0.04] p-5">
          <h3 className="text-sm font-semibold text-rose-300">Key Risks</h3>
          <ul className="mt-4 space-y-2">
            {analysis.risks.map((item) => (
              <li
                key={item}
                className="flex items-start gap-2 text-sm text-rose-100/80"
              >
                <span className="mt-1.5 text-rose-400">−</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Thesis */}
      <section className="rounded-xl border border-white/8 bg-[#0a0f1c]/60 p-6">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
          Short-Term Investment Thesis
        </h3>
        <p className="mt-4 text-sm leading-relaxed text-slate-300">
          {analysis.thesis}
        </p>
      </section>
    </div>
  );
}
