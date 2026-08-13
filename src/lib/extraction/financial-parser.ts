/**
 * Parses numeric values from financial text lines.
 * Does not infer values — only extracts explicitly present numbers.
 */

export function parseFinancialNumber(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed || trimmed === "-" || trimmed === "NA" || trimmed === "N/A") {
    return null;
  }

  const isNegative =
    trimmed.startsWith("(") && trimmed.endsWith(")") ||
    trimmed.startsWith("-");

  const cleaned = trimmed
    .replace(/[()]/g, "")
    .replace(/,/g, "")
    .replace(/%/g, "")
    .replace(/\s*(Cr|crore|L|lakh|bn|million)\b/gi, "")
    .trim();

  const value = Number.parseFloat(cleaned);
  if (!Number.isFinite(value)) return null;

  return isNegative ? -Math.abs(value) : value;
}

export function extractNumbersFromLine(line: string): number[] {
  const matches = line.match(/-?\(?[\d,]+(?:\.\d+)?\)?%?/g) ?? [];
  return matches
    .map((match) => parseFinancialNumber(match))
    .filter((value): value is number => value !== null);
}

export function extractLastNumberFromLine(line: string): number | null {
  const numbers = extractNumbersFromLine(line);
  return numbers.length > 0 ? numbers[numbers.length - 1]! : null;
}

export function normalizeText(text: string): string {
  return text
    .replace(/\r/g, "\n")
    .replace(/\t/g, " ")
    .replace(/[ \u00a0]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function extractCompanyName(text: string): string | null {
  const lines = normalizeText(text)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const patterns = [
    /^company\s*[:\-]\s*(.+)$/i,
    /^name\s*[:\-]\s*(.+)$/i,
    /^stock\s*[:\-]\s*(.+)$/i,
  ];

  for (const line of lines.slice(0, 30)) {
    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match?.[1]) {
        const name = match[1].trim();
        if (name.length >= 2 && name.length <= 120) return name;
      }
    }
  }

  const screenerLine = lines.find((line) =>
    /screener\.in/i.test(line),
  );
  if (screenerLine) {
    const idx = lines.indexOf(screenerLine);
    const candidate = lines[idx - 1] ?? lines[idx + 1];
    if (candidate && candidate.length >= 2 && candidate.length <= 120) {
      return candidate;
    }
  }

  const titledLine = lines.find(
    (line) =>
      line.length >= 3 &&
      line.length <= 80 &&
      /^[A-Z][A-Za-z0-9&.\- ]+( Ltd| Limited| Inc| Corp| PLC)?\.?$/i.test(line),
  );

  return titledLine ?? null;
}

export function extractPeriodInfo(text: string): {
  period: string | null;
  year: number | null;
} {
  const normalized = normalizeText(text);

  const fyMatch = normalized.match(
    /\b(?:FY|Financial Year|F\.Y\.?)\s*['']?(\d{2,4})\b/i,
  );
  if (fyMatch?.[1]) {
    const rawYear = fyMatch[1];
    const year =
      rawYear.length === 2
        ? 2000 + Number.parseInt(rawYear, 10)
        : Number.parseInt(rawYear, 10);
    return { period: `FY${year}`, year };
  }

  const quarterMatch = normalized.match(
    /\b(Q[1-4])\s*(?:FY)?\s*['']?(\d{2,4})\b/i,
  );
  if (quarterMatch) {
    const quarter = quarterMatch[1]!.toUpperCase();
    const rawYear = quarterMatch[2]!;
    const year =
      rawYear.length === 2
        ? 2000 + Number.parseInt(rawYear, 10)
        : Number.parseInt(rawYear, 10);
    return { period: `${quarter} FY${year}`, year };
  }

  const monthYearMatch = normalized.match(
    /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})\b/i,
  );
  if (monthYearMatch) {
    const month = monthYearMatch[1]!;
    const year = Number.parseInt(monthYearMatch[2]!, 10);
    return { period: `${month} ${year}`, year };
  }

  const yearMatch = normalized.match(/\b(20\d{2}|19\d{2})\b/);
  if (yearMatch?.[1]) {
    const year = Number.parseInt(yearMatch[1], 10);
    return { period: `${year}`, year };
  }

  return { period: null, year: null };
}

type FieldPattern = {
  key: string;
  labels: RegExp[];
  preferPercentage?: boolean;
};

const INCOME_PATTERNS: FieldPattern[] = [
  { key: "revenue", labels: [/total revenue/i, /revenue from operations/i, /net sales/i, /sales/i, /revenue/i] },
  { key: "ebitda", labels: [/ebitda/i] },
  { key: "ebit", labels: [/operating profit/i, /\bebit\b/i, /pbdit/i] },
  { key: "profitBeforeTax", labels: [/profit before tax/i, /\bpbt\b/i, /profit before taxation/i] },
  { key: "netProfit", labels: [/profit after tax/i, /net profit/i, /\bpat\b/i, /net income/i] },
  { key: "eps", labels: [/\beps\b/i, /earnings per share/i] },
];

