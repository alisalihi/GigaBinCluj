import { useRef, useEffect, useState } from 'react';
import { SUBURB_TRENDS } from '../../data/bins';

const QUICK = [
  { label:'Which zones need urgent collection?', code:'OPS', prompt:'Which zones need urgent collection right now?' },
  { label:'Any contamination alerts?',           code:'QA', prompt:'Any contamination issues right now?' },
  { label:'Analyse Florești vs Cluj-Napoca trends', code:'TRD', prompt:'Compare the waste generation trends of Florești vs Cluj-Napoca based on the real Supercom data. Which needs more trucks?' },
  { label:"Today's schedule overview",           code:'SCH', prompt:"What is today's collection schedule and which districts are currently being serviced?" },
  { label:'Optimise all truck routes',           code:'RTE', prompt:'Optimise the truck routes for maximum efficiency right now, considering the real suburb data.' },
];

export const AgentPanel = ({ bins, trucks, stats, dispatchAgent }) => {
  const [input, setInput] = useState('');
  const endRef = useRef(null);
  const { messages, isTyping, answerQuery, providerLabel } = dispatchAgent;

  useEffect(() => { endRef.current?.scrollIntoView({ behavior:'smooth' }); }, [messages, isTyping]);

  const askAgent = (text) => {
    if (!text.trim()) return;
    answerQuery(text.trim(), { bins, trucks, stats });
  };

  const handleSend = () => {
    if (!input.trim()) return;
    askAgent(input);
    setInput('');
  };

  // Suburb trend mini-summary
  const suburbs = [...new Set(bins.map(b => b.suburb))];

  return (
    <aside className="flex h-full w-full shrink-0 flex-col bg-white" data-testid="agent-panel">
      {/* Header */}
      <div className="shrink-0 border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 text-sm font-black text-slate-900">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#005BAA] text-xs font-black text-white">GB</div>
              GigaBin Operator Agent
            </div>
            <p className="mt-1 text-[11px] text-slate-500">Project data + synthetic live signals · {bins.length} bins · {suburbs.length} suburbs</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="rounded-full border border-[#0099D8]/25 bg-[#0099D8]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#005BAA]">{providerLabel}</span>
            <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-700">Autonomous</span>
          </div>
        </div>

        {/* Real data trend pills */}
        <div className="mt-2 flex flex-wrap gap-1">
          {Object.entries(SUBURB_TRENDS).map(([s, t]) => (
            <span key={s} className={`rounded-full border px-1.5 py-0.5 text-[9px] font-bold ${t.trend === 'increasing' ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700' : 'border-[#E31E24]/25 bg-[#E31E24]/10 text-[#B91C1C]'}`}>
              {t.trend === 'increasing' ? '↑' : '↓'} {s}
            </span>
          ))}
        </div>
      </div>

      {/* Quick actions */}
      <div className="shrink-0 space-y-1.5 border-b border-slate-200 bg-slate-50 px-3 py-3">
        <div className="px-1 text-[10px] font-black uppercase tracking-widest text-[#005BAA]">Ask the agent</div>
        {QUICK.map(a => (
          <button key={a.prompt} type="button" onClick={() => askAgent(a.prompt)}
            className="grid w-full grid-cols-[34px_minmax(0,1fr)] items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-left text-[11px] font-semibold text-slate-700 shadow-sm transition hover:border-[#0099D8]/50 hover:bg-[#0099D8]/10 hover:text-[#005BAA]">
            <span className="rounded bg-slate-100 px-1.5 py-1 text-center text-[9px] font-black tracking-wider text-slate-500">{a.code}</span>
            <span className="truncate">{a.label}</span>
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-2.5 overflow-y-auto bg-white px-4 py-3">
        {messages.map(msg => (
          <div key={msg.id ?? msg.text}
            className={`text-sm leading-relaxed rounded-2xl px-3.5 py-2.5 ${
              msg.role === 'user'   ? 'ml-auto max-w-[88%] rounded-br-sm bg-[#005BAA] text-white'
            : msg.role === 'system' ? 'mx-auto text-center text-[11px] italic text-slate-500'
            :                         'mr-auto max-w-[92%] rounded-bl-sm border border-slate-200 bg-slate-50 text-slate-800 shadow-sm'
            }`}>
            {msg.text}
          </div>
        ))}
        {isTyping && (
          <div className="mr-auto flex max-w-[80%] items-center gap-1.5 rounded-2xl rounded-bl-sm border border-slate-200 bg-slate-50 px-4 py-3 shadow-sm">
            {[0,150,300].map(d => <span key={d} className="h-2 w-2 animate-bounce rounded-full bg-[#0099D8]" style={{animationDelay:`${d}ms`}}/>)}
          </div>
        )}
        <div ref={endRef}/>
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-slate-200 bg-slate-50 px-3 py-3">
        <div className="flex gap-2">
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key==='Enter' && handleSend()}
            placeholder="Ask about routes, bins, cost, CO2..."
            className="flex-1 rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#0099D8] focus:ring-2 focus:ring-[#0099D8]/20"/>
          <button type="button" onClick={handleSend}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#005BAA] text-white transition hover:bg-[#0099D8] active:scale-95" aria-label="Send">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M2 12L22 2L12 22L10 14L2 12Z"/></svg>
          </button>
        </div>
      </div>
    </aside>
  );
};
