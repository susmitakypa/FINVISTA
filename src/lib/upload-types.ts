export type UploadCategory =
  | "screener"
  | "annual-report"
  | "investor-presentation"
  | "quarterly-results";

export type LegacyUploadCategory = "balance-sheet" | "profit-loss";

export type UploadFileStatus = "loading" | "success" | "error";

export type UploadedFileEntry = {
  id: string;
  file: File;
  previewUrl?: string;
  status: UploadFileStatus;
  error?: string;
};

export type UploadCategoryConfig = {
  id: UploadCategory;
  title: string;
  description: string;
  accept: string;
  acceptLabel: string;
  allowMultiple: true;
};

export const UPLOAD_CATEGORIES: UploadCategoryConfig[] = [
  {
    id: "screener",
    title: "Screener / Financial Screenshots",
    description:
      "Upload screenshots of Screener, P&L, Balance Sheet, Cash Flow or other financial data.",
    accept: ".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp",
    acceptLabel: "PNG, JPG, JPEG, WEBP",
    allowMultiple: true,
  },
  {
    id: "annual-report",
    title: "Annual Report",
    description:
      "Upload the company's latest annual report for historical financials, debt, cash flow, notes and management information.",
    accept: ".pdf,application/pdf",
    acceptLabel: "PDF",
    allowMultiple: true,
  },
  {
    id: "investor-presentation",
    title: "Investor Presentation",
    description:
      "Upload the latest investor presentation for management commentary, guidance, business outlook and growth plans.",
    accept:
      ".pdf,.ppt,.pptx,application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation",
    acceptLabel: "PDF, PPT, PPTX",
    allowMultiple: true,
  },
  {
    id: "quarterly-results",
    title: "Latest Quarterly Results",
    description:
      "Upload the latest quarterly financial results for recent revenue, profitability, margins and balance-sheet information.",
    accept: ".pdf,application/pdf",
    acceptLabel: "PDF",
    allowMultiple: true,
  },
];

export const SCREENER_EXTENSIONS = ["png", "jpg", "jpeg", "webp"] as const;

export const PDF_EXTENSIONS = ["pdf"] as const;

export const PRESENTATION_EXTENSIONS = ["pdf", "ppt", "pptx"] as const;

export const DOCUMENT_SOURCE_LABELS: Record<UploadCategory, string> = {
  screener: "Screener",
  "annual-report": "Annual Report",
  "investor-presentation": "Investor Presentation",
  "quarterly-results": "Quarterly Results",
};

export function migrateUploadCategory(
  category: string,
): UploadCategory | null {
  if (
    category === "screener" ||
    category === "annual-report" ||
    category === "investor-presentation" ||
    category === "quarterly-results"
  ) {
    return category;
  }
  if (category === "balance-sheet" || category === "profit-loss") {
    return "screener";
  }
  return null;
}
