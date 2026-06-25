const TYPE = {
  danger:        { icon:'🔴', cls:'text-rose-400'    },
  warning:       { icon:'🟣', cls:'text-purple-400'  },
  success:       { icon:'✅', cls:'text-emerald-400' },
  route:         { icon:'🚛', cls:'text-blue-400'    },
  learn:         { icon:'🧠', cls:'text-violet-400'  },
  proactive:     { icon:'⚡', cls:'text-yellow-400'  },
  'agent-decision':{ icon:'🤖', cls:'text-sky-300'   },
  info:          { icon:'📡', cls:'text-slate-400'   },
};

export const AgentLog = ({ entries }) => (
  <div className="flex flex-col h-full">
    <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800 shrink-0">
      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Agent decision log</span>
      <span className="text-[10px] text-slate-700">{entries.length} events</span>
    </div>
    <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1 font-mono text-[11px]">
      {entries.length === 0 && <p className="text-slate-700 italic pt-2">Waiting for agent events…</p>}
      {entries.map(e => {
        const { icon, cls } = TYPE[e.type] ?? TYPE.info;
        return (
          <div key={e.id} className={`flex items-start gap-2 leading-relaxed ${e.isAgent ? 'bg-slate-900/50 rounded px-1' : ''}`}>
            <span className="shrink-0 text-slate-600 tabular-nums">{e.ts}</span>
            <span className="shrink-0">{icon}</span>
            <span className={cls}>{e.text}</span>
          </div>
        );
      })}
    </div>
  </div>
);
