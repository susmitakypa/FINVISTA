import type { SeriesPoint } from "@/lib/analysis/financial-forecast";

type MixedBarChartProps = {
  title: string;
  data: SeriesPoint[];
  unit?: string;
};

export function MixedBarChart({ title, data, unit = "" }: MixedBarChartProps) {
  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-white/8 bg-[#0a0f1c]/60 p-5">
        <h3 className="text-sm font-semibold text-slate-300">{title}</h3>
        <p className="mt-4 text-sm text-slate-500">Insufficient data</p>
      </div>
    );
  }

  const max = Math.max(...data.map((point) => Math.abs(point.value)), 1);

  return (
    <div className="rounded-xl border border-white/8 bg-[#0a0f1c]/60 p-5">
      <h3 className="text-sm font-semibold text-slate-300">{title}</h3>
      <div className="mt-3 flex gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-sky-400" />
          Historical
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-indigo-400/80 ring-1 ring-dashed ring-indigo-200/40" />
          Forecast
        </span>
      </div>
      <div className="mt-5 flex items-end gap-3" style={{ minHeight: 160 }}>
        {data.map((item: SeriesPoint) => {
          const height = Math.max((Math.abs(item.value) / max) * 100, 4);
          const isForecast = item.kind === "forecast";
          return (
            <div
              key={`${item.kind}-${item.label}`}
              className="flex flex-1 flex-col items-center gap-2"
            >
              <span className="text-[10px] text-slate-500">
                {item.value.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                {unit}
              </span>
              <div
                className="w-full rounded-t-md"
                style={{
                  height: `${height}%`,
                  minHeight: 8,
                  background: isForecast
                    ? "repeating-linear-gradient(135deg, rgba(129,140,248,0.95), rgba(129,140,248,0.95) 6px, rgba(129,140,248,0.45) 6px, rgba(129,140,248,0.45) 12px)"
                    : "linear-gradient(to top, #38bdf888, #38bdf8)",
                }}
              />
              <span className="text-center text-[10px] text-slate-400">
                {item.label}
                {isForecast ? " · F" : ""}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

type ScenarioPoint = {
  label: string;
  bear: number | null;
  base: number | null;
  bull: number | null;
};

type ScenarioChartProps = {
  title: string;
  data: ScenarioPoint[];
  unit?: string;
};

export function ScenarioBarChart({ title, data, unit = "" }: ScenarioChartProps) {
  const hasData = data.some(
    (point) => point.bear !== null || point.base !== null || point.bull !== null,
  );

  if (!hasData) {
    return (
      <div className="rounded-xl border border-white/8 bg-[#0a0f1c]/60 p-5">
        <h3 className="text-sm font-semibold text-slate-300">{title}</h3>
        <p className="mt-4 text-sm text-slate-500">Insufficient data</p>
      </div>
    );
  }

  const max = Math.max(
    ...data.flatMap((point) =>
      [point.bear, point.base, point.bull].filter(
        (value): value is number => value !== null,
      ),
    ).map((value) => Math.abs(value)),
    1,
  );

  return (
    <div className="rounded-xl border border-white/8 bg-[#0a0f1c]/60 p-5">
      <h3 className="text-sm font-semibold text-slate-300">{title}</h3>
      <div className="mt-3 flex gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-rose-400" />
          Bear
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-sky-400" />
          Base
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-emerald-400" />
          Bull
        </span>
      </div>
      <div className="mt-5 flex items-end gap-4" style={{ minHeight: 160 }}>
        {data.map((item: ScenarioPoint) => (
          <div key={item.label} className="flex flex-1 flex-col items-center gap-2">
            <div className="flex w-full items-end justify-center gap-1" style={{ height: 120 }}>
              <ScenarioBar value={item.bear} max={max} color="#fb7185" unit={unit} />
              <ScenarioBar value={item.base} max={max} color="#38bdf8" unit={unit} />
              <ScenarioBar value={item.bull} max={max} color="#34d399" unit={unit} />
            </div>
            <span className="text-center text-[10px] text-slate-400">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ScenarioBar({
  value,
  max,
  color,
  unit,
}: {
  value: number | null;
  max: number;
  color: string;
  unit: string;
}) {
  if (value === null) {
    return <div className="w-3 rounded-t bg-white/5" style={{ height: "8%" }} title="Insufficient data" />;
  }
  return (
    <div
      className="w-3 rounded-t"
      style={{
        height: `${Math.max((Math.abs(value) / max) * 100, 6)}%`,
        background: color,
      }}
      title={`${value.toLocaleString(undefined, { maximumFractionDigits: 1 })}${unit}`}
    />
  );
}
