import type {
  FinancialValue,
  MarketData,
  NormalizedFinancialData,
  PeriodFinancialData,
  QualitativeInsights,
} from "@/lib/financial-data-types";
import {
  countExtractedFields,
  createEmptyQualitative,
} from "@/lib/financial-data-types";

export type LongTermMetric = {
  label: string;
  value: FinancialValue;
  formatted: string;
  unit?: string;
  available: boolean;
  formula: string;
  inputsUsed: string[];
  missingInputs: string[];
  unavailableHint?: string;
};

export type DetectedPeriod = {
  label: string;
  year: number | null;
  fieldCount: number;
  fields: { name: string; value: FinancialValue; present: boolean }[];
};

export type LongTermClassification =
  | "STRONG LONG-TERM"
  | "POSITIVE"
  | "NEUTRAL"
  | "CAUTIOUS"
  | "INSUFFICIENT DATA";

export type QualitativeItem = {
  label: string;
  available: boolean;
  detail: string;
};

export type QualityPillar = {
  key: string;
  label: string;
  score: number | null;
  max: number;
  explanation: string;
};

export type RiskItem = {
  label: string;
  level: "Low" | "Moderate" | "High" | "Unavailable";
  detail: string;
};

export type LongTermAnalysis = {
  company: string | null;
  periodsAvailable: number;
  latestPeriod: PeriodFinancialData | null;
  priorPeriod: PeriodFinancialData | null;
  marketData: MarketData;
  detectedPeriods: DetectedPeriod[];
  strengthMetrics: LongTermMetric[];
  growthMetrics: LongTermMetric[];
  valuationMetrics: LongTermMetric[];
  sustainableGrowth: string;
  qualityPillars: QualityPillar[];
  risks: RiskItem[];
  overallScore: number | null;
  classification: LongTermClassification;
  insufficientData: boolean;
  scoreExplanation: string[];
  insights: string[];
  qualitativeItems: QualitativeItem[];
  thesis: {
    bull: string;
    base: string;
    bear: string;
    catalysts: string[];
    keyRisks: string[];
    monitor: string[];
  };
  chartData: {
    revenueByPeriod: { label: string; value: number }[];
    profitByPeriod: { label: string; value: number }[];
    marginTrend: {
      label: string;
      operating: number | null;
      net: number | null;
    }[];
    debtEquityByPeriod: { label: string; value: number }[];
    cashFlowByPeriod: { label: string; value: number }[];
  };
  dataCoverage: {
    availableMetrics: number;
    totalMetrics: number;
    coveragePercent: number;
    presentRawFields: string[];
    missingRawFields: string[];
  };
};

const UNAVAILABLE = "Data unavailable";

const PERIOD_FIELD_DEFS: {
  name: string;
  pick: (period: PeriodFinancialData) => FinancialValue;
}[] = [
  { name: "Revenue", pick: (period) => period.incomeStatement.revenue },
  { name: "EBITDA", pick: (period) => period.incomeStatement.ebitda },
  { name: "EBIT / operating profit", pick: (period) => period.incomeStatement.ebit },
  { name: "PBT", pick: (period) => period.incomeStatement.profitBeforeTax },
  { name: "PAT", pick: (period) => period.incomeStatement.netProfit },
  { name: "EPS", pick: (period) => period.incomeStatement.eps },
  { name: "Total assets", pick: (period) => period.balanceSheet.totalAssets },
  { name: "Equity", pick: (period) => period.balanceSheet.totalEquity },
  { name: "Total debt", pick: (period) => period.balanceSheet.totalDebt },
  { name: "Cash", pick: (period) => period.balanceSheet.cash },
  { name: "Current assets", pick: (period) => period.balanceSheet.currentAssets },
  { name: "Current liabilities", pick: (period) => period.balanceSheet.currentLiabilities },
  { name: "Operating cash flow", pick: (period) => period.cashFlow.operatingCashFlow },
  { name: "Capex", pick: (period) => period.cashFlow.capitalExpenditure },
  { name: "Free cash flow", pick: (period) => period.cashFlow.freeCashFlow },
  { name: "OPM (extracted)", pick: (period) => period.ratios.operatingMargin },
  { name: "NPM (extracted)", pick: (period) => period.ratios.netProfitMargin },
  { name: "ROE (extracted)", pick: (period) => period.ratios.roe },
  { name: "ROCE (extracted)", pick: (period) => period.ratios.roce },
  { name: "D/E (extracted)", pick: (period) => period.ratios.debtToEquity },
  { name: "Interest coverage (extracted)", pick: (period) => period.ratios.interestCoverage },
];

function formatValue(value: FinancialValue, unit?: string): string {
  if (value === null) return UNAVAILABLE;
  const formatted = value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return unit ? `${formatted}${unit}` : formatted;
}

function describeAmount(value: FinancialValue, unit = ""): string {
  if (value === null) return UNAVAILABLE;
  return `${formatValue(value, unit)}`;
}

function metric(options: {
  label: string;
  value: FinancialValue;
  unit?: string;
  formula: string;
  inputsUsed: string[];
  missingInputs: string[];
  unavailableHint?: string;
}): LongTermMetric {
  return {
    label: options.label,
    value: options.value,
    formatted: formatValue(options.value, options.unit),
    unit: options.unit,
    available: options.value !== null,
    formula: options.formula,
    inputsUsed: options.inputsUsed,
    missingInputs: options.missingInputs,
    unavailableHint: options.unavailableHint,
  };
}

function periodLabel(period: PeriodFinancialData): string {
  return period.period ?? (period.year ? `FY${period.year}` : "Unlabeled period");
}

function computeMargin(
  numerator: FinancialValue,
  denominator: FinancialValue,
): FinancialValue {
  if (numerator === null || denominator === null || denominator === 0) {
    return null;
  }
  return (numerator / denominator) * 100;
}

function operatingProfitOf(period: PeriodFinancialData): FinancialValue {
  return period.incomeStatement.ebit ?? period.incomeStatement.ebitda;
}

function operatingMarginOf(period: PeriodFinancialData): FinancialValue {
  if (period.ratios.operatingMargin !== null) return period.ratios.operatingMargin;
  const profit = operatingProfitOf(period);
  return computeMargin(profit, period.incomeStatement.revenue);
}

function netMarginOf(period: PeriodFinancialData): FinancialValue {
  if (period.ratios.netProfitMargin !== null) return period.ratios.netProfitMargin;
  return computeMargin(
    period.incomeStatement.netProfit,
    period.incomeStatement.revenue,
  );
}

function debtEquityOf(period: PeriodFinancialData): FinancialValue {
  if (period.ratios.debtToEquity !== null) return period.ratios.debtToEquity;
  const debt = period.balanceSheet.totalDebt;
  const equity = period.balanceSheet.totalEquity;
  if (debt === null || equity === null || equity === 0) return null;
  return debt / equity;
}

function freeCashFlowOf(period: PeriodFinancialData): FinancialValue {
  if (period.cashFlow.freeCashFlow !== null) return period.cashFlow.freeCashFlow;
  const cfo = period.cashFlow.operatingCashFlow;
  const capex = period.cashFlow.capitalExpenditure;
  if (cfo === null || capex === null) return null;
  return capex < 0 ? cfo + capex : cfo - capex;
}

