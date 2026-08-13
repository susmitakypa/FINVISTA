import type {
  FinancialValue,
  NormalizedFinancialData,
  PeriodFinancialData,
} from "@/lib/financial-data-types";
import {
  countExtractedFields,
  comparablePeriods,
} from "@/lib/financial-data-types";

export type ScenarioKey = "bear" | "base" | "bull";

export type ForecastAssumptions = {
  revenueGrowthPct: number | null;
  bearGrowthPct: number | null;
  bullGrowthPct: number | null;
  operatingMarginPct: number | null;
  patMarginPct: number | null;
  cfoToRevenuePct: number | null;
  capexToRevenuePct: number | null;
  fcfToRevenuePct: number | null;
};

export type HistoricalRow = {
  label: string;
  year: number | null;
  revenue: FinancialValue;
  operatingProfit: FinancialValue;
  operatingMargin: FinancialValue;
  pat: FinancialValue;
  patMargin: FinancialValue;
  eps: FinancialValue;
  debt: FinancialValue;
  cash: FinancialValue;
  cfo: FinancialValue;
  capex: FinancialValue;
  fcf: FinancialValue;
};

export type ForecastYear = {
  label: string;
  year: number | null;
  revenue: FinancialValue;
  operatingProfit: FinancialValue;
  operatingMargin: FinancialValue;
  pat: FinancialValue;
  patMargin: FinancialValue;
  cfo: FinancialValue;
  capex: FinancialValue;
  fcf: FinancialValue;
};

export type SeriesPoint = {
  label: string;
  value: number;
  kind: "historical" | "forecast";
};

export type ConfidenceLevel = "HIGH" | "MEDIUM" | "LOW";

export type FinancialForecastModel = {
  company: string | null;
  historical: HistoricalRow[];
  derivedAssumptions: ForecastAssumptions;
  assumptionNotes: string[];
  scenarios: Record<ScenarioKey, ForecastYear[]>;
  charts: {
    revenue: SeriesPoint[];
    pat: SeriesPoint[];
    operatingMargin: SeriesPoint[];
    fcf: SeriesPoint[];
    scenarioRevenue: { label: string; bear: number | null; base: number | null; bull: number | null }[];
    scenarioPat: { label: string; bear: number | null; base: number | null; bull: number | null }[];
  };
  summary: {
    revenueCagr: FinancialValue;
    year1Revenue: FinancialValue;
    year2Revenue: FinancialValue;
    year3Revenue: FinancialValue;
    year1Pat: FinancialValue;
    year2Pat: FinancialValue;
    year3Pat: FinancialValue;
    expectedOperatingMargin: FinancialValue;
    expectedPatMargin: FinancialValue;
    year1Fcf: FinancialValue;
    year2Fcf: FinancialValue;
    year3Fcf: FinancialValue;
  };
  confidence: {
    level: ConfidenceLevel;
    reasons: string[];
  };
  limitations: string[];
  inputsUsed: string[];
  missingInputs: string[];
  canForecastRevenue: boolean;
  canForecastProfit: boolean;
  canForecastCashFlow: boolean;
};

const FORECAST_YEARS = 3;
const BULL_GROWTH_LIFT_PP = 5;
const BEAR_GROWTH_CUT_PP = 5;
const BULL_MARGIN_LIFT_PP = 2;
const BEAR_MARGIN_CUT_PP = 2;

function periodLabel(period: PeriodFinancialData): string {
  return period.period ?? (period.year ? `FY${period.year}` : "Unlabeled period");
}

function chronological(periods: PeriodFinancialData[]): PeriodFinancialData[] {
  return [...periods]
    .map((period, index) => ({ period, index }))
    .sort((a, b) => {
      const yearDiff =
        (a.period.year ?? Number.POSITIVE_INFINITY) -
        (b.period.year ?? Number.POSITIVE_INFINITY);
      if (yearDiff !== 0) return yearDiff;
      return a.index - b.index;
    })
    .map((entry) => entry.period);
}

function operatingProfitOf(period: PeriodFinancialData): FinancialValue {
  return period.incomeStatement.ebit ?? period.incomeStatement.ebitda;
}

function operatingMarginOf(period: PeriodFinancialData): FinancialValue {
  if (period.ratios.operatingMargin !== null) return period.ratios.operatingMargin;
  const profit = operatingProfitOf(period);
  const revenue = period.incomeStatement.revenue;
  if (profit === null || revenue === null || revenue === 0) return null;
  return (profit / revenue) * 100;
}

