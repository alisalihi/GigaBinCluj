const SCENARIOS = [
  { key: 'traffic_peak', label: 'Traffic peak', detail: 'test start/hold decision' },
  { key: 'contamination', label: 'Contamination', detail: 'force sorting alert' },
  { key: 'floresti_overflow', label: 'Florești overflow', detail: 'cluster urgent bins' },
  { key: 'truck_full', label: 'Truck full', detail: 'force depot return' },
];

export const DemoControls = ({ onScenario }) => (
  <section className="shrink-0 border-b border-slate-200 bg-white px-4 py-3" data-testid="demo-scenarios">
    <div className="mb-2 flex items-center justify-between gap-2">
      <span className="text-[10px] font-black uppercase tracking-widest text-[#005BAA]">Demo scenarios</span>
      <span className="rounded-full bg-[#FFD500]/35 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-700">click to test</span>
    </div>
    <div className="grid grid-cols-2 gap-2">
      {SCENARIOS.map((scenario) => (
        <button
          key={scenario.key}
          type="button"
          onClick={() => onScenario?.(scenario.key)}
          data-testid={`demo-${scenario.key}`}
          className="group min-h-[58px] rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left shadow-sm transition hover:border-[#0099D8]/50 hover:bg-[#0099D8]/10 active:scale-[0.99]"
        >
          <div className="text-[11px] font-black text-slate-900 group-hover:text-[#005BAA]">{scenario.label}</div>
          <div className="mt-0.5 text-[9px] font-medium leading-snug text-slate-500">{scenario.detail}</div>
        </button>
      ))}
    </div>
  </section>
);
