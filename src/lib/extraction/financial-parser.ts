import type { MarketData } from "../financial-data-types";

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

function parseYearToken(raw: string): number | null {
  const year =
    raw.length === 2 ? 2000 + Number.parseInt(raw, 10) : Number.parseInt(raw, 10);
  if (!Number.isFinite(year)) return null;
  const current = new Date().getFullYear();
  if (year < 1990 || year > current + 1) return null;
  return year;
}

function latestCandidate(
  candidates: { period: string; year: number; weight: number }[],
): { period: string; year: number } | null {
  if (candidates.length === 0) return null;
  const ranked = [...candidates].sort((a, b) => {
    if (b.year !== a.year) return b.year - a.year;
    return b.weight - a.weight;
  });
  const best = ranked[0]!;
  return { period: best.period, year: best.year };
}

export function extractPeriodInfo(text: string): {
  period: string | null;
  year: number | null;
} {
  const normalized = normalizeText(text);
  const candidates: { period: string; year: number; weight: number }[] = [];

  for (const match of normalized.matchAll(
    /\b(?:FY|Financial Year|F\.Y\.?)\s*['']?(\d{2,4})\b/gi,
  )) {
    const year = parseYearToken(match[1] ?? "");
    if (year === null) continue;
    candidates.push({ period: `FY${year}`, year, weight: 4 });
  }

  for (const match of normalized.matchAll(
    /\b(Q[1-4])\s*(?:FY)?\s*['']?(\d{2,4})\b/gi,
  )) {
    const year = parseYearToken(match[2] ?? "");
    if (year === null) continue;
    const quarter = (match[1] ?? "Q").toUpperCase();
    candidates.push({ period: `${quarter} FY${year}`, year, weight: 3 });
  }

  const monthPattern =
    /\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{4})\b/gi;
  for (const match of normalized.matchAll(monthPattern)) {
    const year = parseYearToken(match[2] ?? "");
    if (year === null) continue;
    const month = (match[1] ?? "Mar").slice(0, 3);
    const period =
      month.toLowerCase() === "mar" ? `FY${year}` : `${month} ${year}`;
    candidates.push({
      period,
      year,
      weight: month.toLowerCase() === "mar" ? 3 : 2,
    });
  }

  if (candidates.length === 0) {
    for (const match of normalized.matchAll(/\b(20\d{2})\b/g)) {
      const year = parseYearToken(match[1] ?? "");
      if (year === null) continue;
      candidates.push({ period: `FY${year}`, year, weight: 1 });
    }
  }

  const current = new Date().getFullYear();
  const recent = candidates.filter((item) => item.year >= current - 12);
  const best =
    latestCandidate(recent) ??
    latestCandidate(candidates.filter((item) => item.weight >= 4));
  return best ?? { period: null, year: null };
}

type FieldPattern = {
  key: string;
  labels: RegExp[];
  preferPercentage?: boolean;
};

const INCOME_PATTERNS: FieldPattern[] = [
  { key: "revenue", labels: [/total revenue/i, /revenue from operations/i, /net sales/i, /sales\s*\+?/i, /revenue/i] },
  { key: "ebitda", labels: [/\bebitda\b/i] },
  { key: "ebit", labels: [/operating profit/i, /\bebit\b/i, /pbdit/i, /op\.?\s*profit/i] },
  { key: "profitBeforeTax", labels: [/profit before tax/i, /\bpbt\b/i, /profit before taxation/i] },
  { key: "netProfit", labels: [/profit after tax/i, /net profit/i, /\bpat\b/i, /net income/i] },
  { key: "eps", labels: [/\beps\b/i, /earnings per share/i] },
  {
    key: "interestExpense",
    labels: [
      /finance costs?/i,
      /interest expense/i,
      /interest paid/i,
      /finance charges?/i,
      /\binterest\b(?!\s+cover)/i,
    ],
  },
];