function patMarginOf(period: PeriodFinancialData): FinancialValue {
  if (period.ratios.netProfitMargin !== null) return period.ratios.netProfitMargin;
  const pat = period.incomeStatement.netProfit;
  const revenue = period.incomeStatement.revenue;
  if (pat === null || revenue === null || revenue === 0) return null;
  return (pat / revenue) * 100;
}

function fcfOf(period: PeriodFinancialData): FinancialValue {
  if (period.cashFlow.freeCashFlow !== null) return period.cashFlow.freeCashFlow;
  const cfo = period.cashFlow.operatingCashFlow;
  const capex = period.cashFlow.capitalExpenditure;
  if (cfo === null || capex === null) return null;
  return capex < 0 ? cfo + capex : cfo - capex;
}

function values(
  rows: HistoricalRow[],
  pick: (row: HistoricalRow) => FinancialValue,
): number[] {
  return rows
    .map(pick)
    .filter((value): value is number => value !== null);
}

function average(numbers: number[]): FinancialValue {
  if (numbers.length === 0) return null;
  return numbers.reduce((sum, value) => sum + value, 0) / numbers.length;
}

function cagr(numbers: number[], yearSpan: number): FinancialValue {
  if (numbers.length < 2 || yearSpan <= 0) return null;
  const first = numbers[0]!;
  const last = numbers[numbers.length - 1]!;
  if (first <= 0 || last <= 0) return null;
  return (Math.pow(last / first, 1 / yearSpan) - 1) * 100;
}

function periodGrowthRates(numbers: number[]): number[] {
  const rates: number[] = [];
  for (let index = 1; index < numbers.length; index += 1) {
    const previous = numbers[index - 1]!;
    const current = numbers[index]!;
    if (previous === 0) continue;
    rates.push((current / previous - 1) * 100);
  }
  return rates;
}

function yearSpanOf(rows: HistoricalRow[]): number {
  const dated = rows.filter((row) => row.year !== null);
  if (dated.length >= 2) {
    return Math.max(
      (dated[dated.length - 1]!.year ?? 0) - (dated[0]!.year ?? 0),
      dated.length - 1,
    );
  }
  return Math.max(rows.length - 1, 0);
}

function nextYearLabel(latest: HistoricalRow, offset: number): {
  label: string;
  year: number | null;
} {
  if (latest.year !== null) {
    const year = latest.year + offset;
    return { label: `FY${year}F`, year };
  }
  return { label: `Year ${offset}F`, year: null };
}

function buildHistorical(periods: PeriodFinancialData[]): HistoricalRow[] {
  return chronological(periods)
    .filter((period) => countExtractedFields(period) > 0)
    .map((period) => ({
      label: periodLabel(period),
      year: period.year,
      revenue: period.incomeStatement.revenue,
      operatingProfit: operatingProfitOf(period),
      operatingMargin: operatingMarginOf(period),
      pat: period.incomeStatement.netProfit,
      patMargin: patMarginOf(period),
      eps: period.incomeStatement.eps,
      debt: period.balanceSheet.totalDebt,
      cash: period.balanceSheet.cash,
      cfo: period.cashFlow.operatingCashFlow,
      capex: period.cashFlow.capitalExpenditure,
      fcf: fcfOf(period),
    }));
}

