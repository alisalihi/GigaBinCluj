import { useMemo, useState } from 'react';
import { Header }     from './components/Header';
import { ImpactStatsBar, StatsBar, SuburbTrendBar } from './components/StatsBar';
import { AgenticLoopPanel } from './components/AgenticLoopPanel';
import { AgentRolesPanel } from './components/AgentRolesPanel';
import { DemoControls } from './components/DemoControls';
import { MapPanel }   from './components/MapPanel';
import { AgentPanel } from './components/AgentPanel/AgentPanel';
import { AgentLog }   from './components/AgentLog';
import { useSimulation } from './hooks/useSimulation';
import { useDispatchAgent } from './hooks/useDispatchAgent';
import './App.css';

export default function App() {
  const [showLog, setShowLog] = useState(false);

  const dispatchAgent = useDispatchAgent();
  const simulationAgent = useMemo(() => ({
    explainReroute: dispatchAgent.explainReroute,
    processEvent: dispatchAgent.processEvent,
    syncStatus: dispatchAgent.syncStatus,
  }), [dispatchAgent.explainReroute, dispatchAgent.processEvent, dispatchAgent.syncStatus]);
  const { bins, trucks, alerts, agentLog, stats, runDemoScenario } = useSimulation(simulationAgent);

  const suburbs = [...new Set(bins.map(b => b.suburb))];

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-slate-100">
      <Header totalBins={bins.length} activeSuburbs={suburbs.length}/>
      <SuburbTrendBar/>

      <main className="grid min-h-0 flex-1 grid-cols-[360px_minmax(0,1fr)_360px] overflow-hidden">
        <aside className="min-h-0 overflow-y-auto border-r border-slate-300 bg-white">
          <StatsBar stats={stats}/>
          <ImpactStatsBar stats={stats}/>
          <DemoControls onScenario={runDemoScenario}/>
          <AgentRolesPanel/>
          <AgenticLoopPanel bins={bins} trucks={trucks} agentLog={agentLog}/>
        </aside>

        <div className="relative flex min-w-0 flex-col overflow-hidden border-r border-slate-300 bg-slate-200">
          <MapPanel bins={bins} trucks={trucks} alerts={alerts}/>

          {/* Agent log toggle */}
          <button type="button" onClick={() => setShowLog(v => !v)}
            className="absolute bottom-16 right-4 z-[1001] flex items-center gap-2 rounded-lg border border-slate-200 bg-white/95 px-3 py-2 text-xs font-bold text-[#005BAA] shadow-lg backdrop-blur-sm transition hover:border-[#0099D8]/50 hover:bg-[#0099D8]/10">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"/>
            {showLog ? 'Hide log' : 'Agent log'}
            {agentLog.length > 0 && (
              <span className="rounded-full bg-[#005BAA] px-1.5 py-0.5 text-[10px] font-black text-white">{agentLog.length}</span>
            )}
          </button>

          {/* Slide-up agent log */}
          {showLog && (
            <div className="absolute bottom-0 left-0 right-0 z-[1000] h-56 border-t border-slate-300 bg-white/98 shadow-2xl backdrop-blur-sm">
              <AgentLog entries={agentLog}/>
            </div>
          )}
        </div>

        <AgentPanel bins={bins} trucks={trucks} stats={stats} dispatchAgent={dispatchAgent}/>
      </main>
    </div>
  );
}
