import type {
  FinancialValue,
  MarketData,
  NormalizedFinancialData,
  PeriodFinancialData,
} from "@/lib/financial-data-types";
import {
  comparablePeriods,
  extractQuarter,
  inferPeriodType,
} from "@/lib/financial-data-types";

export type MetricValue = {
  label: string;
  value: FinancialValue;
  formatted: string;
  unit?: string;
  available: boolean;
};

export type GrowthMetric = MetricValue & {
  priorValue: FinancialValue;
  growthPercent: FinancialValue;
};

export type AssessmentRating = "Buy" | "Hold" | "Avoid";

export type ShortTermAnalysis = {
  company: string | null;
  periodsAvailable: number;
  latestPeriod: PeriodFinancialData | null;
  priorPeriod: PeriodFinancialData | null;
  marketData: MarketData;
  valuationMetrics: MetricValue[];
  growthMetrics: GrowthMetric[];
  profitabilityMetrics: MetricValue[];
  leverageMetrics: MetricValue[];
  ownershipMetrics: MetricValue[];
  positives: string[];
  risks: string[];
  thesis: string;
  assessment: AssessmentRating;
  assessmentReasoning: string[];
  chartData: {
    revenueByPeriod: { label: string; value: number }[];
    profitByPeriod: { label: string; value: number }[];
    marginTrend: { label: string; operating: number | null; net: number | null }[];
  };
  dataCoverage: {
    totalMetrics: number;
    availableMetrics: number;
    coveragePercent: number;
  };
};

function formatValue(
  value: FinancialValue,
  unit?: string,
): string {
  if (value === null) return "Not available";
  const formatted = Math.abs(value) >= 1000
    ? value.toLocaleString(undefined, { maximumFractionDigits: 2 })
    : value.toLocaleString(undefined, { maximumFractionDigits: 4 });
  return unit ? `${formatted}${unit}` : formatted;
}

function metric(
  label: string,
  value: FinancialValue,
  unit?: string,
): MetricValue {
  return {
    label,
    value,
    formatted: formatValue(value, unit),
    unit,
    available: value !== null,
  };
}

