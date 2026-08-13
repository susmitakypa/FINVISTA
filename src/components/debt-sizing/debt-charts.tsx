type GroupedBar = {
  label: string;
  value: number;
  color?: string;
};

export function DebtBarChart({
  title,
  data,
  unit = "",
}: {
  title: string;
  data: GroupedBar[];
  unit?: string;
}) {
  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-white/8 bg-[#0a0f1c]/60 p-5">
        <h3 className="text-sm font-semibold text-slate-300">{title}</h3>
        <p className="mt-4 text-sm text-slate-500">Not enough data for chart.</p>
      </div>
    );
  }

  const max = Math.max(...data.map((item) => Math.abs(item.value)), 1);

  return (
    <div className="rounded-xl border border-white/8 bg-[#0a0f1c]/60 p-5">
      <h3 className="text-sm font-semibold text-slate-300">{title}</h3>
      <div className="mt-5 flex items-end gap-3" style={{ minHeight: 160 }}>
        {data.map((item) => {
          const height = Math.max((Math.abs(item.value) / max) * 100, 4);
          const color = item.color ?? "#38bdf8";
          return (
            <div key={item.label} className="flex flex-1 flex-col items-center gap-2">
              <span className="text-[10px] text-slate-500">
                {item.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                {unit}
              </span>
              <div
                className="w-full rounded-t-md"
                style={{
                  height: `${height}%`,
                  minHeight: 8,
                  background: `linear-gradient(to top, ${color}88, ${color})`,
                }}
              />
              <span className="text-center text-[10px] text-slate-400">{item.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
