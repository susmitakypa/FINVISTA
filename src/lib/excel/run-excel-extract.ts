import { processFinancialFiles } from "@/lib/extraction/process-financial-files";
import type { UploadCategory } from "@/lib/upload-types";
import { isImageFile } from "@/lib/upload-utils";
import {
  toExcelCsv,
  toExcelExtractResponse,
  type ExcelExtractResponse,
} from "./excel-extract-response";

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

export async function extractScreenshotsForExcel(
  files: File[],
  category: UploadCategory,
): Promise<ExcelExtractResponse> {
  const inputs = files.map((file, index) => ({
    id: `excel-${Date.now()}-${index}`,
    file,
    category,
  }));
  const data = await processFinancialFiles(inputs);
  return toExcelExtractResponse(data);
}

export { toExcelCsv };
