import { useCallback, useEffect, useRef, useState } from 'react';
import { INITIAL_BINS, INITIAL_TRUCKS, getScheduleMultiplier } from '../data/bins';
import { computeRoutes } from '../utils/routeOptimizer';

const BASE_FILL = 0.40;
const TRUCK_SPEED = 0.0006;
const ARRIVE_THRESH = 0.0008;
const EMPTY_AMOUNT = 45;
const SERVICE_TICKS = 2;
const DEFAULT_TRUCK_CAPACITY_KG = 6500;
const RETURN_TO_DEPOT_RATIO = 0.86;

const initTruck = (truck) => ({
  ...truck,
  depotLat: truck.lat,
  depotLng: truck.lng,
  capacityKg: truck.capacityKg ?? DEFAULT_TRUCK_CAPACITY_KG,
  loadKg: truck.loadKg ?? 0,
  status: truck.status ?? 'available',
  serviceTicksRemaining: truck.serviceTicksRemaining ?? 0,
  activeTargetId: truck.activeTargetId ?? null,
  routePlan: truck.routePlan ?? [],
});

const initMemory = () =>
  Object.fromEntries(INITIAL_BINS.map((b) => [b.id, { samples: [], avgRate: BASE_FILL, learnedLogged: false }]));

const estimateCollectedKg = (bin) => {
  const syntheticBinCapacityKg = Math.min(1600, Math.max(450, (bin.monthlyWeightKg ?? 200000) / 850));
  return Math.round((bin.fill / 100) * syntheticBinCapacityKg);
};

const moveToward = (truck, target) => {
  const dlat = target.lat - truck.lat;
  const dlng = target.lng - truck.lng;
  const dist = Math.sqrt(dlat * dlat + dlng * dlng);
  if (dist < ARRIVE_THRESH) return { arrived: true, truck };
  return {
    arrived: false,
    truck: {
      ...truck,
      lat: truck.lat + (dlat / dist) * TRUCK_SPEED,
      lng: truck.lng + (dlng / dist) * TRUCK_SPEED,
    },
  };
};

