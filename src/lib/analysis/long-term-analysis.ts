import type {
  FinancialValue,
  MarketData,
  NormalizedFinancialData,
  PeriodFinancialData,
} from "@/lib/financial-data-types";

export type LongTermMetric = {
  label: string;
  value: FinancialValue;
  formatted: string;
  unit?: string;
  available: boolean;
};

export type LongTermClassification =
  | "STRONG BUY"
  | "BUY"
  | "HOLD"
  | "AVOID";

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
  strengthMetrics: LongTermMetric[];
  growthMetrics: LongTermMetric[];
  valuationMetrics: LongTermMetric[];
  sustainableGrowth: string;
  qualityPillars: QualityPillar[];
  risks: RiskItem[];
  overallScore: number | null;
  classification: LongTermClassification;
  scoreExplanation: string[];
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
  };
};

const UNAVAILABLE = "Data unavailable";

function formatValue(value: FinancialValue, unit?: string): string {
  if (value === null) return UNAVAILABLE;
  const formatted =
    Math.abs(value) >= 1000
      ? value.toLocaleString(undefined, { maximumFractionDigits: 2 })
      : value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return unit ? `${formatted}${unit}` : formatted;
}

function metric(
  label: string,
  value: FinancialValue,
  unit?: string,
): LongTermMetric {
  return {
    label,
    value,
    formatted: formatValue(value, unit),
    unit,
    available: value !== null,
  };
}

