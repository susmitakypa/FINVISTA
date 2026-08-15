import type {
  FinancialValue,
  NormalizedFinancialData,
  PeriodFinancialData,
} from "@/lib/financial-data-types";
import { countExtractedFields } from "@/lib/financial-data-types";

export type ExcelPeriodRow = {
  period: string | null;
  year: number | null;
  periodType: string;
  revenue: FinancialValue;
  pat: FinancialValue;
  ebitda: FinancialValue;
  ebit: FinancialValue;
  depreciation: FinancialValue;
  interestExpense: FinancialValue;
  cfo: FinancialValue;
  capex: FinancialValue;
  fcf: FinancialValue;
  totalDebt: FinancialValue;
  netDebt: FinancialValue;
  cash: FinancialValue;
  equity: FinancialValue;
  debtToEquity: FinancialValue;
  interestCoverage: FinancialValue;
};

export type ExcelExtractResponse = {
  source: "finvista-extract-api";
  company: string | null;
  latestPeriod: string | null;
  metrics: ExcelPeriodRow | null;
  periods: ExcelPeriodRow[];
  files: Array<{
    name: string;
    status: string;
    fieldsExtracted: number;
    error?: string;
  }>;
  extractionValidation: NormalizedFinancialData["extractionValidation"];
  summary: NormalizedFinancialData["summary"];
};

const CSV_COLUMNS: Array<keyof ExcelPeriodRow | "company"> = [
  "company",
  "period",
  "year",
  "periodType",
  "revenue",
  "pat",
  "ebitda",
  "ebit",
  "depreciation",
  "interestExpense",
  "cfo",
  "capex",
  "fcf",
  "totalDebt",
  "netDebt",
  "cash",
  "equity",
  "debtToEquity",
  "interestCoverage",
];

function flattenPeriod(period: PeriodFinancialData): ExcelPeriodRow {
  return {
    period: period.period,
    year: period.year,
    periodType: period.periodType,
    revenue: period.incomeStatement.revenue,
    pat: period.incomeStatement.netProfit,
    ebitda: period.incomeStatement.ebitda,
    ebit: period.incomeStatement.ebit,
    depreciation: period.incomeStatement.depreciation,
    interestExpense: period.incomeStatement.interestExpense,
    cfo: period.cashFlow.operatingCashFlow,
    capex: period.cashFlow.capitalExpenditure,
    fcf: period.cashFlow.freeCashFlow,
    totalDebt: period.balanceSheet.totalDebt,
    netDebt: period.balanceSheet.netDebt,
    cash: period.balanceSheet.cash,
    equity: period.balanceSheet.totalEquity,
    debtToEquity: period.ratios.debtToEquity,
    interestCoverage: period.ratios.interestCoverage,
  };
}

function pickLatest(periods: PeriodFinancialData[]): PeriodFinancialData | null {
  const usable = periods.filter((period) => countExtractedFields(period) > 0);
  if (usable.length === 0) return null;
  return [...usable].sort((a, b) => (b.year ?? -1) - (a.year ?? -1))[0] ?? null;
}

export function toExcelExtractResponse(
  data: NormalizedFinancialData,
): ExcelExtractResponse {
  const periods = (data.periods ?? []).map(flattenPeriod);
  const latest = pickLatest(data.periods ?? []);
  return {
    source: "finvista-extract-api",
    company: data.company,
    latestPeriod: latest?.period ?? null,
    metrics: latest ? flattenPeriod(latest) : null,
    periods,
    files: (data.sourceFiles ?? []).map((file) => ({
      name: file.name,
      status: file.status,
      fieldsExtracted: file.fieldsExtracted,
      error: file.error,
    })),
    extractionValidation: data.extractionValidation,
    summary: data.summary,
  };
}

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  if (/[",\n]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

export function toExcelCsv(payload: ExcelExtractResponse): string {
  const header = CSV_COLUMNS.join(",");
  const rows = payload.periods.map((period) =>
    CSV_COLUMNS.map((column) => {
      if (column === "company") return csvCell(payload.company);
      return csvCell(period[column]);
    }).join(","),
  );
  if (rows.length === 0) {
    rows.push(CSV_COLUMNS.map((column) => (column === "company" ? csvCell(payload.company) : "")).join(","));
  }
  return [header, ...rows].join("\n") + "\n";
}
