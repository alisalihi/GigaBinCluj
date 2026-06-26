import { SUBURB_TRENDS } from '../data/bins';

const CARDS = [
  { key:'avg',          label:'Avg fill level',       accent:'blue',  fmt: v => `${v}%`,   pctFn: v => v },
  { key:'urgent',       label:'Overflow bins (>85%)',  accent:'red',   fmt: v => v,         pctFn: v => Math.min(v * 10, 100) },
  { key:'contaminated', label:'Contamination alerts',  accent:'amber', fmt: v => v,         pctFn: v => Math.min(v * 20, 100) },
  { key:'routing',      label:'Trucks routing',        accent:'green', fmt: (v,s) => `${v}/${s.total > 15 ? 3 : 3}`, pctFn: v => (v/3)*100 },
];
const ACCENT = {
  blue:'border-[#0099D8]/25 bg-[#0099D8]/10',
  red:'border-[#E31E24]/25 bg-[#E31E24]/10',
  amber:'border-[#FFD500]/60 bg-[#FFD500]/20',
  green:'border-emerald-500/25 bg-emerald-500/10',
};
const BAR = { blue:'bg-[#0099D8]', red:'bg-[#E31E24]', amber:'bg-[#FFD500]', green:'bg-emerald-500' };

// Real trend badges from CSV data
const TrendBadge = ({ suburb }) => {
  const t = SUBURB_TRENDS[suburb];
  if (!t) return null;
  return (
    <span className={`rounded-full border px-1.5 py-0.5 text-[9px] font-bold ${t.trend === 'increasing' ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700' : 'border-[#E31E24]/25 bg-[#E31E24]/10 text-[#B91C1C]'}`}>
      {t.trend === 'increasing' ? '↑' : '↓'} {suburb}
    </span>
  );
};

export const StatsBar = ({ stats }) => (
  <div className="shrink-0 border-b border-slate-200 bg-white px-4 py-3" data-testid="operations-kpis">
    <div className="mb-2 flex items-center justify-between gap-2">
      <span className="text-[10px] font-black uppercase tracking-widest text-[#005BAA]">Live operations</span>
      <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-500">Synthetic + project data</span>
    </div>
    <div className="grid grid-cols-2 gap-2">
    {CARDS.map(({ key, label, accent, fmt, pctFn }) => {
      const raw = stats[key];
      const pct = pctFn(raw, stats);
      return (
        <div key={key} className={`rounded-lg border px-3 py-2.5 ${ACCENT[accent]}`}>
          <div className="text-[9px] font-black uppercase tracking-wider text-slate-500">{label}</div>
          <div className="mt-1 text-2xl font-black text-slate-900">{fmt(raw, stats)}</div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/80 ring-1 ring-slate-200">
            <div className={`h-full rounded-full transition-all duration-700 ${BAR[accent]}`} style={{ width:`${pct}%` }}/>
          </div>
        </div>
      );
    })}
    </div>
  </div>
);

const IMPACT_CARDS = [
  { key: 'routeKm', label: 'Active route km', fmt: (v) => `${(v ?? 0).toFixed(1)} km`, cls: 'border-[#0099D8]/25 bg-[#0099D8]/10 text-[#005BAA]' },
  { key: 'dieselL', label: 'Diesel estimate', fmt: (v) => `${(v ?? 0).toFixed(1)} L`, cls: 'border-[#FFD500]/60 bg-[#FFD500]/20 text-slate-900' },
  { key: 'co2Kg', label: 'CO2 estimate', fmt: (v) => `${(v ?? 0).toFixed(1)} kg`, cls: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700' },
  { key: 'variableCostEur', label: 'Variable cost', fmt: (v) => `€${(v ?? 0).toFixed(2)}`, cls: 'border-[#E31E24]/20 bg-[#E31E24]/10 text-[#B91C1C]' },
];

export const ImpactStatsBar = ({ stats }) => (
  <div className="shrink-0 border-b border-slate-200 bg-slate-50 px-4 py-3" data-testid="impact-stats">
    <div className="mb-2 flex items-center justify-between gap-2">
      <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">Cost and pollution impact</span>
      <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">Route-derived estimates</span>
    </div>
    <div className="grid grid-cols-2 gap-2">
    {IMPACT_CARDS.map((card) => (
      <div key={card.key} className={`rounded-lg border px-3 py-2 ${card.cls}`}>
        <div className="text-[9px] font-black uppercase tracking-wider text-slate-500">{card.label}</div>
        <div className="mt-1 text-lg font-black">{card.fmt(stats[card.key])}</div>
      </div>
    ))}
    </div>
  </div>
);

export const SuburbTrendBar = () => (
  <div className="flex shrink-0 items-center gap-2 overflow-x-auto border-b border-slate-200 bg-slate-50 px-4 py-1.5">
    <span className="shrink-0 text-[9px] font-black uppercase tracking-widest text-[#005BAA]">Supercom SA 2024-2026 trends:</span>
    {Object.keys(SUBURB_TRENDS).map(s => <TrendBadge key={s} suburb={s} />)}
    <span className="ml-auto shrink-0 text-[9px] font-medium text-slate-500">Source: clujNapoca_data.csv</span>
  </div>
);
