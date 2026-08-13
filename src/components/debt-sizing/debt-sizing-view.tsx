"use client";

import { useMemo, useState } from "react";
import { useFinancialSession } from "@/context/financial-session-context";
import {
  analyzeDebtSizing,
  listCreditPeriods,
  REPAYMENT_PRESETS,
  type CashFlowBasisChoice,
  type DebtSizingOptions,
  type StressDeclinePct,
  type TargetDscr,
} from "@/lib/analysis/debt-sizing-analysis";
import { DOCUMENT_SOURCE_LABELS } from "@/lib/upload-types";
import { DebtBarChart } from "./debt-charts";
import { CreditMetricCard, OriginBadge } from "./metric-card";
import { DebtSizingNoDataState } from "./no-data-state";

const TARGETS: TargetDscr[] = [1.25, 1.5, 1.75, 2];
const STRESS: StressDeclinePct[] = [0, 10, 20, 30];

const GRADE_STYLES: Record<string, string> = {
  STRONG: "text-emerald-300",
  HEALTHY: "text-sky-300",
  MODERATE: "text-amber-300",
  WEAK: "text-rose-300",
  "INSUFFICIENT DATA": "text-slate-300",
  "LOW RISK": "text-emerald-300",
  "MODERATE RISK": "text-amber-300",
  "HIGH RISK": "text-rose-300",
};

function parseOptionalNumber(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  const value = Number.parseFloat(trimmed);
  return Number.isFinite(value) ? value : null;
}

function formatAmount(value: number | null): string {
  if (value === null) return "Insufficient data";
  return `₹${value.toLocaleString(undefined, { maximumFractionDigits: 2 })} Cr`;
}

function formatMultiple(value: number | null): string {
  if (value === null) return "Insufficient data";
  return `${value.toFixed(2)}x`;
}

