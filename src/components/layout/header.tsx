"use client";

import { usePathname } from "next/navigation";
import { useFinancialSession } from "@/context/financial-session-context";
import { NAV_ITEMS } from "@/lib/constants";

function getHeaderContent(pathname: string) {
  const match = NAV_ITEMS.find((item) =>
    item.href === "/" ? pathname === "/" : pathname.startsWith(item.href),
  );

  if (!match) {
    return {
      title: "Dashboard",
      subtitle: "Upload financial data to begin analysis",
    };
  }

  return {
    title: match.label,
    subtitle: match.description ?? "Upload financial data to begin analysis",
  };
}

const STATUS_CONFIG = {
  "awaiting-upload": {
    label: "Awaiting data upload",
    color: "bg-amber-400",
    ping: true,
  },
  "ready-to-process": {
    label: "Files ready to be processed",
    color: "bg-sky-400",
    ping: true,
  },
  processing: {
    label: "Processing financial data…",
    color: "bg-indigo-400",
    ping: true,
  },
  processed: {
    label: "Financial data processed",
    color: "bg-emerald-400",
    ping: false,
  },
} as const;

export function Header() {
  const pathname = usePathname();
  const { title, subtitle } = getHeaderContent(pathname);
  const { dashboardStatus, financialData } = useFinancialSession();
  const status = STATUS_CONFIG[dashboardStatus];

  return (
    <header className="sticky top-0 z-10 border-b border-white/5 bg-[#0a0f1c]/70 backdrop-blur-xl">
      <div className="flex flex-col gap-4 px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-white">
            {title}
          </h1>
          <p className="mt-0.5 text-sm text-slate-400">{subtitle}</p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative">
            <label htmlFor="company-search" className="sr-only">
              Search company
            </label>
            <svg
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              id="company-search"
              type="search"
              placeholder={
                financialData?.company
                  ? financialData.company
                  : "Search company or ticker..."
              }
              disabled
              className="w-full rounded-lg border border-white/10 bg-white/5 py-2 pl-10 pr-4 text-sm text-slate-300 placeholder:text-slate-600 transition-colors focus:border-sky-500/40 focus:outline-none focus:ring-1 focus:ring-sky-500/30 disabled:cursor-not-allowed sm:w-72"
            />
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
            <span className="relative flex h-2 w-2">
              {status.ping && (
                <span
                  className={`absolute inline-flex h-full w-full animate-ping rounded-full ${status.color} opacity-40`}
                />
              )}
              <span
                className={`relative inline-flex h-2 w-2 rounded-full ${status.color}`}
              />
            </span>
            <span className="text-xs font-medium text-slate-300">
              {status.label}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