export function deriveForecastAssumptions(
  historical: HistoricalRow[],
): { assumptions: ForecastAssumptions; notes: string[]; inputsUsed: string[]; missingInputs: string[] } {
  const notes: string[] = [];
  const inputsUsed: string[] = [];
  const missingInputs: string[] = [];

  const revenues = values(historical, (row) => row.revenue);
  const span = yearSpanOf(historical.filter((row) => row.revenue !== null));
  const historicalCagr = cagr(revenues, span);
  const avgGrowth = average(periodGrowthRates(revenues));

  let revenueGrowthPct: FinancialValue = null;
  if (historicalCagr !== null) {
    revenueGrowthPct = historicalCagr;
    notes.push(
      `Base revenue growth uses historical CAGR of ${historicalCagr.toFixed(1)}% across ${revenues.length} revenue observations.`,
    );
    inputsUsed.push(`Revenue series (${revenues.length} periods)`);
  } else if (avgGrowth !== null) {
    revenueGrowthPct = avgGrowth;
    notes.push(
      `Base revenue growth uses average period-over-period growth of ${avgGrowth.toFixed(1)}% because CAGR could not be formed.`,
    );
    inputsUsed.push(`Period-over-period revenue growth rates`);
  } else {
    missingInputs.push("At least two historical revenue observations");
    notes.push("Revenue cannot be forecast without two historical revenue values.");
  }

  const bearGrowthPct =
    revenueGrowthPct === null ? null : revenueGrowthPct - BEAR_GROWTH_CUT_PP;
  const bullGrowthPct =
    revenueGrowthPct === null ? null : revenueGrowthPct + BULL_GROWTH_LIFT_PP;

  if (revenueGrowthPct !== null) {
    notes.push(
      `Bear growth is base − ${BEAR_GROWTH_CUT_PP} pp. Bull growth is base + ${BULL_GROWTH_LIFT_PP} pp.`,
    );
  }

  const opmSeries = values(historical, (row) => row.operatingMargin);
  const patmSeries = values(historical, (row) => row.patMargin);
  const operatingMarginPct = average(opmSeries);
  const patMarginPct = average(patmSeries);

  if (operatingMarginPct !== null) {
    notes.push(
      `Operating margin uses the average of ${opmSeries.length} historical observation(s): ${operatingMarginPct.toFixed(1)}%.`,
    );
    inputsUsed.push("Historical operating margin (OPM or operating profit / revenue)");
  } else {
    missingInputs.push("Historical operating margin or operating profit and revenue");
  }

  if (patMarginPct !== null) {
    notes.push(
      `PAT margin uses the average of ${patmSeries.length} historical observation(s): ${patMarginPct.toFixed(1)}%.`,
    );
    inputsUsed.push("Historical PAT margin (NPM or PAT / revenue)");
  } else {
    missingInputs.push("Historical PAT margin or PAT and revenue");
  }

  const revenuesForRatios = historical.filter(
    (row) => row.revenue !== null && row.revenue !== 0,
  );
  const cfoRatios = revenuesForRatios
    .filter((row) => row.cfo !== null)
    .map((row) => (row.cfo! / row.revenue!) * 100);
  const capexRatios = revenuesForRatios
    .filter((row) => row.capex !== null)
    .map((row) => (Math.abs(row.capex!) / row.revenue!) * 100);
  const fcfRatios = revenuesForRatios
    .filter((row) => row.fcf !== null)
    .map((row) => (row.fcf! / row.revenue!) * 100);

  const cfoToRevenuePct = average(cfoRatios);
  const capexToRevenuePct = average(capexRatios);
  const fcfToRevenuePct = average(fcfRatios);

  if (cfoToRevenuePct !== null) {
    notes.push(`CFO is projected as ${cfoToRevenuePct.toFixed(1)}% of forecast revenue.`);
    inputsUsed.push("Historical CFO / revenue");
  }
  if (capexToRevenuePct !== null) {
    notes.push(`Capex is projected as ${capexToRevenuePct.toFixed(1)}% of forecast revenue.`);
    inputsUsed.push("Historical capex / revenue");
  }
  if (fcfToRevenuePct !== null) {
    notes.push(`FCF is projected as ${fcfToRevenuePct.toFixed(1)}% of forecast revenue.`);
    inputsUsed.push("Historical FCF / revenue (or CFO − capex)");
  }
  if (cfoToRevenuePct === null && fcfToRevenuePct === null) {
    missingInputs.push("Historical CFO or FCF with revenue");
  }

  return {
    assumptions: {
      revenueGrowthPct,
      bearGrowthPct,
      bullGrowthPct,
      operatingMarginPct,
      patMarginPct,
      cfoToRevenuePct,
      capexToRevenuePct,
      fcfToRevenuePct,
    },
    notes,
    inputsUsed,
    missingInputs,
  };
}

