import type {
  ExtractionValidation,
  FinancialObservation,
  NormalizedFinancialData,
  PeriodFinancialData,
  RatioValidation,
} from "@/lib/financial-data-types";
import {
  countExtractedFields,
  countPossiblePeriodFields,
  inferPeriodType,
} from "@/lib/financial-data-types";

function nearlyEqual(a: number, b: number): boolean {
  const scale = Math.max(Math.abs(a), Math.abs(b), 1);
  return Math.abs(a - b) / scale <= 0.08 || Math.abs(a - b) <= 0.3;
}

function validateRatio(
  metric: string,
  extracted: number | null,
  calculated: number | null,
): RatioValidation | null {
  if (extracted === null) return null;
  if (calculated === null) {
    return { metric, extracted, calculated: extracted, status: "extracted-only" };
  }
  return {
    metric,
    extracted,
    calculated,
    status: nearlyEqual(extracted, calculated) ? "validated" : "divergent",
  };
}

export function buildExtractionValidation(input: {
  data: NormalizedFinancialData;
  observations: FinancialObservation[];
  screenshotsProcessed: number;
  calculatedCount: number;
}): ExtractionValidation {
  const { data, observations, screenshotsProcessed, calculatedCount } = input;
  const extracted = observations.filter((item) => item.origin === "extracted");
  const annualValues = extracted.filter((item) => item.periodType === "annual").length;
  const quarterlyValues = extracted.filter(
    (item) => item.periodType === "quarterly",
  ).length;
  const confidences = extracted
    .map((item) => item.confidence)
    .filter((value) => Number.isFinite(value));
  const averageConfidence =
    confidences.length === 0
      ? null
      : confidences.reduce((sum, value) => sum + value, 0) / confidences.length;

  const richest =
    data.periods.length === 0
      ? null
      : data.periods.reduce((best, period) =>
          countExtractedFields(period) > countExtractedFields(best)
            ? period
            : best,
        );

  const missingInputs: string[] = [];
  if (richest) {
    if (richest.incomeStatement.revenue === null) missingInputs.push("Revenue");
    if (richest.incomeStatement.netProfit === null) missingInputs.push("PAT");
    if (richest.cashFlow.operatingCashFlow === null) missingInputs.push("CFO");
    if (richest.cashFlow.capitalExpenditure === null) missingInputs.push("Capex");
    if (richest.balanceSheet.totalDebt === null) missingInputs.push("Total debt");
    if (richest.balanceSheet.totalEquity === null) missingInputs.push("Equity");
    if (richest.cashFlow.principalRepayment === null) {
      missingInputs.push("Principal repayment");
    }
  }

  const validations: RatioValidation[] = [];
  for (const period of data.periods) {
    const label = period.period ?? `FY${period.year ?? ""}`;
    const extractedRoe = observations.find(
      (item) =>
        item.metric === "roe" &&
        item.origin === "extracted" &&
        item.period === period.period,
    )?.value ?? null;
    const extractedRoce = observations.find(
      (item) =>
        item.metric === "roce" &&
        item.origin === "extracted" &&
        item.period === period.period,
    )?.value ?? null;
    const extractedNpm = observations.find(
      (item) =>
        item.metric === "pat_margin" &&
        item.origin === "extracted" &&
        item.period === period.period,
    )?.value ?? null;
    const extractedOpm = observations.find(
      (item) =>
        item.metric === "operating_margin" &&
        item.origin === "extracted" &&
        item.period === period.period,
    )?.value ?? null;

    const calcRoe =
      period.incomeStatement.netProfit !== null &&
      period.balanceSheet.totalEquity
        ? (period.incomeStatement.netProfit / period.balanceSheet.totalEquity) * 100
        : null;
    const calcOpm =
      (period.incomeStatement.ebit ?? period.incomeStatement.ebitda) !== null &&
      period.incomeStatement.revenue
        ? ((period.incomeStatement.ebit ?? period.incomeStatement.ebitda)! /
            period.incomeStatement.revenue) *
          100
        : null;
    const calcNpm =
      period.incomeStatement.netProfit !== null && period.incomeStatement.revenue
        ? (period.incomeStatement.netProfit / period.incomeStatement.revenue) * 100
        : null;

    const checks = [
      validateRatio(`ROE ${label}`, extractedRoe, calcRoe),
      validateRatio(`OPM ${label}`, extractedOpm, calcOpm),
      validateRatio(`NPM ${label}`, extractedNpm, calcNpm),
      validateRatio(`ROCE ${label}`, extractedRoce, period.ratios.roce),
    ];
    for (const check of checks) {
      if (check) validations.push(check);
    }
  }

  const total = countPossiblePeriodFields();
  const available = richest ? countExtractedFields(richest) : 0;

  return {
    screenshotsProcessed,
    filesProcessed: data.sourceFiles.length,
    valuesExtracted: extracted.length,
    annualValues,
    quarterlyValues,
    directMetrics: extracted.length,
    calculatedMetrics: calculatedCount,
    unavailableMetrics: Math.max(total - available, 0),
    averageConfidence,
    missingInputs,
    validations,
  };
}

export function latestComparablePeriod(
  periods: PeriodFinancialData[],
): PeriodFinancialData | null {
  const usable = periods.filter((period) => countExtractedFields(period) > 0);
  const ranked = [...usable].sort((a, b) => {
    const yearDiff = (b.year ?? -1) - (a.year ?? -1);
    if (yearDiff !== 0) return yearDiff;
    const qa = inferPeriodType(a) === "quarterly" ? 1 : 0;
    const qb = inferPeriodType(b) === "quarterly" ? 1 : 0;
    return qb - qa;
  });
  return ranked[0] ?? null;
}