function periodLabel(period: PeriodFinancialData): string {
  return period.period ?? (period.year ? String(period.year) : "Unknown");
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

function periodGrowth(
  current: FinancialValue,
  prior: FinancialValue,
): FinancialValue {
  if (current === null || prior === null || prior === 0) return null;
  return ((current - prior) / Math.abs(prior)) * 100;
}

function freeCashFlowOf(period: PeriodFinancialData): FinancialValue {
  if (period.cashFlow.freeCashFlow !== null) return period.cashFlow.freeCashFlow;
  const ocf = period.cashFlow.operatingCashFlow;
  const capex = period.cashFlow.capitalExpenditure;
  if (ocf === null || capex === null) return null;
  return capex < 0 ? ocf + capex : ocf - capex;
}

function operatingMarginOf(period: PeriodFinancialData): FinancialValue {
  return (
    period.ratios.operatingMargin ??
    computeMargin(
      period.incomeStatement.ebitda ?? period.incomeStatement.ebit,
      period.incomeStatement.revenue,
    )
  );
}

function netMarginOf(period: PeriodFinancialData): FinancialValue {
  return (
    period.ratios.netProfitMargin ??
    computeMargin(
      period.incomeStatement.netProfit,
      period.incomeStatement.revenue,
    )
  );
}

function chronological(periods: PeriodFinancialData[]): PeriodFinancialData[] {
  return [...periods].sort((a, b) => (a.year ?? 0) - (b.year ?? 0));
}

function newestFirst(periods: PeriodFinancialData[]): PeriodFinancialData[] {
  return [...periods].sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
}

function seriesCagr(
  periods: PeriodFinancialData[],
  pick: (period: PeriodFinancialData) => FinancialValue,
): FinancialValue {
  const points = chronological(periods)
    .map((period) => ({ year: period.year, value: pick(period) }))
    .filter(
      (point): point is { year: number | null; value: number } =>
        point.value !== null,
    );

  if (points.length < 2) return null;

  const first = points[0]!;
  const last = points[points.length - 1]!;
  if (first.value === 0) return null;

  const yearSpan =
    first.year !== null && last.year !== null && last.year !== first.year
      ? last.year - first.year
      : points.length - 1;

  if (yearSpan <= 0) return null;

  if (first.value > 0 && last.value > 0) {
    return (Math.pow(last.value / first.value, 1 / yearSpan) - 1) * 100;
  }

  return ((last.value - first.value) / Math.abs(first.value)) * 100;
}

function chartSeries(
  periods: PeriodFinancialData[],
  pick: (period: PeriodFinancialData) => FinancialValue,
): { label: string; value: number }[] {
  return chronological(periods)
    .filter((period) => pick(period) !== null)
    .map((period) => ({
      label: periodLabel(period),
      value: pick(period) as number,
    }));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
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
        "ROE, ROCE, and margins were not available in the uploaded data.",
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

  const score = clamp(Math.round((points / 20) * 20), 0, 20);

  return {
    key: "profitability",
    label: "Profitability",
    score,
    max: 20,
    explanation:
      roe !== null
        ? `Latest ROE is ${roe.toFixed(1)}% with operating margin ${operatingMargin === null ? UNAVAILABLE : `${operatingMargin.toFixed(1)}%`}.`
        : `Operating margin is ${operatingMargin === null ? UNAVAILABLE : `${operatingMargin.toFixed(1)}%`}; ROE was not extracted.`,
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
      explanation: "Cash-flow and PAT figures were not available.",
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
    explanation = `Free cash flow is ${conversion.toFixed(0)}% of PAT based on uploaded statements.`;
  } else if (ocf !== null) {
    score = ocf > 0 ? 12 : 4;
    explanation =
      ocf > 0
        ? "Operating cash flow is positive, but free-cash-flow conversion versus PAT could not be completed."
        : "Operating cash flow is negative in the latest available period.";
  } else if (fcf !== null) {
    score = fcf > 0 ? 12 : 4;
    explanation =
      fcf > 0
        ? "Free cash flow is positive in the latest period."
        : "Free cash flow is negative in the latest period.";
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
      explanation: "Leverage, coverage, and liquidity fields were not extracted.",
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
        ? `Debt-to-equity is ${debtEquity.toFixed(2)}x${interestCoverage !== null ? ` with interest coverage of ${interestCoverage.toFixed(1)}x` : ""}.`
        : "Leverage ratio was not available; scoring uses coverage and liquidity where present.",
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
      explanation: "ROCE and asset-growth inputs were not available.",
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
        ? `ROCE of ${roce.toFixed(1)}% is the primary capital-efficiency signal from uploaded data.`
        : "ROCE was unavailable; efficiency is inferred from revenue versus asset growth where possible.",
  };
}

function scoreEarningsConsistency(
  periods: PeriodFinancialData[],
): QualityPillar {
  const profits = chronological(periods)
    .map((period) => period.incomeStatement.netProfit)
    .filter((value): value is number => value !== null);

  if (profits.length < 2) {
    return {
      key: "earnings-consistency",
      label: "Earnings consistency",
      score: null,
      max: 20,
      explanation: "At least two PAT observations are required to judge consistency.",
    };
  }

  const growthRates: number[] = [];
  for (let index = 1; index < profits.length; index += 1) {
    const prior = profits[index - 1]!;
    const current = profits[index]!;
    if (prior === 0) continue;
    growthRates.push(((current - prior) / Math.abs(prior)) * 100);
  }

  const positiveYears = profits.filter((value) => value > 0).length;
  const positiveShare = positiveYears / profits.length;
  const negativeGrowth = growthRates.filter((value) => value < 0).length;

  let score = Math.round(positiveShare * 12);
  if (growthRates.length > 0 && negativeGrowth === 0) score += 8;
  else if (negativeGrowth <= 1) score += 4;

  return {
    key: "earnings-consistency",
    label: "Earnings consistency",
    score: clamp(score, 0, 20),
    max: 20,
    explanation: `${positiveYears} of ${profits.length} observed periods were profitable${growthRates.length > 0 ? `; PAT declined in ${negativeGrowth} interval(s)` : ""}.`,
  };
}

export function analyzeLongTermInvestment(
  data: NormalizedFinancialData | null,
): LongTermAnalysis | null {
  if (!data || data.periods.length === 0) return null;

  const sortedNewest = newestFirst(data.periods);
  const latest = sortedNewest[0] ?? null;
  const prior = sortedNewest[1] ?? null;

  const revenue = latest?.incomeStatement.revenue ?? null;
  const priorRevenue = prior?.incomeStatement.revenue ?? null;
  const pat = latest?.incomeStatement.netProfit ?? null;
  const priorPat = prior?.incomeStatement.netProfit ?? null;
  const ebitda = latest?.incomeStatement.ebitda ?? null;
  const eps = latest?.incomeStatement.eps ?? null;
  const priorEps = prior?.incomeStatement.eps ?? null;
  const equity = latest?.balanceSheet.totalEquity ?? null;
  const debt = latest?.balanceSheet.totalDebt ?? null;
  const cash = latest?.balanceSheet.cash ?? null;
  const currentAssets = latest?.balanceSheet.currentAssets ?? null;
  const currentLiabilities = latest?.balanceSheet.currentLiabilities ?? null;
  const ocf = latest?.cashFlow.operatingCashFlow ?? null;
  const fcf = latest ? freeCashFlowOf(latest) : null;
  const roe = latest?.ratios.roe ?? null;
  const roce = latest?.ratios.roce ?? null;
  const debtEquity = latest?.ratios.debtToEquity ??
    (debt !== null && equity !== null && equity !== 0 ? debt / equity : null);
  const interestCoverage = latest?.ratios.interestCoverage ?? null;
  const operatingMargin = latest ? operatingMarginOf(latest) : null;
  const netMargin = latest ? netMarginOf(latest) : null;
  const priorOperatingMargin = prior ? operatingMarginOf(prior) : null;
  const currentRatio =
    currentAssets !== null &&
    currentLiabilities !== null &&
    currentLiabilities !== 0
      ? currentAssets / currentLiabilities
      : null;

  const revenueGrowth = periodGrowth(revenue, priorRevenue);
  const patGrowth = periodGrowth(pat, priorPat);
  const epsGrowth = periodGrowth(eps, priorEps);
  const revenueCagr = seriesCagr(
    data.periods,
    (period) => period.incomeStatement.revenue,
  );
  const earningsCagr = seriesCagr(
    data.periods,
    (period) => period.incomeStatement.netProfit,
  );
  const assetCagr = seriesCagr(
    data.periods,
    (period) => period.balanceSheet.totalAssets,
  );
  const fcfCagr = seriesCagr(data.periods, freeCashFlowOf);

  const pe = data.marketData.pe;
  const pb = data.marketData.pb;
  const marketCap = data.marketData.marketCap;

  let enterpriseValue: FinancialValue = null;
  if (marketCap !== null && debt !== null && cash !== null) {
    enterpriseValue = marketCap + debt - cash;
  }

  const evEbitda =
    enterpriseValue !== null && ebitda !== null && ebitda !== 0
      ? enterpriseValue / ebitda
      : null;

  const growthForPeg = earningsCagr ?? patGrowth ?? epsGrowth;
  const peg =
    pe !== null &&
    pe > 0 &&
    growthForPeg !== null &&
    growthForPeg > 0
      ? pe / growthForPeg
      : null;

  const strengthMetrics: LongTermMetric[] = [
    metric("Revenue", revenue, " Cr"),
    metric("Revenue growth", revenueGrowth, "%"),
    metric("EBITDA", ebitda, " Cr"),
    metric("Operating margin", operatingMargin, "%"),
    metric("PAT", pat, " Cr"),
    metric("PAT growth", patGrowth, "%"),
    metric("ROE", roe, "%"),
    metric("ROCE", roce, "%"),
    metric("Debt-to-equity", debtEquity, "x"),
    metric("Interest coverage", interestCoverage, "x"),
    metric("Free cash flow", fcf, " Cr"),
  ];

  const growthMetrics: LongTermMetric[] = [
    metric("Historical revenue CAGR", revenueCagr, "%"),
    metric("Historical earnings CAGR", earningsCagr, "%"),
    metric("Latest operating margin", operatingMargin, "%"),
    metric(
      "Operating margin change",
      operatingMargin !== null && priorOperatingMargin !== null
        ? operatingMargin - priorOperatingMargin
        : null,
      " pp",
    ),
    metric("Free-cash-flow CAGR", fcfCagr, "%"),
    metric("Asset growth (CAGR)", assetCagr, "%"),
  ];

  const valuationMetrics: LongTermMetric[] = [
    metric("P/E", pe),
    metric("P/B", pb),
    metric("EV/EBITDA", evEbitda, "x"),
    metric("PEG", peg, "x"),
  ];

  let sustainableGrowth =
    "Sustainable growth cannot be assessed from the uploaded fields.";
  if (roe !== null && revenueCagr !== null) {
    if (revenueCagr > 0 && roe >= 12) {
      sustainableGrowth = `Revenue CAGR of ${revenueCagr.toFixed(1)}% alongside ROE of ${roe.toFixed(1)}% is consistent with a durable compounding profile, subject to reinvestment quality.`;
    } else if (revenueCagr <= 0) {
      sustainableGrowth = `Historical revenue CAGR is ${revenueCagr.toFixed(1)}%, which weakens the long-term compounding case even if returns on equity remain ${roe.toFixed(1)}%.`;
    } else {
      sustainableGrowth = `Growth is present (revenue CAGR ${revenueCagr.toFixed(1)}%) but ROE of ${roe.toFixed(1)}% is modest, so internal compounding may be limited.`;
    }
  } else if (revenueCagr !== null) {
    sustainableGrowth = `Historical revenue CAGR is ${revenueCagr.toFixed(1)}%. ROE was not extracted, so sustainability of that growth cannot be confirmed.`;
  } else if (roe !== null) {
    sustainableGrowth = `ROE of ${roe.toFixed(1)}% is available, but multi-period revenue history is insufficient to judge sustainable growth.`;
  }

  const qualityPillars: QualityPillar[] = [
    scoreProfitability(roe, roce, operatingMargin, netMargin),
    scoreCashConversion(pat, fcf, ocf),
    scoreBalanceSheet(debtEquity, interestCoverage, cash, currentRatio),
    scoreCapitalEfficiency(roce, revenueCagr, assetCagr),
    scoreEarningsConsistency(data.periods),
  ];

  const scoredPillars = qualityPillars.filter(
    (pillar) => pillar.score !== null,
  );
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
      detail: "Debt-to-equity could not be calculated from uploaded statements.",
    });
  } else if (debtEquity > 1.5) {
    risks.push({
      label: "Leverage risk",
      level: "High",
      detail: `Debt-to-equity of ${debtEquity.toFixed(2)}x is elevated for a long-term hold.`,
    });
  } else if (debtEquity > 0.8) {
    risks.push({
      label: "Leverage risk",
      level: "Moderate",
      detail: `Debt-to-equity of ${debtEquity.toFixed(2)}x warrants ongoing monitoring.`,
    });
  } else {
    risks.push({
      label: "Leverage risk",
      level: "Low",
      detail: `Debt-to-equity of ${debtEquity.toFixed(2)}x appears conservative on uploaded data.`,
    });
  }

  if (currentRatio === null && cash === null) {
    risks.push({
      label: "Liquidity risk",
      level: "Unavailable",
      detail: "Current assets, current liabilities, and cash were not extracted.",
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
      detail: `Current ratio of ${currentRatio.toFixed(2)}x leaves limited short-term cover.`,
    });
  } else {
    risks.push({
      label: "Liquidity risk",
      level: "Low",
      detail:
        currentRatio !== null
          ? `Current ratio of ${currentRatio.toFixed(2)}x indicates adequate near-term cover.`
          : "Cash is present; a full current ratio could not be computed.",
    });
  }

  const profits = chronological(data.periods)
    .map((period) => period.incomeStatement.netProfit)
    .filter((value): value is number => value !== null);
  if (profits.length < 2) {
    risks.push({
      label: "Earnings volatility",
      level: "Unavailable",
      detail: "Fewer than two PAT observations are available.",
    });
  } else {
    const mean =
      profits.reduce((sum, value) => sum + value, 0) / profits.length;
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
        detail: "PAT has been highly variable across available periods.",
      });
    } else if (cv > 0.3) {
      risks.push({
        label: "Earnings volatility",
        level: "Moderate",
        detail: "PAT shows noticeable variability across uploaded periods.",
      });
    } else {
      risks.push({
        label: "Earnings volatility",
        level: "Low",
        detail: "PAT has been relatively stable across available periods.",
      });
    }
  }

  if (operatingMargin === null || priorOperatingMargin === null) {
    risks.push({
      label: "Margin compression",
      level: "Unavailable",
      detail: "Operating margin is missing for one or more periods.",
    });
  } else if (operatingMargin < priorOperatingMargin - 2) {
    risks.push({
      label: "Margin compression",
      level: "High",
      detail: `Operating margin declined from ${priorOperatingMargin.toFixed(1)}% to ${operatingMargin.toFixed(1)}%.`,
    });
  } else if (operatingMargin < priorOperatingMargin) {
    risks.push({
      label: "Margin compression",
      level: "Moderate",
      detail: `Operating margin eased from ${priorOperatingMargin.toFixed(1)}% to ${operatingMargin.toFixed(1)}%.`,
    });
  } else {
    risks.push({
      label: "Margin compression",
      level: "Low",
      detail: `Operating margin held or improved versus the prior available period (${operatingMargin.toFixed(1)}%).`,
    });
  }

  if (fcf !== null && fcf < 0) {
    risks.push({
      label: "Cash generation",
      level: "High",
      detail: "Latest free cash flow is negative.",
    });
  } else if (interestCoverage !== null && interestCoverage < 2) {
    risks.push({
      label: "Coverage risk",
      level: "High",
      detail: `Interest coverage of ${interestCoverage.toFixed(1)}x is thin.`,
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

  let classification: LongTermClassification = "HOLD";
  if (overallScore === null || scoredPillars.length < 2 || availableMetrics < 6) {
    classification = "HOLD";
  } else if (overallScore >= 80) {
    classification = "STRONG BUY";
  } else if (overallScore >= 65) {
    classification = "BUY";
  } else if (overallScore >= 45) {
    classification = "HOLD";
  } else {
    classification = "AVOID";
  }

  const highRiskCount = risks.filter((risk) => risk.level === "High").length;
  if (highRiskCount >= 3 && classification === "STRONG BUY") {
    classification = "BUY";
  }
  if (highRiskCount >= 3 && overallScore !== null && overallScore < 55) {
    classification = "AVOID";
  }

  const scoreExplanation: string[] = [];
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
  if (availableMetrics < 6) {
    scoreExplanation.push(
      "Limited metric coverage forces a conservative HOLD ceiling until more statement fields are extracted.",
    );
  }
  scoreExplanation.push(
    "This is an analytical assessment based only on uploaded financial data. It is not investment advice and is not a guarantee of future returns.",
  );

  const companyName = data.company ?? "the uploaded company";
  const thesis = {
    bull:
      revenueCagr !== null && revenueCagr > 8 && (roe === null || roe >= 12)
        ? `${companyName} could compound if historical revenue growth of ${revenueCagr.toFixed(1)}% continues and returns on capital remain adequate.`
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
      revenueCagr !== null && revenueCagr > 0
        ? "Continuation of historical revenue compounding"
        : "Clearer multi-year revenue history from additional uploads",
      fcf !== null && fcf > 0
        ? "Sustained positive free cash flow"
        : "Improvement in cash conversion once cash-flow fields are complete",
      roe !== null && roe >= 12
        ? "Maintenance of double-digit ROE"
        : "Evidence of improving capital returns",
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
    periodsAvailable: data.periods.length,
    latestPeriod: latest,
    priorPeriod: prior,
    marketData: data.marketData,
    strengthMetrics,
    growthMetrics,
    valuationMetrics,
    sustainableGrowth,
    qualityPillars,
    risks,
    overallScore,
    classification,
    scoreExplanation,
    thesis,
    chartData: {
      revenueByPeriod: chartSeries(
        data.periods,
        (period) => period.incomeStatement.revenue,
      ),
      profitByPeriod: chartSeries(
        data.periods,
        (period) => period.incomeStatement.netProfit,
      ),
      marginTrend: chronological(data.periods).map((period) => ({
        label: periodLabel(period),
        operating: operatingMarginOf(period),
        net: netMarginOf(period),
      })),
      debtEquityByPeriod: chartSeries(data.periods, (period) => {
        if (period.ratios.debtToEquity !== null) return period.ratios.debtToEquity;
        const periodDebt = period.balanceSheet.totalDebt;
        const periodEquity = period.balanceSheet.totalEquity;
        if (periodDebt === null || periodEquity === null || periodEquity === 0) {
          return null;
        }
        return periodDebt / periodEquity;
      }),
      cashFlowByPeriod: chartSeries(data.periods, (period) => {
        if (period.cashFlow.freeCashFlow !== null) return period.cashFlow.freeCashFlow;
        return period.cashFlow.operatingCashFlow;
      }),
    },
    dataCoverage: {
      availableMetrics,
      totalMetrics: allMetrics.length,
      coveragePercent,
    },
  };
}
