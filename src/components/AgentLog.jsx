const TYPE = {
  danger:        { code:'ALR', cls:'text-[#B91C1C]' },
  warning:       { code:'QA', cls:'text-violet-700' },
  success:       { code:'OK', cls:'text-emerald-700' },
  route:         { code:'RTE', cls:'text-[#005BAA]' },
  learn:         { code:'LRN', cls:'text-slate-700' },
  proactive:     { code:'ETA', cls:'text-amber-700' },
  'agent-decision':{ code:'AGT', cls:'text-[#005BAA]' },
  info:          { code:'INF', cls:'text-slate-600' },
};

export const AgentLog = ({ entries }) => (
  <div className="flex flex-col h-full">
    <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-4 py-2">
      <span className="text-[10px] font-black uppercase tracking-widest text-[#005BAA]">Agent decision log</span>
      <span className="text-[10px] font-semibold text-slate-500">{entries.length} events</span>
    </div>
    <div className="flex-1 space-y-1 overflow-y-auto px-4 py-2 font-mono text-[11px]">
      {entries.length === 0 && <p className="pt-2 italic text-slate-500">Waiting for agent events...</p>}
      {entries.map(e => {
        const { code, cls } = TYPE[e.type] ?? TYPE.info;
        return (
          <div key={e.id} className={`flex items-start gap-2 rounded px-1 leading-relaxed ${e.isAgent ? 'bg-[#0099D8]/10' : ''}`}>
            <span className="shrink-0 tabular-nums text-slate-400">{e.ts}</span>
            <span className="shrink-0 rounded bg-slate-100 px-1 text-[9px] font-black tracking-wider text-slate-500">{code}</span>
            <span className={`${cls} font-medium`}>{e.text}</span>
          </div>
        );
      })}
    </div>
  </div>
);
