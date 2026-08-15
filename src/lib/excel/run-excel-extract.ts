import { processFinancialFiles } from "@/lib/extraction/process-financial-files";
import type { NormalizedFinancialData } from "@/lib/financial-data-types";
import type { UploadCategory } from "@/lib/upload-types";
import { isImageFile } from "@/lib/upload-utils";
import { toExcelCsv, toExcelExtractResponse } from "./excel-extract-response";

const ALLOWED_CATEGORIES: UploadCategory[] = [
  "screener",
  "annual-report",
  "investor-presentation",
  "quarterly-results",
];

const IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
]);

export function parseUploadCategory(raw: string | null): UploadCategory {
  if (raw && (ALLOWED_CATEGORIES as string[]).includes(raw)) {
    return raw as UploadCategory;
  }
  return "screener";
}

export function isAllowedScreenshot(file: File): boolean {
  if (IMAGE_TYPES.has(file.type) || isImageFile(file)) return true;
  const name = file.name.toLowerCase();
  return name.endsWith(".png") || name.endsWith(".jpg") || name.endsWith(".jpeg") || name.endsWith(".webp");
}

function mimeForScreenshot(file: File): string {
  if (file.type && IMAGE_TYPES.has(file.type)) return file.type;
  const name = file.name.toLowerCase();
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
  if (name.endsWith(".webp")) return "image/webp";
  return "image/png";
}

export async function extractScreenshotsForExcel(
  files: File[],
  category: UploadCategory,
): Promise<NormalizedFinancialData> {
  const inputs = await Promise.all(
    files.map(async (file, index) => {
      const bytes = await file.arrayBuffer();
      const copy = new File([bytes], file.name || `screenshot-${index + 1}.png`, {
        type: mimeForScreenshot(file),
      });
      return {
        id: `excel-${Date.now()}-${index}`,
        file: copy,
        category,
      };
    }),
  );
  return processFinancialFiles(inputs);
}

export { toExcelCsv, toExcelExtractResponse };
