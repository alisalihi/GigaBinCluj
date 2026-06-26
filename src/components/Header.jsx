import { useEffect, useState } from 'react';
import clujLogo from '../assets/cluj_logo.png';

export const Header = ({ totalBins, activeSuburbs }) => {
  const [clock, setClock] = useState('');
  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString('ro-RO'));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <header className="shrink-0 border-b border-slate-300 bg-white px-4 py-2.5 shadow-sm flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        {/* Cluj-Napoca Coat of Arms */}
        <img src={clujLogo} alt="Cluj-Napoca" className="h-10 w-10 object-contain" />
        <div className="border-l border-slate-300 pl-3">
          <div className="flex items-center gap-2 text-base font-black leading-tight tracking-wide text-[#005BAA]">
            GigaBin
            <span className="rounded bg-[#FFD500] px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-slate-900">BIP 2026</span>
          </div>
          <div className="text-[11px] text-slate-600 leading-tight mt-0.5">
            Agentic AI smart-bin dispatch · Cluj-Napoca City Hall · Supercom SA
          </div>
        </div>
        <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-[#0099D8]/30 bg-[#0099D8]/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-[#005BAA]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#0099D8] animate-pulse" />
          LIVE
        </span>
      </div>

      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1.5 rounded-full border border-[#E31E24]/25 bg-[#E31E24]/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#B91C1C]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#E31E24] animate-pulse"/>
          In-app dispatch agent
        </span>

        <div className="text-right text-[11px] text-slate-600">
          <div className="font-mono font-semibold text-slate-900 tracking-widest">{clock}</div>
          <div>{totalBins} bins · {activeSuburbs} suburbs · 3 trucks</div>
        </div>
      </div>
    </header>
  );
};
