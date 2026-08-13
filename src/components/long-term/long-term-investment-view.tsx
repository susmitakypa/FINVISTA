"use client";

import { useMemo } from "react";
import { useFinancialSession } from "@/context/financial-session-context";
import { analyzeLongTermInvestment } from "@/lib/analysis/long-term-analysis";
import { BarChart, MarginTrendChart } from "@/components/short-term/bar-chart";
import { ClassificationBadge } from "./classification-badge";
import { LongTermMetricGrid } from "./metric-grid";
import { LongTermNoDataState } from "./no-data-state";
import { QualityGrid } from "./quality-grid";
import { RiskPanel } from "./risk-panel";
import { ThesisPanel } from "./thesis-panel";

export function LongTermInvestmentView() {
  const { financialData, isSessionReady } = useFinancialSession();
  const analysis = useMemo(
    () => analyzeLongTermInvestment(financialData),
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
    return <LongTermNoDataState />;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <section className="rounded-xl border border-white/8 bg-gradient-to-br from-[#0f1629]/80 to-[#0a0f1c]/80 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Long-Term Company Analysis
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

      <ClassificationBadge
        classification={analysis.classification}
        score={analysis.overallScore}
      />

      <section className="rounded-xl border border-white/8 bg-[#0a0f1c]/60 p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
          Long-Term Investment Score
        </h3>
        <p className="mt-2 text-3xl font-bold text-white">
          {analysis.overallScore === null
            ? "Data unavailable"
            : `${analysis.overallScore}/100`}
        </p>
        <ul className="mt-4 space-y-2">
          {analysis.scoreExplanation.map((item: string, index: number) => (
            <li key={`${index}-${item.slice(0, 24)}`} className="text-sm leading-relaxed text-slate-400">
              {item}
            </li>
          ))}
        </ul>
      </section>

      <LongTermMetricGrid
        title="Financial Strength"
        metrics={analysis.strengthMetrics}
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <LongTermMetricGrid
          title="Long-Term Growth Analysis"
          metrics={analysis.growthMetrics}
        />
        <LongTermMetricGrid
          title="Valuation"
          metrics={analysis.valuationMetrics}
        />
      </div>

      <section className="rounded-xl border border-white/8 bg-[#0a0f1c]/60 p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
          Sustainable Growth Assessment
        </h3>
        <p className="mt-3 text-sm leading-relaxed text-slate-300">
          {analysis.sustainableGrowth}
        </p>
      </section>

      <QualityGrid pillars={analysis.qualityPillars} />
      <RiskPanel risks={analysis.risks} />

      <div className="grid gap-5 lg:grid-cols-2">
        <BarChart
          title="Revenue Trend"
          data={analysis.chartData.revenueByPeriod}
          color="#38bdf8"
          unit=" Cr"
        />
        <BarChart
          title="Profit / PAT Trend"
          data={analysis.chartData.profitByPeriod}
          color="#818cf8"
          unit=" Cr"
        />
        <MarginTrendChart
          title="Margin Trend"
          data={analysis.chartData.marginTrend}
        />
        <BarChart
          title="Debt / Equity Trend"
          data={analysis.chartData.debtEquityByPeriod}
          color="#f59e0b"
          unit="x"
        />
        <BarChart
          title="Cash-Flow Trend"
          data={analysis.chartData.cashFlowByPeriod}
          color="#34d399"
          unit=" Cr"
        />
      </div>

      <ThesisPanel thesis={analysis.thesis} />
    </div>
  );
}
