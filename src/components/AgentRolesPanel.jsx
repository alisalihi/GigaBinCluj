const ROLES = [
  { name: 'Bin Monitoring Agent', detail: 'tracks fill, contamination, schedule pressure' },
  { name: 'Traffic Start Agent', detail: 'starts now or holds for a better road window' },
  { name: 'Road Routing Agent', detail: 'orders stops with HERE matrix and local fallback' },
  { name: 'Dispatch Decision Agent', detail: 'assigns trucks by urgency, ETA, load, zone' },
  { name: 'Explanation Agent', detail: 'writes operator-readable decisions and reasons' },
  { name: 'Learning Agent', detail: 'detects fast-filling patterns over time' },
];

export const AgentRolesPanel = () => (
  <section className="shrink-0 border-b border-slate-200 bg-slate-50 px-4 py-3" data-testid="agent-roles-panel">
    <div className="mb-2 flex items-center justify-between gap-2">
      <span className="text-[10px] font-black uppercase tracking-widest text-[#005BAA]">Autonomous agent roles</span>
      <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">GigaBin model</span>
    </div>
    <div className="grid grid-cols-2 gap-2">
      {ROLES.map((role) => (
        <div key={role.name} className="min-h-[76px] rounded-lg border border-slate-200 bg-white px-2.5 py-2 shadow-sm">
          <div className="text-[10px] font-black uppercase leading-tight tracking-wider text-slate-900">{role.name}</div>
          <div className="mt-1.5 line-clamp-3 text-[10px] leading-snug text-slate-500">{role.detail}</div>
        </div>
      ))}
    </div>
  </section>
);