export const useSimulation = (onAgentTrigger) => {
  const [bins,     setBins]     = useState(() => INITIAL_BINS.map(b => ({ ...b, fillRate: b.fillRateMultiplier * getScheduleMultiplier(b.district) })));
  const [trucks,   setTrucks]   = useState(() => computeRoutes(INITIAL_BINS, INITIAL_TRUCKS.map(initTruck)));
  const [alerts,   setAlerts]   = useState([]);
  const [agentLog, setAgentLog] = useState([]);

  const binsRef     = useRef(bins);
  const trucksRef   = useRef(trucks);
  const memoryRef   = useRef(initMemory());
  const alertedRef  = useRef(new Set());
  const contRef     = useRef(new Set());
  const agentBusy   = useRef(false);

  useEffect(() => { binsRef.current = bins; }, [bins]);
  useEffect(() => { trucksRef.current = trucks; }, [trucks]);

  const pushAlert = useCallback((text, type = 'overflow') => {
    const id = Date.now() + Math.random();
    setAlerts(p => [{ id, text, type }, ...p].slice(0, 6));
    setTimeout(() => setAlerts(p => p.filter(a => a.id !== id)), 5500);
  }, []);

  const pushLog = useCallback((text, type = 'info', isAgent = false) => {
    const ts = new Date().toLocaleTimeString('ro-RO', { hour:'2-digit', minute:'2-digit', second:'2-digit' });
    setAgentLog(p => [{ id: Date.now() + Math.random(), ts, text, type, isAgent }, ...p].slice(0, 80));
  }, []);

  const updateMemory = useCallback((binId, delta) => {
    const mem = memoryRef.current[binId];
    if (!mem) return;
    mem.samples.push(delta);
    if (mem.samples.length > 20) mem.samples.shift();
    mem.avgRate = mem.samples.reduce((s, v) => s + v, 0) / mem.samples.length;
    if (mem.samples.length >= 10 && !mem.learnedLogged && mem.avgRate > BASE_FILL * 1.4) {
      mem.learnedLogged = true;
      const bin = binsRef.current.find(b => b.id === binId);
      if (bin) pushLog(`Learned pattern: ${bin.name} (${bin.suburb}) fills ${(mem.avgRate / BASE_FILL).toFixed(1)}× faster than baseline — proactive schedule adjustment applied`, 'learn', true);
    }
  }, [pushLog]);

  const triggerAgent = useCallback(async (bin, reason) => {
    if (agentBusy.current || !onAgentTrigger) return;
    agentBusy.current = true;
    pushLog(`🤖 Autonomous trigger: ${reason} — ${bin.name}`, 'proactive', true);
    const cur = binsRef.current;
    const urgent = cur.filter(b => b.fill > 85).map(b => `${b.name} ${Math.round(b.fill)}%`);
    const routes = computeRoutes(cur, trucksRef.current.map(initTruck));
    const truck  = routes.find(t => t.route.includes(bin.id));
    const prompt = `AUTONOMOUS AGENT DECISION — no human prompted this.
Bin: ${bin.name}, Suburb: ${bin.suburb}, District: ${bin.district}, Fill: ${Math.round(bin.fill)}%
Trigger reason: ${reason}
Other overflow bins: ${urgent.filter(u => !u.startsWith(bin.name)).join(', ') || 'none'}
Assigned truck: ${truck?.id ?? 'unassigned'}
Monthly suburb volume: ${(bin.monthlyWeightKg/1000).toFixed(0)} tonnes (Supercom SA data)
Data trend: ${bin.fillRateMultiplier > 1.5 ? 'high-volume increasing suburb' : 'normal volume'}

Make an autonomous decision in exactly 3 sentences starting with "DECISION:". Cover: which truck responds, citizen notification needed yes/no, and one scheduling recommendation based on the suburb data.`;
    const reply = await onAgentTrigger(prompt);
    if (reply) {
      pushLog(reply, 'agent-decision', true);
      pushAlert(`🤖 Agent decision: ${bin.name}`, 'route');
    }
    setTimeout(() => { agentBusy.current = false; }, 10000);
  }, [onAgentTrigger, pushLog, pushAlert]);

  useEffect(() => {
    const tick = () => {
      setBins(prev => {
        const next = prev.map(bin => {
          const schedMult = getScheduleMultiplier(bin.district);
          const effective = BASE_FILL * bin.fillRateMultiplier * schedMult;
          const delta     = Math.random() * effective - 0.05;
          const fill      = Math.min(100, Math.max(0, bin.fill + delta));
          const contaminated = Math.random() < 0.002 ? !bin.contaminated : bin.contaminated;

          updateMemory(bin.id, Math.max(0, delta));

          if (fill > 90 && !alertedRef.current.has(bin.id)) {
            alertedRef.current.add(bin.id);
            pushAlert(`⚠ ${bin.name}: ${Math.round(fill)}% full`, 'overflow');
            pushLog(`Overflow — ${bin.name} (${bin.suburb}) at ${Math.round(fill)}%`, 'danger');
            triggerAgent({ ...bin, fill }, 'fill exceeded 90% threshold');
          }
          if (fill < 80) alertedRef.current.delete(bin.id);

          if (contaminated && !bin.contaminated && !contRef.current.has(bin.id)) {
            contRef.current.add(bin.id);
            pushAlert(`🟣 Contamination: ${bin.name}`, 'contamination');
            pushLog(`Contamination — ${bin.name} flagged`, 'warning');
            triggerAgent({ ...bin, fill }, 'contamination detected');
          }
          if (!contaminated) contRef.current.delete(bin.id);

          return { ...bin, fill, contaminated, fillRate: bin.fillRateMultiplier * schedMult };
        });

        setTrucks(prevTrucks => {
          const withRoutes = computeRoutes(next, prevTrucks);
          withRoutes.forEach((t, i) => {
            const oldR = JSON.stringify(prevTrucks[i]?.route ?? []);
            const newR = JSON.stringify(t.route);
            const top = t.routePlan?.[0];
            if (oldR !== newR && t.route.length > 0) {
              const reason = top
                ? `${top.binName} ${Math.round(top.fill)}%, ETA ${top.etaMin}m, ${top.reason}`
                : t.route.slice(0, 2).join(', ');
              pushLog(`${t.id} rerouted → ${reason}${t.route.length>1?` +${t.route.length-1} more`:''}`, 'route');
            }
          });
          return withRoutes.map(truck => {
            if (truck.serviceTicksRemaining > 0) {
              const remaining = truck.serviceTicksRemaining - 1;
              return {
                ...truck,
                status: remaining > 0 ? 'servicing' : 'available',
                serviceTicksRemaining: remaining,
              };
            }

            const capacityKg = truck.capacityKg ?? DEFAULT_TRUCK_CAPACITY_KG;
            const loadKg = truck.loadKg ?? 0;
            const depot = { lat: truck.depotLat ?? truck.lat, lng: truck.depotLng ?? truck.lng };
            if (truck.status === 'returning' || loadKg >= capacityKg * RETURN_TO_DEPOT_RATIO) {
              const moved = moveToward(truck, depot);
              if (moved.arrived) {
                pushLog(`${truck.id} unloaded at depot — capacity restored`, 'success');
                return {
                  ...truck,
                  lat: depot.lat,
                  lng: depot.lng,
                  loadKg: 0,
                  status: 'available',
                  route: [],
                  routePlan: [],
                  activeTargetId: null,
                };
              }
              return {
                ...moved.truck,
                status: 'returning',
                route: [],
                routePlan: [],
                activeTargetId: null,
              };
            }

            if (!truck.route.length) {
              return { ...truck, status: 'available', activeTargetId: null };
            }

            const tid    = truck.route[truck.routeIdx % truck.route.length];
            const target = next.find(b => b.id === tid);
            if (!target) return truck;
            const moved = moveToward(truck, target);
            if (moved.arrived) {
              const collectedKg = estimateCollectedKg(target);
              setBins(b => b.map(bin => bin.id === tid ? { ...bin, fill: Math.max(8, bin.fill - EMPTY_AMOUNT) } : bin));
              pushAlert(`✅ ${truck.id} emptied ${target.name}`, 'ok');
              pushLog(`${truck.id} completed collection — ${target.name}, +${collectedKg}kg load, replanning live route`, 'success');
              return {
                ...truck,
                loadKg: Math.min(capacityKg, loadKg + collectedKg),
                status: 'servicing',
                serviceTicksRemaining: SERVICE_TICKS,
                route: truck.route.filter(id => id !== tid),
                routePlan: (truck.routePlan ?? []).filter(stop => stop.binId !== tid),
                activeTargetId: truck.route.find(id => id !== tid) ?? null,
                routeIdx: 0,
              };
            }
            return { ...moved.truck, status: 'enroute' };
          });
        });
        return next;
      });
    };
    const iv = setInterval(tick, 900);
    return () => clearInterval(iv);
  }, [pushAlert, pushLog, updateMemory, triggerAgent]);

  const stats = {
    avg:          Math.round(bins.reduce((s,b) => s+b.fill, 0) / bins.length),
    urgent:       bins.filter(b => b.fill > 85).length,
    contaminated: bins.filter(b => b.contaminated).length,
    routing:      trucks.filter(t => t.route.length > 0).length,
    total:        bins.length,
  };

  return { bins, trucks, alerts, agentLog, stats };
};
