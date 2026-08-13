import Link from "next/link";

type ComingSoonProps = {
  moduleName: string;
};

export function ComingSoon({ moduleName }: ComingSoonProps) {
  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-col items-center justify-center rounded-xl border border-white/8 bg-[#0a0f1c]/60 px-6 py-20 text-center backdrop-blur-sm">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-sky-500/10 ring-1 ring-sky-400/20">
        <svg
          className="h-6 w-6 text-sky-400"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          aria-hidden="true"
        >
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
        </svg>
      </div>
      <h2 className="text-lg font-semibold text-white">{moduleName}</h2>
      <p className="mt-2 max-w-md text-sm text-slate-400">
        This analysis module is part of the FINVISTA roadmap. Upload financial
        data from the dashboard to prepare for future analysis.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:border-sky-500/30 hover:bg-sky-500/10 hover:text-white"
      >
        <svg
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Back to Dashboard
      </Link>
      </div>
    </div>
  );
}
