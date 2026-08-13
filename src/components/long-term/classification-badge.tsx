import type {
  LongTermClassification,
} from "@/lib/analysis/long-term-analysis";

const STYLES: Record<
  LongTermClassification,
  { bg: string; ring: string; text: string; glow: string }
> = {
  "STRONG LONG-TERM": {
    bg: "bg-emerald-500/10",
    ring: "ring-emerald-400/30",
    text: "text-emerald-300",
    glow: "shadow-[0_0_24px_rgba(52,211,153,0.15)]",
  },
  POSITIVE: {
    bg: "bg-sky-500/10",
    ring: "ring-sky-400/30",
    text: "text-sky-300",
    glow: "shadow-[0_0_24px_rgba(56,189,248,0.15)]",
  },
  NEUTRAL: {
    bg: "bg-amber-500/10",
    ring: "ring-amber-400/30",
    text: "text-amber-300",
    glow: "shadow-[0_0_24px_rgba(251,191,36,0.12)]",
  },
  CAUTIOUS: {
    bg: "bg-rose-500/10",
    ring: "ring-rose-400/30",
    text: "text-rose-300",
    glow: "shadow-[0_0_24px_rgba(251,113,133,0.12)]",
  },
  "INSUFFICIENT DATA": {
    bg: "bg-slate-500/10",
    ring: "ring-slate-400/20",
    text: "text-slate-300",
    glow: "",
  },
};

type ClassificationBadgeProps = {
  classification: LongTermClassification;
  score: number | null;
  insufficientData?: boolean;
};

export function ClassificationBadge({
  classification,
  score,
  insufficientData,
}: ClassificationBadgeProps) {
  const style = STYLES[classification];

  return (
    <div
      className={`rounded-xl border border-white/8 p-6 ring-1 ${style.bg} ${style.ring} ${style.glow}`}
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
        Long-Term Verdict
      </p>
      <p className={`mt-2 text-4xl font-bold tracking-tight ${style.text}`}>
        {classification}
      </p>
      {insufficientData || classification === "INSUFFICIENT DATA" ? (
        <div className="mt-3 space-y-1">
          <p className="text-sm text-slate-300">
            Insufficient data for a complete long-term assessment
          </p>
          <p className="text-sm text-slate-500">
            Available analysis based on uploaded data
          </p>
        </div>
      ) : (
        <p className="mt-3 text-sm text-slate-400">
          Score: {score === null ? "Data unavailable" : `${score}/100`} · Based
          only on uploaded financial data. Not investment advice.
        </p>
      )}
    </div>
  );
}
