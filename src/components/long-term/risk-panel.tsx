import type { RiskItem } from "@/lib/analysis/long-term-analysis";

const LEVEL_STYLES: Record<
  RiskItem["level"],
  { text: string; border: string; bg: string }
> = {
  Low: {
    text: "text-emerald-300",
    border: "border-emerald-500/20",
    bg: "bg-emerald-500/[0.04]",
  },
  Moderate: {
    text: "text-amber-300",
    border: "border-amber-500/20",
    bg: "bg-amber-500/[0.04]",
  },
  High: {
    text: "text-rose-300",
    border: "border-rose-500/20",
    bg: "bg-rose-500/[0.04]",
  },
  Unavailable: {
    text: "text-slate-400",
    border: "border-white/8",
    bg: "bg-white/[0.02]",
  },
};

type RiskPanelProps = {
  risks: RiskItem[];
};

export function RiskPanel({ risks }: RiskPanelProps) {
  return (
    <div className="rounded-xl border border-white/8 bg-[#0a0f1c]/60 p-5">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
        Risk Assessment
      </h3>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {risks.map((risk: RiskItem) => {
          const style = LEVEL_STYLES[risk.level];
          return (
            <article
              key={risk.label}
              className={`rounded-lg border px-4 py-3 ${style.border} ${style.bg}`}
            >
              <div className="flex items-center justify-between gap-3">
                <h4 className="text-sm font-medium text-white">{risk.label}</h4>
                <span className={`text-xs font-semibold ${style.text}`}>
                  {risk.level}
                </span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">
                {risk.detail}
              </p>
            </article>
          );
        })}
      </div>
    </div>
  );
}
