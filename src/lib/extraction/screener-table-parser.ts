import type {
  FinancialObservation,
  PeriodFinancialData,
  PeriodType,
} from "@/lib/financial-data-types";
import { createEmptyPeriod } from "@/lib/financial-data-types";
import {
  extractNumbersFromLine,
  normalizeText,
} from "@/lib/extraction/financial-parser";
import {
  inferUnit,
  matchMetricSpec,
  METRIC_SPECS,
  type MetricSpec,
} from "@/lib/extraction/metric-aliases";
import {
  classifyScreenshotSection,
  isLikelyAnnualSection,
  isQuarterlySection,
  type ScreenshotSection,
} from "@/lib/extraction/screenshot-classifier";

export type ColumnPeriod = {
  period: string;
  year: number;
  periodType: PeriodType;
  quarter: string | null;
};

export type TableParseResult = {
  section: ScreenshotSection;
  columns: ColumnPeriod[];
  periods: PeriodFinancialData[];
  observations: FinancialObservation[];
};

const HEADER_TOKEN =
  /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s*'?(\d{2,4})/gi;

const METRIC_BY_CANONICAL = new Map(
  METRIC_SPECS.map((spec) => [spec.canonical, spec]),
);

function parseYearToken(raw: string): number | null {
  const year =
    raw.length === 2 ? 2000 + Number.parseInt(raw, 10) : Number.parseInt(raw, 10);
  if (!Number.isFinite(year)) return null;
  const current = new Date().getFullYear();
  if (year < 1990 || year > current + 1) return null;
  return year;
}

function indianFiscalFromMonth(
  month: string,
  calendarYear: number,
): { fy: number; quarter: string } {
  const key = month.slice(0, 3).toLowerCase();
  if (key === "jun") return { fy: calendarYear + 1, quarter: "Q1" };
  if (key === "sep") return { fy: calendarYear + 1, quarter: "Q2" };
  if (key === "dec") return { fy: calendarYear + 1, quarter: "Q3" };
  if (key === "mar") return { fy: calendarYear, quarter: "Q4" };
  if (key === "apr" || key === "may") return { fy: calendarYear + 1, quarter: "Q1" };
  if (key === "jul" || key === "aug") return { fy: calendarYear + 1, quarter: "Q2" };
  if (key === "oct" || key === "nov") return { fy: calendarYear + 1, quarter: "Q3" };
  if (key === "jan" || key === "feb") return { fy: calendarYear, quarter: "Q4" };
  return { fy: calendarYear, quarter: "Q4" };
}

function parseHeaderLine(
  line: string,
  section: ScreenshotSection,
): ColumnPeriod[] {
  const tokens: { month: string; year: number }[] = [];
  for (const match of line.matchAll(HEADER_TOKEN)) {
    const year = parseYearToken(match[2] ?? "");
    if (year === null) continue;
    tokens.push({ month: (match[1] ?? "Mar").slice(0, 3), year });
  }
  if (tokens.length < 2) return [];

  const months = new Set(tokens.map((token) => token.month.toLowerCase()));
  const quarterly =
    isQuarterlySection(section) ||
    (months.size > 1 && !isLikelyAnnualSection(section));

  return tokens.map((token) => {
    const fiscal = indianFiscalFromMonth(token.month, token.year);
    if (quarterly) {
      return {
        period: `${fiscal.quarter} FY${fiscal.fy}`,
        year: fiscal.fy,
        periodType: "quarterly" as const,
        quarter: fiscal.quarter,
      };
    }
    const fy = token.month.toLowerCase() === "mar" ? token.year : fiscal.fy;
    return {
      period: `FY${fy}`,
      year: fy,
      periodType: "annual" as const,
      quarter: null,
    };
  });
}