function projectScenario(
  latest: HistoricalRow,
  growthPct: FinancialValue,
  operatingMarginPct: FinancialValue,
  patMarginPct: FinancialValue,
  cash: {
    cfoToRevenuePct: FinancialValue;
    capexToRevenuePct: FinancialValue;
    fcfToRevenuePct: FinancialValue;
  },
  marginShiftPp: number,
): ForecastYear[] {
  const years: ForecastYear[] = [];
  if (latest.revenue === null || growthPct === null) {
    return Array.from({ length: FORECAST_YEARS }, (_, index) => {
      const { label, year } = nextYearLabel(latest, index + 1);
      return {
        label,
        year,
        revenue: null,
        operatingProfit: null,
        operatingMargin: null,
        pat: null,
        patMargin: null,
        cfo: null,
        capex: null,
        fcf: null,
      };
    });
  }

  const opm =
    operatingMarginPct === null ? null : operatingMarginPct + marginShiftPp;
  const patm = patMarginPct === null ? null : patMarginPct + marginShiftPp;

  for (let offset = 1; offset <= FORECAST_YEARS; offset += 1) {
    const { label, year } = nextYearLabel(latest, offset);
    const revenue = latest.revenue * Math.pow(1 + growthPct / 100, offset);
    const operatingProfit = opm === null ? null : revenue * (opm / 100);
    const pat = patm === null ? null : revenue * (patm / 100);
    const cfo =
      cash.cfoToRevenuePct === null ? null : revenue * (cash.cfoToRevenuePct / 100);
    const capex =
      cash.capexToRevenuePct === null
        ? null
        : revenue * (cash.capexToRevenuePct / 100);
    let fcf: FinancialValue = null;
    if (cash.fcfToRevenuePct !== null) {
      fcf = revenue * (cash.fcfToRevenuePct / 100);
    } else if (cfo !== null && capex !== null) {
      fcf = cfo - capex;
    }

    years.push({
      label,
      year,
      revenue,
      operatingProfit,
      operatingMargin: opm,
      pat,
      patMargin: patm,
      cfo,
      capex,
      fcf,
    });
  }

  return years;
}

function toSeries(
  historical: HistoricalRow[],
  forecast: ForecastYear[],
  pickHistorical: (row: HistoricalRow) => FinancialValue,
  pickForecast: (row: ForecastYear) => FinancialValue,
): SeriesPoint[] {
  const points: SeriesPoint[] = [];
  for (const row of historical) {
    const value = pickHistorical(row);
    if (value !== null) {
      points.push({ label: row.label, value, kind: "historical" });
    }
  }
  for (const row of forecast) {
    const value = pickForecast(row);
    if (value !== null) {
      points.push({ label: row.label, value, kind: "forecast" });
    }
  }
  return points;
}

function confidenceFor(
  historical: HistoricalRow[],
  canForecastRevenue: boolean,
  canForecastProfit: boolean,
): { level: ConfidenceLevel; reasons: string[] } {
  const revenueCount = values(historical, (row) => row.revenue).length;
  const marginCount = values(historical, (row) => row.operatingMargin).length;
  const patCount = values(historical, (row) => row.pat).length;
  const cashCount = values(historical, (row) => row.fcf).length + values(historical, (row) => row.cfo).length;
  const reasons: string[] = [];

  if (!canForecastRevenue) {
    return {
      level: "LOW",
      reasons: [
        "Fewer than two historical revenue observations, so growth cannot be estimated from uploaded data.",
      ],
    };
  }

  if (revenueCount >= 3 && marginCount >= 2 && canForecastProfit) {
    reasons.push(`${revenueCount} revenue periods and ${marginCount} margin observations support a HIGH confidence base case.`);
    if (cashCount === 0) {
      reasons.push("Cash-flow history is thin, so FCF projections remain less certain than P&L.");
    }
    return { level: "HIGH", reasons };
  }

  if (revenueCount >= 2) {
    reasons.push(`${revenueCount} revenue observation(s) allow a growth rate, but the history is still short.`);
    if (!canForecastProfit) {
      reasons.push("Margins are missing, so profit projections are unavailable.");
    }
    if (patCount < 2) {
      reasons.push("PAT history is limited.");
    }
    return { level: "MEDIUM", reasons };
  }

  reasons.push("Historical coverage is too thin for a confident multi-year model.");
  return { level: "LOW", reasons };
}

