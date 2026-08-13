import type {
  CashFlowDebug,
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
  cashFlowOcrDetected?: boolean;
  cashFlowParserDetected?: boolean;
  cashFlowOcrPreview?: string;
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
  const anyPeriod = (pick: (period: PeriodFinancialData) => unknown) =>
    data.periods.some((period) => pick(period) != null);
  if (!anyPeriod((period) => period.incomeStatement.revenue)) {
    missingInputs.push("Revenue");
  }
  if (!anyPeriod((period) => period.incomeStatement.netProfit)) {
    missingInputs.push("PAT");
  }
  if (!anyPeriod((period) => period.cashFlow.operatingCashFlow)) {
    missingInputs.push("CFO");
  }
  if (!anyPeriod((period) => period.cashFlow.capitalExpenditure)) {
    missingInputs.push("Capex");
  }
  if (!anyPeriod((period) => period.balanceSheet.totalDebt)) {
    missingInputs.push("Total debt");
  }
  if (!anyPeriod((period) => period.balanceSheet.totalEquity)) {
    missingInputs.push("Equity");
  }
  if (!anyPeriod((period) => period.cashFlow.principalRepayment)) {
    missingInputs.push("Principal repayment");
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

  const cashPeriod =
    data.periods.find(
      (period) =>
        period.cashFlow.operatingCashFlow !== null ||
        period.cashFlow.capitalExpenditure !== null,
    ) ?? richest;
  const cfoObs = extracted.find((item) => item.metric === "cfo");
  const capexObs = extracted.find((item) => item.metric === "capex");
  const cashFlowDebug: CashFlowDebug = {
    ocrDetected: Boolean(input.cashFlowOcrDetected),
    parserDetected: Boolean(input.cashFlowParserDetected),
    normalizedDetected: Boolean(
      cashPeriod &&
        (cashPeriod.cashFlow.operatingCashFlow !== null ||
          cashPeriod.cashFlow.capitalExpenditure !== null),
    ),
    cfo: cashPeriod?.cashFlow.operatingCashFlow ?? null,
    capex: cashPeriod?.cashFlow.capitalExpenditure ?? null,
    fcf: cashPeriod?.cashFlow.freeCashFlow ?? null,
    cfoSource: cfoObs?.source ?? (cashPeriod?.cashFlow.operatingCashFlow !== null ? "normalized dataset" : null),
    capexSource:
      capexObs?.source ??
      (cashPeriod?.cashFlow.capitalExpenditure !== null ? "normalized dataset" : null),
    periods: data.periods
      .filter(
        (period) =>
          period.cashFlow.operatingCashFlow !== null ||
          period.cashFlow.capitalExpenditure !== null,
      )
      .map((period) => period.period ?? `FY${period.year ?? ""}`),
    ocrPreview: input.cashFlowOcrPreview ?? "",
  };

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
    cashFlowDebug,
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
