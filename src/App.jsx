import { useState } from 'react';
import { Header }     from './components/Header';
import { StatsBar, SuburbTrendBar } from './components/StatsBar';
import { AgenticLoopPanel } from './components/AgenticLoopPanel';
import { MapPanel }   from './components/MapPanel';
import { AgentPanel } from './components/AgentPanel/AgentPanel';
import { AgentLog }   from './components/AgentLog';
import { useSimulation } from './hooks/useSimulation';
import { useMistral }     from './components/AgentPanel/useGemini';
import './App.css';

export default function App() {
  const [n8nMode, setN8nMode] = useState(false);
  const [showLog, setShowLog] = useState(false);

  // Shared Mistral instance — also used by autonomous simulation triggers
  const mistral = useMistral([], [], {});
  const { bins, trucks, alerts, agentLog, stats } = useSimulation(mistral.callAgent);

  const suburbs = [...new Set(bins.map(b => b.suburb))];

  return (
    <div className="flex h-screen flex-col bg-slate-950 overflow-hidden">
      <Header n8nMode={n8nMode} onToggleN8n={() => setN8nMode(v => !v)} totalBins={bins.length} activeSuburbs={suburbs.length}/>
      <SuburbTrendBar/>
      <StatsBar stats={stats}/>
      <AgenticLoopPanel bins={bins} trucks={trucks} agentLog={agentLog}/>

      <main className="flex flex-1 overflow-hidden">
        <div className="relative flex flex-1 flex-col overflow-hidden">
          <MapPanel bins={bins} trucks={trucks} alerts={alerts}/>

          {/* Agent log toggle */}
          <button type="button" onClick={() => setShowLog(v => !v)}
            className="absolute bottom-16 right-4 z-[1001] flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/95 px-3 py-2 text-xs font-semibold text-slate-300 shadow-lg backdrop-blur-sm transition hover:bg-slate-800">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"/>
            {showLog ? 'Hide log' : 'Agent log'}
            {agentLog.length > 0 && (
              <span className="rounded-full bg-sky-600 px-1.5 py-0.5 text-[10px] font-black text-white">{agentLog.length}</span>
            )}
          </button>

          {/* Slide-up agent log */}
          {showLog && (
            <div className="absolute bottom-0 left-0 right-0 z-[1000] h-56 border-t border-slate-700 bg-slate-950/98 backdrop-blur-sm shadow-2xl">
              <AgentLog entries={agentLog}/>
            </div>
          )}
        </div>

        <AgentPanel bins={bins} trucks={trucks} stats={stats} n8nMode={n8nMode} onToggleN8n={() => setN8nMode(v => !v)}/>
      </main>
    </div>
  );
}
