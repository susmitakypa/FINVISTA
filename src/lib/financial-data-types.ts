import type { UploadCategory } from "./upload-types";

export type FinancialValue = number | null;

export type PeriodType = "annual" | "quarterly" | "unknown";

export type ObservationOrigin = "extracted" | "calculated";

export type ObservationSourceKind =
  | "annual_report"
  | "screener_table"
  | "screener_screenshot"
  | "chart";

export type FinancialObservation = {
  metric: string;
  value: number;
  unit: string | null;
  period: string;
  periodType: PeriodType;
  year: number | null;
  source: string;
  sourceKind: ObservationSourceKind;
  confidence: number;
  rawText: string;
  origin: ObservationOrigin;
};

export type RatioValidation = {
  metric: string;
  extracted: number;
  calculated: number;
  status: "validated" | "divergent" | "extracted-only";
};

export type ExtractionValidation = {
  screenshotsProcessed: number;
  filesProcessed: number;
  valuesExtracted: number;
  annualValues: number;
  quarterlyValues: number;
  directMetrics: number;
  calculatedMetrics: number;
  unavailableMetrics: number;
  averageConfidence: number | null;
  missingInputs: string[];
  validations: RatioValidation[];
};

export type MarketData = {
  currentPrice: FinancialValue;
  marketCap: FinancialValue;
  pe: FinancialValue;
  pb: FinancialValue;
  dividendYield: FinancialValue;
  promoterHolding: FinancialValue;
  promoterHoldingChange: FinancialValue;
};

export type IncomeStatement = {
  revenue: FinancialValue;
  ebitda: FinancialValue;
  ebit: FinancialValue;
  depreciation: FinancialValue;
  profitBeforeTax: FinancialValue;
  netProfit: FinancialValue;
  eps: FinancialValue;
  interestExpense: FinancialValue;
};

export type BalanceSheet = {
  totalAssets: FinancialValue;
  totalEquity: FinancialValue;
  totalDebt: FinancialValue;
  netDebt: FinancialValue;
  cash: FinancialValue;
  receivables: FinancialValue;
  inventory: FinancialValue;
  payables: FinancialValue;
  currentAssets: FinancialValue;
  currentLiabilities: FinancialValue;
  shortTermDebt: FinancialValue;
  longTermDebt: FinancialValue;
};

export type CashFlow = {
  operatingCashFlow: FinancialValue;
  capitalExpenditure: FinancialValue;
  freeCashFlow: FinancialValue;
  financingCashFlow: FinancialValue;
  investingCashFlow: FinancialValue;
  principalRepayment: FinancialValue;
  cashTaxes: FinancialValue;
  maintenanceCapex: FinancialValue;
};

export type FinancialRatios = {
  debtToEquity: FinancialValue;
  roe: FinancialValue;
  roce: FinancialValue;
  roa: FinancialValue;
  operatingMargin: FinancialValue;
  ebitdaMargin: FinancialValue;
  netProfitMargin: FinancialValue;
  fcfMargin: FinancialValue;
  cfoMargin: FinancialValue;
  interestCoverage: FinancialValue;
  currentRatio: FinancialValue;
  quickRatio: FinancialValue;
  assetTurnover: FinancialValue;
  workingCapital: FinancialValue;
  receivableDays: FinancialValue;
  inventoryDays: FinancialValue;
  payableDays: FinancialValue;
  cashConversionCycle: FinancialValue;
  cfoToPat: FinancialValue;
  fcfToPat: FinancialValue;
  netDebtToEbitda: FinancialValue;
  debtToEbitda: FinancialValue;
  cfoToInterest: FinancialValue;
};

export type PeriodFinancialData = {
  period: string | null;
  year: number | null;
  periodType: PeriodType;
  incomeStatement: IncomeStatement;
  balanceSheet: BalanceSheet;
  cashFlow: CashFlow;
  ratios: FinancialRatios;
};

export type DebtFacility = {
  lender: string | null;
  facility: string | null;
  openingDebt: FinancialValue;
  outstanding: FinancialValue;
  interestRatePct: FinancialValue;
  maturity: string | null;
  maturityYear: number | null;
  annualPrincipal: FinancialValue;
  annualInterest: FinancialValue;
  source: UploadCategory | "unknown";
};

export type FileProcessingStatus =
  | "success"
  | "partial"
  | "review"
  | "failed";

