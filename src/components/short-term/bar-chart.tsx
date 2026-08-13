"use client";

type BarChartProps = {
  title: string;
  data: { label: string; value: number }[];
  color?: string;
  unit?: string;
};

export function BarChart({
  title,
  data,
  color = "#38bdf8",
  unit = "",
}: BarChartProps) {
  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-white/8 bg-[#0a0f1c]/60 p-5">
        <h3 className="text-sm font-semibold text-slate-300">{title}</h3>
        <p className="mt-4 text-sm text-slate-500">Not enough data for chart.</p>
      </div>
    );
  }

  const max = Math.max(...data.map((d) => Math.abs(d.value)), 1);

  return (
    <div className="rounded-xl border border-white/8 bg-[#0a0f1c]/60 p-5">
      <h3 className="text-sm font-semibold text-slate-300">{title}</h3>
      <div className="mt-5 flex items-end gap-3" style={{ minHeight: 160 }}>
        {data.map((item: { label: string; value: number }) => {
          const height = Math.max((Math.abs(item.value) / max) * 100, 4);
          return (
            <div
              key={item.label}
              className="flex flex-1 flex-col items-center gap-2"
            >
              <span className="text-[10px] text-slate-500">
                {item.value.toLocaleString(undefined, {
                  maximumFractionDigits: 1,
                })}
                {unit}
              </span>
              <div
                className="w-full rounded-t-md transition-all duration-500"
                style={{
                  height: `${height}%`,
                  minHeight: 8,
                  background: `linear-gradient(to top, ${color}88, ${color})`,
                }}
              />
              <span className="text-center text-[10px] text-slate-400">
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

type MarginChartProps = {
  title: string;
  data: {
    label: string;
    operating: number | null;
    net: number | null;
  }[];
};

export function MarginTrendChart({ title, data }: MarginChartProps) {
  const hasData = data.some((d) => d.operating !== null || d.net !== null);

  if (!hasData) {
    return (
      <div className="rounded-xl border border-white/8 bg-[#0a0f1c]/60 p-5">
        <h3 className="text-sm font-semibold text-slate-300">{title}</h3>
        <p className="mt-4 text-sm text-slate-500">Not enough data for chart.</p>
      </div>
    );
  }

  const values = data.flatMap((d) =>
    [d.operating, d.net].filter((v): v is number => v !== null),
  );
  const max = Math.max(...values, 1);

  return (
    <div className="rounded-xl border border-white/8 bg-[#0a0f1c]/60 p-5">
      <h3 className="text-sm font-semibold text-slate-300">{title}</h3>
      <div className="mt-3 flex gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-sky-400" />
          Operating
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-indigo-400" />
          Net
        </span>
      </div>
      <div className="mt-4 flex items-end gap-4" style={{ minHeight: 140 }}>
        {data.map((item: { label: string; operating: number | null; net: number | null }) => (
          <div
            key={item.label}
            className="flex flex-1 flex-col items-center gap-1"
          >
            <div className="flex w-full items-end justify-center gap-1" style={{ height: 100 }}>
              {item.operating !== null && (
                <div
                  className="w-3 rounded-t bg-sky-400"
                  style={{
                    height: `${Math.max((Math.abs(item.operating) / max) * 100, 6)}%`,
                  }}
                  title={`Operating: ${item.operating}%`}
                />
              )}
              {item.net !== null && (
                <div
                  className="w-3 rounded-t bg-indigo-400"
                  style={{
                    height: `${Math.max((Math.abs(item.net) / max) * 100, 6)}%`,
                  }}
                  title={`Net: ${item.net}%`}
                />
              )}
            </div>
            <span className="text-center text-[10px] text-slate-400">
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