function chronological(periods: PeriodFinancialData[]): PeriodFinancialData[] {
  return [...periods]
    .map((period, index) => ({ period, index }))
    .sort((a, b) => {
      const yearDiff = (a.period.year ?? Number.POSITIVE_INFINITY) - (b.period.year ?? Number.POSITIVE_INFINITY);
      if (yearDiff !== 0) return yearDiff;
      return a.index - b.index;
    })
    .map((entry) => entry.period);
}

function selectLatest(periods: PeriodFinancialData[]): PeriodFinancialData | null {
  const usable = periods.filter((period) => countExtractedFields(period) > 0);
  const pool = usable.length > 0 ? usable : periods;
  const dated = pool.filter((period) => period.year !== null);
  const ranked = (dated.length > 0 ? dated : pool).slice().sort((a, b) => {
    const yearDiff = (b.year ?? -1) - (a.year ?? -1);
    if (yearDiff !== 0) return yearDiff;
    return countExtractedFields(b) - countExtractedFields(a);
  });
  return ranked[0] ?? null;
}

function selectPrior(
  periods: PeriodFinancialData[],
  latest: PeriodFinancialData | null,
): PeriodFinancialData | null {
  if (!latest) return null;
  const ordered = chronological(periods).filter(
    (period) => countExtractedFields(period) > 0 && period !== latest,
  );
  const before = ordered.filter(
    (period) =>
      latest.year === null ||
      period.year === null ||
      (period.year ?? 0) < (latest.year ?? 0),
  );
  return (before.at(-1) ?? ordered.at(-1) ?? null);
}

function observations(
  periods: PeriodFinancialData[],
  pick: (period: PeriodFinancialData) => FinancialValue,
): { period: PeriodFinancialData; value: number }[] {
  return chronological(periods)
    .map((period) => ({ period, value: pick(period) }))
    .filter(
      (entry): entry is { period: PeriodFinancialData; value: number } =>
        entry.value !== null,
    );
}

function ratioGrowth(current: number, previous: number): FinancialValue {
  if (previous === 0) return null;
  return (current / previous - 1) * 100;
}

function twoPeriodGrowth(
  periods: PeriodFinancialData[],
  pick: (period: PeriodFinancialData) => FinancialValue,
  fieldName: string,
): {
  value: FinancialValue;
  inputsUsed: string[];
  missingInputs: string[];
} {
  const points = observations(periods, pick);
  if (points.length >= 2) {
    const previous = points[points.length - 2]!;
    const current = points[points.length - 1]!;
    const value = ratioGrowth(current.value, previous.value);
    return {
      value,
      inputsUsed: [
        `${fieldName} ${periodLabel(current.period)} = ${describeAmount(current.value)}`,
        `${fieldName} ${periodLabel(previous.period)} = ${describeAmount(previous.value)}`,
      ],
      missingInputs:
        value === null ? [`${fieldName} previous period is zero`] : [],
    };
  }

  const missing: string[] = [];
  if (points.length === 0) {
    missing.push(`Current ${fieldName}`, `Previous-period ${fieldName}`);
    return { value: null, inputsUsed: [], missingInputs: missing };
  }

  return {
    value: null,
    inputsUsed: [
      `${fieldName} ${periodLabel(points[0]!.period)} = ${describeAmount(points[0]!.value)}`,
    ],
    missingInputs: [`Previous-period ${fieldName}`],
  };
}

function seriesCagr(
  periods: PeriodFinancialData[],
  pick: (period: PeriodFinancialData) => FinancialValue,
  fieldName: string,
): {
  value: FinancialValue;
  inputsUsed: string[];
  missingInputs: string[];
} {
  const points = observations(periods, pick);
  if (points.length < 2) {
    return {
      value: null,
      inputsUsed: points.map(
        (point) =>
          `${fieldName} ${periodLabel(point.period)} = ${describeAmount(point.value)}`,
      ),
      missingInputs: [
        points.length === 0
          ? `At least two ${fieldName} observations`
          : `A second ${fieldName} observation`,
      ],
    };
  }

  const first = points[0]!;
  const last = points[points.length - 1]!;
  const yearSpan =
    first.period.year !== null &&
    last.period.year !== null &&
    last.period.year !== first.period.year
      ? last.period.year - first.period.year
      : points.length - 1;

  if (yearSpan <= 0 || first.value === 0) {
    return {
      value: null,
      inputsUsed: [
        `${fieldName} ${periodLabel(first.period)} = ${describeAmount(first.value)}`,
        `${fieldName} ${periodLabel(last.period)} = ${describeAmount(last.value)}`,
      ],
      missingInputs: ["A positive time span between the first and last observations"],
    };
  }

  const value =
    first.value > 0 && last.value > 0
      ? (Math.pow(last.value / first.value, 1 / yearSpan) - 1) * 100
      : ratioGrowth(last.value, first.value);

  return {
    value,
    inputsUsed: [
      `${fieldName} ${periodLabel(first.period)} = ${describeAmount(first.value)}`,
      `${fieldName} ${periodLabel(last.period)} = ${describeAmount(last.value)}`,
      `Span = ${yearSpan} period(s)`,
    ],
    missingInputs: [],
  };
}

