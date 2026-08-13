import type {
  FinancialValue,
  PeriodFinancialData,
} from "@/lib/financial-data-types";
import {
  countExtractedFields,
  inferPeriodType,
  periodIdentityKey,
} from "@/lib/financial-data-types";

const STALE_YEAR_GAP = 12;

function currentYear(): number {
  return new Date().getFullYear();
}

function isRecentYear(year: number | null): boolean {
  return year !== null && year >= currentYear() - STALE_YEAR_GAP;
}

function fillSection<T extends Record<string, FinancialValue>>(
  existing: T,
  incoming: T,
): T {
  const merged = { ...existing };
  for (const key of Object.keys(incoming) as Array<keyof T>) {
    if (incoming[key] !== null) merged[key] = incoming[key];
  }
  return merged;
}

function preferYear(
  existing: number | null,
  incoming: number | null,
): number | null {
  if (isRecentYear(incoming) && !isRecentYear(existing)) return incoming;
  if (isRecentYear(existing) && !isRecentYear(incoming)) return existing;
  if (incoming !== null && existing !== null) {
    return Math.max(incoming, existing);
  }
  return incoming ?? existing;
}

function displayPeriod(year: number | null, fallback: string | null): string | null {
  if (isRecentYear(year)) return `FY${year}`;
  if (fallback && !stalePeriodLabel(fallback)) return fallback;
  if (year !== null && isRecentYear(year)) return `FY${year}`;
  return null;
}

function stalePeriodLabel(label: string): boolean {
  const match = label.match(/\b(19|20)\d{2}\b/);
  if (!match) return false;
  const year = Number.parseInt(match[0] ?? "", 10);
  return !isRecentYear(year);
}

export function periodBucketKey(period: {
  year: number | null;
  period: string | null;
  periodType?: PeriodFinancialData["periodType"];
}): string {
  return periodIdentityKey(period);
}

export function mergePeriodRecords(
  existing: PeriodFinancialData,
  incoming: PeriodFinancialData,
): PeriodFinancialData {
  const year = preferYear(existing.year, incoming.year);
  const period =
    displayPeriod(year, incoming.period) ??
    displayPeriod(year, existing.period) ??
    existing.period ??
    incoming.period;

  return {
    period,
    year,
    periodType:
      existing.periodType !== "unknown"
        ? existing.periodType
        : incoming.periodType,
    incomeStatement: fillSection(
      existing.incomeStatement,
      incoming.incomeStatement,
    ),
    balanceSheet: fillSection(existing.balanceSheet, incoming.balanceSheet),
    cashFlow: fillSection(existing.cashFlow, incoming.cashFlow),
    ratios: fillSection(existing.ratios, incoming.ratios),
  };
}

export function assembleCreditSnapshot(
  periods: PeriodFinancialData[],
): PeriodFinancialData | null {
  const annual = periods.filter(
    (period) => inferPeriodType(period) !== "quarterly",
  );
  const usable = (annual.length > 0 ? annual : periods).filter(
    (period) => countExtractedFields(period) > 0,
  );
  if (usable.length === 0) return null;

  const ordered = [...usable].sort((a, b) => (a.year ?? 0) - (b.year ?? 0));
  const merged = ordered.reduce((current, period) =>
    mergePeriodRecords(current, period),
  );

  const recent = usable.filter((period) => isRecentYear(period.year));
  const labelSource =
    recent.sort((a, b) => (b.year ?? 0) - (a.year ?? 0))[0] ?? merged;
  const year = preferYear(null, labelSource.year);
  return {
    ...merged,
    year,
    periodType: inferPeriodType(labelSource),
    period: displayPeriod(year, labelSource.period) ?? merged.period,
  };
}

export function consolidateExtractedPeriods(
  periods: PeriodFinancialData[],
): PeriodFinancialData[] {
  if (periods.length <= 1) return periods;

  const byKey = new Map<string, PeriodFinancialData>();
  for (const period of periods) {
    const key = periodBucketKey(period);
    const existing = byKey.get(key);
    byKey.set(key, existing ? mergePeriodRecords(existing, period) : period);
  }
  const grouped = [...byKey.values()];
  if (grouped.length <= 1) return grouped;

  const years = grouped
    .map((period) => period.year)
    .filter((year): year is number => year !== null)
    .sort((a, b) => a - b);

  if (years.length === 0) {
    return [
      grouped.reduce((merged, period) => mergePeriodRecords(merged, period)),
    ];
  }

  const maxYear = years[years.length - 1]!;
  const uniqueYears = [...new Set(years)];
  const looksLikeHistory =
    uniqueYears.length >= 3 &&
    maxYear - uniqueYears[0]! <= uniqueYears.length + 2;

  if (looksLikeHistory) {
    const unknown = grouped.filter((period) => period.year === null);
    const dated = grouped.filter((period) => period.year !== null);
    if (unknown.length === 0) return dated;
    const latestDated =
      dated.find((period) => period.year === maxYear) ?? dated[0]!;
    const foldedUnknown = unknown.reduce(
      (merged, period) => mergePeriodRecords(merged, period),
      latestDated,
    );
    return dated.map((period) =>
      period.year === maxYear ? foldedUnknown : period,
    );
  }

  let latest =
    grouped.find((period) => period.year === maxYear) ?? grouped[0]!;
  const kept: PeriodFinancialData[] = [];
  for (const period of grouped) {
    if (period === latest) continue;
    const isOutlier = period.year === null || maxYear - period.year >= 8;
    if (isOutlier) latest = mergePeriodRecords(latest, period);
    else kept.push(period);
  }

  return [...kept, latest];
}