export type ProcessedFileRecord = {
  id: string;
  name: string;
  category: UploadCategory;
  status: FileProcessingStatus;
  error?: string;
  extractedTextLength: number;
  fieldsExtracted: number;
  preserved: true;
};

export type ProcessingSummary = {
  filesProcessed: number;
  filesSuccessfullyParsed: number;
  filesRequiringReview: number;
  totalFieldsExtracted: number;
  processedAt: string;
};

export function createEmptyMarketData(): MarketData {
  return {
    currentPrice: null,
    marketCap: null,
    pe: null,
    pb: null,
    dividendYield: null,
    promoterHolding: null,
    promoterHoldingChange: null,
  };
}

export type QualitativeInsights = {
  managementGuidance: string | null;
  businessOutlook: string | null;
  growthDrivers: string | null;
  risks: string | null;
  capexPlans: string | null;
  expansionPlans: string | null;
};

export type DocumentCoverage = {
  screener: boolean;
  annualReport: boolean;
  investorPresentation: boolean;
  quarterlyResults: boolean;
};

export type NormalizedFinancialData = {
  company: string | null;
  currency: string | null;
  periods: PeriodFinancialData[];
  observations: FinancialObservation[];
  extractionValidation: ExtractionValidation | null;
  marketData: MarketData;
  qualitative: QualitativeInsights;
  documentCoverage: DocumentCoverage;
  debtFacilities: DebtFacility[];
  sourceFiles: ProcessedFileRecord[];
  summary: ProcessingSummary;
};

export function createEmptyIncomeStatement(): IncomeStatement {
  return {
    revenue: null,
    ebitda: null,
    ebit: null,
    depreciation: null,
    profitBeforeTax: null,
    netProfit: null,
    eps: null,
    interestExpense: null,
  };
}

export function createEmptyBalanceSheet(): BalanceSheet {
  return {
    totalAssets: null,
    totalEquity: null,
    totalDebt: null,
    netDebt: null,
    cash: null,
    receivables: null,
    inventory: null,
    payables: null,
    currentAssets: null,
    currentLiabilities: null,
    shortTermDebt: null,
    longTermDebt: null,
  };
}

export function createEmptyCashFlow(): CashFlow {
  return {
    operatingCashFlow: null,
    capitalExpenditure: null,
    freeCashFlow: null,
    financingCashFlow: null,
    investingCashFlow: null,
    principalRepayment: null,
    cashTaxes: null,
    maintenanceCapex: null,
  };
}

export function createEmptyRatios(): FinancialRatios {
  return {
    debtToEquity: null,
    roe: null,
    roce: null,
    roa: null,
    operatingMargin: null,
    ebitdaMargin: null,
    netProfitMargin: null,
    fcfMargin: null,
    cfoMargin: null,
    interestCoverage: null,
    currentRatio: null,
    quickRatio: null,
    assetTurnover: null,
    workingCapital: null,
    receivableDays: null,
    inventoryDays: null,
    payableDays: null,
    cashConversionCycle: null,
    cfoToPat: null,
    fcfToPat: null,
    netDebtToEbitda: null,
    debtToEbitda: null,
    cfoToInterest: null,
  };
}

export function createEmptyQualitative(): QualitativeInsights {
  return {
    managementGuidance: null,
    businessOutlook: null,
    growthDrivers: null,
    risks: null,
    capexPlans: null,
    expansionPlans: null,
  };
}

export function createEmptyDocumentCoverage(): DocumentCoverage {
  return {
    screener: false,
    annualReport: false,
    investorPresentation: false,
    quarterlyResults: false,
  };
}

export function createEmptyPeriod(
  period: string | null = null,
  year: number | null = null,
  periodType: PeriodType = "unknown",
): PeriodFinancialData {
  return {
    period,
    year,
    periodType: periodType === "unknown" ? inferPeriodTypeFromLabel(period) : periodType,
    incomeStatement: createEmptyIncomeStatement(),
    balanceSheet: createEmptyBalanceSheet(),
    cashFlow: createEmptyCashFlow(),
    ratios: createEmptyRatios(),
  };
}

export function inferPeriodTypeFromLabel(label: string | null | undefined): PeriodType {
  if (!label) return "unknown";
  if (/Q[1-4]/i.test(label)) return "quarterly";
  if (/FY\d{2,4}/i.test(label)) return "annual";
  return "unknown";
}

export function inferPeriodType(period: {
  period?: string | null;
  periodType?: PeriodType;
}): PeriodType {
  if (period.periodType && period.periodType !== "unknown") return period.periodType;
  return inferPeriodTypeFromLabel(period.period);
}

