import { useRef, useEffect, useState } from 'react';
import { useMistral } from './useGemini';
import { getScheduleToday, getNextCollection, SUBURB_TRENDS } from '../../data/bins';

const QUICK = [
  { label:'Which zones need urgent collection?', icon:'🚛', prompt:'Which zones need urgent collection right now?' },
  { label:'Any contamination alerts?',           icon:'⚠️', prompt:'Any contamination issues right now?' },
  { label:'Analyse Florești vs Cluj-Napoca trends', icon:'📊', prompt:'Compare the waste generation trends of Florești vs Cluj-Napoca based on the real Supercom data. Which needs more trucks?' },
  { label:"Today's schedule overview",           icon:'📅', prompt:"What is today's collection schedule and which districts are currently being serviced?" },
  { label:'Optimise all truck routes',           icon:'🗺️', prompt:'Optimise the truck routes for maximum efficiency right now, considering the real suburb data.' },
];

export const AgentPanel = ({ bins, trucks, stats, n8nMode, onToggleN8n }) => {
  const [input, setInput] = useState('');
  const endRef = useRef(null);
  const { messages, isTyping, sendMessage, n8nMode: mistralN8n, setN8nMode, providerLabel } = useMistral(bins, trucks, stats);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior:'smooth' }); }, [messages, isTyping]);
  useEffect(() => { setN8nMode(n8nMode); }, [n8nMode, setN8nMode]);

  const handleSend = () => {
    if (!input.trim()) return;
    sendMessage(input.trim());
    setInput('');
  };

  // Suburb trend mini-summary
  const suburbs = [...new Set(bins.map(b => b.suburb))];
  const toggleN8nMode = () => {
    setN8nMode(v => !v);
    onToggleN8n?.();
  };

  return (
    <aside className="w-full max-w-[340px] shrink-0 border-l border-slate-800 bg-slate-950 flex flex-col">
      {/* Header */}
      <div className="shrink-0 border-b border-slate-800 bg-slate-900/95 px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 text-sm font-bold text-slate-100">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 text-white text-xs font-black">AI</div>
              City Operator Agent
            </div>
            <p className="mt-1 text-[11px] text-slate-500">Real Supercom SA data · {bins.length} bins · {suburbs.length} suburbs</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="rounded-full border border-slate-700 bg-slate-800 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-300">{providerLabel}</span>
            <button type="button" onClick={toggleN8nMode}
              className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider transition-all ${mistralN8n ? 'border-orange-500/40 bg-orange-500/15 text-orange-300' : 'border-slate-700 bg-slate-800/50 text-slate-600 hover:text-slate-300'}`}>
              {mistralN8n ? '● n8n' : '○ n8n'}
            </button>
          </div>
        </div>

        {/* Real data trend pills */}
        <div className="mt-2 flex flex-wrap gap-1">
          {Object.entries(SUBURB_TRENDS).map(([s, t]) => (
            <span key={s} className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${t.trend === 'increasing' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'}`}>
              {t.trend === 'increasing' ? '↑' : '↓'} {s}
            </span>
          ))}
        </div>
      </div>

      {/* Quick actions */}
      <div className="shrink-0 border-b border-slate-800 px-3 py-2 space-y-1.5">
        {QUICK.map(a => (
          <button key={a.prompt} type="button" onClick={() => sendMessage(a.prompt)}
            className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-left text-[11px] text-slate-300 transition hover:border-slate-700 hover:bg-slate-800 hover:text-slate-100">
            <span className="mr-1.5">{a.icon}</span>{a.label}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5">
        {messages.map(msg => (
          <div key={msg.id ?? msg.text}
            className={`text-sm leading-relaxed rounded-2xl px-3.5 py-2.5 ${
              msg.role === 'user'   ? 'ml-auto max-w-[88%] rounded-br-sm bg-sky-600 text-white'
            : msg.role === 'system' ? 'mx-auto text-center text-[11px] italic text-slate-600'
            :                         'mr-auto max-w-[92%] rounded-bl-sm bg-slate-800/80 text-slate-200 border border-slate-700/40'
            }`}>
            {msg.text}
          </div>
        ))}
        {isTyping && (
          <div className="mr-auto max-w-[80%] rounded-2xl rounded-bl-sm bg-slate-800/80 border border-slate-700/40 px-4 py-3 flex items-center gap-1.5">
            {[0,150,300].map(d => <span key={d} className="h-2 w-2 rounded-full bg-slate-500 animate-bounce" style={{animationDelay:`${d}ms`}}/>)}
          </div>
        )}
        <div ref={endRef}/>
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-slate-800 bg-slate-900/95 px-3 py-3">
        <div className="flex gap-2">
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key==='Enter' && handleSend()}
            placeholder="Ask the agent…"
            className="flex-1 rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-600 outline-none transition focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30"/>
          <button type="button" onClick={handleSend}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-600 text-white transition hover:bg-sky-500 active:scale-95" aria-label="Send">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M2 12L22 2L12 22L10 14L2 12Z"/></svg>
          </button>
        </div>
      </div>
    </aside>
  );
};