function chartSeries(
  periods: PeriodFinancialData[],
  pick: (period: PeriodFinancialData) => FinancialValue,
): { label: string; value: number }[] {
  return observations(periods, pick).map((entry) => ({
    label: periodLabel(entry.period),
    value: entry.value,
  }));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function buildDetectedPeriods(periods: PeriodFinancialData[]): DetectedPeriod[] {
  return chronological(periods).map((period) => ({
    label: periodLabel(period),
    year: period.year,
    fieldCount: countExtractedFields(period),
    fields: PERIOD_FIELD_DEFS.map((field) => {
      const value = field.pick(period);
      return { name: field.name, value, present: value !== null };
    }),
  }));
}

function scoreProfitability(
  roe: FinancialValue,
  roce: FinancialValue,
  operatingMargin: FinancialValue,
  netMargin: FinancialValue,
): QualityPillar {
  const inputs = [roe, roce, operatingMargin, netMargin].filter(
    (value): value is number => value !== null,
  );

  if (inputs.length === 0) {
    return {
      key: "profitability",
      label: "Profitability",
      score: null,
      max: 20,
      explanation:
        "Need ROE, ROCE, or margins. Missing PAT/equity and operating profit/revenue.",
    };
  }

  let points = 0;
  if (roe !== null) points += roe >= 18 ? 6 : roe >= 12 ? 4 : roe >= 8 ? 2 : 0;
  if (roce !== null)
    points += roce >= 18 ? 6 : roce >= 12 ? 4 : roce >= 8 ? 2 : 0;
  if (operatingMargin !== null)
    points +=
      operatingMargin >= 18
        ? 4
        : operatingMargin >= 12
          ? 3
          : operatingMargin >= 6
            ? 2
            : 0;
  if (netMargin !== null)
    points += netMargin >= 12 ? 4 : netMargin >= 8 ? 3 : netMargin >= 4 ? 2 : 0;

  return {
    key: "profitability",
    label: "Profitability",
    score: clamp(Math.round(points), 0, 20),
    max: 20,
    explanation:
      roe !== null
        ? `ROE ${roe.toFixed(1)}%; operating margin ${operatingMargin === null ? UNAVAILABLE : `${operatingMargin.toFixed(1)}%`}.`
        : `Operating margin ${operatingMargin === null ? UNAVAILABLE : `${operatingMargin.toFixed(1)}%`}.`,
  };
}

function scoreCashConversion(
  pat: FinancialValue,
  fcf: FinancialValue,
  ocf: FinancialValue,
): QualityPillar {
  if (pat === null && fcf === null && ocf === null) {
    return {
      key: "cash-conversion",
      label: "Cash conversion",
      score: null,
      max: 20,
      explanation: "Need PAT plus CFO or FCF.",
    };
  }

  let score = 8;
  let explanation = "Cash conversion could only be partly assessed.";

  if (pat !== null && pat !== 0 && fcf !== null) {
    const conversion = (fcf / Math.abs(pat)) * 100;
    if (conversion >= 90) score = 18;
    else if (conversion >= 70) score = 15;
    else if (conversion >= 50) score = 12;
    else if (conversion >= 20) score = 8;
    else score = 4;
    explanation = `FCF is ${conversion.toFixed(0)}% of PAT.`;
  } else if (ocf !== null) {
    score = ocf > 0 ? 12 : 4;
    explanation =
      ocf > 0
        ? "CFO is positive; FCF versus PAT is incomplete."
        : "CFO is negative in the latest period.";
  } else if (fcf !== null) {
    score = fcf > 0 ? 12 : 4;
    explanation = fcf > 0 ? "FCF is positive." : "FCF is negative.";
  }

  return {
    key: "cash-conversion",
    label: "Cash conversion",
    score,
    max: 20,
    explanation,
  };
}

function scoreBalanceSheet(
  debtEquity: FinancialValue,
  interestCoverage: FinancialValue,
  cash: FinancialValue,
  currentRatio: FinancialValue,
): QualityPillar {
  if (
    debtEquity === null &&
    interestCoverage === null &&
    cash === null &&
    currentRatio === null
  ) {
    return {
      key: "balance-sheet",
      label: "Balance-sheet strength",
      score: null,
      max: 20,
      explanation: "Need debt, equity, coverage, or liquidity fields.",
    };
  }

  let points = 0;
  if (debtEquity !== null)
    points += debtEquity < 0.4 ? 8 : debtEquity < 0.8 ? 6 : debtEquity < 1.5 ? 4 : 1;
  if (interestCoverage !== null)
    points +=
      interestCoverage >= 8
        ? 6
        : interestCoverage >= 4
          ? 4
          : interestCoverage >= 2
            ? 2
            : 0;
  if (currentRatio !== null)
    points += currentRatio >= 1.5 ? 4 : currentRatio >= 1 ? 2 : 0;
  else if (cash !== null) points += cash > 0 ? 2 : 0;

  return {
    key: "balance-sheet",
    label: "Balance-sheet strength",
    score: clamp(points, 0, 20),
    max: 20,
    explanation:
      debtEquity !== null
        ? `D/E ${debtEquity.toFixed(2)}x${interestCoverage !== null ? `; interest coverage ${interestCoverage.toFixed(1)}x` : ""}.`
        : "Leverage incomplete; scored from coverage/liquidity where present.",
  };
}

function scoreCapitalEfficiency(
  roce: FinancialValue,
  revenueCagr: FinancialValue,
  assetCagr: FinancialValue,
): QualityPillar {
  if (roce === null && revenueCagr === null && assetCagr === null) {
    return {
      key: "capital-efficiency",
      label: "Capital efficiency",
      score: null,
      max: 20,
      explanation: "Need ROCE or revenue/asset history.",
    };
  }

  let points = 0;
  if (roce !== null) points += roce >= 18 ? 10 : roce >= 12 ? 7 : roce >= 8 ? 4 : 2;
  if (revenueCagr !== null && assetCagr !== null) {
    points += revenueCagr >= assetCagr ? 8 : 3;
  } else if (revenueCagr !== null) {
    points += revenueCagr >= 10 ? 6 : revenueCagr >= 0 ? 4 : 1;
  }

  return {
    key: "capital-efficiency",
    label: "Capital efficiency",
    score: clamp(points, 0, 20),
    max: 20,
    explanation:
      roce !== null
        ? `ROCE ${roce.toFixed(1)}%.`
        : "ROCE missing; inferred from growth history where possible.",
  };
}

function scoreEarningsConsistency(
  periods: PeriodFinancialData[],
): QualityPillar {
  const profits = observations(
    periods,
    (period) => period.incomeStatement.netProfit,
  ).map((entry) => entry.value);

  if (profits.length < 2) {
    return {
      key: "earnings-consistency",
      label: "Earnings consistency",
      score: null,
      max: 20,
      explanation: "Need at least two PAT observations.",
    };
  }

  const growthRates: number[] = [];
  for (let index = 1; index < profits.length; index += 1) {
    const previous = profits[index - 1]!;
    const current = profits[index]!;
    const growth = ratioGrowth(current, previous);
    if (growth !== null) growthRates.push(growth);
  }

  const positiveYears = profits.filter((value) => value > 0).length;
  const negativeGrowth = growthRates.filter((value) => value < 0).length;
  let score = Math.round((positiveYears / profits.length) * 12);
  if (growthRates.length > 0 && negativeGrowth === 0) score += 8;
  else if (negativeGrowth <= 1) score += 4;

  return {
    key: "earnings-consistency",
    label: "Earnings consistency",
    score: clamp(score, 0, 20),
    max: 20,
    explanation: `${positiveYears} of ${profits.length} PAT observations were profitable.`,
  };
}

export function analyzeLongTermInvestment(
  data: NormalizedFinancialData | null,
): LongTermAnalysis | null {
  if (!data) return null;

  const qualitative: QualitativeInsights =
    data.qualitative ?? createEmptyQualitative();
  const hasQualitative = Object.values(qualitative).some((value) =>
    Boolean(value),
  );
  if ((!data.periods || data.periods.length === 0) && !hasQualitative) {
    return null;
  }

  const periods = data.periods ?? [];

  const latest = selectLatest(periods);
  const prior = selectPrior(periods, latest);
  const detectedPeriods = buildDetectedPeriods(periods);

  const revenue = latest?.incomeStatement.revenue ?? null;
  const pat = latest?.incomeStatement.netProfit ?? null;
  const ebit = latest?.incomeStatement.ebit ?? null;
  const ebitda = latest?.incomeStatement.ebitda ?? null;
  const operatingProfit = ebit ?? ebitda;
  const pbt = latest?.incomeStatement.profitBeforeTax ?? null;
  const eps = latest?.incomeStatement.eps ?? null;
  const equity = latest?.balanceSheet.totalEquity ?? null;
  const priorEquity = prior?.balanceSheet.totalEquity ?? null;
  const debt = latest?.balanceSheet.totalDebt ?? null;
  const cash = latest?.balanceSheet.cash ?? null;
  const assets = latest?.balanceSheet.totalAssets ?? null;
  const currentAssets = latest?.balanceSheet.currentAssets ?? null;
  const currentLiabilities = latest?.balanceSheet.currentLiabilities ?? null;
  const cfo = latest?.cashFlow.operatingCashFlow ?? null;
  const capex = latest?.cashFlow.capitalExpenditure ?? null;
  const extractedRoe = latest?.ratios.roe ?? null;
  const extractedRoce = latest?.ratios.roce ?? null;
  const extractedDe = latest?.ratios.debtToEquity ?? null;
  const extractedCoverage = latest?.ratios.interestCoverage ?? null;
  const extractedOpm = latest?.ratios.operatingMargin ?? null;

  const revenueGrowth = twoPeriodGrowth(
    periods,
    (period) => period.incomeStatement.revenue,
    "Revenue",
  );
  const patGrowth = twoPeriodGrowth(
    periods,
    (period) => period.incomeStatement.netProfit,
    "PAT",
  );
  const epsGrowth = twoPeriodGrowth(
    periods,
    (period) => period.incomeStatement.eps,
    "EPS",
  );
  const ebitdaGrowth = twoPeriodGrowth(
    periods,
    (period) => period.incomeStatement.ebitda,
    "EBITDA",
  );
  const roceTrend = twoPeriodGrowth(
    periods,
    (period) => period.ratios.roce,
    "ROCE",
  );
  const revenueCagr = seriesCagr(
    periods,
    (period) => period.incomeStatement.revenue,
    "Revenue",
  );
  const earningsCagr = seriesCagr(
    periods,
    (period) => period.incomeStatement.netProfit,
    "PAT",
  );
  const assetCagr = seriesCagr(
    periods,
    (period) => period.balanceSheet.totalAssets,
    "Total assets",
  );
  const fcfCagr = seriesCagr(periods, freeCashFlowOf, "Free cash flow");

  let operatingMargin: FinancialValue = null;
  const opmInputs: string[] = [];
  const opmMissing: string[] = [];
  if (extractedOpm !== null) {
    operatingMargin = extractedOpm;
    opmInputs.push(`Extracted OPM = ${describeAmount(extractedOpm, "%")}`);
  } else if (ebit !== null && revenue !== null && revenue !== 0) {
    operatingMargin = (ebit / revenue) * 100;
    opmInputs.push(
      `EBIT / operating profit = ${describeAmount(ebit)}`,
      `Revenue = ${describeAmount(revenue)}`,
    );
  } else if (ebitda !== null && revenue !== null && revenue !== 0) {
    operatingMargin = (ebitda / revenue) * 100;
    opmInputs.push(
      `EBITDA (proxy for operating profit) = ${describeAmount(ebitda)}`,
      `Revenue = ${describeAmount(revenue)}`,
    );
  } else {
    if (operatingProfit === null) opmMissing.push("EBIT / operating profit (or EBITDA)");
    if (revenue === null) opmMissing.push("Revenue");
    if (revenue === 0) opmMissing.push("Non-zero revenue");
  }

  const netMargin = latest ? netMarginOf(latest) : null;

  let roe: FinancialValue = extractedRoe;
  const roeInputs: string[] = [];
  const roeMissing: string[] = [];
  if (extractedRoe !== null) {
    roeInputs.push(`Extracted ROE = ${describeAmount(extractedRoe, "%")}`);
  } else if (pat !== null && equity !== null && priorEquity !== null) {
    const averageEquity = (equity + priorEquity) / 2;
    if (averageEquity !== 0) {
      roe = (pat / averageEquity) * 100;
      roeInputs.push(
        `PAT = ${describeAmount(pat)}`,
        `Latest equity = ${describeAmount(equity)}`,
        `Prior equity = ${describeAmount(priorEquity)}`,
        `Average equity = ${describeAmount(averageEquity)}`,
      );
    } else {
      roeMissing.push("Non-zero average equity");
    }
  } else if (pat !== null && equity !== null && equity !== 0) {
    roe = (pat / equity) * 100;
    roeInputs.push(
      `PAT = ${describeAmount(pat)}`,
      `Ending equity = ${describeAmount(equity)} (prior equity missing, so average equity was not used)`,
    );
  } else {
    if (pat === null) roeMissing.push("PAT");
    if (equity === null) roeMissing.push("Equity");
  }

  let capitalEmployed: FinancialValue = null;
  let capitalLabel = "Capital employed";
  if (equity !== null && debt !== null) {
    capitalEmployed = equity + debt;
    capitalLabel = "Equity + total debt";
  } else if (
    assets !== null &&
    currentLiabilities !== null
  ) {
    capitalEmployed = assets - currentLiabilities;
    capitalLabel = "Total assets − current liabilities";
  }

  let roce: FinancialValue = extractedRoce;
  const roceInputs: string[] = [];
  const roceMissing: string[] = [];
  if (extractedRoce !== null) {
    roceInputs.push(`Extracted ROCE = ${describeAmount(extractedRoce, "%")}`);
  } else if (
    operatingProfit !== null &&
    capitalEmployed !== null &&
    capitalEmployed !== 0
  ) {
    roce = (operatingProfit / capitalEmployed) * 100;
    roceInputs.push(
      `${ebit !== null ? "EBIT" : "EBITDA"} = ${describeAmount(operatingProfit)}`,
      `${capitalLabel} = ${describeAmount(capitalEmployed)}`,
    );
  } else {
    if (operatingProfit === null) roceMissing.push("EBIT / operating profit");
    if (capitalEmployed === null) {
      roceMissing.push("Equity and total debt (or total assets and current liabilities)");
    }
    if (capitalEmployed === 0) roceMissing.push("Non-zero capital employed");
  }

  let debtEquity: FinancialValue = extractedDe;
  const deInputs: string[] = [];
  const deMissing: string[] = [];
  if (extractedDe !== null) {
    deInputs.push(`Extracted D/E = ${describeAmount(extractedDe, "x")}`);
  } else if (debt !== null && equity !== null && equity !== 0) {
    debtEquity = debt / equity;
    deInputs.push(
      `Total debt = ${describeAmount(debt)}`,
      `Equity = ${describeAmount(equity)}`,
    );
  } else {
    if (debt === null) deMissing.push("Total debt");
    if (equity === null) deMissing.push("Equity");
    if (equity === 0) deMissing.push("Non-zero equity");
  }

  let interestCoverage: FinancialValue = extractedCoverage;
  const icInputs: string[] = [];
  const icMissing: string[] = [];
  if (extractedCoverage !== null) {
    icInputs.push(`Extracted interest coverage = ${describeAmount(extractedCoverage, "x")}`);
  } else if (ebit !== null && pbt !== null && ebit > pbt) {
    const interestExpense = ebit - pbt;
    if (interestExpense !== 0) {
      interestCoverage = ebit / interestExpense;
      icInputs.push(
        `EBIT = ${describeAmount(ebit)}`,
        `PBT = ${describeAmount(pbt)}`,
        `Implied interest (EBIT − PBT) = ${describeAmount(interestExpense)}`,
      );
    } else {
      icMissing.push("Non-zero implied interest (EBIT − PBT)");
    }
  } else {
    icMissing.push("Extracted interest coverage, or both EBIT and PBT (with EBIT > PBT)");
  }

  let fcf: FinancialValue = latest ? freeCashFlowOf(latest) : null;
  const fcfInputs: string[] = [];
  const fcfMissing: string[] = [];
  if (latest?.cashFlow.freeCashFlow !== null && latest) {
    fcfInputs.push(`Extracted FCF = ${describeAmount(latest.cashFlow.freeCashFlow)}`);
  } else if (cfo !== null && capex !== null) {
    fcfInputs.push(
      `CFO = ${describeAmount(cfo)}`,
      `Capex = ${describeAmount(capex)}`,
    );
  } else {
    if (cfo === null) fcfMissing.push("Operating cash flow (CFO)");
    if (capex === null) fcfMissing.push("Capital expenditure");
  }

  const currentRatio =
    currentAssets !== null &&
    currentLiabilities !== null &&
    currentLiabilities !== 0
      ? currentAssets / currentLiabilities
      : null;

  const peExtracted = data.marketData.pe;
  const pbExtracted = data.marketData.pb;
  const price = data.marketData.currentPrice;
  const marketCap = data.marketData.marketCap;

  let pe: FinancialValue = peExtracted;
  const peInputs: string[] = [];
  const peMissing: string[] = [];
  if (peExtracted !== null) {
    peInputs.push(`Extracted P/E = ${describeAmount(peExtracted)}`);
  } else if (price !== null && eps !== null && eps !== 0) {
    pe = price / eps;
    peInputs.push(
      `Current price = ${describeAmount(price)}`,
      `EPS = ${describeAmount(eps)}`,
    );
  } else {
    if (peExtracted === null) peMissing.push("Extracted P/E");
    if (price === null) peMissing.push("Market price");
    if (eps === null) peMissing.push("EPS");
  }

  let pb: FinancialValue = pbExtracted;
  const pbInputs: string[] = [];
  const pbMissing: string[] = [];
  if (pbExtracted !== null) {
    pbInputs.push(`Extracted P/B = ${describeAmount(pbExtracted)}`);
  } else if (marketCap !== null && equity !== null && equity !== 0) {
    pb = marketCap / equity;
    pbInputs.push(
      `Market cap = ${describeAmount(marketCap)}`,
      `Equity = ${describeAmount(equity)}`,
    );
  } else {
    if (pbExtracted === null) pbMissing.push("Extracted P/B");
    if (marketCap === null) pbMissing.push("Market cap");
    if (equity === null) pbMissing.push("Equity");
  }

  let enterpriseValue: FinancialValue = null;
  const evInputs: string[] = [];
  const evMissing: string[] = [];
  if (marketCap !== null && debt !== null && cash !== null) {
    enterpriseValue = marketCap + debt - cash;
    evInputs.push(
      `Market cap = ${describeAmount(marketCap)}`,
      `Total debt = ${describeAmount(debt)}`,
      `Cash = ${describeAmount(cash)}`,
    );
  } else {
    if (marketCap === null) evMissing.push("Market cap");
    if (debt === null) evMissing.push("Total debt");
    if (cash === null) evMissing.push("Cash");
  }

  const evEbitda =
    enterpriseValue !== null && ebitda !== null && ebitda !== 0
      ? enterpriseValue / ebitda
      : null;
  const evEbitdaMissing: string[] = [];
  const evEbitdaInputs: string[] = [...evInputs];
  if (evEbitda !== null && ebitda !== null) {
    evEbitdaInputs.push(`EBITDA = ${describeAmount(ebitda)}`);
  } else {
    evEbitdaMissing.push(...evMissing);
    if (ebitda === null) evEbitdaMissing.push("EBITDA");
    if (ebitda === 0) evEbitdaMissing.push("Non-zero EBITDA");
  }

  const growthForPeg = earningsCagr.value ?? patGrowth.value;
  const peg =
    pe !== null && pe > 0 && growthForPeg !== null && growthForPeg > 0
      ? pe / growthForPeg
      : null;
  const pegMissing: string[] = [];
  const pegInputs: string[] = [];
  if (peg !== null) {
    pegInputs.push(
      `P/E = ${describeAmount(pe)}`,
      `Earnings growth % = ${describeAmount(growthForPeg, "%")}`,
    );
  } else {
    if (pe === null) pegMissing.push("P/E");
    if (growthForPeg === null) pegMissing.push("Positive earnings growth");
    else if (growthForPeg <= 0) pegMissing.push("Positive earnings growth");
  }

  const latestOpm = latest ? operatingMarginOf(latest) : null;
  const priorOpm = prior ? operatingMarginOf(prior) : null;

  const strengthMetrics: LongTermMetric[] = [
    metric({
      label: "Revenue",
      value: revenue,
      unit: " Cr",
      formula: "Latest extracted revenue",
      inputsUsed: revenue === null ? [] : [`Revenue ${latest ? periodLabel(latest) : ""} = ${describeAmount(revenue)}`],
      missingInputs: revenue === null ? ["Revenue"] : [],
    }),
    metric({
      label: "Revenue growth",
      value: revenueGrowth.value,
      unit: "%",
      formula: "(Current revenue / Previous revenue) − 1",
      inputsUsed: revenueGrowth.inputsUsed,
      missingInputs: revenueGrowth.missingInputs,
    }),
    metric({
      label: "EBITDA",
      value: ebitda,
      unit: " Cr",
      formula: "Latest extracted EBITDA",
      inputsUsed: ebitda === null ? [] : [`EBITDA = ${describeAmount(ebitda)}`],
      missingInputs: ebitda === null ? ["EBITDA"] : [],
    }),
    metric({
      label: "EBITDA margin",
      value: computeMargin(ebitda, revenue),
      unit: "%",
      formula: "EBITDA / revenue",
      inputsUsed:
        ebitda !== null && revenue !== null
          ? [`EBITDA = ${describeAmount(ebitda)}`, `Revenue = ${describeAmount(revenue)}`]
          : [],
      missingInputs: [
        ...(ebitda === null ? ["EBITDA"] : []),
        ...(revenue === null ? ["Revenue"] : []),
        ...(revenue === 0 ? ["Non-zero revenue"] : []),
      ].filter((item, index, list) => list.indexOf(item) === index),
      unavailableHint: "Requires EBITDA and revenue.",
    }),
    metric({
      label: "Operating margin",
      value: operatingMargin,
      unit: "%",
      formula: "OPM, or operating profit / revenue",
      inputsUsed: opmInputs,
      missingInputs: opmMissing,
      unavailableHint: "Requires operating profit and revenue.",
    }),
    metric({
      label: "PAT",
      value: pat,
      unit: " Cr",
      formula: "Latest extracted profit after tax",
      inputsUsed: pat === null ? [] : [`PAT = ${describeAmount(pat)}`],
      missingInputs: pat === null ? ["PAT / net profit"] : [],
    }),
    metric({
      label: "PAT margin",
      value: computeMargin(pat, revenue),
      unit: "%",
      formula: "PAT / revenue",
      inputsUsed:
        pat !== null && revenue !== null
          ? [`PAT = ${describeAmount(pat)}`, `Revenue = ${describeAmount(revenue)}`]
          : [],
      missingInputs: [
        ...(pat === null ? ["PAT"] : []),
        ...(revenue === null ? ["Revenue"] : []),
      ],
      unavailableHint: "Requires PAT and revenue.",
    }),
    metric({
      label: "PAT growth",
      value: patGrowth.value,
      unit: "%",
      formula: "(Current PAT / Previous PAT) − 1",
      inputsUsed: patGrowth.inputsUsed,
      missingInputs: patGrowth.missingInputs,
    }),
    metric({
      label: "ROE",
      value: roe,
      unit: "%",
      formula: "Extracted ROE, or PAT / average equity",
      inputsUsed: roeInputs,
      missingInputs: roeMissing,
      unavailableHint: "Requires PAT and shareholder equity.",
    }),
    metric({
      label: "ROCE",
      value: roce,
      unit: "%",
      formula: "Extracted ROCE, or EBIT / capital employed",
      inputsUsed: roceInputs,
      missingInputs: roceMissing,
      unavailableHint: "Requires operating profit and capital employed.",
    }),
    metric({
      label: "Debt",
      value: debt,
      unit: " Cr",
      formula: "Latest extracted total debt",
      inputsUsed: debt === null ? [] : [`Total debt = ${describeAmount(debt)}`],
      missingInputs: debt === null ? ["Total debt"] : [],
      unavailableHint: "Requires balance-sheet total debt.",
    }),
    metric({
      label: "Debt-to-equity",
      value: debtEquity,
      unit: "x",
      formula: "Extracted D/E, or total debt / equity",
      inputsUsed: deInputs,
      missingInputs: deMissing,
      unavailableHint: "Requires total debt and shareholder equity.",
    }),
    metric({
      label: "Interest coverage",
      value: interestCoverage,
      unit: "x",
      formula: "Extracted coverage, or EBIT / (EBIT − PBT)",
      inputsUsed: icInputs,
      missingInputs: icMissing,
      unavailableHint: "Requires EBIT and finance cost.",
    }),
    metric({
      label: "Free cash flow",
      value: fcf,
      unit: " Cr",
      formula: "Extracted FCF, or CFO − capex",
      inputsUsed: fcfInputs,
      missingInputs: fcfMissing,
    }),
  ];

  const growthMetrics: LongTermMetric[] = [
    metric({
      label: "Historical revenue CAGR",
      value: revenueCagr.value,
      unit: "%",
      formula: "(Last revenue / First revenue)^(1/n) − 1",
      inputsUsed: revenueCagr.inputsUsed,
      missingInputs: revenueCagr.missingInputs,
    }),
    metric({
      label: "Historical earnings CAGR",
      value: earningsCagr.value,
      unit: "%",
      formula: "(Last PAT / First PAT)^(1/n) − 1",
      inputsUsed: earningsCagr.inputsUsed,
      missingInputs: earningsCagr.missingInputs,
    }),
    metric({
      label: "EPS growth",
      value: epsGrowth.value,
      unit: "%",
      formula: "(Current EPS / Previous EPS) − 1",
      inputsUsed: epsGrowth.inputsUsed,
      missingInputs: epsGrowth.missingInputs,
      unavailableHint: "Requires EPS in at least two periods.",
    }),
    metric({
      label: "Latest operating margin",
      value: operatingMargin,
      unit: "%",
      formula: "Same as Financial Strength operating margin",
      inputsUsed: opmInputs,
      missingInputs: opmMissing,
    }),
    metric({
      label: "Operating margin change",
      value:
        latestOpm !== null && priorOpm !== null ? latestOpm - priorOpm : null,
      unit: " pp",
      formula: "Latest OPM − prior OPM",
      inputsUsed:
        latestOpm !== null && priorOpm !== null
          ? [
              `Latest OPM = ${describeAmount(latestOpm, "%")}`,
              `Prior OPM = ${describeAmount(priorOpm, "%")}`,
            ]
          : latestOpm !== null
            ? [`Latest OPM = ${describeAmount(latestOpm, "%")}`]
            : [],
      missingInputs:
        latestOpm !== null && priorOpm !== null
          ? []
          : [
              ...(latestOpm === null ? ["Latest operating margin"] : []),
              ...(priorOpm === null ? ["Prior-period operating margin"] : []),
            ],
    }),
    metric({
      label: "ROCE trend",
      value: roceTrend.value,
      unit: "%",
      formula: "(Current ROCE / Previous ROCE) − 1",
      inputsUsed: roceTrend.inputsUsed,
      missingInputs: roceTrend.missingInputs,
      unavailableHint: "Requires extracted ROCE in at least two periods.",
    }),
    metric({
      label: "Capital expenditure",
      value: capex,
      unit: " Cr",
      formula: "Latest extracted capex",
      inputsUsed: capex === null ? [] : [`Capex = ${describeAmount(capex)}`],
      missingInputs: capex === null ? ["Capital expenditure"] : [],
      unavailableHint: "Requires cash-flow capital expenditure.",
    }),
    metric({
      label: "Free-cash-flow CAGR",
      value: fcfCagr.value,
      unit: "%",
      formula: "CAGR of FCF or CFO − capex across detected periods",
      inputsUsed: fcfCagr.inputsUsed,
      missingInputs: fcfCagr.missingInputs,
    }),
    metric({
      label: "Asset growth (CAGR)",
      value: assetCagr.value,
      unit: "%",
      formula: "CAGR of total assets",
      inputsUsed: assetCagr.inputsUsed,
      missingInputs: assetCagr.missingInputs,
    }),
  ];

  const valuationMetrics: LongTermMetric[] = [
    metric({
      label: "P/E",
      value: pe,
      formula: "Extracted P/E, or market price / EPS",
      inputsUsed: peInputs,
      missingInputs: peMissing,
    }),
    metric({
      label: "P/B",
      value: pb,
      formula: "Extracted P/B, or market cap / equity",
      inputsUsed: pbInputs,
      missingInputs: pbMissing,
    }),
    metric({
      label: "EV/EBITDA",
      value: evEbitda,
      unit: "x",
      formula: "(Market cap + debt − cash) / EBITDA",
      inputsUsed: evEbitdaInputs,
      missingInputs: evEbitdaMissing,
    }),
    metric({
      label: "PEG",
      value: peg,
      unit: "x",
      formula: "P/E / earnings growth %",
      inputsUsed: pegInputs,
      missingInputs: pegMissing,
    }),
  ];

  let sustainableGrowth =
    "Sustainable growth cannot be assessed from the uploaded fields.";
  if (roe !== null && revenueCagr.value !== null) {
    if (revenueCagr.value > 0 && roe >= 12) {
      sustainableGrowth = `Revenue CAGR of ${revenueCagr.value.toFixed(1)}% alongside ROE of ${roe.toFixed(1)}% is consistent with a durable compounding profile, subject to reinvestment quality.`;
    } else if (revenueCagr.value <= 0) {
      sustainableGrowth = `Historical revenue CAGR is ${revenueCagr.value.toFixed(1)}%, which weakens the long-term compounding case even if ROE is ${roe.toFixed(1)}%.`;
    } else {
      sustainableGrowth = `Growth is present (revenue CAGR ${revenueCagr.value.toFixed(1)}%) but ROE of ${roe.toFixed(1)}% is modest.`;
    }
  } else if (revenueCagr.value !== null) {
    sustainableGrowth = `Historical revenue CAGR is ${revenueCagr.value.toFixed(1)}%. ROE could not be derived (need PAT and equity).`;
  } else if (roe !== null) {
    sustainableGrowth = `ROE of ${roe.toFixed(1)}% is available, but at least two revenue observations are required for growth history.`;
  } else if (revenueGrowth.value !== null) {
    sustainableGrowth = `Period-over-period revenue growth is ${revenueGrowth.value.toFixed(1)}%. CAGR and ROE still need additional history or equity.`;
  }

  const qualityPillars: QualityPillar[] = [
    scoreProfitability(roe, roce, operatingMargin, netMargin),
    scoreCashConversion(pat, fcf, cfo),
    scoreBalanceSheet(debtEquity, interestCoverage, cash, currentRatio),
    scoreCapitalEfficiency(roce, revenueCagr.value, assetCagr.value),
    scoreEarningsConsistency(periods),
  ];

  const scoredPillars = qualityPillars.filter((pillar) => pillar.score !== null);
  const overallScore =
    scoredPillars.length === 0
      ? null
      : Math.round(
          (scoredPillars.reduce((sum, pillar) => sum + (pillar.score ?? 0), 0) /
            (scoredPillars.length * 20)) *
            100,
        );

  const risks: RiskItem[] = [];

  if (debtEquity === null) {
    risks.push({
      label: "Leverage risk",
      level: "Unavailable",
      detail: "Need total debt and equity, or an extracted D/E ratio.",
    });
  } else if (debtEquity > 1.5) {
    risks.push({
      label: "Leverage risk",
      level: "High",
      detail: `Debt-to-equity of ${debtEquity.toFixed(2)}x is elevated.`,
    });
  } else if (debtEquity > 0.8) {
    risks.push({
      label: "Leverage risk",
      level: "Moderate",
      detail: `Debt-to-equity of ${debtEquity.toFixed(2)}x warrants monitoring.`,
    });
  } else {
    risks.push({
      label: "Leverage risk",
      level: "Low",
      detail: `Debt-to-equity of ${debtEquity.toFixed(2)}x appears conservative.`,
    });
  }

  if (currentRatio === null && cash === null) {
    risks.push({
      label: "Liquidity risk",
      level: "Unavailable",
      detail: "Need current assets and current liabilities, or cash.",
    });
  } else if (currentRatio !== null && currentRatio < 1) {
    risks.push({
      label: "Liquidity risk",
      level: "High",
      detail: `Current ratio of ${currentRatio.toFixed(2)}x is below 1.`,
    });
  } else if (currentRatio !== null && currentRatio < 1.2) {
    risks.push({
      label: "Liquidity risk",
      level: "Moderate",
      detail: `Current ratio of ${currentRatio.toFixed(2)}x leaves limited cover.`,
    });
  } else {
    risks.push({
      label: "Liquidity risk",
      level: "Low",
      detail:
        currentRatio !== null
          ? `Current ratio of ${currentRatio.toFixed(2)}x indicates adequate cover.`
          : "Cash is present; current ratio could not be computed.",
    });
  }

  const profits = observations(
    periods,
    (period) => period.incomeStatement.netProfit,
  ).map((entry) => entry.value);
  if (profits.length < 2) {
    risks.push({
      label: "Earnings volatility",
      level: "Unavailable",
      detail: "Need at least two PAT observations.",
    });
  } else {
    const mean = profits.reduce((sum, value) => sum + value, 0) / profits.length;
    const variance =
      profits.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
      profits.length;
    const cv = mean === 0 ? null : Math.sqrt(variance) / Math.abs(mean);
    if (cv === null) {
      risks.push({
        label: "Earnings volatility",
        level: "Unavailable",
        detail: "PAT mean is zero, so volatility cannot be scaled.",
      });
    } else if (cv > 0.6) {
      risks.push({
        label: "Earnings volatility",
        level: "High",
        detail: "PAT has been highly variable across detected periods.",
      });
    } else if (cv > 0.3) {
      risks.push({
        label: "Earnings volatility",
        level: "Moderate",
        detail: "PAT shows noticeable variability.",
      });
    } else {
      risks.push({
        label: "Earnings volatility",
        level: "Low",
        detail: "PAT has been relatively stable.",
      });
    }
  }

  if (latestOpm === null || priorOpm === null) {
    risks.push({
      label: "Margin compression",
      level: "Unavailable",
      detail: "Need operating margin in two periods (OPM, or operating profit and revenue).",
    });
  } else if (latestOpm < priorOpm - 2) {
    risks.push({
      label: "Margin compression",
      level: "High",
      detail: `Operating margin declined from ${priorOpm.toFixed(1)}% to ${latestOpm.toFixed(1)}%.`,
    });
  } else if (latestOpm < priorOpm) {
    risks.push({
      label: "Margin compression",
      level: "Moderate",
      detail: `Operating margin eased from ${priorOpm.toFixed(1)}% to ${latestOpm.toFixed(1)}%.`,
    });
  } else {
    risks.push({
      label: "Margin compression",
      level: "Low",
      detail: `Operating margin held or improved (${latestOpm.toFixed(1)}%).`,
    });
  }

  if (fcf !== null && fcf < 0) {
    risks.push({
      label: "Cash-flow risk",
      level: "High",
      detail: "Latest free cash flow is negative.",
    });
  } else if (fcf === null && cfo === null) {
    risks.push({
      label: "Cash-flow risk",
      level: "Unavailable",
      detail: "Cash-flow strength cannot be assessed from the uploaded documents.",
    });
  } else if (interestCoverage !== null && interestCoverage < 2) {
    risks.push({
      label: "Coverage risk",
      level: "High",
      detail: `Interest coverage of ${interestCoverage.toFixed(1)}x is thin.`,
    });
  }

  if (qualitative.risks) {
    const text = qualitative.risks.toLowerCase();
    if (text.includes("concentration") || text.includes("customer")) {
      risks.push({
        label: "Customer concentration",
        level: "Moderate",
        detail: qualitative.risks,
      });
    }
    if (text.includes("cyclical") || text.includes("cycle")) {
      risks.push({
        label: "Cyclical risk",
        level: "Moderate",
        detail: qualitative.risks,
      });
    }
    risks.push({
      label: "Industry / disclosed risks",
      level: "Moderate",
      detail: qualitative.risks,
    });
  }

  if (!qualitative.managementGuidance) {
    risks.push({
      label: "Guidance risk",
      level: "Unavailable",
      detail: "Management guidance was not extracted from the uploaded documents.",
    });
  }

  const allMetrics = [
    ...strengthMetrics,
    ...growthMetrics,
    ...valuationMetrics,
  ];
  const availableMetrics = allMetrics.filter((entry) => entry.available).length;
  const coveragePercent = Math.round(
    (availableMetrics / allMetrics.length) * 100,
  );

  const presentRaw = new Set<string>();
  const missingRaw = new Set<string>();
  for (const snapshot of detectedPeriods) {
    for (const field of snapshot.fields) {
      if (field.present) presentRaw.add(field.name);
    }
  }
  for (const field of PERIOD_FIELD_DEFS) {
    if (!presentRaw.has(field.name)) missingRaw.add(field.name);
  }
  if (price !== null) presentRaw.add("Current price");
  else missingRaw.add("Current price");
  if (marketCap !== null) presentRaw.add("Market cap");
  else missingRaw.add("Market cap");
  if (peExtracted !== null) presentRaw.add("P/E (extracted)");
  if (pbExtracted !== null) presentRaw.add("P/B (extracted)");

  const insufficientData =
    overallScore === null || scoredPillars.length < 2 || availableMetrics < 6;

  let classification: LongTermClassification = "INSUFFICIENT DATA";
  if (insufficientData) {
    classification = "INSUFFICIENT DATA";
  } else if (overallScore !== null && overallScore >= 80) {
    classification = "STRONG LONG-TERM";
  } else if (overallScore !== null && overallScore >= 65) {
    classification = "POSITIVE";
  } else if (overallScore !== null && overallScore >= 45) {
    classification = "NEUTRAL";
  } else {
    classification = "CAUTIOUS";
  }

  const highRiskCount = risks.filter((risk) => risk.level === "High").length;
  if (highRiskCount >= 3 && classification === "STRONG LONG-TERM") {
    classification = "POSITIVE";
  }
  if (
    !insufficientData &&
    highRiskCount >= 3 &&
    overallScore !== null &&
    overallScore < 55
  ) {
    classification = "CAUTIOUS";
  }

  const scoreExplanation: string[] = [];
  if (insufficientData) {
    scoreExplanation.push(
      "Insufficient data for a complete long-term assessment.",
    );
    scoreExplanation.push(
      "Available analysis based on uploaded data is shown below. Missing metrics are marked Data unavailable.",
    );
  }
  if (overallScore === null) {
    scoreExplanation.push(
      "An overall score could not be formed because quality pillars lacked sufficient uploaded inputs.",
    );
  } else {
    scoreExplanation.push(
      `Overall score ${overallScore}/100 is the scaled average of ${scoredPillars.length} quality pillar(s) that had enough data.`,
    );
    for (const pillar of qualityPillars) {
      scoreExplanation.push(
        pillar.score === null
          ? `${pillar.label}: ${UNAVAILABLE}. ${pillar.explanation}`
          : `${pillar.label}: ${pillar.score}/${pillar.max}. ${pillar.explanation}`,
      );
    }
  }
  scoreExplanation.push(
    "This is an analytical assessment based only on uploaded financial data. It is not investment advice and is not a guarantee of future returns.",
  );

  const insights: string[] = [];
  if (revenueGrowth.value !== null && revenueGrowth.value > 0) {
    insights.push(
      `Revenue increased by ${revenueGrowth.value.toFixed(1)}%, indicating positive top-line growth.`,
    );
  } else if (revenueGrowth.value !== null && revenueGrowth.value < 0) {
    insights.push(
      `Revenue declined by ${Math.abs(revenueGrowth.value).toFixed(1)}%.`,
    );
  }
  if (patGrowth.value !== null && patGrowth.value > 0) {
    insights.push(
      `PAT increased by ${patGrowth.value.toFixed(1)}%, indicating improving profitability.`,
    );
  } else if (patGrowth.value !== null && patGrowth.value < 0) {
    insights.push(
      `PAT declined by ${Math.abs(patGrowth.value).toFixed(1)}%.`,
    );
  }
  if (ebitdaGrowth.value !== null && ebitdaGrowth.value > 0) {
    insights.push(
      `EBITDA increased by ${ebitdaGrowth.value.toFixed(1)}%.`,
    );
  }
  if (latestOpm !== null && priorOpm !== null && latestOpm > priorOpm) {
    insights.push(
      `EBITDA / operating margin expanded from ${priorOpm.toFixed(1)}% to ${latestOpm.toFixed(1)}%, suggesting improving operating efficiency.`,
    );
  }
  if (debtEquity !== null && debtEquity > 1.5) {
    insights.push("Leverage appears elevated and should be monitored.");
  }
  if (fcf === null && cfo === null) {
    insights.push(
      "Cash-flow strength cannot be assessed from the uploaded documents.",
    );
  }
  if (qualitative.managementGuidance) {
    insights.push("Management guidance was extracted from the uploaded documents.");
  }

  const qualitativeItems: QualitativeItem[] = [
    {
      label: "Management commentary / guidance",
      available: Boolean(qualitative.managementGuidance),
      detail: qualitative.managementGuidance ?? "Data unavailable",
    },
    {
      label: "Business / industry outlook",
      available: Boolean(qualitative.businessOutlook),
      detail: qualitative.businessOutlook ?? "Data unavailable",
    },
    {
      label: "Growth drivers",
      available: Boolean(qualitative.growthDrivers),
      detail: qualitative.growthDrivers ?? "Data unavailable",
    },
    {
      label: "Expansion / capacity plans",
      available: Boolean(qualitative.expansionPlans),
      detail: qualitative.expansionPlans ?? "Data unavailable",
    },
    {
      label: "Capex plans",
      available: Boolean(qualitative.capexPlans),
      detail: qualitative.capexPlans ?? "Data unavailable",
    },
    {
      label: "Disclosed risks",
      available: Boolean(qualitative.risks),
      detail: qualitative.risks ?? "Data unavailable",
    },
    {
      label: "Competitive advantages",
      available: false,
      detail: "Data unavailable",
    },
    {
      label: "Business model",
      available: Boolean(qualitative.businessOutlook || qualitative.growthDrivers),
      detail:
        qualitative.businessOutlook ??
        qualitative.growthDrivers ??
        "Data unavailable",
    },
  ];

  const companyName = data.company ?? "the uploaded company";
  const thesis = {
    bull:
      (revenueCagr.value ?? revenueGrowth.value) !== null &&
      (revenueCagr.value ?? revenueGrowth.value)! > 8 &&
      (roe === null || roe >= 12)
        ? `${companyName} could compound if observed revenue growth continues and returns on capital remain adequate.`
        : `The bull case requires durable revenue growth and improving returns; several of those signals are incomplete or mixed in the uploaded file set.`,
    base: `The base case is that ${companyName} tracks the currently observed fundamentals — classification ${classification} on a ${overallScore === null ? "partial" : `${overallScore}/100`} quality score — without assuming multiple expansion.`,
    bear:
      highRiskCount > 0
        ? `The bear case is that identified risks (${risks
            .filter((risk) => risk.level === "High")
            .map((risk) => risk.label.toLowerCase())
            .join(", ") || "softer growth and weaker cash conversion"}) persist and erode long-term equity value.`
        : "The bear case is slower growth, thinner margins, or weaker cash conversion than the limited history currently shows.",
    catalysts: [
      (revenueCagr.value ?? revenueGrowth.value) !== null &&
      (revenueCagr.value ?? revenueGrowth.value)! > 0
        ? "Continuation of historical revenue compounding"
        : "A second revenue period so growth can be measured",
      fcf !== null && fcf > 0
        ? "Sustained positive free cash flow"
        : "CFO and capex so cash conversion can be completed",
      roe !== null && roe >= 12
        ? "Maintenance of double-digit ROE"
        : "Equity alongside PAT so ROE can be confirmed",
    ],
    keyRisks: risks
      .filter((risk) => risk.level === "High" || risk.level === "Moderate")
      .map((risk) => `${risk.label}: ${risk.detail}`),
    monitor: [
      "Revenue and PAT trajectory versus the uploaded history",
      "Operating and net margins for compression",
      "Debt-to-equity and interest coverage",
      "Free cash flow versus reported profit",
      "P/E, P/B, and EV/EBITDA when market data is present",
    ],
  };

  if (thesis.keyRisks.length === 0) {
    thesis.keyRisks.push(
      "No moderate or high financial risks could be confirmed from available fields; incompleteness itself is a monitoring item.",
    );
  }

  return {
    company: data.company,
    periodsAvailable: periods.length,
    latestPeriod: latest,
    priorPeriod: prior,
    marketData: data.marketData,
    detectedPeriods,
    strengthMetrics,
    growthMetrics,
    valuationMetrics,
    sustainableGrowth,
    qualityPillars,
    risks,
    overallScore,
    classification,
    insufficientData,
    scoreExplanation,
    insights,
    qualitativeItems,
    thesis,
    chartData: {
      revenueByPeriod: chartSeries(
        periods,
        (period) => period.incomeStatement.revenue,
      ),
      profitByPeriod: chartSeries(
        periods,
        (period) => period.incomeStatement.netProfit,
      ),
      marginTrend: chronological(periods).map((period) => ({
        label: periodLabel(period),
        operating: operatingMarginOf(period),
        net: netMarginOf(period),
      })),
      debtEquityByPeriod: chartSeries(periods, debtEquityOf),
      cashFlowByPeriod: chartSeries(periods, (period) => {
        if (period.cashFlow.freeCashFlow !== null) return period.cashFlow.freeCashFlow;
        return period.cashFlow.operatingCashFlow;
      }),
    },
    dataCoverage: {
      availableMetrics,
      totalMetrics: allMetrics.length,
      coveragePercent,
      presentRawFields: [...presentRaw],
      missingRawFields: [...missingRaw],
    },
  };
}
