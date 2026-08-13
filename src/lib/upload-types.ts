export type UploadCategory = "screener" | "balance-sheet" | "profit-loss";

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
    title: "Screener Screenshots",
    description:
      "Overview, ratios, shareholding, quarterly results, P&L, balance sheet, cash flow, and more.",
    accept: ".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp",
    acceptLabel: "PNG, JPG, JPEG, WEBP",
    allowMultiple: true,
  },
  {
    id: "balance-sheet",
    title: "Balance Sheet",
    description: "Upload one or multiple balance sheet documents or images.",
    accept:
      ".pdf,.xlsx,.xls,.csv,.png,.jpg,.jpeg,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv,image/png,image/jpeg",
    acceptLabel: "PDF, XLSX, XLS, CSV, PNG, JPG, JPEG",
    allowMultiple: true,
  },
  {
    id: "profit-loss",
    title: "Profit & Loss",
    description: "Upload one or multiple profit & loss statements or images.",
    accept:
      ".pdf,.xlsx,.xls,.csv,.png,.jpg,.jpeg,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv,image/png,image/jpeg",
    acceptLabel: "PDF, XLSX, XLS, CSV, PNG, JPG, JPEG",
    allowMultiple: true,
  },
];

export const SCREENER_EXTENSIONS = ["png", "jpg", "jpeg", "webp"] as const;

export const STATEMENT_EXTENSIONS = [
  "pdf",
  "xlsx",
  "xls",
  "csv",
  "png",
  "jpg",
  "jpeg",
] as const;
