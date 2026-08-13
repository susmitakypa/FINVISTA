import type { UploadCategory } from "./upload-types";
import {
  PDF_EXTENSIONS,
  PRESENTATION_EXTENSIONS,
  SCREENER_EXTENSIONS,
} from "./upload-types";

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const value = bytes / 1024 ** index;
  return `${value >= 10 || index === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[index]}`;
}

function getExtension(filename: string): string {
  const parts = filename.split(".");
  return parts.length > 1 ? (parts.at(-1)?.toLowerCase() ?? "") : "";
}

export function isImageFile(file: File): boolean {
  if (file.type.startsWith("image/")) return true;
  const ext = getExtension(file.name);
  return ["png", "jpg", "jpeg", "webp"].includes(ext);
}

export type DocumentKind =
  | "pdf"
  | "spreadsheet"
  | "csv"
  | "image"
  | "presentation"
  | "unknown";

export function getDocumentKind(file: File): DocumentKind {
  if (isImageFile(file)) return "image";

  const ext = getExtension(file.name);
  if (ext === "pdf" || file.type === "application/pdf") return "pdf";
  if (ext === "csv" || file.type === "text/csv") return "csv";
  if (["ppt", "pptx"].includes(ext) || file.type.includes("presentation") || file.type.includes("powerpoint")) {
    return "presentation";
  }
  if (
    ["xlsx", "xls"].includes(ext) ||
    file.type.includes("spreadsheet") ||
    file.type.includes("excel")
  ) {
    return "spreadsheet";
  }

  return "unknown";
}

export function getDocumentLabel(kind: DocumentKind): string {
  switch (kind) {
    case "pdf":
      return "PDF";
    case "spreadsheet":
      return "Spreadsheet";
    case "csv":
      return "CSV";
    case "image":
      return "Image";
    case "presentation":
      return "Presentation";
    default:
      return "Document";
  }
}

function isAllowedExtension(
  filename: string,
  allowed: readonly string[],
): boolean {
  const ext = getExtension(filename);
  return allowed.includes(ext);
}

export function validateFileForCategory(
  file: File,
  category: UploadCategory,
): string | null {
  if (category === "screener") {
    if (!isImageFile(file) || !isAllowedExtension(file.name, SCREENER_EXTENSIONS)) {
      return `"${file.name}" is not a supported screenshot format. Use PNG, JPG, JPEG, or WEBP.`;
    }
    return null;
  }

  if (category === "annual-report" || category === "quarterly-results") {
    if (!isAllowedExtension(file.name, PDF_EXTENSIONS) && file.type !== "application/pdf") {
      return `"${file.name}" must be a PDF.`;
    }
    return null;
  }

  if (category === "investor-presentation") {
    if (!isAllowedExtension(file.name, PRESENTATION_EXTENSIONS)) {
      return `"${file.name}" is not a supported presentation format. Use PDF, PPT, or PPTX.`;
    }
    return null;
  }

  return `"${file.name}" is not a supported format for this category.`;
}

export function createFileId(file: File): string {
  return `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`;
}

export async function simulateFileIngestion(
  delayMs = 600,
): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, delayMs));
}
