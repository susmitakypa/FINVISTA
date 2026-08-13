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

function companyInitials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "FV";
  return parts
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();
}

export function Header() {
  const pathname = usePathname();
  const { title } = getHeaderContent(pathname);
  const { dashboardStatus, financialData } = useFinancialSession();
  const status = STATUS_CONFIG[dashboardStatus];
  const companyName = financialData?.company?.trim() || "Company name unavailable";
  const hasCompany = Boolean(financialData?.company?.trim());

  return (
    <header className="sticky top-0 z-10 border-b border-white/5 bg-[#0a0f1c]/70 backdrop-blur-xl">
      <div className="flex flex-col gap-4 px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-sm font-semibold text-sky-200"
            aria-hidden="true"
          >
            {hasCompany ? companyInitials(companyName) : "—"}
          </div>
          <div className="min-w-0">
            <p className="truncate text-xl font-semibold tracking-tight text-white">
              {companyName}
            </p>
            <p className="mt-0.5 text-sm text-slate-400">
              Financial Analysis Dashboard
            </p>
            <p className="mt-0.5 text-[11px] uppercase tracking-wider text-slate-600">
              {title}
            </p>
          </div>
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
          <span className="text-xs font-medium text-slate-300">{status.label}</span>
        </div>
      </div>
    </header>
  );
}
