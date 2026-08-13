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
  cash: FinancialValue;
  currentAssets: FinancialValue;
  currentLiabilities: FinancialValue;
};

export type CashFlow = {
  operatingCashFlow: FinancialValue;
  capitalExpenditure: FinancialValue;
  freeCashFlow: FinancialValue;
  financingCashFlow: FinancialValue;
};

export type FinancialRatios = {
  debtToEquity: FinancialValue;
  roe: FinancialValue;
  roce: FinancialValue;
  operatingMargin: FinancialValue;
  netProfitMargin: FinancialValue;
  interestCoverage: FinancialValue;
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

export type NormalizedFinancialData = {
  company: string | null;
  periods: PeriodFinancialData[];
  marketData: MarketData;
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
    cash: null,
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
  };
}

export function createEmptyRatios(): FinancialRatios {
  return {
    debtToEquity: null,
    roe: null,
    roce: null,
    operatingMargin: null,
    netProfitMargin: null,
    interestCoverage: null,
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

export function countAllExtractedFields(periods: PeriodFinancialData[]): number {
  return periods.reduce(
    (total, period) => total + countExtractedFields(period),
    0,
  );
}

export type DashboardStatus =
  | "awaiting-upload"
  | "ready-to-process"
  | "processing"
  | "processed";

export function formatFinancialValue(value: FinancialValue): string {
  if (value === null) return "Not available";
  if (Math.abs(value) >= 1_000_000) {
    return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }
  return value.toLocaleString(undefined, { maximumFractionDigits: 4 });
}