export function DebtSizingView() {
  const { financialData, isSessionReady } = useFinancialSession();
  const [targetDscr, setTargetDscr] = useState<TargetDscr>(1.5);
  const [stressDeclinePct, setStressDeclinePct] = useState<StressDeclinePct>(0);
  const [assumedRate, setAssumedRate] = useState("");
  const [repaymentPct, setRepaymentPct] = useState(10);
  const [useCustomPrincipal, setUseCustomPrincipal] = useState(false);
  const [customPrincipalAmount, setCustomPrincipalAmount] = useState("");
  const [cashFlowBasis, setCashFlowBasis] = useState<CashFlowBasisChoice>("fcf");
  const [periodKey, setPeriodKey] = useState("");

  const periodOptions = useMemo(
    () => listCreditPeriods(financialData),
    [financialData],
  );

  const options: DebtSizingOptions = useMemo(
    () => ({
      targetDscr,
      stressDeclinePct,
      assumedInterestRatePct: parseOptionalNumber(assumedRate),
      assumedRepaymentPct: repaymentPct,
      assumedPrincipalAmount: useCustomPrincipal
        ? parseOptionalNumber(customPrincipalAmount)
        : null,
      cashFlowBasis,
      periodKey: periodKey || null,
    }),
    [
      targetDscr,
      stressDeclinePct,
      assumedRate,
      repaymentPct,
      useCustomPrincipal,
      customPrincipalAmount,
      cashFlowBasis,
      periodKey,
    ],
  );

  const analysis = useMemo(
    () => analyzeDebtSizing(financialData, options),
    [financialData, options],
  );

  if (!isSessionReady) {
    return (
      <div className="mx-auto max-w-2xl rounded-xl border border-white/8 bg-[#0a0f1c]/60 px-6 py-16 text-center">
        <p className="text-sm text-slate-400">Loading saved financial data…</p>
      </div>
    );
  }

  if (!analysis) {
    return <DebtSizingNoDataState />;
  }

  const dscrAvailable = analysis.headline.dscr.available;
  const interestRateOriginLabel =
    analysis.model.interestRateOrigin === "implied"
      ? "Implied"
      : analysis.model.interestRateOrigin === "extracted"
        ? "Extracted"
        : "Assumed";

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <section className="rounded-xl border border-white/8 bg-gradient-to-br from-[#0f1629]/80 to-[#0a0f1c]/80 p-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Debt Sizing &amp; DSCR
        </p>
        <h2 className="mt-1 text-2xl font-bold text-white">
          {analysis.company?.trim() || "Company name unavailable"}
        </h2>
        <p className="mt-2 text-sm text-slate-400">Financial Analysis Dashboard</p>
        {analysis.latestPeriodLabel && (
          <p className="mt-1 text-xs text-slate-500">{analysis.latestPeriodLabel}</p>
        )}
        {periodOptions.length > 1 && (
          <label className="mt-4 block max-w-xs text-xs text-slate-500">
            Period
            <select
              value={periodKey || analysis.selectedPeriodKey || ""}
              onChange={(event) => setPeriodKey(event.target.value)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
            >
              {periodOptions.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        )}
      </section>

      <section className="rounded-xl border border-white/8 bg-[#0a0f1c]/60 p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
          Debt Position
        </h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {analysis.leverage
            .filter((item) =>
              ["Total Debt", "Net Debt", "Debt / Equity", "Debt / EBITDA"].includes(
                item.label,
              ),
            )
            .map((item) => (
              <CreditMetricCard key={item.label} metric={item} />
            ))}
        </div>
      </section>

      <section className="rounded-xl border border-white/8 bg-[#0a0f1c]/60 p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
          Coverage
        </h3>
        <p className="mt-2 text-xs text-slate-500">
          Interest-coverage ratios from extracted financials. These are not DSCR.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {analysis.coverageMetrics.map((item) => (
            <CreditMetricCard key={item.label} metric={item} />
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-sky-500/20 bg-sky-500/[0.04] p-5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          True DSCR vs Assumption-Based DSCR
        </p>
        <p className="mt-2 text-xs leading-relaxed text-slate-400">
          True DSCR uses actual principal repayment plus actual interest. That
          schedule is not available from Screener, so FINVISTA shows
          Assumption-Based DSCR: FCF or a labelled CFO proxy, plus assumed
          principal repayment, plus extracted interest. This is not a
          company-reported DSCR.
        </p>
        <h3 className="mt-5 text-sm font-semibold uppercase tracking-wider text-sky-200">
          {analysis.model.dscrLabel}
        </h3>
        <p className="mt-2 text-sm text-slate-300">
          Calculated using FCF and assumed principal repayment.
        </p>
        {analysis.usesCfoProxy && analysis.model.cashFlowBasisNote && (
          <p className="mt-2 text-xs text-amber-300/90">
            {analysis.model.cashFlowBasisNote}
          </p>
        )}
        <p
          className={`mt-4 text-5xl font-bold ${
            dscrAvailable ? "text-white" : "text-slate-500"
          }`}
        >
          {dscrAvailable ? analysis.headline.dscr.formatted : "Insufficient data"}
        </p>
        <p className="mt-2 text-sm text-slate-400">
          Calculation: {analysis.usesCfoProxy ? "CFO" : "FCF"} ÷ (Interest +
          Assumed Principal Repayment)
        </p>
        {!dscrAvailable && (
          <p className="mt-3 text-sm text-amber-300/90">
            {analysis.dscrUnavailableReason ??
              "DSCR cannot be calculated because CFO/FCF is unavailable."}
          </p>
        )}
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <tbody>
              {[
                analysis.cads,
                analysis.interest,
                analysis.leverage.find((item) => item.label === "Total Debt"),
                analysis.principal,
                analysis.debtService,
                analysis.headline.dscr,
              ]
                .filter((item): item is NonNullable<typeof item> => Boolean(item))
                .map((item) => (
                  <tr key={item.label} className="border-t border-white/5">
                    <td className="py-2 pr-4 text-slate-400">{item.label}</td>
                    <td className="py-2 text-right font-medium text-white">
                      {item.formatted}
                    </td>
                    <td className="py-2 pl-4 text-right text-[11px] text-slate-500">
                      Source: {item.source}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        {dscrAvailable && (
          <p className="mt-4 text-sm text-emerald-300">
            ✓ Calculated using available financial data + explicit principal
            repayment assumption
          </p>
        )}
        <p className="mt-3 text-sm leading-relaxed text-slate-300">
          {analysis.dscrInterpretation}
        </p>
      </section>

      <section className="rounded-xl border border-white/8 bg-[#0a0f1c]/60 p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
          DSCR Assumptions
        </h3>
        <p className="mt-2 text-xs text-amber-300/80">
          Model assumption:{" "}
          {analysis.model.principalIsCustomAmount
            ? "custom principal repayment amount"
            : `${analysis.model.repaymentPct.toFixed(0)}% of outstanding debt repaid annually`}
          . This is not extracted company data.
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <label className="text-xs text-slate-500">
            Cash Flow Basis
            <select
              value={cashFlowBasis}
              onChange={(event) =>
                setCashFlowBasis(event.target.value as CashFlowBasisChoice)
              }
              className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
            >
              <option value="fcf">FCF</option>
              <option value="cfo">CFO</option>
            </select>
          </label>
          <div className="text-xs text-slate-500">
            Assumed Annual Principal Repayment
            <div className="mt-1 flex flex-wrap gap-1.5">
              {REPAYMENT_PRESETS.map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => {
                    setRepaymentPct(pct);
                    setUseCustomPrincipal(false);
                  }}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                    !useCustomPrincipal && repaymentPct === pct
                      ? "bg-sky-500/20 text-sky-200 ring-1 ring-sky-400/40"
                      : "bg-white/5 text-slate-400 ring-1 ring-white/10"
                  }`}
                >
                  {pct}% of Debt
                </button>
              ))}
              <button
                type="button"
                onClick={() => setUseCustomPrincipal(true)}
                className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                  useCustomPrincipal
                    ? "bg-sky-500/20 text-sky-200 ring-1 ring-sky-400/40"
                    : "bg-white/5 text-slate-400 ring-1 ring-white/10"
                }`}
              >
                Custom
              </button>
            </div>
            {useCustomPrincipal && (
              <input
                value={customPrincipalAmount}
                onChange={(event) => setCustomPrincipalAmount(event.target.value)}
                placeholder="Custom amount (₹ Cr)"
                className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
              />
            )}
          </div>
          <div className="text-xs text-slate-500">
            Interest
            <div className="mt-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white">
              {analysis.interest.available
                ? analysis.interest.formatted
                : "Insufficient data"}
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              Extracted from financial data
            </p>
          </div>
          <label className="text-xs text-slate-500">
            Interest rate %{" "}
            <span className="text-amber-400/80">(Model assumption if blank)</span>
            <input
              value={assumedRate}
              onChange={(event) => setAssumedRate(event.target.value)}
              placeholder={
                analysis.model.interestRatePct !== null
                  ? `${analysis.model.interestRatePct.toFixed(2)} (${interestRateOriginLabel})`
                  : "8% model assumption"
              }
              className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
            />
            <p className="mt-1 text-[11px] text-slate-600">
              Active: {analysis.model.interestRatePct?.toFixed(2) ?? "—"}% ·{" "}
              {interestRateOriginLabel}. Not presented as the company&apos;s actual
              borrowing rate.
            </p>
          </label>
          <div className="text-xs text-slate-500">
            Target DSCR
            <div className="mt-1 flex flex-wrap gap-1.5">
              {TARGETS.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTargetDscr(value)}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                    targetDscr === value
                      ? "bg-sky-500/20 text-sky-200 ring-1 ring-sky-400/40"
                      : "bg-white/5 text-slate-400 ring-1 ring-white/10"
                  }`}
                >
                  {value.toFixed(2)}x
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-white/8 bg-[#0a0f1c]/60 p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
          Model Assumptions
        </h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-white/8 bg-white/[0.02] px-4 py-3">
            <p className="text-xs text-slate-500">
              Principal repayment assumption
              <OriginBadge
                origin="ASSUMED"
                label={`ASSUMED — ${analysis.model.repaymentPct}%`}
              />
            </p>
            <p className="mt-1 text-lg font-semibold text-white">
              {analysis.model.repaymentPct}%
            </p>
          </div>
          <div className="rounded-lg border border-white/8 bg-white/[0.02] px-4 py-3">
            <p className="text-xs text-slate-500">
              Cash-flow basis
              <OriginBadge origin="ASSUMED" />
            </p>
            <p className="mt-1 text-lg font-semibold text-white">
              {analysis.model.cashFlowBasis.toUpperCase()}
            </p>
          </div>
          <div className="rounded-lg border border-white/8 bg-white/[0.02] px-4 py-3">
            <p className="text-xs text-slate-500">
              Interest rate
              <OriginBadge
                origin={
                  analysis.model.interestRateOrigin === "assumed"
                    ? "ASSUMED"
                    : analysis.model.interestRateOrigin === "implied"
                      ? "CALCULATED"
                      : "EXTRACTED"
                }
              />
            </p>
            <p className="mt-1 text-lg font-semibold text-white">
              {analysis.model.interestRatePct === null
                ? "Insufficient data"
                : `${analysis.model.interestRatePct.toFixed(2)}%`}
            </p>
            <p className="mt-1 text-[11px] text-slate-500">{interestRateOriginLabel}</p>
          </div>
          <div className="rounded-lg border border-white/8 bg-white/[0.02] px-4 py-3">
            <p className="text-xs text-slate-500">
              Target DSCR
              <OriginBadge origin="ASSUMED" />
            </p>
            <p className="mt-1 text-lg font-semibold text-white">
              {analysis.model.targetDscr.toFixed(2)}x
            </p>
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {analysis.model.inputs.map((item) => (
            <CreditMetricCard key={item.label} metric={item} />
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-white/8 bg-[#0a0f1c]/60 p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
          DSCR Sensitivity
        </h3>
        <p className="mt-2 text-xs text-slate-500">Illustrative sensitivity analysis</p>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-3 py-2 font-medium">Repayment Assumption</th>
                <th className="px-3 py-2 font-medium">Assumed Debt Service</th>
                <th className="px-3 py-2 font-medium">DSCR</th>
              </tr>
            </thead>
            <tbody>
              {analysis.sensitivity.map((row) => (
                <tr
                  key={row.repaymentPct}
                  className={`border-t border-white/5 ${
                    row.repaymentPct === analysis.model.repaymentPct
                      ? "bg-sky-500/10"
                      : ""
                  }`}
                >
                  <td className="px-3 py-2 text-slate-300">{row.repaymentPct}%</td>
                  <td className="px-3 py-2 text-slate-300">
                    {formatAmount(row.assumedDebtService)}
                  </td>
                  <td className="px-3 py-2 font-medium text-white">
                    {formatMultiple(row.dscr)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-white/8 bg-[#0a0f1c]/60 p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
          Debt Capacity
        </h3>
        <p className="mt-2 text-xs text-slate-500">
          Analytical estimate based on model assumptions.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <CreditMetricCard metric={analysis.capacity.existingDebt} />
          <CreditMetricCard metric={analysis.capacity.maxSustainableDebtService} />
          <CreditMetricCard metric={analysis.capacity.maxSustainableDebt} />
          <CreditMetricCard metric={analysis.capacity.additionalCapacity} />
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {analysis.scenarios.map((scenario) => (
            <div
              key={scenario.key}
              className="rounded-lg border border-white/8 bg-white/[0.02] p-4"
            >
              <p className="text-sm font-semibold text-white">{scenario.label}</p>
              <p className="mt-1 text-xs text-slate-500">
                Target DSCR {scenario.targetDscr.toFixed(2)}x
              </p>
              <p className="mt-3 text-xs text-slate-500">Maximum Sustainable Debt Service</p>
              <p className="text-sm text-slate-200">
                {formatAmount(scenario.maxDebtService)}
              </p>
              <p className="mt-2 text-xs text-slate-500">Indicative Debt Capacity</p>
              <p className="text-lg font-semibold text-white">
                {formatAmount(scenario.maxDebt)}
              </p>
              <p className="mt-2 text-xs text-slate-500">Existing Debt</p>
              <p className="text-sm text-slate-300">
                {formatAmount(scenario.existingDebt)}
              </p>
              <p className="mt-2 text-xs text-slate-500">
                Indicative Additional Debt Capacity
              </p>
              <p className="text-sm text-slate-300">
                {formatAmount(scenario.additionalCapacity)}
              </p>
            </div>
          ))}
        </div>
        <ul className="mt-4 space-y-1">
          {analysis.capacity.assumptionsUsed.map((item) => (
            <li key={item} className="text-xs text-slate-500">
              {item}
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-white/8 bg-[#0a0f1c]/60 p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
          DSCR Stress Test
        </h3>
        <p className="mt-2 text-xs text-slate-500">
          Revenue / cash-flow reduction applied to the selected CFO/FCF basis.
          Assumed debt service is held constant.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {STRESS.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setStressDeclinePct(value)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                stressDeclinePct === value
                  ? "bg-rose-500/20 text-rose-200 ring-1 ring-rose-400/40"
                  : "bg-white/5 text-slate-400 ring-1 ring-white/10"
              }`}
            >
              {value === 0 ? "Base Case" : `${value}% Stress`}
            </button>
          ))}
        </div>
        {!analysis.stress.available ? (
          <p className="mt-4 text-sm text-amber-300/80">
            {analysis.stress.unavailableReason}
          </p>
        ) : (
          <>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-3 py-2 font-medium">Case</th>
                    <th className="px-3 py-2 font-medium">Cash Available</th>
                    <th className="px-3 py-2 font-medium">Assumed Debt Service</th>
                    <th className="px-3 py-2 font-medium">DSCR</th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.stress.rows.map((row) => (
                    <tr
                      key={row.declinePct}
                      className={`border-t border-white/5 ${
                        row.declinePct === stressDeclinePct ? "bg-rose-500/10" : ""
                      }`}
                    >
                      <td className="px-3 py-2 text-slate-300">
                        {row.declinePct === 0 ? "Base Case" : `${row.declinePct}% Stress`}
                      </td>
                      <td className="px-3 py-2 text-slate-300">
                        {formatAmount(row.cads)}
                      </td>
                      <td className="px-3 py-2 text-slate-300">
                        {formatAmount(analysis.debtService.value)}
                      </td>
                      <td className="px-3 py-2 font-medium text-white">
                        {formatMultiple(row.dscr)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {analysis.stressInterpretation && (
              <p className="mt-4 text-sm leading-relaxed text-slate-300">
                {analysis.stressInterpretation}
              </p>
            )}
          </>
        )}
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <DebtBarChart
          title="Existing Debt vs Indicative Capacity"
          data={analysis.charts.existingVsMax.map((item) => ({
            ...item,
            color: item.label.includes("Existing") ? "#38bdf8" : "#34d399",
          }))}
        />
        <DebtBarChart
          title="Target DSCR by scenario"
          data={analysis.charts.scenarioDscr.map((item) => ({
            ...item,
            color: "#818cf8",
          }))}
          unit="x"
        />
        <DebtBarChart
          title="Modeled DSCR under cash-flow stress"
          data={analysis.charts.stressDscr.map((item) => ({
            ...item,
            color: "#fb7185",
          }))}
          unit="x"
        />
        <DebtBarChart
          title="Debt maturity profile"
          data={analysis.charts.maturity.map((item) => ({
            ...item,
            color: "#f59e0b",
          }))}
        />
      </div>

      <section className="rounded-xl border border-white/8 bg-[#0a0f1c]/60 p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
          Credit Assessment
        </h3>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-white/8 bg-white/[0.02] p-4">
            <p className="text-xs text-slate-500">Score</p>
            <p className="mt-2 text-3xl font-bold text-white">
              {analysis.score.value === null
                ? "Insufficient data"
                : `${analysis.score.value}/100`}
            </p>
            <p className={`mt-2 text-sm font-semibold ${GRADE_STYLES[analysis.score.grade]}`}>
              {analysis.score.grade}
            </p>
            <p className="mt-2 text-xs text-slate-500">{analysis.score.explanation}</p>
          </div>
          <div className="rounded-lg border border-white/8 bg-white/[0.02] p-4">
            <p className="text-xs text-slate-500">Risk Classification</p>
            <p className={`mt-2 text-2xl font-bold ${GRADE_STYLES[analysis.lending.risk]}`}>
              {analysis.lending.risk}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-slate-300">
              {analysis.lending.explanation}
            </p>
          </div>
          <div className="rounded-lg border border-white/8 bg-white/[0.02] p-4">
            <p className="text-xs text-slate-500">Interpretation</p>
            <p className="mt-3 text-sm leading-relaxed text-slate-300">
              {analysis.dscrInterpretation}
            </p>
            <ul className="mt-3 space-y-1 text-xs text-slate-500">
              {analysis.score.components.map((item) => (
                <li key={item.label}>
                  {item.label}:{" "}
                  {item.score === null ? "Insufficient data" : `${item.score}/${item.max}`}{" "}
                  · {item.detail}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-white/8 bg-[#0a0f1c]/60 p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
          Cash Flow
        </h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {analysis.cashFlowMetrics.map((item) => (
            <CreditMetricCard key={item.label} metric={item} />
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-white/8 bg-[#0a0f1c]/60 p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
          Data Availability
        </h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {(
            [
              ["screener", DOCUMENT_SOURCE_LABELS.screener],
              ["annualReport", DOCUMENT_SOURCE_LABELS["annual-report"]],
              ["investorPresentation", DOCUMENT_SOURCE_LABELS["investor-presentation"]],
              ["quarterlyResults", DOCUMENT_SOURCE_LABELS["quarterly-results"]],
            ] as const
          ).map(([key, label]) => {
            const available = analysis.documentCoverage[key];
            return (
              <div
                key={key}
                className="rounded-lg border border-white/8 bg-white/[0.02] px-4 py-3"
              >
                <p className="text-xs text-slate-500">{label}</p>
                <p
                  className={`mt-1 text-sm font-semibold ${
                    available ? "text-emerald-300" : "text-slate-500"
                  }`}
                >
                  {available ? "✓ Available" : "Not uploaded"}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <p className="text-[11px] leading-relaxed text-slate-600">
        FINVISTA&apos;s DSCR and debt-capacity figures are analytical estimates based
        on extracted financial data and explicitly stated model assumptions. They
        are not company-reported debt-service figures or lending commitments.
      </p>
    </div>
  );
}
