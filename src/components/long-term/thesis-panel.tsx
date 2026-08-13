import type { LongTermAnalysis } from "@/lib/analysis/long-term-analysis";

type ThesisPanelProps = {
  thesis: LongTermAnalysis["thesis"];
};

export function ThesisPanel({ thesis }: ThesisPanelProps) {
  return (
    <section className="rounded-xl border border-white/8 bg-[#0a0f1c]/60 p-6">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
        Long-Term Investment Thesis
      </h3>
      <p className="mt-2 text-xs text-slate-500">
        Analytical scenarios based only on uploaded financial data. Not a
        recommendation to buy or sell.
      </p>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <ThesisCard title="Bull case" body={thesis.bull} accent="emerald" />
        <ThesisCard title="Base case" body={thesis.base} accent="sky" />
        <ThesisCard title="Bear case" body={thesis.bear} accent="rose" />
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <ListCard title="Long-term catalysts" items={thesis.catalysts} />
        <ListCard title="Key risks" items={thesis.keyRisks} />
        <ListCard title="Metrics to monitor" items={thesis.monitor} />
      </div>
    </section>
  );
}

function ThesisCard({
  title,
  body,
  accent,
}: {
  title: string;
  body: string;
  accent: "emerald" | "sky" | "rose";
}) {
  const color =
    accent === "emerald"
      ? "border-emerald-500/15 bg-emerald-500/[0.04] text-emerald-200"
      : accent === "rose"
        ? "border-rose-500/15 bg-rose-500/[0.04] text-rose-200"
        : "border-sky-500/15 bg-sky-500/[0.04] text-sky-200";

  return (
    <article className={`rounded-lg border p-4 ${color}`}>
      <h4 className="text-sm font-semibold text-white">{title}</h4>
      <p className="mt-2 text-sm leading-relaxed text-slate-300">{body}</p>
    </article>
  );
}

function ListCard({ title, items }: { title: string; items: string[] }) {
  return (
    <article className="rounded-lg border border-white/8 bg-white/[0.02] p-4">
      <h4 className="text-sm font-semibold text-white">{title}</h4>
      <ul className="mt-3 space-y-2">
        {items.map((item: string) => (
          <li
            key={item}
            className="flex items-start gap-2 text-sm text-slate-400"
          >
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-500" />
            {item}
          </li>
        ))}
      </ul>
    </article>
  );
}