function findHeaderColumns(
  lines: string[],
  section: ScreenshotSection,
): ColumnPeriod[] {
  let best: ColumnPeriod[] = [];
  for (const line of lines.slice(0, 80)) {
    const columns = parseHeaderLine(line, section);
    if (columns.length > best.length) best = columns;
  }
  if (best.length >= 2) return best;

  const stitched = parseHeaderLine(lines.slice(0, 40).join(" "), section);
  if (stitched.length > best.length) return stitched;
  return best;
}

function alignToHeaders(
  numbers: number[],
  headerCount: number,
): Array<number | null> {
  if (headerCount <= 0) return [];
  if (numbers.length === headerCount) return numbers;
  if (numbers.length === headerCount + 1) {
    return numbers.slice(0, headerCount);
  }
  if (numbers.length > headerCount) {
    return numbers.slice(numbers.length - headerCount);
  }
  const pad = headerCount - numbers.length;
  return [...Array.from({ length: pad }, () => null), ...numbers];
}

function stripLabel(line: string): string {
  return line
    .replace(/-?\(?[\d,]+(?:\.\d+)?\)?%?/g, " ")
    .replace(/[+]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function looksLikeHeader(line: string): boolean {
  return parseHeaderLine(line, "other").length >= 2;
}

function isMostlyNumericLine(line: string): boolean {
  const label = stripLabel(line);
  return label.length < 3 && extractNumbersFromLine(line).length > 0;
}

function pickValue(value: number, spec: MetricSpec, line: string): number {
  if (spec.key === "capitalExpenditure") return Math.abs(value);
  if (spec.preferPercentage || /%/.test(line)) return value;
  return value;
}

export function setSectionValue(
  period: PeriodFinancialData,
  spec: MetricSpec,
  value: number,
  overwrite = false,
): void {
  if (spec.section === "marketData") return;
  const bucket = period[spec.section] as Record<string, number | null>;
  if (!(spec.key in bucket)) return;
  const next = spec.key === "capitalExpenditure" ? Math.abs(value) : value;
  if (overwrite || bucket[spec.key] === null) bucket[spec.key] = next;
}

function numbersForRow(
  lines: string[],
  index: number,
  headerYears: Set<number>,
): { numbers: number[]; consumed: number } {
  const line = lines[index] ?? "";
  const direct = extractNumbersFromLine(line).filter((value) => {
    if (headerYears.has(value) && extractNumbersFromLine(line).length <= 2) {
      return false;
    }
    return true;
  });
  if (direct.length > 0) return { numbers: direct, consumed: 0 };

  for (let offset = 1; offset <= 3; offset += 1) {
    const next = lines[index + offset];
    if (!next) break;
    if (looksLikeHeader(next)) continue;
    if (matchMetricSpec(stripLabel(next))) break;
    if (!isMostlyNumericLine(next) && extractNumbersFromLine(next).length < 2) {
      continue;
    }
    const numbers = extractNumbersFromLine(next);
    if (numbers.length > 0) return { numbers, consumed: offset };
  }
  return { numbers: [], consumed: 0 };
}

export function parseScreenerTables(
  text: string,
  options: {
    source: string;
    confidence: number;
    sourceKind: FinancialObservation["sourceKind"];
  },
): TableParseResult {
  const section = classifyScreenshotSection(text);
  const lines = normalizeText(text)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const columns = findHeaderColumns(lines, section);
  const observations: FinancialObservation[] = [];

  if (columns.length < 2) {
    return { section, columns, periods: [], observations };
  }

  const periods = columns.map((column) =>
    createEmptyPeriod(column.period, column.year, column.periodType),
  );
  const headerYears = new Set(columns.map((column) => column.year));

  const equityCapital: Array<number | null> = columns.map(() => null);
  const reserves: Array<number | null> = columns.map(() => null);

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]!;
    if (looksLikeHeader(line)) continue;
    const label = stripLabel(line);
    if (label.length < 2) continue;
    const { numbers, consumed } = numbersForRow(lines, index, headerYears);
    if (consumed > 0) index += consumed;
    if (numbers.length === 0) continue;

    const aligned = alignToHeaders(numbers, columns.length);
    const equityLabel = /equity capital|share capital/i.test(label);
    const reserveLabel = /\breserves\b/i.test(label);

    if (equityLabel || reserveLabel) {
      aligned.forEach((value, columnIndex) => {
        if (value === null) return;
        if (equityLabel) equityCapital[columnIndex] = value;
        if (reserveLabel) reserves[columnIndex] = value;
      });
      continue;
    }

    const spec = matchMetricSpec(label);
    if (!spec || spec.section === "marketData") continue;

    aligned.forEach((rawValue, columnIndex) => {
      if (rawValue === null) return;
      const column = columns[columnIndex];
      const period = periods[columnIndex];
      if (!column || !period) return;
      const value = pickValue(rawValue, spec, line);
      setSectionValue(period, spec, value);
      observations.push({
        metric: spec.canonical,
        value,
        unit: inferUnit(line, spec),
        period: column.period,
        periodType: column.periodType,
        year: column.year,
        source: options.source,
        sourceKind: options.sourceKind,
        confidence: options.confidence,
        rawText: String(rawValue),
        origin: "extracted",
      });
    });
  }

  periods.forEach((period, index) => {
    if (period.balanceSheet.totalEquity !== null) return;
    const capital = equityCapital[index];
    const reserve = reserves[index];
    if (capital !== null && reserve !== null) {
      period.balanceSheet.totalEquity = capital + reserve;
    } else {
      period.balanceSheet.totalEquity = capital ?? reserve ?? null;
    }
  });

  return {
    section,
    columns,
    periods: periods.filter(
      (period) =>
        Object.values(period.incomeStatement).some((value) => value !== null) ||
        Object.values(period.balanceSheet).some((value) => value !== null) ||
        Object.values(period.cashFlow).some((value) => value !== null) ||
        Object.values(period.ratios).some((value) => value !== null),
    ),
    observations,
  };
}

