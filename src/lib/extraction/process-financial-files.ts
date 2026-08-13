import type {
  DebtFacility,
  DocumentCoverage,
  FinancialObservation,
  NormalizedFinancialData,
  ObservationSourceKind,
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
  periodIdentityKey,
} from "@/lib/financial-data-types";
import type { UploadCategory, UploadedFileEntry } from "@/lib/upload-types";
import { enrichPeriodsWithDerived } from "@/lib/analysis/derived-metrics";
import { extractTextFromFile } from "./file-extractor";
import { buildExtractionValidation } from "./extraction-validation";
import {
  mergePeriodData,
  parseFinancialText,
  parseMarketData,
} from "./financial-parser";
import { consolidateExtractedPeriods } from "@/lib/financial-period-merge";
import { mergeQualitative, parseQualitativeText } from "./qualitative-parser";
import { mergeDebtFacilities, parseDebtFacilities } from "./debt-parser";
import {
  applyObservation,
  parseChartObservations,
  parseScreenerTables,
} from "./screener-table-parser";

type ProcessInput = {
  id: string;
  file: File;
  category: UploadCategory;
};

function sourceKind(
  category: UploadCategory,
  fromTable: boolean,
  fromChart: boolean,
): ObservationSourceKind {
  if (category === "annual-report") return "annual_report";
  if (fromChart) return "chart";
  if (fromTable) return "screener_table";
  return "screener_screenshot";
}