export function extractQuarter(label: string | null | undefined): string | null {
  const match = label?.match(/Q[1-4]/i);
  return match ? match[0]!.toUpperCase() : null;
}

export function comparablePeriods(
  periods: PeriodFinancialData[],
  prefer: Exclude<PeriodType, "unknown"> = "annual",
): PeriodFinancialData[] {
  const typed = periods.filter(
    (period) =>
      inferPeriodType(period) === prefer && countExtractedFields(period) > 0,
  );
  if (typed.length > 0) return typed;
  const other: Exclude<PeriodType, "unknown"> =
    prefer === "annual" ? "quarterly" : "annual";
  const fallback = periods.filter(
    (period) =>
      inferPeriodType(period) === other && countExtractedFields(period) > 0,
  );
  return fallback.length > 0 ? fallback : periods;
}

export function periodIdentityKey(period: {
  year: number | null;
  period: string | null;
  periodType?: PeriodType;
}): string {
  const type = inferPeriodType(period);
  if (type === "quarterly") {
    const quarter = extractQuarter(period.period) ?? "QX";
    return `Q-${period.year ?? "na"}-${quarter}`;
  }
  if (period.year !== null) return `A-FY${period.year}`;
  return `A-${period.period ?? "unknown"}`;
}

export function countExtractedFields(period: PeriodFinancialData): number {
  const sections = [
    period.incomeStatement,
    period.balanceSheet,
    period.cashFlow,
    period.ratios,
  ];

  return sections.reduce((count, section) => {
    return (
      count +
      Object.values(section).filter((value) => value !== null).length
    );
  }, 0);
}

export function countPossiblePeriodFields(): number {
  return (
    Object.keys(createEmptyIncomeStatement()).length +
    Object.keys(createEmptyBalanceSheet()).length +
    Object.keys(createEmptyCashFlow()).length +
    Object.keys(createEmptyRatios()).length
  );
}

export function countAllExtractedFields(periods: PeriodFinancialData[]): number {
  return periods.reduce(
    (total, period) => total + countExtractedFields(period),
    0,
  );
}

export function metricCoverage(data: NormalizedFinancialData): {
  available: number;
  unavailable: number;
  total: number;
} {
  const richest =
    data.periods.length === 0
      ? null
      : data.periods.reduce((best, period) =>
          countExtractedFields(period) > countExtractedFields(best)
            ? period
            : best,
        );
  const total = countPossiblePeriodFields();
  const available = richest ? countExtractedFields(richest) : 0;
  return {
    available,
    unavailable: Math.max(total - available, 0),
    total,
  };
}

export type DashboardStatus =
  | "awaiting-upload"
  | "ready-to-process"
  | "processing"
  | "processed";

export function formatFinancialValue(value: FinancialValue): string {
  if (value === null) return "Data unavailable";
  if (Math.abs(value) >= 1_000_000) {
    return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }
  return value.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

export function hydrateNormalizedData(
  raw: NormalizedFinancialData,
): NormalizedFinancialData {
  return {
    company: raw.company ?? null,
    currency: raw.currency ?? null,
    periods: (raw.periods ?? []).map((period) => ({
      period: period.period ?? null,
      year: period.year ?? null,
      periodType: inferPeriodType(period),
      incomeStatement: {
        ...createEmptyIncomeStatement(),
        ...period.incomeStatement,
      },
      balanceSheet: {
        ...createEmptyBalanceSheet(),
        ...period.balanceSheet,
      },
      cashFlow: {
        ...createEmptyCashFlow(),
        ...period.cashFlow,
      },
      ratios: {
        ...createEmptyRatios(),
        ...period.ratios,
      },
    })),
    observations: raw.observations ?? [],
    extractionValidation: raw.extractionValidation ?? null,
    marketData: {
      ...createEmptyMarketData(),
      ...raw.marketData,
    },
    qualitative: {
      ...createEmptyQualitative(),
      ...raw.qualitative,
    },
    documentCoverage: {
      ...createEmptyDocumentCoverage(),
      ...raw.documentCoverage,
    },
    debtFacilities: raw.debtFacilities ?? [],
    sourceFiles: raw.sourceFiles ?? [],
    summary: raw.summary ?? {
      filesProcessed: 0,
      filesSuccessfullyParsed: 0,
      filesRequiringReview: 0,
      totalFieldsExtracted: 0,
      processedAt: new Date().toISOString(),
    },
  };
}
