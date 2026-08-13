import type { AssessmentRating } from "@/lib/analysis/short-term-analysis";

const STYLES: Record<
  AssessmentRating,
  { bg: string; ring: string; text: string; glow: string }
> = {
  Buy: {
    bg: "bg-emerald-500/10",
    ring: "ring-emerald-400/30",
    text: "text-emerald-300",
    glow: "shadow-[0_0_24px_rgba(52,211,153,0.15)]",
  },
  Hold: {
    bg: "bg-amber-500/10",
    ring: "ring-amber-400/30",
    text: "text-amber-300",
    glow: "shadow-[0_0_24px_rgba(251,191,36,0.12)]",
  },
  Avoid: {
    bg: "bg-rose-500/10",
    ring: "ring-rose-400/30",
    text: "text-rose-300",
    glow: "shadow-[0_0_24px_rgba(251,113,133,0.12)]",
  },
};

type AssessmentBadgeProps = {
  rating: AssessmentRating;
  reasoning: string[];
};

export function AssessmentBadge({ rating, reasoning }: AssessmentBadgeProps) {
  const style = STYLES[rating];

  return (
    <div
      className={`rounded-xl border border-white/8 p-6 ring-1 ${style.bg} ${style.ring} ${style.glow}`}
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
        Short-Term Assessment
      </p>
      <p className={`mt-2 text-4xl font-bold tracking-tight ${style.text}`}>
        {rating}
      </p>
      <p className="mt-3 text-sm text-slate-400">
        Based only on metrics extracted from uploaded financial data. Not
        financial advice.
      </p>
      {reasoning.length > 0 && (
        <ul className="mt-4 space-y-2">
          {reasoning.map((reason) => (
            <li
              key={reason}
              className="flex items-start gap-2 text-sm text-slate-300"
            >
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-500" />
              {reason}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