export function buildFinancialForecast(
  data: NormalizedFinancialData | null,
  overrides?: Partial<ForecastAssumptions>,
): FinancialForecastModel | null {
  if (!data || data.periods.length === 0) return null;

  const historical = buildHistorical(comparablePeriods(data.periods, "annual"));
  if (historical.length === 0) return null;

  const derived = deriveForecastAssumptions(historical);
  const assumptions: ForecastAssumptions = {
    ...derived.assumptions,
    ...Object.fromEntries(
      Object.entries(overrides ?? {}).filter(([, value]) => value !== undefined),
    ),
  };

  if (overrides?.bearGrowthPct === undefined && assumptions.revenueGrowthPct !== null) {
    assumptions.bearGrowthPct = assumptions.revenueGrowthPct - BEAR_GROWTH_CUT_PP;
  }
  if (overrides?.bullGrowthPct === undefined && assumptions.revenueGrowthPct !== null) {
    assumptions.bullGrowthPct = assumptions.revenueGrowthPct + BULL_GROWTH_LIFT_PP;
  }

  const latest = historical[historical.length - 1]!;
  const cash = {
    cfoToRevenuePct: assumptions.cfoToRevenuePct,
    capexToRevenuePct: assumptions.capexToRevenuePct,
    fcfToRevenuePct: assumptions.fcfToRevenuePct,
  };

  const base = projectScenario(
    latest,
    assumptions.revenueGrowthPct,
    assumptions.operatingMarginPct,
    assumptions.patMarginPct,
    cash,
    0,
  );
  const bull = projectScenario(
    latest,
    assumptions.bullGrowthPct,
    assumptions.operatingMarginPct,
    assumptions.patMarginPct,
    cash,
    BULL_MARGIN_LIFT_PP,
  );
  const bear = projectScenario(
    latest,
    assumptions.bearGrowthPct,
    assumptions.operatingMarginPct,
    assumptions.patMarginPct,
    cash,
    -BEAR_MARGIN_CUT_PP,
  );

  const canForecastRevenue =
    latest.revenue !== null && assumptions.revenueGrowthPct !== null;
  const canForecastProfit =
    canForecastRevenue &&
    (assumptions.operatingMarginPct !== null ||
      assumptions.patMarginPct !== null);
  const canForecastCashFlow =
    canForecastRevenue &&
    (assumptions.fcfToRevenuePct !== null ||
      (assumptions.cfoToRevenuePct !== null &&
        assumptions.capexToRevenuePct !== null));

  const limitations: string[] = [
    "Forecast values are model projections, not actual reported results.",
    "The model does not invent missing historical numbers.",
  ];
  if (!canForecastRevenue) {
    limitations.push(
      "Forecast unavailable — additional historical periods required.",
    );
  }
  if (!canForecastProfit) {
    limitations.push("Profit forecast needs historical operating and/or PAT margins.");
  }
  if (!canForecastCashFlow) {
    limitations.push("Cash-flow forecast needs historical CFO or FCF together with revenue.");
  }
  limitations.push(
    "Bull and bear cases apply fixed ±5 pp growth and ±2 pp margin shifts around the historical base; they are scenarios, not predictions.",
  );

  const confidence = confidenceFor(
    historical,
    canForecastRevenue,
    canForecastProfit,
  );

  return {
    company: data.company,
    historical,
    derivedAssumptions: assumptions,
    assumptionNotes: derived.notes,
    scenarios: { bear, base, bull },
    charts: {
      revenue: toSeries(
        historical,
        base,
        (row) => row.revenue,
        (row) => row.revenue,
      ),
      pat: toSeries(
        historical,
        base,
        (row) => row.pat,
        (row) => row.pat,
      ),
      operatingMargin: toSeries(
        historical,
        base,
        (row) => row.operatingMargin,
        (row) => row.operatingMargin,
      ),
      fcf: toSeries(
        historical,
        base,
        (row) => row.fcf,
        (row) => row.fcf,
      ),
      scenarioRevenue: base.map((year, index) => ({
        label: year.label,
        bear: bear[index]?.revenue ?? null,
        base: year.revenue,
        bull: bull[index]?.revenue ?? null,
      })),
      scenarioPat: base.map((year, index) => ({
        label: year.label,
        bear: bear[index]?.pat ?? null,
        base: year.pat,
        bull: bull[index]?.pat ?? null,
      })),
    },
    summary: {
      revenueCagr: assumptions.revenueGrowthPct,
      year1Revenue: base[0]?.revenue ?? null,
      year2Revenue: base[1]?.revenue ?? null,
      year3Revenue: base[2]?.revenue ?? null,
      year1Pat: base[0]?.pat ?? null,
      year2Pat: base[1]?.pat ?? null,
      year3Pat: base[2]?.pat ?? null,
      expectedOperatingMargin: assumptions.operatingMarginPct,
      expectedPatMargin: assumptions.patMarginPct,
      year1Fcf: base[0]?.fcf ?? null,
      year2Fcf: base[1]?.fcf ?? null,
      year3Fcf: base[2]?.fcf ?? null,
    },
    confidence,
    limitations,
    inputsUsed: derived.inputsUsed,
    missingInputs: derived.missingInputs,
    canForecastRevenue,
    canForecastProfit,
    canForecastCashFlow,
  };
}

export function formatForecastValue(value: FinancialValue, unit = ""): string {
  if (value === null) return "Data unavailable";
  const formatted = value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return unit ? `${formatted}${unit}` : formatted;
}