function growth(
  label: string,
  current: FinancialValue,
  prior: FinancialValue,
  unit?: string,
): GrowthMetric {
  let growthPercent: FinancialValue = null;
  if (current !== null && prior !== null && prior !== 0) {
    growthPercent = ((current - prior) / Math.abs(prior)) * 100;
  }

  return {
    label,
    value: current,
    priorValue: prior,
    growthPercent,
    formatted: formatValue(current, unit),
    unit,
    available: current !== null,
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

export function analyzeShortTermInvestment(
  data: NormalizedFinancialData | null,
): ShortTermAnalysis | null {
  if (!data || data.periods.length === 0) return null;

  const quarterly = comparablePeriods(data.periods, "quarterly").filter(
    (period) => inferPeriodType(period) === "quarterly",
  );
  const pool =
    quarterly.length >= 2
      ? quarterly
      : comparablePeriods(data.periods, "annual");
  const sorted = [...pool].sort((a, b) => {
    const yearDiff = (b.year ?? 0) - (a.year ?? 0);
    if (yearDiff !== 0) return yearDiff;
    return (extractQuarter(b.period) ?? "").localeCompare(
      extractQuarter(a.period) ?? "",
    );
  });
  const latest = sorted[0] ?? null;
  const prior = latest
    ? sorted.find((period) => {
        if (period === latest) return false;
        if (inferPeriodType(latest) === "quarterly") {
          return (
            extractQuarter(period.period) === extractQuarter(latest.period) &&
            (period.year ?? 0) < (latest.year ?? 0)
          );
        }
        return (period.year ?? 0) < (latest.year ?? 0);
      }) ?? sorted[1] ?? null
    : null;

  const valuationMetrics: MetricValue[] = [
    metric("Current Price", data.marketData.currentPrice, " ₹"),
    metric("Market Cap", data.marketData.marketCap, " Cr"),
    metric("P/E Ratio", data.marketData.pe),
    metric("P/B Ratio", data.marketData.pb),
    metric("Dividend Yield", data.marketData.dividendYield, "%"),
  ];

  const growthMetrics: GrowthMetric[] = [
    growth(
      "Revenue",
      latest?.incomeStatement.revenue ?? null,
      prior?.incomeStatement.revenue ?? null,
      " Cr",
    ),
    growth(
      "Net Profit / PAT",
      latest?.incomeStatement.netProfit ?? null,
      prior?.incomeStatement.netProfit ?? null,
      " Cr",
    ),
    growth(
      "EPS",
      latest?.incomeStatement.eps ?? null,
      prior?.incomeStatement.eps ?? null,
    ),
  ];

  const operatingMargin =
    latest?.ratios.operatingMargin ??
    computeMargin(
      latest?.incomeStatement.ebitda ?? latest?.incomeStatement.ebit ?? null,
      latest?.incomeStatement.revenue ?? null,
    );

  const netMargin =
    latest?.ratios.netProfitMargin ??
    computeMargin(
      latest?.incomeStatement.netProfit ?? null,
      latest?.incomeStatement.revenue ?? null,
    );

  const profitabilityMetrics: MetricValue[] = [
    metric("Operating Margin", operatingMargin, "%"),
    metric("Net Profit Margin", netMargin, "%"),
    metric("ROE", latest?.ratios.roe ?? null, "%"),
    metric("ROCE", latest?.ratios.roce ?? null, "%"),
  ];

  const leverageMetrics: MetricValue[] = [
    metric("Debt / Equity", latest?.ratios.debtToEquity ?? null),
    metric("Interest Coverage", latest?.ratios.interestCoverage ?? null),
    metric("Total Debt", latest?.balanceSheet.totalDebt ?? null, " Cr"),
    metric("Cash", latest?.balanceSheet.cash ?? null, " Cr"),
  ];

  const ownershipMetrics: MetricValue[] = [
    metric("Promoter Holding", data.marketData.promoterHolding, "%"),
    metric(
      "Promoter Holding Change",
      data.marketData.promoterHoldingChange,
      "%",
    ),
  ];

  const allMetrics = [
    ...valuationMetrics,
    ...growthMetrics,
    ...profitabilityMetrics,
    ...leverageMetrics,
    ...ownershipMetrics,
  ];
  const availableMetrics = allMetrics.filter((m) => m.available).length;

  const positives: string[] = [];
  const risks: string[] = [];

  const revenueGrowth = growthMetrics[0]?.growthPercent;
  if (revenueGrowth !== null && revenueGrowth > 10) {
    positives.push(
      `Revenue grew ${revenueGrowth.toFixed(1)}% versus the prior available period.`,
    );
  } else if (revenueGrowth !== null && revenueGrowth < 0) {
    risks.push(
      `Revenue declined ${Math.abs(revenueGrowth).toFixed(1)}% versus the prior period.`,
    );
  }

  const epsGrowth = growthMetrics[2]?.growthPercent;
  if (epsGrowth !== null && epsGrowth > 10) {
    positives.push(
      `EPS improved ${epsGrowth.toFixed(1)}% year-over-year based on uploaded data.`,
    );
  } else if (epsGrowth !== null && epsGrowth < 0) {
    risks.push(`EPS fell ${Math.abs(epsGrowth).toFixed(1)}% versus prior period.`);
  }

  const roe = latest?.ratios.roe;
  if (roe !== null && roe >= 15) {
    positives.push(`ROE of ${roe}% indicates strong return on equity.`);
  } else if (roe !== null && roe < 10) {
    risks.push(`ROE of ${roe}% is below typical quality thresholds.`);
  }

  const roce = latest?.ratios.roce;
  if (roce !== null && roce >= 15) {
    positives.push(`ROCE of ${roce}% shows efficient capital employment.`);
  } else if (roce !== null && roce < 10) {
    risks.push(`ROCE of ${roce}% suggests modest capital efficiency.`);
  }

  const debtEquity = latest?.ratios.debtToEquity;
  if (debtEquity !== null && debtEquity > 1.5) {
    risks.push(`Elevated debt-to-equity ratio of ${debtEquity}.`);
  } else if (debtEquity !== null && debtEquity < 0.5) {
    positives.push(`Conservative leverage with debt-to-equity of ${debtEquity}.`);
  }

  const promoter = data.marketData.promoterHolding;
  if (promoter !== null && promoter >= 50) {
    positives.push(`Promoter holding at ${promoter}% signals aligned ownership.`);
  } else if (promoter !== null && promoter < 30) {
    risks.push(`Low promoter holding of ${promoter}% may indicate weaker alignment.`);
  }

  const promoterChange = data.marketData.promoterHoldingChange;
  if (promoterChange !== null && promoterChange < -2) {
    risks.push(
      `Promoter holding decreased by ${Math.abs(promoterChange)}% — monitor closely.`,
    );
  } else if (promoterChange !== null && promoterChange > 2) {
    positives.push(`Promoter holding increased by ${promoterChange}%.`);
  }

  const pe = data.marketData.pe;
  if (pe !== null && pe > 40) {
    risks.push(`P/E of ${pe} suggests premium valuation — limited margin of safety.`);
  } else if (pe !== null && pe > 0 && pe < 20) {
    positives.push(`P/E of ${pe} indicates reasonable valuation on available data.`);
  }

  if (positives.length === 0) {
    positives.push(
      "Insufficient positive signals from uploaded data — additional metrics may strengthen the case.",
    );
  }
  if (risks.length === 0) {
    risks.push(
      "No major risk flags detected from available metrics. Review data completeness before deciding.",
    );
  }

  let score = 0;
  const reasoning: string[] = [];

  if (revenueGrowth !== null) {
    if (revenueGrowth > 5) {
      score += 1;
      reasoning.push("Revenue trend is supportive.");
    } else if (revenueGrowth < 0) {
      score -= 1;
      reasoning.push("Revenue contraction weighs on the short-term outlook.");
    }
  }

  if (epsGrowth !== null) {
    if (epsGrowth > 5) {
      score += 1;
      reasoning.push("Earnings momentum is positive.");
    } else if (epsGrowth < 0) {
      score -= 1;
      reasoning.push("Earnings are declining.");
    }
  }

  if (roe !== null) {
    if (roe >= 15) {
      score += 1;
      reasoning.push("ROE meets quality benchmark.");
    } else if (roe < 10) {
      score -= 1;
      reasoning.push("ROE is weak.");
    }
  }

  if (debtEquity !== null && debtEquity > 1.5) {
    score -= 1;
    reasoning.push("Leverage is elevated.");
  }

  if (pe !== null && pe > 40) {
    score -= 1;
    reasoning.push("Valuation appears stretched.");
  } else if (pe !== null && pe > 0 && pe < 25) {
    score += 1;
    reasoning.push("Valuation appears reasonable.");
  }

  let assessment: AssessmentRating = "Hold";
  if (score >= 2) assessment = "Buy";
  else if (score <= -2) assessment = "Avoid";

  if (availableMetrics < 5) {
    assessment = "Hold";
    reasoning.push(
      "Limited data coverage — assessment defaults to Hold until more metrics are available.",
    );
  }

  const companyName = data.company ?? "Uploaded Company";
  const periodText = latest ? periodLabel(latest) : "latest period";

  const thesis = [
    `${companyName} short-term view is based solely on uploaded financial data for ${periodText}.`,
    revenueGrowth !== null
      ? `Revenue ${revenueGrowth >= 0 ? "grew" : "declined"} ${Math.abs(revenueGrowth).toFixed(1)}% over the comparable period.`
      : "Revenue trend could not be established from available uploads.",
    roe !== null
      ? `Return profile shows ROE of ${roe}% and ROCE of ${roce ?? "N/A"}%.`
      : "Profitability ratios were not fully available in uploaded files.",
    `Overall short-term stance: ${assessment} — driven by ${reasoning.slice(0, 3).join(" ")}`,
  ].join(" ");

  const chartPeriods = [...sorted].reverse();

  return {
    company: data.company,
    periodsAvailable: sorted.length,
    latestPeriod: latest,
    priorPeriod: prior,
    marketData: data.marketData,
    valuationMetrics,
    growthMetrics,
    profitabilityMetrics,
    leverageMetrics,
    ownershipMetrics,
    positives,
    risks,
    thesis,
    assessment,
    assessmentReasoning: reasoning,
    chartData: {
      revenueByPeriod: chartPeriods
        .filter((p) => p.incomeStatement.revenue !== null)
        .map((p) => ({
          label: periodLabel(p),
          value: p.incomeStatement.revenue!,
        })),
      profitByPeriod: chartPeriods
        .filter((p) => p.incomeStatement.netProfit !== null)
        .map((p) => ({
          label: periodLabel(p),
          value: p.incomeStatement.netProfit!,
        })),
      marginTrend: chartPeriods.map((p) => ({
        label: periodLabel(p),
        operating:
          p.ratios.operatingMargin ??
          computeMargin(
            p.incomeStatement.ebitda ?? p.incomeStatement.ebit,
            p.incomeStatement.revenue,
          ),
        net:
          p.ratios.netProfitMargin ??
          computeMargin(p.incomeStatement.netProfit, p.incomeStatement.revenue),
      })),
    },
    dataCoverage: {
      totalMetrics: allMetrics.length,
      availableMetrics,
      coveragePercent: Math.round(
        (availableMetrics / allMetrics.length) * 100,
      ),
    },
  };
}
