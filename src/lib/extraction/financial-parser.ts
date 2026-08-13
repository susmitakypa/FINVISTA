import type { MarketData } from "../financial-data-types";
import {
  createEmptyBalanceSheet,
  createEmptyCashFlow,
  createEmptyIncomeStatement,
  createEmptyRatios,
  inferPeriodTypeFromLabel,
  type PeriodType,
} from "../financial-data-types";
import { specsForSection, type FieldPattern } from "./metric-aliases";

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

const INCOME_PATTERNS = specsForSection("incomeStatement");
const BALANCE_PATTERNS = specsForSection("balanceSheet");
const CASHFLOW_PATTERNS = specsForSection("cashFlow");
const RATIO_PATTERNS = specsForSection("ratios");
const MARKET_PATTERNS = specsForSection("marketData");

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
  if (sameLine !== null) {
    return pattern.key === "capitalExpenditure" ? Math.abs(sameLine) : sameLine;
  }

  for (const offset of [1, 2, 3]) {
    const next = lines[index + offset];
    if (!next) continue;
    if (looksLikePeriodHeader(next)) continue;
    if (allPatterns.some((item) => lineMatchesLabel(next, item.labels))) continue;
    const value = pickNumericValue(next, pattern);
    if (value !== null) {
      return pattern.key === "capitalExpenditure" ? Math.abs(value) : value;
    }
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
  const periodType: PeriodType = inferPeriodTypeFromLabel(period);

  const incomeStatement = applyPatterns(
    createEmptyIncomeStatement(),
    lines,
    INCOME_PATTERNS,
    ALL_FIELD_PATTERNS,
  );

  const balanceSheet = applyPatterns(
    createEmptyBalanceSheet(),
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
    createEmptyCashFlow(),
    lines,
    CASHFLOW_PATTERNS,
    ALL_FIELD_PATTERNS,
  );

  const ratios = applyPatterns(
    createEmptyRatios(),
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
    periodType,
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
