"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/lib/constants";

function FinvistaLogo() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-sky-400/20 to-indigo-500/30 ring-1 ring-sky-400/30">
        <span className="text-sm font-bold tracking-tight text-sky-300">FV</span>
      </div>
      <div>
        <p className="text-sm font-semibold tracking-[0.2em] text-white">FINVISTA</p>
        <p className="text-[10px] uppercase tracking-wider text-slate-500">
          Finance Analysis
        </p>
      </div>
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-white/5 bg-[#070b14]/80 backdrop-blur-xl">
      <div className="border-b border-white/5 px-5 py-6">
        <FinvistaLogo />
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4" aria-label="Main navigation">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex flex-col rounded-lg px-3 py-2.5 transition-all duration-200 ${
                isActive
                  ? "bg-gradient-to-r from-sky-500/15 to-indigo-500/10 text-white ring-1 ring-sky-400/20"
                  : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
              }`}
            >
              <span className="text-sm font-medium">{item.label}</span>
              {item.description && (
                <span
                  className={`mt-0.5 text-xs transition-colors ${
                    isActive
                      ? "text-slate-400"
                      : "text-slate-600 group-hover:text-slate-500"
                  }`}
                >
                  {item.description}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/5 px-5 py-4">
        <p className="text-[11px] leading-relaxed text-slate-600">
          Shell v0.1 — analysis modules coming soon
        </p>
      </div>
    </aside>
  );
}
