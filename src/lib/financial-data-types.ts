import type { UploadCategory } from "./upload-types";

export type FinancialValue = number | null;

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
  profitBeforeTax: FinancialValue;
  netProfit: FinancialValue;
  eps: FinancialValue;
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
};

export type CashFlow = {
  operatingCashFlow: FinancialValue;
  capitalExpenditure: FinancialValue;
  freeCashFlow: FinancialValue;
  financingCashFlow: FinancialValue;
  investingCashFlow: FinancialValue;
};

export type FinancialRatios = {
  debtToEquity: FinancialValue;
  roe: FinancialValue;
  roce: FinancialValue;
  roa: FinancialValue;
  operatingMargin: FinancialValue;
  netProfitMargin: FinancialValue;
  interestCoverage: FinancialValue;
  currentRatio: FinancialValue;
  assetTurnover: FinancialValue;
};

export type PeriodFinancialData = {
  period: string | null;
  year: number | null;
  incomeStatement: IncomeStatement;
  balanceSheet: BalanceSheet;
  cashFlow: CashFlow;
  ratios: FinancialRatios;
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
  marketData: MarketData;
  qualitative: QualitativeInsights;
  documentCoverage: DocumentCoverage;
  sourceFiles: ProcessedFileRecord[];
  summary: ProcessingSummary;
};

export function createEmptyIncomeStatement(): IncomeStatement {
  return {
    revenue: null,
    ebitda: null,
    ebit: null,
    profitBeforeTax: null,
    netProfit: null,
    eps: null,
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
  };
}

export function createEmptyCashFlow(): CashFlow {
  return {
    operatingCashFlow: null,
    capitalExpenditure: null,
    freeCashFlow: null,
    financingCashFlow: null,
    investingCashFlow: null,
  };
}

export function createEmptyRatios(): FinancialRatios {
  return {
    debtToEquity: null,
    roe: null,
    roce: null,
    roa: null,
    operatingMargin: null,
    netProfitMargin: null,
    interestCoverage: null,
    currentRatio: null,
    assetTurnover: null,
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
): PeriodFinancialData {
  return {
    period,
    year,
    incomeStatement: createEmptyIncomeStatement(),
    balanceSheet: createEmptyBalanceSheet(),
    cashFlow: createEmptyCashFlow(),
    ratios: createEmptyRatios(),
  };
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