const BALANCE_PATTERNS: FieldPattern[] = [
  { key: "totalAssets", labels: [/total assets/i, /assets total/i] },
  {
    key: "totalEquity",
    labels: [
      /total equity/i,
      /shareholders.? funds/i,
      /net worth/i,
      /total shareholders/i,
      /equity share capital/i,
    ],
  },
  {
    key: "totalDebt",
    labels: [
      /total debt/i,
      /total borrowings/i,
      /borrowings?/i,
    ],
  },
  { key: "netDebt", labels: [/net debt/i] },
  {
    key: "cash",
    labels: [
      /cash and cash equivalents/i,
      /cash\s*&\s*cash equivalents/i,
      /cash equivalents/i,
      /cash\s*&\s*bank/i,
      /\bcash\b/i,
    ],
  },
  { key: "receivables", labels: [/trade receivables/i, /receivables/i] },
  { key: "inventory", labels: [/inventor(?:y|ies)/i] },
  { key: "payables", labels: [/trade payables/i, /payables/i] },
  { key: "currentAssets", labels: [/current assets/i, /total current assets/i] },
  { key: "currentLiabilities", labels: [/current liabilities/i, /total current liabilities/i] },
  { key: "shortTermDebt", labels: [/short[- ]term (?:debt|borrowings)/i, /current borrowings/i, /current portion of (?:long[- ]term )?(?:debt|borrowings)/i] },
  { key: "longTermDebt", labels: [/long[- ]term (?:debt|borrowings)/i, /non[- ]current borrowings/i] },
];

const CASHFLOW_PATTERNS: FieldPattern[] = [
  {
    key: "operatingCashFlow",
    labels: [
      /cash from operating/i,
      /cash[- ]flow from operat/i,
      /operating cash flow/i,
      /net cash from operating/i,
      /cash from operations/i,
      /\bcfo\b/i,
    ],
  },
  { key: "capitalExpenditure", labels: [/capital expenditure/i, /\bcapex\b/i, /purchase of (?:ppe|fixed assets)/i] },
  { key: "freeCashFlow", labels: [/free cash flow/i, /\bfcf\b/i] },
  { key: "financingCashFlow", labels: [/cash from financing/i, /financing cash flow/i, /net cash from financing/i] },
  { key: "investingCashFlow", labels: [/cash from investing/i, /investing cash flow/i, /net cash from investing/i] },
  { key: "principalRepayment", labels: [/repayment of (?:borrowings|debt|loans?)/i, /principal repayment/i, /debt repaid/i] },
  { key: "cashTaxes", labels: [/taxes? paid/i, /income tax paid/i, /direct taxes? paid/i] },
  { key: "maintenanceCapex", labels: [/maintenance capex/i, /maintenance capital expenditure/i] },
];

const RATIO_PATTERNS: FieldPattern[] = [
  { key: "debtToEquity", labels: [/debt.?equity/i, /debt to equity/i, /\bd\/e\b/i] },
  { key: "roe", labels: [/\broe\b/i, /return on equity/i] },
  { key: "roce", labels: [/\broce\b/i, /return on capital employed/i] },
  { key: "roa", labels: [/\broa\b/i, /return on assets/i] },
  { key: "operatingMargin", labels: [/operating margin/i, /\bopm\b/i, /ebitda margin/i] },
  { key: "netProfitMargin", labels: [/net profit margin/i, /\bnpm\b/i, /profit margin/i] },
  { key: "interestCoverage", labels: [/interest coverage/i, /interest cover/i] },
  { key: "currentRatio", labels: [/current ratio/i] },
  { key: "assetTurnover", labels: [/asset turnover/i] },
];

function lineMatchesLabel(line: string, labels: RegExp[]): boolean {
  return labels.some((label) => label.test(line));
}

function looksLikePeriodHeader(line: string): boolean {
  return (
    /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4}\b/i.test(
      line,
    ) &&
    extractNumbersFromLine(line).every((value) => value >= 1990 && value <= 2100)
  );
}

function pickNumericValue(line: string, pattern: FieldPattern): number | null {
  const numbers = extractNumbersFromLine(line);
  if (numbers.length === 0) return null;

  if (pattern.preferPercentage || /%/.test(line)) {
    const percent = numbers.find((value) => Math.abs(value) <= 100);
    if (percent !== undefined) return percent;
  }

  return numbers[numbers.length - 1] ?? null;
}

function extractFieldValueFromLines(
  lines: string[],
  index: number,
  pattern: FieldPattern,
  allPatterns: FieldPattern[],
): number | null {
  const line = lines[index];
  if (!line || !lineMatchesLabel(line, pattern.labels)) return null;

  const sameLine = pickNumericValue(line, pattern);
  if (sameLine !== null) return sameLine;

  for (const offset of [1, 2]) {
    const next = lines[index + offset];
    if (!next) continue;
    if (looksLikePeriodHeader(next)) continue;
    if (allPatterns.some((item) => lineMatchesLabel(next, item.labels))) continue;
    const value = pickNumericValue(next, pattern);
    if (value !== null) return value;
  }

  return null;
}

