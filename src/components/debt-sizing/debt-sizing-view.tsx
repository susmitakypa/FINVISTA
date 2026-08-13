"use client";

import { useMemo, useState } from "react";
import { useFinancialSession } from "@/context/financial-session-context";
import {
  analyzeDebtSizing,
  type DebtSizingOptions,
  type StressDeclinePct,
  type TargetDscr,
} from "@/lib/analysis/debt-sizing-analysis";
import { DOCUMENT_SOURCE_LABELS } from "@/lib/upload-types";
import { DebtBarChart } from "./debt-charts";
import { CreditMetricCard } from "./metric-card";
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

export function DebtSizingView() {
  const { financialData, isSessionReady } = useFinancialSession();
  const [targetDscr, setTargetDscr] = useState<TargetDscr>(1.5);
  const [stressDeclinePct, setStressDeclinePct] = useState<StressDeclinePct>(0);
  const [assumedRate, setAssumedRate] = useState("");
  const [assumedTenor, setAssumedTenor] = useState("");
  const [assumedPrincipal, setAssumedPrincipal] = useState("");

  const options: DebtSizingOptions = useMemo(
    () => ({
      targetDscr,
      stressDeclinePct,
      assumedInterestRatePct: parseOptionalNumber(assumedRate),
      assumedTenorYears: parseOptionalNumber(assumedTenor),
      assumedPrincipal: parseOptionalNumber(assumedPrincipal),
    }),
    [targetDscr, stressDeclinePct, assumedRate, assumedTenor, assumedPrincipal],
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

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <section className="rounded-xl border border-white/8 bg-gradient-to-br from-[#0f1629]/80 to-[#0a0f1c]/80 p-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Debt Sizing &amp; DSCR
        </p>
        <h2 className="mt-1 text-2xl font-bold text-white">
          {analysis.company ?? "Uploaded company"}
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          Credit analysis from processed documents
          {analysis.latestPeriodLabel ? ` · ${analysis.latestPeriodLabel}` : ""}
        </p>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-sky-500/20 bg-sky-500/[0.06] p-5 md:col-span-2 xl:col-span-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            DSCR
          </p>
          <p
            className={`mt-2 text-4xl font-bold ${
              dscrAvailable ? "text-white" : "text-slate-500"
            }`}
          >
            {dscrAvailable ? analysis.headline.dscr.formatted : "DSCR unavailable"}
          </p>
          <p className="mt-2 text-sm text-slate-300">{analysis.dscrBand}</p>
          {!dscrAvailable && (
            <p className="mt-2 text-xs text-amber-300/80">
              Required: CFO/FCF and debt-service information.
            </p>
          )}
          <p className="mt-3 text-[11px] text-slate-500">
            Source: {analysis.headline.dscr.source}
          </p>
          <p className="text-[11px] text-slate-600">
            Method: {analysis.headline.dscr.methodology}
          </p>
        </div>
        <CreditMetricCard metric={analysis.headline.debtEquity} />
        <CreditMetricCard metric={analysis.headline.debtEbitda} />
        <CreditMetricCard metric={analysis.headline.interestCoverage} />
      </div>

      <section className="rounded-xl border border-white/8 bg-[#0a0f1c]/60 p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
          Debt Position
        </h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {analysis.position.map((item) => (
            <CreditMetricCard key={item.label} metric={item} />
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-white/8 bg-[#0a0f1c]/60 p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
          Existing Debt Profile
        </h3>
        {analysis.facilities.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">
            Data unavailable. Requires a debt schedule (lender, outstanding,
            rate, maturity, or repayments) in the uploaded documents.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead className="text-slate-500">
                <tr>
                  {[
                    "Facility",
                    "Opening",
                    "Outstanding",
                    "Rate",
                    "Maturity",
                    "Principal",
                    "Interest",
                    "Debt service",
                  ].map((header) => (
                    <th key={header} className="px-2 py-2 font-medium">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {analysis.facilities.map((facility, index) => {
                  const service =
                    facility.annualPrincipal !== null &&
                    facility.annualInterest !== null
                      ? facility.annualPrincipal + facility.annualInterest
                      : facility.annualInterest;
                  return (
                    <tr key={`${facility.facility}-${index}`} className="border-t border-white/5">
                      <td className="px-2 py-2 text-slate-300">
                        {facility.facility ?? "Facility"}
                      </td>
                      <td className="px-2 py-2 text-slate-400">
                        {facility.openingDebt ?? "Data unavailable"}
                      </td>
                      <td className="px-2 py-2 text-slate-300">
                        {facility.outstanding ?? "Data unavailable"}
                      </td>
                      <td className="px-2 py-2 text-slate-400">
                        {facility.interestRatePct !== null
                          ? `${facility.interestRatePct}%`
                          : "Data unavailable"}
                      </td>
                      <td className="px-2 py-2 text-slate-400">
                        {facility.maturity ?? "Data unavailable"}
                      </td>
                      <td className="px-2 py-2 text-slate-400">
                        {facility.annualPrincipal ?? "Data unavailable"}
                      </td>
                      <td className="px-2 py-2 text-slate-400">
                        {facility.annualInterest ?? "Data unavailable"}
                      </td>
                      <td className="px-2 py-2 text-slate-300">
                        {service ?? "Data unavailable"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-white/8 bg-[#0a0f1c]/60 p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
          DSCR Analysis
        </h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <CreditMetricCard metric={analysis.cads} />
          <CreditMetricCard metric={analysis.interest} />
          <CreditMetricCard metric={analysis.principal} />
          <CreditMetricCard metric={analysis.debtService} />
          <CreditMetricCard metric={analysis.headline.dscr} />
          {!analysis.principal.available && (
            <CreditMetricCard metric={analysis.cashInterestCover} />
          )}
        </div>
      </section>

      <section className="rounded-xl border border-white/8 bg-[#0a0f1c]/60 p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
          Debt Capacity
        </h3>
        <p className="mt-2 text-xs text-slate-500">
          Analytical debt capacity estimate — not a guaranteed lending limit.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {TARGETS.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setTargetDscr(value)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                targetDscr === value
                  ? "bg-sky-500/20 text-sky-200 ring-1 ring-sky-400/40"
                  : "bg-white/5 text-slate-400 ring-1 ring-white/10"
              }`}
            >
              Target DSCR {value.toFixed(2)}x
            </button>
          ))}
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <label className="text-xs text-slate-500">
            Interest rate % <span className="text-amber-400/80">(Assumption)</span>
            <input
              value={assumedRate}
              onChange={(event) => setAssumedRate(event.target.value)}
              placeholder="Extracted if available"
              className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
            />
          </label>
          <label className="text-xs text-slate-500">
            Tenor (years) <span className="text-amber-400/80">(Assumption)</span>
            <input
              value={assumedTenor}
              onChange={(event) => setAssumedTenor(event.target.value)}
              placeholder="Leave blank for interest-only"
              className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
            />
          </label>
          <label className="text-xs text-slate-500">
            Annual principal <span className="text-amber-400/80">(Assumption)</span>
            <input
              value={assumedPrincipal}
              onChange={(event) => setAssumedPrincipal(event.target.value)}
              placeholder="Used only if not extracted"
              className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
            />
          </label>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <CreditMetricCard metric={analysis.capacity.existingDebt} />
          <CreditMetricCard metric={analysis.capacity.maxSustainableDebtService} />
          <CreditMetricCard metric={analysis.capacity.maxSustainableDebt} />
          <CreditMetricCard metric={analysis.capacity.additionalCapacity} />
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
          Scenario Analysis
        </h3>
        <p className="mt-2 text-xs text-slate-500">
          Analytical debt capacity estimate
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {analysis.scenarios.map((scenario) => (
            <div
              key={scenario.key}
              className="rounded-lg border border-white/8 bg-white/[0.02] p-4"
            >
              <p className="text-sm font-semibold text-white">{scenario.label}</p>
              <p className="mt-1 text-xs text-slate-500">
                Target DSCR {scenario.targetDscr.toFixed(2)}x
              </p>
              <p className="mt-3 text-xs text-slate-500">Maximum Debt Capacity</p>
              <p className="text-lg font-semibold text-white">
                {scenario.maxDebt === null
                  ? "Data unavailable"
                  : scenario.maxDebt.toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                    })}
              </p>
              <p className="mt-2 text-xs text-slate-500">Existing Debt</p>
              <p className="text-sm text-slate-300">
                {scenario.existingDebt === null
                  ? "Data unavailable"
                  : scenario.existingDebt.toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                    })}
              </p>
              <p className="mt-2 text-xs text-slate-500">Additional Borrowing Capacity</p>
              <p className="text-sm text-slate-300">
                {scenario.additionalCapacity === null
                  ? "Data unavailable"
                  : scenario.additionalCapacity.toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                    })}
              </p>
              <p className="mt-2 text-xs text-slate-500">DSCR at capacity</p>
              <p className="text-sm text-slate-300">
                {scenario.impliedDscr === null
                  ? "Data unavailable"
                  : `${scenario.impliedDscr.toFixed(2)}x`}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-white/8 bg-[#0a0f1c]/60 p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
          Stress Test
        </h3>
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
              Revenue/CADS decline {value}%
            </button>
          ))}
        </div>
        {!analysis.stress.available ? (
          <p className="mt-4 text-sm text-amber-300/80">
            {analysis.stress.unavailableReason}
          </p>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-white/8 bg-white/[0.02] px-4 py-3">
              <p className="text-xs text-slate-500">Stressed EBITDA</p>
              <p className="mt-1 text-lg font-semibold text-white">
                {analysis.stress.selected.ebitda === null
                  ? "Data unavailable"
                  : analysis.stress.selected.ebitda.toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                    })}
              </p>
            </div>
            <div className="rounded-lg border border-white/8 bg-white/[0.02] px-4 py-3">
              <p className="text-xs text-slate-500">Stressed CADS</p>
              <p className="mt-1 text-lg font-semibold text-white">
                {analysis.stress.selected.cads === null
                  ? "Data unavailable"
                  : analysis.stress.selected.cads.toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                    })}
              </p>
            </div>
            <div className="rounded-lg border border-white/8 bg-white/[0.02] px-4 py-3">
              <p className="text-xs text-slate-500">Stressed DSCR</p>
              <p className="mt-1 text-lg font-semibold text-white">
                {analysis.stress.selected.dscr === null
                  ? "Data unavailable"
                  : `${analysis.stress.selected.dscr.toFixed(2)}x`}
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                {analysis.stress.selected.aboveOne
                  ? "Remains ≥ 1.0x"
                  : "Falls below 1.0x"}
                {analysis.stress.selected.aboveTarget
                  ? ` · remains ≥ target ${targetDscr.toFixed(2)}x`
                  : ` · below target ${targetDscr.toFixed(2)}x`}
              </p>
            </div>
            <div className="rounded-lg border border-white/8 bg-white/[0.02] px-4 py-3">
              <p className="text-xs text-slate-500">Surplus / deficit</p>
              <p className="mt-1 text-lg font-semibold text-white">
                {analysis.stress.selected.surplus === null
                  ? "Data unavailable"
                  : analysis.stress.selected.surplus.toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                    })}
              </p>
            </div>
          </div>
        )}
        {analysis.stress.available && (
          <p className="mt-3 text-[11px] text-slate-500">
            Assumption: CADS is scaled with the selected decline. Debt service is
            held constant. This is not a restated cash-flow statement.
          </p>
        )}
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <DebtBarChart
          title="Existing Debt vs Maximum Sustainable Debt"
          data={analysis.charts.existingVsMax.map((item) => ({
            ...item,
            color: item.label.includes("Existing") ? "#38bdf8" : "#34d399",
          }))}
        />
        <DebtBarChart
          title="DSCR under Conservative / Base / Aggressive"
          data={analysis.charts.scenarioDscr.map((item) => ({
            ...item,
            color: "#818cf8",
          }))}
          unit="x"
        />
        <DebtBarChart
          title="Debt-service coverage under stress"
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
            <p className="text-xs text-slate-500">Credit Strength Score</p>
            <p className="mt-2 text-3xl font-bold text-white">
              {analysis.score.value === null
                ? "Data unavailable"
                : `${analysis.score.value}/100`}
            </p>
            <p className={`mt-2 text-sm font-semibold ${GRADE_STYLES[analysis.score.grade]}`}>
              {analysis.score.grade}
            </p>
            <p className="mt-2 text-xs text-slate-500">{analysis.score.explanation}</p>
          </div>
          <div className="rounded-lg border border-white/8 bg-white/[0.02] p-4 md:col-span-2">
            <p className="text-xs text-slate-500">Component scores</p>
            <ul className="mt-3 space-y-2">
              {analysis.score.components.map((item) => (
                <li key={item.label} className="text-sm text-slate-400">
                  <span className="text-slate-300">{item.label}:</span>{" "}
                  {item.score === null
                    ? "Data unavailable"
                    : `${item.score}/${item.max}`}{" "}
                  · {item.detail}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-white/8 bg-[#0a0f1c]/60 p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
          Lending View
        </h3>
        <p className={`mt-3 text-2xl font-bold ${GRADE_STYLES[analysis.lending.risk]}`}>
          {analysis.lending.risk}
        </p>
        <p className="mt-3 text-sm leading-relaxed text-slate-300">
          {analysis.lending.explanation}
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <CreditMetricCard metric={analysis.capacity.existingDebt} />
          <CreditMetricCard metric={analysis.capacity.maxSustainableDebt} />
          <CreditMetricCard metric={analysis.capacity.additionalCapacity} />
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
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-xs font-medium text-emerald-300">Calculated where possible</p>
            <p className="mt-2 text-xs leading-relaxed text-slate-400">
              {analysis.availableFields.length > 0
                ? analysis.availableFields.join(" · ")
                : "None"}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-amber-300">Unavailable</p>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">
              {analysis.unavailableFields.length > 0
                ? analysis.unavailableFields.join(" · ")
                : "None"}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