const BALANCE_PATTERNS: FieldPattern[] = [
  { key: "totalAssets", labels: [/total assets/i, /assets total/i] },
  { key: "totalEquity", labels: [/total equity/i, /shareholders.? funds/i, /net worth/i, /total shareholders/i] },
  { key: "totalDebt", labels: [/total debt/i, /borrowings/i, /total borrowings/i, /debt/i] },
  { key: "cash", labels: [/cash and cash equivalents/i, /cash & cash equivalents/i, /\bcash\b/i] },
  { key: "currentAssets", labels: [/current assets/i, /total current assets/i] },
  { key: "currentLiabilities", labels: [/current liabilities/i, /total current liabilities/i] },
];

const CASHFLOW_PATTERNS: FieldPattern[] = [
  { key: "operatingCashFlow", labels: [/cash from operating/i, /operating cash flow/i, /net cash from operating/i] },
  { key: "capitalExpenditure", labels: [/capital expenditure/i, /\bcapex\b/i, /purchase of fixed assets/i] },
  { key: "freeCashFlow", labels: [/free cash flow/i, /\bfcf\b/i] },
  { key: "financingCashFlow", labels: [/cash from financing/i, /financing cash flow/i, /net cash from financing/i] },
];

const RATIO_PATTERNS: FieldPattern[] = [
  { key: "debtToEquity", labels: [/debt.?equity/i, /debt to equity/i, /\bd\/e\b/i] },
  { key: "roe", labels: [/\broe\b/i, /return on equity/i] },
  { key: "roce", labels: [/\broce\b/i, /return on capital employed/i] },
  { key: "operatingMargin", labels: [/operating margin/i, /\bopm\b/i, /ebitda margin/i] },
  { key: "netProfitMargin", labels: [/net profit margin/i, /\bnpm\b/i, /profit margin/i] },
  { key: "interestCoverage", labels: [/interest coverage/i, /interest cover/i] },
];

function lineMatchesLabel(line: string, labels: RegExp[]): boolean {
  return labels.some((label) => label.test(line));
}

function extractFieldValue(line: string, pattern: FieldPattern): number | null {
  if (!lineMatchesLabel(line, pattern.labels)) return null;

  const numbers = extractNumbersFromLine(line);
  if (numbers.length === 0) return null;

  if (pattern.preferPercentage || /%/.test(line)) {
    const percent = numbers.find((value) => Math.abs(value) <= 100);
    if (percent !== undefined) return percent;
  }

  return numbers[numbers.length - 1] ?? null;
}

function applyPatterns<T extends Record<string, number | null>>(
  target: T,
  lines: string[],
  patterns: FieldPattern[],
): T {
  const result = { ...target };

  for (const pattern of patterns) {
    if (result[pattern.key as keyof T] !== null) continue;

    for (const line of lines) {
      const value = extractFieldValue(line, pattern);
      if (value !== null) {
        (result as Record<string, number | null>)[pattern.key] = value;
        break;
      }
    }
  }

  return result;
}

export function parseFinancialText(text: string) {
  const normalized = normalizeText(text);
  const lines = normalized
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const { period, year } = extractPeriodInfo(normalized);
  const company = extractCompanyName(normalized);

  const incomeStatement = applyPatterns(
    {
      revenue: null,
      ebitda: null,
      ebit: null,
      profitBeforeTax: null,
      netProfit: null,
      eps: null,
    },
    lines,
    INCOME_PATTERNS,
  );

  const balanceSheet = applyPatterns(
    {
      totalAssets: null,
      totalEquity: null,
      totalDebt: null,
      cash: null,
      currentAssets: null,
      currentLiabilities: null,
    },
    lines,
    BALANCE_PATTERNS,
  );

  const cashFlow = applyPatterns(
    {
      operatingCashFlow: null,
      capitalExpenditure: null,
      freeCashFlow: null,
      financingCashFlow: null,
    },
    lines,
    CASHFLOW_PATTERNS,
  );

  const ratios = applyPatterns(
    {
      debtToEquity: null,
      roe: null,
      roce: null,
      operatingMargin: null,
      netProfitMargin: null,
      interestCoverage: null,
    },
    lines,
    RATIO_PATTERNS.map((pattern) => ({
      ...pattern,
      preferPercentage: [
        "roe",
        "roce",
        "operatingMargin",
        "netProfitMargin",
      ].includes(pattern.key),
    })),
  );

  return {
    company,
    period,
    year,
    incomeStatement,
    balanceSheet,
    cashFlow,
    ratios,
    textLength: normalized.length,
  };
}

export function mergePeriodData<T extends Record<string, number | null>>(
  existing: T,
  incoming: T,
): T {
  const merged = { ...existing };
  for (const key of Object.keys(incoming) as Array<keyof T>) {
    if (merged[key] === null && incoming[key] !== null) {
      merged[key] = incoming[key];
    }
  }
  return merged;
}
