import type {
  DebtFacility,
  DocumentCoverage,
  NormalizedFinancialData,
  PeriodFinancialData,
  ProcessedFileRecord,
  QualitativeInsights,
} from "@/lib/financial-data-types";
import {
  countAllExtractedFields,
  countExtractedFields,
  createEmptyDocumentCoverage,
  createEmptyMarketData,
  createEmptyPeriod,
  createEmptyQualitative,
} from "@/lib/financial-data-types";
import type { UploadCategory, UploadedFileEntry } from "@/lib/upload-types";
import { extractTextFromFile } from "./file-extractor";
import {
  mergePeriodData,
  parseFinancialText,
  parseMarketData,
} from "./financial-parser";
import { mergeQualitative, parseQualitativeText } from "./qualitative-parser";
import { mergeDebtFacilities, parseDebtFacilities } from "./debt-parser";

type ProcessInput = {
  id: string;
  file: File;
  category: UploadCategory;
};

function periodKey(period: { year: number | null; period: string | null }): string {
  return `${period.year ?? "unknown"}-${period.period ?? "unknown"}`;
}

function sourceRank(category: UploadCategory, periodLabel: string | null): number {
  const isQuarter = /Q[1-4]/i.test(periodLabel ?? "");
  if (isQuarter && category === "quarterly-results") return 50;
  if (!isQuarter && category === "annual-report") return 50;
  if (category === "quarterly-results") return 40;
  if (category === "annual-report") return 40;
  if (category === "screener") return 30;
  return 20;
}

function mergePreferIncoming<T extends Record<string, number | null>>(
  existing: T,
  incoming: T,
  preferIncoming: boolean,
): T {
  const merged = { ...existing };
  for (const key of Object.keys(incoming) as Array<keyof T>) {
    if (incoming[key] === null) continue;
    if (merged[key] === null || preferIncoming) {
      merged[key] = incoming[key];
    }
  }
  return merged;
}

function mergeIntoPeriods(
  periods: PeriodFinancialData[],
  parsed: ReturnType<typeof parseFinancialText>,
  category: UploadCategory,
  ranks: Map<string, number>,
): PeriodFinancialData[] {
  const key = periodKey(parsed);
  const incomingRank = sourceRank(category, parsed.period);
  const existing = periods.find((item) => periodKey(item) === key);
  const existingRank = ranks.get(key) ?? 0;
  const preferIncoming = incomingRank >= existingRank;

  if (existing) {
    ranks.set(key, Math.max(existingRank, incomingRank));
    return periods.map((item) =>
      periodKey(item) === key
        ? {
            ...item,
            period: item.period ?? parsed.period,
            year: item.year ?? parsed.year,
            incomeStatement: mergePreferIncoming(
              item.incomeStatement,
              parsed.incomeStatement,
              preferIncoming,
            ),
            balanceSheet: mergePreferIncoming(
              item.balanceSheet,
              parsed.balanceSheet,
              preferIncoming,
            ),
            cashFlow: mergePreferIncoming(
              item.cashFlow,
              parsed.cashFlow,
              preferIncoming,
            ),
            ratios: mergePreferIncoming(item.ratios, parsed.ratios, preferIncoming),
          }
        : item,
    );
  }

  ranks.set(key, incomingRank);
  return [
    ...periods,
    {
      period: parsed.period,
      year: parsed.year,
      incomeStatement: parsed.incomeStatement,
      balanceSheet: parsed.balanceSheet,
      cashFlow: parsed.cashFlow,
      ratios: parsed.ratios,
    },
  ];
}

function coverageFromFiles(sourceFiles: ProcessedFileRecord[]): DocumentCoverage {
  const coverage = createEmptyDocumentCoverage();
  for (const file of sourceFiles) {
    if (file.status === "failed") continue;
    if (file.category === "screener") coverage.screener = true;
    if (file.category === "annual-report") coverage.annualReport = true;
    if (file.category === "investor-presentation") {
      coverage.investorPresentation = true;
    }
    if (file.category === "quarterly-results") coverage.quarterlyResults = true;
  }
  return coverage;
}

