import type {
  NormalizedFinancialData,
  PeriodFinancialData,
  ProcessedFileRecord,
} from "@/lib/financial-data-types";
import {
  countAllExtractedFields,
  countExtractedFields,
  createEmptyMarketData,
  createEmptyPeriod,
} from "@/lib/financial-data-types";
import type { UploadCategory, UploadedFileEntry } from "@/lib/upload-types";
import { extractTextFromFile } from "./file-extractor";
import {
  mergePeriodData,
  parseFinancialText,
  parseMarketData,
} from "./financial-parser";

type ProcessInput = {
  id: string;
  file: File;
  category: UploadCategory;
};

function periodKey(period: PeriodFinancialData): string {
  return `${period.year ?? "unknown"}-${period.period ?? "unknown"}`;
}

function mergeIntoPeriods(
  periods: PeriodFinancialData[],
  parsed: ReturnType<typeof parseFinancialText>,
): PeriodFinancialData[] {
  const key = `${parsed.year ?? "unknown"}-${parsed.period ?? "unknown"}`;
  const existing = periods.find((p) => periodKey(p) === key);

  if (existing) {
    return periods.map((p) =>
      periodKey(p) === key
        ? {
            ...p,
            period: p.period ?? parsed.period,
            year: p.year ?? parsed.year,
            incomeStatement: mergePeriodData(
              p.incomeStatement,
              parsed.incomeStatement,
            ),
            balanceSheet: mergePeriodData(p.balanceSheet, parsed.balanceSheet),
            cashFlow: mergePeriodData(p.cashFlow, parsed.cashFlow),
            ratios: mergePeriodData(p.ratios, parsed.ratios),
          }
        : p,
    );
  }

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

export async function processFinancialFiles(
  files: ProcessInput[],
): Promise<NormalizedFinancialData> {
  let company: string | null = null;
  let periods: PeriodFinancialData[] = [];
  const marketData = createEmptyMarketData();
  const sourceFiles: ProcessedFileRecord[] = [];

  for (const { id, file, category } of files) {
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

    if (parsed.company && !company) company = parsed.company;
    periods = mergeIntoPeriods(periods, parsed);

    const mergedMarket = mergePeriodData(marketData, market);
    Object.assign(marketData, mergedMarket);

    const latestPeriod =
      periods.find(
        (p) =>
          `${p.year ?? "unknown"}-${p.period ?? "unknown"}` ===
          `${parsed.year ?? "unknown"}-${parsed.period ?? "unknown"}`,
      ) ?? createEmptyPeriod(parsed.period, parsed.year);

    const fieldsExtracted =
      countExtractedFields(latestPeriod) +
      Object.values(market).filter((v) => v !== null).length;

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
  }

  periods.sort((a, b) => (b.year ?? 0) - (a.year ?? 0));

  const filesSuccessfullyParsed = sourceFiles.filter(
    (f) => f.status === "success" || f.status === "partial",
  ).length;
  const filesRequiringReview = sourceFiles.filter(
    (f) => f.status === "review" || f.status === "partial",
  ).length;

  return {
    company,
    periods,
    marketData,
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
    for (const entry of files) {
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
