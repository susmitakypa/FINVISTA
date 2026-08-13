import {
  getDocumentKind,
  getDocumentLabel,
  isImageFile,
} from "@/lib/upload-utils";

type FilePreviewProps = {
  file: File;
  previewUrl?: string;
  compact?: boolean;
};

const compactSize = "h-12 w-12";
const fullSize = "h-16 w-16";

function DocumentIcon({
  kind,
  sizeClass,
}: {
  kind: ReturnType<typeof getDocumentKind>;
  sizeClass: string;
}) {
  const colorClass =
    kind === "pdf"
      ? "text-rose-400 bg-rose-500/10 ring-rose-400/20"
      : kind === "csv"
        ? "text-emerald-400 bg-emerald-500/10 ring-emerald-400/20"
        : kind === "spreadsheet"
          ? "text-green-400 bg-green-500/10 ring-green-400/20"
          : "text-slate-400 bg-white/5 ring-white/10";

  return (
    <div
      className={`flex items-center justify-center rounded-lg ring-1 ${colorClass} ${sizeClass}`}
    >
      <svg
        className="h-6 w-6"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        aria-hidden="true"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    </div>
  );
}

export function FilePreview({ file, previewUrl, compact = false }: FilePreviewProps) {
  const sizeClass = compact ? compactSize : fullSize;
  const kind = getDocumentKind(file);

  if (isImageFile(file) && previewUrl) {
    return (
      <div
        className={`relative overflow-hidden rounded-lg ring-1 ring-white/10 ${sizeClass}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={previewUrl}
          alt={`Preview of ${file.name}`}
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  if (isImageFile(file) && !previewUrl) {
    return (
      <div
        className={`flex items-center justify-center rounded-lg bg-sky-500/10 ring-1 ring-sky-400/20 ${sizeClass}`}
      >
        <svg
          className="h-6 w-6 text-sky-400"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          aria-hidden="true"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <DocumentIcon kind={kind} sizeClass={sizeClass} />
      {!compact && (
        <span className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
          {getDocumentLabel(kind)}
        </span>
      )}
    </div>
  );
}