export async function processFinancialFiles(
  files: ProcessInput[],
): Promise<NormalizedFinancialData> {
  let company: string | null = null;
  let periods: PeriodFinancialData[] = [];
  const marketData = createEmptyMarketData();
  let qualitative: QualitativeInsights = createEmptyQualitative();
  let debtFacilities: DebtFacility[] = [];
  const sourceFiles: ProcessedFileRecord[] = [];
  const ranks = new Map<string, number>();

  for (const { id, file, category } of files) {
    try {
      const extraction = await extractTextFromFile(file);

      if (extraction.error && extraction.text.length < 10) {
        sourceFiles.push({
          id,
          name: file.name,
          category,
          status: "failed",
          error: extraction.error,
          extractedTextLength: extraction.text.length,
          fieldsExtracted: 0,
          preserved: true,
        });
        continue;
      }

      const parsed = parseFinancialText(extraction.text);
      const market = parseMarketData(extraction.text);
      const incomingQualitative = parseQualitativeText(extraction.text);

      if (parsed.company && !company) company = parsed.company;
      periods = mergeIntoPeriods(periods, parsed, category, ranks);

      const preferMarket =
        sourceRank(category, parsed.period) >= 30;
      Object.assign(
        marketData,
        preferMarket
          ? mergePreferIncoming(marketData, market, true)
          : mergePeriodData(marketData, market),
      );
      qualitative = mergeQualitative(
        qualitative,
        incomingQualitative,
        category === "investor-presentation" || category === "annual-report",
      );
      debtFacilities = mergeDebtFacilities(
        debtFacilities,
        parseDebtFacilities(extraction.text, category),
      );

      const latestPeriod =
        periods.find((item) => periodKey(item) === periodKey(parsed)) ??
        createEmptyPeriod(parsed.period, parsed.year);

      const fieldsExtracted =
        countExtractedFields(latestPeriod) +
        Object.values(market).filter((value) => value !== null).length +
        Object.values(incomingQualitative).filter(Boolean).length;

      const hasFinancialFields = fieldsExtracted > 0;
      const status =
        extraction.error || !hasFinancialFields
          ? "review"
          : extraction.text.length < 50
            ? "partial"
            : "success";

      sourceFiles.push({
        id,
        name: file.name,
        category,
        status,
        error: extraction.error,
        extractedTextLength: extraction.text.length,
        fieldsExtracted,
        preserved: true,
      });
    } catch (error) {
      sourceFiles.push({
        id,
        name: file.name,
        category,
        status: "failed",
        error:
          error instanceof Error
            ? error.message
            : `${file.name} could not be processed.`,
        extractedTextLength: 0,
        fieldsExtracted: 0,
        preserved: true,
      });
    }
  }

  periods.sort((a, b) => (b.year ?? 0) - (a.year ?? 0));

  if (periods.length === 0) {
    periods = [createEmptyPeriod()];
  }

  const filesSuccessfullyParsed = sourceFiles.filter(
    (file) => file.status === "success" || file.status === "partial",
  ).length;
  const filesRequiringReview = sourceFiles.filter(
    (file) => file.status === "review" || file.status === "partial",
  ).length;

  return {
    company,
    currency: null,
    periods,
    marketData,
    qualitative,
    documentCoverage: coverageFromFiles(sourceFiles),
    debtFacilities,
    sourceFiles,
    summary: {
      filesProcessed: sourceFiles.length,
      filesSuccessfullyParsed,
      filesRequiringReview,
      totalFieldsExtracted: countAllExtractedFields(periods),
      processedAt: new Date().toISOString(),
    },
  };
}

export function filesToProcessInput(
  filesByCategory: Record<UploadCategory, UploadedFileEntry[]>,
): ProcessInput[] {
  const entries: ProcessInput[] = [];

  for (const [category, files] of Object.entries(filesByCategory) as [
    UploadCategory,
    UploadedFileEntry[],
  ][]) {
    for (const entry of files ?? []) {
      if (entry.status === "success") {
        entries.push({
          id: entry.id,
          file: entry.file,
          category,
        });
      }
    }
  }

  return entries;
}
