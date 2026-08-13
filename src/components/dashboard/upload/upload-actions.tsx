"use client";

type UploadActionsProps = {
  totalFileCount: number;
  hasSuccessfulFiles: boolean;
  processState:
    | { status: "idle" }
    | { status: "processing" }
    | { status: "ready"; message: string }
    | { status: "error"; message: string };
  onClearAll: () => void;
  onProcess: () => void;
};

function SpinnerIcon() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

export function UploadActions({
  totalFileCount,
  hasSuccessfulFiles,
  processState,
  onClearAll,
  onProcess,
}: UploadActionsProps) {
  const isProcessing = processState.status === "processing";

  return (
    <div className="mt-8 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClearAll}
            disabled={totalFileCount === 0 || isProcessing}
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-400 transition-all duration-200 hover:border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-300 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Clear All
          </button>
          <span className="text-xs text-slate-600">
            {totalFileCount > 0
              ? `${totalFileCount} file${totalFileCount === 1 ? "" : "s"} selected across all categories`
              : "No files selected yet"}
          </span>
        </div>

        <button
          type="button"
          onClick={onProcess}
          disabled={!hasSuccessfulFiles || isProcessing}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-sky-500 to-indigo-500 px-6 py-3 text-sm font-semibold text-white shadow-[0_4px_24px_rgba(56,189,248,0.25)] transition-all duration-300 hover:from-sky-400 hover:to-indigo-400 hover:shadow-[0_6px_32px_rgba(56,189,248,0.35)] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
        >
          {isProcessing ? (
            <>
              <SpinnerIcon />
              Processing…
            </>
          ) : (
            "Process Financial Data"
          )}
        </button>
      </div>

      {processState.status === "ready" && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-lg border border-emerald-500/25 bg-emerald-500/[0.06] px-4 py-3"
        >
          <svg
            className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <p className="text-sm font-medium text-emerald-200">
            {processState.message}
          </p>
        </div>
      )}

      {processState.status === "error" && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-lg border border-rose-500/25 bg-rose-500/[0.06] px-4 py-3"
        >
          <svg
            className="mt-0.5 h-5 w-5 shrink-0 text-rose-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <p className="text-sm text-rose-200">{processState.message}</p>
        </div>
      )}
    </div>
  );
}
