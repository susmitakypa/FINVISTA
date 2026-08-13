"use client";

import { useMemo, useState } from "react";
import { useFinancialSession } from "@/context/financial-session-context";
import {
  buildFinancialForecast,
  formatForecastValue,
  type ForecastAssumptions,
  type ForecastYear,
  type HistoricalRow,
} from "@/lib/analysis/financial-forecast";
import { MixedBarChart, ScenarioBarChart } from "./forecast-charts";
import { ForecastNoDataState } from "./no-data-state";

function display(value: number | null, unit = ""): string {
  return formatForecastValue(value, unit);
}

export function FinancialForecastView() {
  const { financialData, isSessionReady } = useFinancialSession();
  const [overrides, setOverrides] = useState<Partial<ForecastAssumptions>>({});

  const model = useMemo(
    () => buildFinancialForecast(financialData, overrides),
    [financialData, overrides],
  );

  if (!isSessionReady) {
    return (
      <div className="mx-auto max-w-2xl rounded-xl border border-white/8 bg-[#0a0f1c]/60 px-6 py-16 text-center">
        <p className="text-sm text-slate-400">Loading saved financial data…</p>
      </div>
    );
  }

  if (!model) {
    return <ForecastNoDataState />;
  }

  const assumptions = model.derivedAssumptions;

  function updateAssumption(
    key: keyof ForecastAssumptions,
    raw: string,
  ): void {
    const parsed = raw.trim() === "" ? null : Number.parseFloat(raw);
    setOverrides((current) => ({
      ...current,
      [key]: parsed === null || Number.isFinite(parsed) ? parsed : current[key],
    }));
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <section className="rounded-xl border border-white/8 bg-gradient-to-br from-[#0f1629]/80 to-[#0a0f1c]/80 p-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Financial Forecast
        </p>
        <h2 className="mt-1 text-2xl font-bold text-white">
          Projected financial performance modelling
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          {model.company ?? "Uploaded company"} · {model.historical.length} historical
          period{model.historical.length === 1 ? "" : "s"} · next 3 years are
          labelled Forecast, not actuals
        </p>
      </section>

      <section className="rounded-xl border border-white/8 bg-[#0a0f1c]/60 p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
          Historical Performance
        </h3>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-xs">
            <thead className="text-slate-500">
              <tr>
                {[
                  "Period",
                  "Revenue",
                  "Op. profit / EBITDA",
                  "OPM %",
                  "PAT",
                  "PAT %",
                  "EPS",
                  "Debt",
                  "Cash",
                  "CFO",
                  "Capex",
                  "FCF",
                ].map((heading: string) => (
                  <th key={heading} className="px-2 py-2 font-medium">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {model.historical.map((row: HistoricalRow) => (
                <tr key={row.label} className="border-t border-white/5 text-slate-300">
                  <td className="px-2 py-2 text-white">
                    {row.label}
                    <span className="ml-2 text-[10px] uppercase text-sky-400">
                      Historical
                    </span>
                  </td>
                  <td className="px-2 py-2">{display(row.revenue)}</td>
                  <td className="px-2 py-2">{display(row.operatingProfit)}</td>
                  <td className="px-2 py-2">{display(row.operatingMargin, "%")}</td>
                  <td className="px-2 py-2">{display(row.pat)}</td>
                  <td className="px-2 py-2">{display(row.patMargin, "%")}</td>
                  <td className="px-2 py-2">{display(row.eps)}</td>
                  <td className="px-2 py-2">{display(row.debt)}</td>
                  <td className="px-2 py-2">{display(row.cash)}</td>
                  <td className="px-2 py-2">{display(row.cfo)}</td>
                  <td className="px-2 py-2">{display(row.capex)}</td>
                  <td className="px-2 py-2">{display(row.fcf)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <MixedBarChart title="Historical Revenue" data={model.charts.revenue.filter((point) => point.kind === "historical")} unit=" Cr" />
          <MixedBarChart title="Historical PAT" data={model.charts.pat.filter((point) => point.kind === "historical")} unit=" Cr" />
        </div>
      </section>

      <section className="rounded-xl border border-white/8 bg-[#0a0f1c]/60 p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
          Forecast Assumptions
        </h3>
        <p className="mt-2 text-xs text-slate-500">
          Defaults come from uploaded history. You can edit them; the model will
          not fill gaps with invented numbers.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <AssumptionInput
            label="Base revenue growth %"
            value={assumptions.revenueGrowthPct}
            onChange={(raw) => updateAssumption("revenueGrowthPct", raw)}
          />
          <AssumptionInput
            label="Bear revenue growth %"
            value={assumptions.bearGrowthPct}
            onChange={(raw) => updateAssumption("bearGrowthPct", raw)}
          />
          <AssumptionInput
            label="Bull revenue growth %"
            value={assumptions.bullGrowthPct}
            onChange={(raw) => updateAssumption("bullGrowthPct", raw)}
          />
          <AssumptionInput
            label="Operating margin %"
            value={assumptions.operatingMarginPct}
            onChange={(raw) => updateAssumption("operatingMarginPct", raw)}
          />
          <AssumptionInput
            label="PAT margin %"
            value={assumptions.patMarginPct}
            onChange={(raw) => updateAssumption("patMarginPct", raw)}
          />
          <AssumptionInput
            label="CFO / revenue %"
            value={assumptions.cfoToRevenuePct}
            onChange={(raw) => updateAssumption("cfoToRevenuePct", raw)}
          />
          <AssumptionInput
            label="Capex / revenue %"
            value={assumptions.capexToRevenuePct}
            onChange={(raw) => updateAssumption("capexToRevenuePct", raw)}
          />
          <AssumptionInput
            label="FCF / revenue %"
            value={assumptions.fcfToRevenuePct}
            onChange={(raw) => updateAssumption("fcfToRevenuePct", raw)}
          />
        </div>
        <ul className="mt-4 space-y-1">
          {model.assumptionNotes.map((note: string, index: number) => (
            <li key={`${index}-${note.slice(0, 20)}`} className="text-xs text-slate-400">
              {note}
            </li>
          ))}
        </ul>
        {model.inputsUsed.length > 0 && (
          <p className="mt-3 text-xs text-emerald-300/80">
            Inputs used: {model.inputsUsed.join(" · ")}
          </p>
        )}
        {model.missingInputs.length > 0 && (
          <p className="mt-2 text-xs text-amber-300/80">
            Missing: {model.missingInputs.join(" · ")}
          </p>
        )}
      </section>

      <section className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
          Revenue &amp; Profit Forecast
        </h3>
        <div className="grid gap-5 lg:grid-cols-2">
          <MixedBarChart
            title="A. Revenue — Historical vs Forecast"
            data={model.charts.revenue}
            unit=" Cr"
          />
          <MixedBarChart
            title="B. PAT — Historical vs Forecast"
            data={model.charts.pat}
            unit=" Cr"
          />
          <MixedBarChart
            title="C. Operating Margin — Historical vs Forecast"
            data={model.charts.operatingMargin}
            unit="%"
          />
          <MixedBarChart
            title="D. Free Cash Flow — Historical vs Forecast"
            data={model.charts.fcf}
            unit=" Cr"
          />
        </div>
        <ForecastTable
          title="Base-case P&L forecast"
          years={model.scenarios.base}
          canRevenue={model.canForecastRevenue}
          canProfit={model.canForecastProfit}
        />
      </section>

      <section className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
          Scenario Analysis
        </h3>
        <p className="text-xs text-slate-500">
          Bear: lower growth and weaker margins. Base: historical trend. Bull:
          higher growth and stronger margins. All figures below are forecasts.
        </p>
        <div className="grid gap-5 lg:grid-cols-2">
          <ScenarioBarChart
            title="E. Bull / Base / Bear Revenue Forecast"
            data={model.charts.scenarioRevenue}
            unit=" Cr"
          />
          <ScenarioBarChart
            title="F. Bull / Base / Bear PAT Forecast"
            data={model.charts.scenarioPat}
            unit=" Cr"
          />
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <ScenarioCard title="Bear" years={model.scenarios.bear} tone="rose" />
          <ScenarioCard title="Base" years={model.scenarios.base} tone="sky" />
          <ScenarioCard title="Bull" years={model.scenarios.bull} tone="emerald" />
        </div>
      </section>

      <section className="rounded-xl border border-white/8 bg-[#0a0f1c]/60 p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
          Cash Flow Forecast
        </h3>
        {!model.canForecastCashFlow ? (
          <p className="mt-3 text-sm text-amber-300/80">
            Insufficient data. Cash-flow projections need historical CFO or FCF
            together with revenue. Missing: {model.missingInputs.filter((item) => /CFO|FCF|capex/i.test(item)).join(" · ") || "historical cash-flow ratios"}
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead className="text-slate-500">
                <tr>
                  {["Period", "CFO", "Capex", "FCF"].map((heading: string) => (
                    <th key={heading} className="px-2 py-2 font-medium">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {model.scenarios.base.map((year) => (
                  <tr key={year.label} className="border-t border-white/5 text-slate-300">
                    <td className="px-2 py-2 text-white">
                      {year.label}
                      <span className="ml-2 text-[10px] uppercase text-indigo-300">
                        Forecast
                      </span>
                    </td>
                    <td className="px-2 py-2">{display(year.cfo)}</td>
                    <td className="px-2 py-2">{display(year.capex)}</td>
                    <td className="px-2 py-2">{display(year.fcf)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-white/8 bg-[#0a0f1c]/60 p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
          Forecast Summary
        </h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryStat label="Revenue CAGR / base growth" value={display(model.summary.revenueCagr, "%")} />
          <SummaryStat label="Expected OPM" value={display(model.summary.expectedOperatingMargin, "%")} />
          <SummaryStat label="Expected PAT margin" value={display(model.summary.expectedPatMargin, "%")} />
          <SummaryStat label="Y1 FCF" value={display(model.summary.year1Fcf)} />
          <SummaryStat label="Y1 revenue" value={display(model.summary.year1Revenue)} />
          <SummaryStat label="Y2 revenue" value={display(model.summary.year2Revenue)} />
          <SummaryStat label="Y3 revenue" value={display(model.summary.year3Revenue)} />
          <SummaryStat label="Y1 PAT" value={display(model.summary.year1Pat)} />
          <SummaryStat label="Y2 PAT" value={display(model.summary.year2Pat)} />
          <SummaryStat label="Y3 PAT" value={display(model.summary.year3Pat)} />
          <SummaryStat label="Y2 FCF" value={display(model.summary.year2Fcf)} />
          <SummaryStat label="Y3 FCF" value={display(model.summary.year3Fcf)} />
        </div>
      </section>

      <section className="rounded-xl border border-white/8 bg-[#0a0f1c]/60 p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
          Confidence &amp; Limitations
        </h3>
        <p
          className={`mt-3 text-2xl font-bold ${
            model.confidence.level === "HIGH"
              ? "text-emerald-300"
              : model.confidence.level === "MEDIUM"
                ? "text-amber-300"
                : "text-rose-300"
          }`}
        >
          {model.confidence.level}
        </p>
        <ul className="mt-3 space-y-1">
          {model.confidence.reasons.map((reason: string) => (
            <li key={reason} className="text-sm text-slate-400">
              {reason}
            </li>
          ))}
        </ul>
        <ul className="mt-4 space-y-1">
          {model.limitations.map((item: string) => (
            <li key={item} className="text-xs text-slate-500">
              {item}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function AssumptionInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (raw: string) => void;
}) {
  return (
    <label className="block rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2">
      <span className="text-[11px] text-slate-500">{label}</span>
      <input
        type="number"
        step="0.1"
        value={value ?? ""}
        placeholder="Insufficient data"
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-600"
      />
    </label>
  );
}

function ForecastTable({
  title,
  years,
  canRevenue,
  canProfit,
}: {
  title: string;
  years: ForecastYear[];
  canRevenue: boolean;
  canProfit: boolean;
}) {
  return (
    <div className="rounded-xl border border-white/8 bg-[#0a0f1c]/60 p-5">
      <h4 className="text-sm font-medium text-white">{title}</h4>
      <div className="mt-3 overflow-x-auto">
        <table className="min-w-full text-left text-xs">
          <thead className="text-slate-500">
            <tr>
              {["Period", "Revenue", "Op. profit", "OPM %", "PAT", "PAT %"].map(
                (heading: string) => (
                  <th key={heading} className="px-2 py-2 font-medium">
                    {heading}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {years.map((year) => (
              <tr key={year.label} className="border-t border-white/5 text-slate-300">
                <td className="px-2 py-2 text-white">
                  {year.label}
                  <span className="ml-2 text-[10px] uppercase text-indigo-300">
                    Forecast
                  </span>
                </td>
                <td className="px-2 py-2">
                  {canRevenue ? display(year.revenue) : "Insufficient data"}
                </td>
                <td className="px-2 py-2">
                  {canProfit ? display(year.operatingProfit) : "Insufficient data"}
                </td>
                <td className="px-2 py-2">
                  {canProfit ? display(year.operatingMargin, "%") : "Insufficient data"}
                </td>
                <td className="px-2 py-2">
                  {canProfit ? display(year.pat) : "Insufficient data"}
                </td>
                <td className="px-2 py-2">
                  {canProfit ? display(year.patMargin, "%") : "Insufficient data"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ScenarioCard({
  title,
  years,
  tone,
}: {
  title: string;
  years: ForecastYear[];
  tone: "rose" | "sky" | "emerald";
}) {
  const color =
    tone === "rose"
      ? "border-rose-500/20 bg-rose-500/[0.04]"
      : tone === "emerald"
        ? "border-emerald-500/20 bg-emerald-500/[0.04]"
        : "border-sky-500/20 bg-sky-500/[0.04]";

  return (
    <article className={`rounded-xl border p-4 ${color}`}>
      <h4 className="text-sm font-semibold text-white">{title}</h4>
      <ul className="mt-3 space-y-2 text-xs text-slate-300">
        {years.map((year) => (
          <li key={year.label}>
            {year.label}: Rev {display(year.revenue)} · PAT {display(year.pat)}
          </li>
        ))}
      </ul>
    </article>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/8 bg-white/[0.02] px-3 py-3">
      <p className="text-[11px] text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}
