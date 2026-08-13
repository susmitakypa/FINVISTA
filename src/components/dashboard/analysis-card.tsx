import Link from "next/link";
import { AnalysisIcon } from "@/components/icons/analysis-icons";
import type { AnalysisOption } from "@/lib/constants";

type AnalysisCardProps = {
  option: AnalysisOption;
};

export function AnalysisCard({ option }: AnalysisCardProps) {
  return (
    <Link
      href={option.href}
      className="group relative flex flex-col overflow-hidden rounded-xl border border-white/8 bg-gradient-to-br from-[#0f1629] to-[#0a0f1c] p-6 transition-all duration-300 hover:-translate-y-1 hover:border-sky-500/30 hover:shadow-[0_8px_32px_rgba(56,189,248,0.12)]"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-sky-500/0 to-indigo-500/0 opacity-0 transition-opacity duration-300 group-hover:from-sky-500/5 group-hover:to-indigo-500/5 group-hover:opacity-100" />

      <div className="relative">
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-sky-500/10 ring-1 ring-sky-400/20 transition-all duration-300 group-hover:bg-sky-500/20 group-hover:ring-sky-400/40">
          <AnalysisIcon
            icon={option.icon}
            className="h-5 w-5 text-sky-400 transition-transform duration-300 group-hover:scale-110"
          />
        </div>

        <h3 className="text-base font-semibold uppercase tracking-wide text-white">
          {option.title}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-400 transition-colors duration-300 group-hover:text-slate-300">
          {option.description}
        </p>

        <span className="mt-5 inline-flex items-center gap-1.5 text-xs font-medium text-sky-400 opacity-0 transition-all duration-300 group-hover:opacity-100">
          Open module
          <svg
            className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </span>
      </div>
    </Link>
  );
}
