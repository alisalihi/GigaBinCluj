import { useEffect, useState } from 'react';
import clujLogo from '../assets/cluj_logo.png';

export const Header = ({ n8nMode, onToggleN8n, totalBins, activeSuburbs }) => {
  const [clock, setClock] = useState('');
  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString('ro-RO'));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <header className="shrink-0 border-b border-slate-800 bg-slate-900/98 backdrop-blur-sm px-4 py-2.5 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        {/* Cluj-Napoca Coat of Arms */}
        <img src={clujLogo} alt="Cluj-Napoca" className="h-10 w-10 object-contain drop-shadow-lg" />
        <div className="border-l border-slate-700 pl-3">
          <div className="text-sm font-bold text-slate-100 leading-tight tracking-wide">
            Cluj Smart Bin Agent Network
          </div>
          <div className="text-[11px] text-slate-500 leading-tight mt-0.5">
            Municipiul Cluj-Napoca · Supercom SA · Erasmus BIP 2026
          </div>
        </div>
        <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-emerald-300">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          LIVE
        </span>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleN8n}
          className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all ${
            n8nMode
              ? 'border-orange-500/40 bg-orange-500/15 text-orange-300'
              : 'border-slate-700 bg-slate-800 text-slate-500 hover:text-slate-300'
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${n8nMode ? 'bg-orange-400 animate-pulse' : 'bg-slate-600'}`}/>
          {n8nMode ? 'n8n active' : 'Direct AI'}
        </button>

        <div className="text-right text-[11px] text-slate-500">
          <div className="font-mono font-semibold text-slate-200 tracking-widest">{clock}</div>
          <div>{totalBins} bins · {activeSuburbs} suburbs · 3 trucks</div>
        </div>
      </div>
    </header>
  );
};
