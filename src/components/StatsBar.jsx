import { SUBURB_TRENDS } from '../data/bins';

const CARDS = [
  { key:'avg',          label:'Avg fill level',       accent:'blue',  fmt: v => `${v}%`,   pctFn: v => v },
  { key:'urgent',       label:'Overflow bins (>85%)',  accent:'red',   fmt: v => v,         pctFn: v => Math.min(v * 10, 100) },
  { key:'contaminated', label:'Contamination alerts',  accent:'amber', fmt: v => v,         pctFn: v => Math.min(v * 20, 100) },
  { key:'routing',      label:'Trucks routing',        accent:'green', fmt: (v,s) => `${v}/${s.total > 15 ? 3 : 3}`, pctFn: v => (v/3)*100 },
];
const ACCENT = { blue:'border-blue-500/20 bg-blue-500/5', red:'border-rose-500/20 bg-rose-500/5', amber:'border-amber-500/20 bg-amber-500/5', green:'border-emerald-500/20 bg-emerald-500/5' };
const BAR    = { blue:'bg-blue-500', red:'bg-rose-500', amber:'bg-amber-500', green:'bg-emerald-500' };

// Real trend badges from CSV data
const TrendBadge = ({ suburb }) => {
  const t = SUBURB_TRENDS[suburb];
  if (!t) return null;
  return (
    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${t.trend === 'increasing' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'}`}>
      {t.trend === 'increasing' ? '↑' : '↓'} {suburb}
    </span>
  );
};

export const StatsBar = ({ stats }) => (
  <div className="shrink-0 grid grid-cols-4 gap-2.5 border-b border-slate-800 bg-slate-900/95 px-4 py-2.5">
    {CARDS.map(({ key, label, accent, fmt, pctFn }) => {
      const raw = stats[key];
      const pct = pctFn(raw, stats);
      return (
        <div key={key} className={`rounded-2xl border px-4 py-3 ${ACCENT[accent]}`}>
          <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">{label}</div>
          <div className="mt-1.5 text-2xl font-bold text-slate-100">{fmt(raw, stats)}</div>
          <div className="mt-2.5 h-1 rounded-full bg-slate-800 overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-700 ${BAR[accent]}`} style={{ width:`${pct}%` }}/>
          </div>
        </div>
      );
    })}
  </div>
);

export const SuburbTrendBar = () => (
  <div className="shrink-0 border-b border-slate-800 bg-slate-950/80 px-4 py-1.5 flex items-center gap-2 overflow-x-auto">
    <span className="text-[9px] font-bold uppercase tracking-widest text-slate-600 shrink-0">Supercom SA 2024–2026 trends:</span>
    {Object.keys(SUBURB_TRENDS).map(s => <TrendBadge key={s} suburb={s} />)}
    <span className="text-[9px] text-slate-700 ml-auto shrink-0">Source: clujNapoca_data.csv</span>
  </div>
);