export function parseChartObservations(
  text: string,
  options: {
    source: string;
    confidence: number;
  },
): FinancialObservation[] {
  const section = classifyScreenshotSection(text);
  if (section !== "charts" && section !== "valuation" && section !== "other") {
    return [];
  }

  const lines = normalizeText(text)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const observations: FinancialObservation[] = [];
  let pendingSpec: MetricSpec | null = null;
  let pendingLabel = "";

  for (const line of lines) {
    const spec = matchMetricSpec(stripLabel(line));
    if (spec) {
      pendingSpec = spec;
      pendingLabel = stripLabel(line);
    }

    const years = [...line.matchAll(/\b(20\d{2})\b/g)]
      .map((match) => parseYearToken(match[1] ?? ""))
      .filter((year): year is number => year !== null);
    if (years.length < 3 || !pendingSpec) continue;

    const uniqueYears = [...new Set(years)].sort((a, b) => a - b);
    const values = extractNumbersFromLine(line).filter(
      (value) => !(value >= 1990 && value <= 2100),
    );
    if (values.length < 3) continue;

    const aligned = alignToHeaders(values, uniqueYears.length);
    aligned.forEach((value, index) => {
      if (value === null) return;
      const year = uniqueYears[index];
      if (year === undefined) return;
      observations.push({
        metric: pendingSpec!.canonical,
        value: pickValue(value, pendingSpec!, line),
        unit: inferUnit(pendingLabel || line, pendingSpec),
        period: `FY${year}`,
        periodType: "annual",
        year,
        source: options.source,
        sourceKind: "chart",
        confidence: Math.max(0, options.confidence - 0.15),
        rawText: String(value),
        origin: "extracted",
      });
    });
  }

  return observations;
}

export function applyObservation(
  period: PeriodFinancialData,
  observation: FinancialObservation,
  overwrite = false,
): void {
  const spec =
    METRIC_BY_CANONICAL.get(observation.metric) ??
    matchMetricSpec(observation.metric.replace(/_/g, " "));
  if (!spec) return;
  setSectionValue(period, spec, observation.value, overwrite);
}
