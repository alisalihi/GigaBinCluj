import { minutesToLevel } from '../utils/routeOptimizer';

const getLatest = (entries, types) =>
  entries.find((entry) => types.includes(entry.type));

const compactText = (text, fallback) => {
  if (!text) return fallback;
  return text.length > 58 ? `${text.slice(0, 55)}...` : text;
};

export const AgenticLoopPanel = ({ bins, trucks, agentLog }) => {
  const urgent = bins.filter((bin) => bin.fill > 85);
  const contamination = bins.filter((bin) => bin.contaminated);
  const predicted = bins
    .map((bin) => ({ ...bin, minutesTo90: minutesToLevel(bin, 90) }))
    .filter((bin) => bin.fill < 90 && bin.minutesTo90 <= 120)
    .sort((a, b) => a.minutesTo90 - b.minutesTo90);
  const activeTrucks = trucks.filter((truck) => truck.route?.length > 0);
  const movingTrucks = trucks.filter((truck) => ['enroute', 'servicing', 'returning'].includes(truck.status));
  const learnedBins = bins.filter((bin) => (bin.fillRate ?? 0) > (bin.fillRateMultiplier ?? 1) * 1.25);
  const latestDecision = getLatest(agentLog, ['agent-decision', 'route']);
  const latestLearning = getLatest(agentLog, ['learn']);
  const liveOverride = urgent.length > 0 || contamination.length > 0 || predicted.length > 0;
  const holdingTrucks = trucks.filter((truck) => truck.status === 'holding');

  const steps = [
    {
      key: 'observe',
      label: 'Observe',
      value: `${bins.length} bins · ${trucks.length} trucks`,
      detail: `${urgent.length} urgent · ${contamination.length} contaminated`,
    },
    {
      key: 'predict',
      label: 'Predict',
      value: predicted[0] ? `${predicted[0].name} in ${Math.round(predicted[0].minutesTo90)}m` : 'No near overflow',
      detail: `${predicted.length} bins forecast within 2h`,
    },
    {
      key: 'decide',
      label: 'Decide',
      value: holdingTrucks.length ? `${holdingTrucks.length} held by traffic` : activeTrucks[0]?.routePlan?.[0]?.binName ?? 'Standing by',
      detail: holdingTrucks.length ? 'Waiting for better traffic window' : activeTrucks[0]?.routePlan?.[0]?.reason ?? 'No override needed',
    },
    {
      key: 'act',
      label: 'Act',
      value: `${movingTrucks.length}/${trucks.length} trucks active`,
      detail: `${trucks.filter((truck) => truck.status === 'returning').length} depot return · ${trucks.filter((truck) => truck.status === 'servicing').length} servicing`,
    },
    {
      key: 'explain',
      label: 'Explain',
      value: compactText(latestDecision?.text, 'Decision log ready'),
      detail: latestDecision ? latestDecision.ts : 'Waiting for next reroute',
    },
    {
      key: 'learn',
      label: 'Learn',
      value: latestLearning ? 'Pattern detected' : `${learnedBins.length} pressure signals`,
      detail: compactText(latestLearning?.text, 'Fill-rate memory updates continuously'),
    },
  ];

  return (
    <section className="shrink-0 border-b border-slate-200 bg-white px-4 py-3" data-testid="agentic-loop-panel">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-[#005BAA]">Agentic loop</span>
          <div className="mt-0.5 text-[10px] font-semibold text-slate-500">Observe - Predict - Decide - Act - Explain - Learn</div>
        </div>
        <div className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
          liveOverride
            ? 'border-[#0099D8]/35 bg-[#0099D8]/10 text-[#005BAA]'
            : 'border-slate-200 bg-slate-50 text-slate-500'
        }`}>
          {liveOverride ? 'Live override active' : 'Baseline schedule active'}
        </div>
      </div>

      <div className="space-y-2">
        {steps.map((step, index) => (
          <div key={step.key} className="grid grid-cols-[30px_minmax(0,1fr)] gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#005BAA] text-[10px] font-black text-white">
              {index + 1}
            </div>
            <div className="min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">{step.label}</span>
              </div>
              <div className="mt-0.5 truncate text-[12px] font-black text-slate-900">{step.value}</div>
              <div className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-slate-500">{step.detail}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 space-y-2 text-[10px]">
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-600">
          <span className="font-black uppercase tracking-wider text-slate-700">Traditional:</span> fixed collection schedule decides where trucks go.
        </div>
        <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-emerald-800">
          <span className="font-black uppercase tracking-wider">Agentic:</span> schedule is baseline; live fill, contamination, ETA, and capacity override it.
        </div>
      </div>
    </section>
  );
};
