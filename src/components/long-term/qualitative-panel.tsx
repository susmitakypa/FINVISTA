import type { QualitativeItem } from "@/lib/analysis/long-term-analysis";

type QualitativePanelProps = {
  items: QualitativeItem[];
};

export function QualitativePanel({ items }: QualitativePanelProps) {
  return (
    <section className="rounded-xl border border-white/8 bg-[#0a0f1c]/60 p-5">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
        Business Quality
      </h3>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {items.map((item) => (
          <div
            key={item.label}
            className="rounded-lg border border-white/8 bg-white/[0.02] px-4 py-3"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs text-slate-500">{item.label}</p>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                  item.available
                    ? "bg-emerald-500/10 text-emerald-300"
                    : "bg-slate-500/10 text-slate-500"
                }`}
              >
                {item.available ? "Extracted" : "Unavailable"}
              </span>
            </div>
            <p
              className={`mt-2 text-sm leading-relaxed ${
                item.available ? "text-slate-300" : "text-slate-600"
              }`}
            >
              {item.detail}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
