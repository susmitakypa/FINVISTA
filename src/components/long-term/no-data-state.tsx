import Link from "next/link";

export function LongTermNoDataState() {
  return (
    <div className="mx-auto max-w-2xl rounded-xl border border-white/8 bg-[#0a0f1c]/60 px-6 py-16 text-center backdrop-blur-sm">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10 ring-1 ring-amber-400/20">
        <svg
          className="h-6 w-6 text-amber-400"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          aria-hidden="true"
        >
          <path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        </svg>
      </div>
      <h2 className="text-lg font-semibold text-white">
        No processed financial data
      </h2>
      <p className="mt-2 text-sm text-slate-400">
        Upload Screener screenshots, Balance Sheet, and Profit &amp; Loss files on
        the dashboard, then click{" "}
        <strong className="text-slate-300">Process Financial Data</strong> before
        running long-term analysis.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:border-sky-500/30 hover:bg-sky-500/10 hover:text-white"
      >
        Go to Dashboard
      </Link>
    </div>
  );
}