function sourceRank(
  category: UploadCategory,
  kind: ObservationSourceKind,
): number {
  if (kind === "annual_report" || category === "annual-report") return 50;
  if (kind === "screener_table") return 35;
  if (category === "quarterly-results") return 40;
  if (kind === "screener_screenshot") return 25;
  if (kind === "chart") return 10;
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

function mergeParsedPeriod(
  periods: PeriodFinancialData[],
  parsed: PeriodFinancialData,
  rank: number,
  ranks: Map<string, number>,
): PeriodFinancialData[] {
  const key = periodIdentityKey(parsed);
  const existing = periods.find((item) => periodIdentityKey(item) === key);
  const existingRank = ranks.get(key) ?? 0;
  const preferIncoming = rank >= existingRank;

  if (existing) {
    ranks.set(key, Math.max(existingRank, rank));
    return periods.map((item) =>
      periodIdentityKey(item) === key
        ? {
            ...item,
            period: item.period ?? parsed.period,
            year: item.year ?? parsed.year,
            periodType:
              item.periodType !== "unknown" ? item.periodType : parsed.periodType,
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

  ranks.set(key, rank);
  return [...periods, parsed];
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
  const companyNames: string[] = [];
  let periods: PeriodFinancialData[] = [];
  const marketData = createEmptyMarketData();
  let qualitative: QualitativeInsights = createEmptyQualitative();
  let debtFacilities: DebtFacility[] = [];
  const sourceFiles: ProcessedFileRecord[] = [];
  const ranks = new Map<string, number>();
  const observations: FinancialObservation[] = [];
  let screenshotsProcessed = 0;
  let cashFlowOcrDetected = false;
  let cashFlowParserDetected = false;
  let cashFlowOcrPreview = "";

  for (const { id, file, category } of files) {
    try {
      const extraction = await extractTextFromFile(file);
      const isImage = file.type.startsWith("image/");
      if (isImage) screenshotsProcessed += 1;

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

      const confidence =
        typeof extraction.confidence === "number"
          ? extraction.confidence
          : extraction.text.length > 80
            ? 0.75
            : 0.45;
      const tableKind = sourceKind(category, true, false);
      const table = parseScreenerTables(extraction.text, {
        source: file.name,
        confidence,
        sourceKind: tableKind,
      });
      const chartObs = parseChartObservations(extraction.text, {
        source: file.name,
        confidence,
      });
      const parsed = parseFinancialText(extraction.text);
      const market = parseMarketData(extraction.text);
      const incomingQualitative = parseQualitativeText(extraction.text);

      if (parsed.company) companyNames.push(parsed.company);

      const ocrHints = /cash\s+fr[o0mn]{0,3}\s+operat|operating cash flow|\bcfo\b|capex|capital exp/i.test(
        extraction.text,
      );
      if (ocrHints) {
        cashFlowOcrDetected = true;
        if (!cashFlowOcrPreview) cashFlowOcrPreview = extraction.text.slice(0, 800);
      }
      const tableCfo = table.observations.some((item) => item.metric === "cfo");
      const tableCapex = table.observations.some((item) => item.metric === "capex");
      if (
        tableCfo ||
        tableCapex ||
        parsed.cashFlow.operatingCashFlow !== null ||
        parsed.cashFlow.capitalExpenditure !== null
      ) {
        cashFlowParserDetected = true;
      }
      if (typeof console !== "undefined") {
        console.info("[FINVISTA CF] OCR", {
          file: file.name,
          section: table.section,
          ocrLength: extraction.text.length,
          ocrHints,
          tableColumns: table.columns.map((column) => column.period),
          tableCfo: table.observations.filter((item) => item.metric === "cfo").length,
          tableCapex: table.observations.filter((item) => item.metric === "capex").length,
          preview: extraction.text.slice(0, 400),
        });
      }

      let fileFieldCount = 0;
      const tableKindRank = sourceRank(category, tableKind);
      if (table.periods.length > 0) {
        for (const period of table.periods) {
          periods = mergeParsedPeriod(periods, period, tableKindRank, ranks);
          fileFieldCount += countExtractedFields(period);
        }
        observations.push(...table.observations);
      }

      const fallbackKind = sourceKind(category, false, false);
      const fallbackPeriod = createEmptyPeriod(
        parsed.period,
        parsed.year,
        parsed.periodType,
      );
      fallbackPeriod.incomeStatement = parsed.incomeStatement;
      fallbackPeriod.balanceSheet = parsed.balanceSheet;
      fallbackPeriod.cashFlow = parsed.cashFlow;
      fallbackPeriod.ratios = parsed.ratios;
      const fallbackHasFields = countExtractedFields(fallbackPeriod) > 0;
      if (fallbackHasFields) {
        periods = mergeParsedPeriod(
          periods,
          fallbackPeriod,
          table.periods.length > 0 ? 0 : sourceRank(category, fallbackKind),
          ranks,
        );
        if (table.periods.length === 0) {
          fileFieldCount = countExtractedFields(fallbackPeriod);
        }
      }

      if (typeof console !== "undefined") {
        const cfoPeriods = periods.filter(
          (period) => period.cashFlow.operatingCashFlow !== null,
        );
        console.info("[FINVISTA CF] parsed", {
          file: file.name,
          lineParserCfo: parsed.cashFlow.operatingCashFlow,
          lineParserCapex: parsed.cashFlow.capitalExpenditure,
          mergedCfoPeriods: cfoPeriods.map((period) => ({
            period: period.period,
            cfo: period.cashFlow.operatingCashFlow,
            capex: period.cashFlow.capitalExpenditure,
          })),
        });
      }

      if (chartObs.length > 0) {
        const rank = sourceRank(category, "chart");
        for (const observation of chartObs) {
          const target =
            periods.find(
              (item) =>
                item.period === observation.period &&
                item.periodType === observation.periodType,
            ) ??
            createEmptyPeriod(
              observation.period,
              observation.year,
              observation.periodType,
            );
          applyObservation(target, observation, false);
          periods = mergeParsedPeriod(periods, target, rank, ranks);
        }
        observations.push(...chartObs);
      }

      const preferMarket = sourceRank(category, tableKind) >= 30;
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

      const fieldsExtracted =
        fileFieldCount +
        Object.values(market).filter((value) => value !== null).length +
        Object.values(incomingQualitative).filter(Boolean).length;

      const hasFinancialFields = fieldsExtracted > 0 || table.observations.length > 0;
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

  periods = consolidateExtractedPeriods(periods);
  const enriched = enrichPeriodsWithDerived(periods);
  periods = enriched.periods;
  observations.push(...enriched.calculated);
  periods.sort((a, b) => {
    const yearDiff = (b.year ?? 0) - (a.year ?? 0);
    if (yearDiff !== 0) return yearDiff;
    return (a.period ?? "").localeCompare(b.period ?? "");
  });

  if (periods.length === 0) {
    periods = [createEmptyPeriod()];
  }

  const filesSuccessfullyParsed = sourceFiles.filter(
    (file) => file.status === "success" || file.status === "partial",
  ).length;
  const filesRequiringReview = sourceFiles.filter(
    (file) => file.status === "review" || file.status === "partial",
  ).length;

  const company = reconcileCompanyNames(companyNames);

  const data: NormalizedFinancialData = {
    company,
    currency: null,
    periods,
    observations,
    extractionValidation: null,
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

  data.extractionValidation = buildExtractionValidation({
    data,
    observations,
    screenshotsProcessed,
    calculatedCount: enriched.calculated.length,
    cashFlowOcrDetected,
    cashFlowParserDetected,
    cashFlowOcrPreview,
  });

  return data;
}

function reconcileCompanyNames(names: string[]): string | null {
  const cleaned = names
    .map((name) => name.trim())
    .filter((name) => name.length >= 2 && name.length <= 120);
  if (cleaned.length === 0) return null;
  const counts = new Map<string, { display: string; count: number }>();
  for (const name of cleaned) {
    const key = name.toLowerCase();
    const existing = counts.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      counts.set(key, { display: name, count: 1 });
    }
  }
  return [...counts.values()].sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return b.display.length - a.display.length;
  })[0]!.display;
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