function applyPatterns<T extends Record<string, number | null>>(
  target: T,
  lines: string[],
  patterns: FieldPattern[],
  extraPatterns: FieldPattern[] = [],
): T {
  const result = { ...target };
  const allPatterns = [...patterns, ...extraPatterns];

  for (const pattern of patterns) {
    if (result[pattern.key as keyof T] !== null) continue;

    for (let index = 0; index < lines.length; index += 1) {
      const value = extractFieldValueFromLines(
        lines,
        index,
        pattern,
        allPatterns,
      );
      if (value !== null) {
        (result as Record<string, number | null>)[pattern.key] = value;
        break;
      }
    }
  }

  return result;
}

const ALL_FIELD_PATTERNS: FieldPattern[] = [
  ...INCOME_PATTERNS,
  ...BALANCE_PATTERNS,
  ...CASHFLOW_PATTERNS,
  ...RATIO_PATTERNS,
];

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
      interestExpense: null,
    },
    lines,
    INCOME_PATTERNS,
    ALL_FIELD_PATTERNS,
  );

  const balanceSheet = applyPatterns(
    {
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
    },
    lines,
    BALANCE_PATTERNS,
    ALL_FIELD_PATTERNS,
  );

  let totalEquity: number | null = balanceSheet.totalEquity;
  if (totalEquity === null) {
    const equityParts = applyPatterns(
      { equityCapital: null as number | null, reserves: null as number | null },
      lines,
      [
        { key: "equityCapital", labels: [/equity capital/i, /share capital/i] },
        { key: "reserves", labels: [/\breserves\b/i, /reserves and surplus/i] },
      ],
      ALL_FIELD_PATTERNS,
    );
    if (equityParts.equityCapital !== null && equityParts.reserves !== null) {
      totalEquity = equityParts.equityCapital + equityParts.reserves;
    } else {
      totalEquity = equityParts.equityCapital ?? equityParts.reserves ?? null;
    }
  }
  const balanced = { ...balanceSheet, totalEquity };

  const cashFlow = applyPatterns(
    {
      operatingCashFlow: null,
      capitalExpenditure: null,
      freeCashFlow: null,
      financingCashFlow: null,
      investingCashFlow: null,
      principalRepayment: null,
      cashTaxes: null,
      maintenanceCapex: null,
    },
    lines,
    CASHFLOW_PATTERNS,
    ALL_FIELD_PATTERNS,
  );

  const ratios = applyPatterns(
    {
      debtToEquity: null,
      roe: null,
      roce: null,
      roa: null,
      operatingMargin: null,
      netProfitMargin: null,
      interestCoverage: null,
      currentRatio: null,
      assetTurnover: null,
    },
    lines,
    RATIO_PATTERNS.map((pattern) => ({
      ...pattern,
      preferPercentage: [
        "roe",
        "roce",
        "roa",
        "operatingMargin",
        "netProfitMargin",
      ].includes(pattern.key),
    })),
    ALL_FIELD_PATTERNS,
  );

  return {
    company,
    period,
    year,
    incomeStatement,
    balanceSheet: balanced,
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

const MARKET_PATTERNS: FieldPattern[] = [
  { key: "currentPrice", labels: [/current price/i, /cmp/i, /market price/i, /stock price/i] },
  { key: "marketCap", labels: [/market cap/i, /market capitalization/i, /mcap/i] },
  { key: "pe", labels: [/\bp\/e\b/i, /price to earning/i, /price.?earnings/i, /\bpe ratio\b/i] },
  { key: "pb", labels: [/\bp\/b\b/i, /price to book/i, /\bpb ratio\b/i] },
  { key: "dividendYield", labels: [/dividend yield/i, /\bdiv yield\b/i], preferPercentage: true },
  { key: "promoterHolding", labels: [/promoter holding/i, /promoters.? holding/i, /promoter shareholding/i], preferPercentage: true },
  { key: "promoterHoldingChange", labels: [/promoter holding change/i, /change in promoter/i, /promoter.*change/i], preferPercentage: true },
];

export function parseMarketData(text: string): MarketData {
  const lines = normalizeText(text)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return applyPatterns(
    {
      currentPrice: null,
      marketCap: null,
      pe: null,
      pb: null,
      dividendYield: null,
      promoterHolding: null,
      promoterHoldingChange: null,
    },
    lines,
    MARKET_PATTERNS,
  );
}
