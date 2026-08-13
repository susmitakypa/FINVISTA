import type { QualityPillar } from "@/lib/analysis/long-term-analysis";

type QualityGridProps = {
  pillars: QualityPillar[];
};

export function QualityGrid({ pillars }: QualityGridProps) {
  return (
    <div className="rounded-xl border border-white/8 bg-[#0a0f1c]/60 p-5">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
        Business Quality
      </h3>
      <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {pillars.map((pillar: QualityPillar) => {
          const ratio =
            pillar.score === null ? 0 : pillar.score / pillar.max;

          return (
            <div
              key={pillar.key}
              className="rounded-lg border border-white/8 bg-white/[0.02] p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-medium text-slate-300">
                  {pillar.label}
                </p>
                <p className="text-sm font-semibold text-sky-300">
                  {pillar.score === null
                    ? "Data unavailable"
                    : `${pillar.score}/${pillar.max}`}
                </p>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-sky-400"
                  style={{ width: `${Math.round(ratio * 100)}%` }}
                />
              </div>
              <p className="mt-3 text-xs leading-relaxed text-slate-500">
                {pillar.explanation}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
