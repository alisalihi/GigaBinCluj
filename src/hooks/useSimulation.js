import { useCallback, useEffect, useRef, useState } from 'react';
import { INITIAL_BINS, INITIAL_TRUCKS, getScheduleMultiplier } from '../data/bins';
import { computeRoutes } from '../utils/routeOptimizer';
import { replanAllTrucks } from '../services/routeService';
import { analyzeTrafficWindow, shouldHoldTruckForTraffic } from '../services/trafficService';

const BASE_FILL = 0.40;
const TRUCK_SPEED = 0.00035;
const ARRIVE_THRESH = 0.00015;
const EMPTY_AMOUNT = 45;
const SERVICE_TICKS = 2;
const DEFAULT_TRUCK_CAPACITY_KG = 6500;
const RETURN_TO_DEPOT_RATIO = 0.86;
const REPLAN_DEBOUNCE_MS = 4000;
const TRAFFIC_HOLD_MS = 15000;
const DEMO_TRAFFIC_MS = 30000;
const DIESEL_L_PER_KM = 0.35;
const CO2_KG_PER_L_DIESEL = 2.63;
const VARIABLE_COST_EUR_PER_KM = 0.89;

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
  routeGeometry: truck.routeGeometry ?? [],
  routeGeomIdx: truck.routeGeomIdx ?? 0,
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

const moveAlongGeometry = (truck, geometry) => {
  if (!geometry?.length) return null;

  let idx = truck.routeGeomIdx ?? 0;
  if (idx >= geometry.length - 1) {
    const last = geometry[geometry.length - 1];
    const dist = Math.hypot(last.lat - truck.lat, last.lng - truck.lng);
    if (dist < ARRIVE_THRESH) return { arrived: true, truck: { ...truck, lat: last.lat, lng: last.lng, routeGeomIdx: idx } };
    return moveToward(truck, last);
  }

  const target = geometry[idx + 1];
  const moved = moveToward(truck, target);
  if (moved.arrived) {
    return {
      arrived: idx + 1 >= geometry.length - 1,
      truck: {
        ...moved.truck,
        routeGeomIdx: idx + 1,
      },
    };
  }
  return { arrived: false, truck: moved.truck };
};

const routeSignature = (truck) =>
  JSON.stringify({
    id: truck.id,
    route: truck.route,
    lat: Number(truck.lat.toFixed(4)),
    lng: Number(truck.lng.toFixed(4)),
    status: truck.status,
  });

export const useSimulation = (dispatchAgent) => {
  const [bins, setBins] = useState(() =>
    INITIAL_BINS.map((b) => ({
      ...b,
      fillRate: b.fillRateMultiplier * getScheduleMultiplier(b.district),
    })),
  );
  const [trucks, setTrucks] = useState(() => computeRoutes(INITIAL_BINS, INITIAL_TRUCKS.map(initTruck)));
  const [alerts, setAlerts] = useState([]);
  const [agentLog, setAgentLog] = useState([]);
  const [hereReady, setHereReady] = useState(false);
  const [trafficDecision, setTrafficDecision] = useState(() => analyzeTrafficWindow([], []));

  const binsRef = useRef(bins);
  const trucksRef = useRef(trucks);
  const memoryRef = useRef(initMemory());
  const alertedRef = useRef(new Set());
  const contRef = useRef(new Set());
  const replanBusyRef = useRef(false);
  const replanTimerRef = useRef(null);
  const lastRouteSigRef = useRef('');
  const trafficOverrideRef = useRef(null);

  useEffect(() => { binsRef.current = bins; }, [bins]);
  useEffect(() => { trucksRef.current = trucks; }, [trucks]);

  const pushAlert = useCallback((text, type = 'overflow') => {
    const id = Date.now() + Math.random();
    setAlerts((p) => [{ id, text, type }, ...p].slice(0, 6));
    setTimeout(() => setAlerts((p) => p.filter((a) => a.id !== id)), 5500);
  }, []);

  const pushLog = useCallback((text, type = 'info', isAgent = false) => {
    const ts = new Date().toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setAgentLog((p) => [{ id: Date.now() + Math.random(), ts, text, type, isAgent }, ...p].slice(0, 80));
  }, []);

  const updateMemory = useCallback((binId, delta) => {
    const mem = memoryRef.current[binId];
    if (!mem) return;
    mem.samples.push(delta);
    if (mem.samples.length > 20) mem.samples.shift();
    mem.avgRate = mem.samples.reduce((s, v) => s + v, 0) / mem.samples.length;
    if (mem.samples.length >= 10 && !mem.learnedLogged && mem.avgRate > BASE_FILL * 1.4) {
      mem.learnedLogged = true;
      const bin = binsRef.current.find((b) => b.id === binId);
      if (bin) {
        pushLog(
          `Learned pattern: ${bin.name} (${bin.suburb}) fills ${(mem.avgRate / BASE_FILL).toFixed(1)}x faster - raising future priority`,
          'learn',
          true,
        );
      }
    }
  }, [pushLog]);

  const scheduleReplan = useCallback((force = false) => {
    if (replanTimerRef.current) clearTimeout(replanTimerRef.current);
    replanTimerRef.current = setTimeout(async () => {
      if (replanBusyRef.current) return;
      replanBusyRef.current = true;
      try {
        const nextBins = binsRef.current;
        const baseTrucks = computeRoutes(nextBins, trucksRef.current.map(initTruck));
        const sig = baseTrucks.map(routeSignature).join('|');
        if (!force && sig === lastRouteSigRef.current) return;

        const replanned = await replanAllTrucks(nextBins, baseTrucks);
        const override =
          trafficOverrideRef.current?.until > Date.now()
            ? trafficOverrideRef.current
            : null;
        if (!override) trafficOverrideRef.current = null;
        const traffic = analyzeTrafficWindow(nextBins, replanned, new Date(), override);
        const trafficAware = replanned.map((truck) => {
          if (!shouldHoldTruckForTraffic(truck, traffic)) {
            return truck.status === 'holding' ? { ...truck, status: 'available', holdUntil: null } : truck;
          }
          return {
            ...truck,
            status: 'holding',
            holdUntil: Date.now() + TRAFFIC_HOLD_MS,
          };
        });
        lastRouteSigRef.current = sig;
        setTrafficDecision(traffic);

        setTrucks((prevTrucks) => {
          trafficAware.forEach((truck, i) => {
            const oldR = JSON.stringify(prevTrucks[i]?.route ?? []);
            const newR = JSON.stringify(truck.route);
            if (oldR !== newR && truck.route.length > 0 && dispatchAgent) {
              const text = dispatchAgent.explainReroute(truck);
              pushLog(text, 'route', true);
            }
          });
          if (traffic.decision === 'hold_for_window') {
            pushLog(`Traffic Start Agent: ${traffic.message} Multiplier ${traffic.multiplier}x.`, 'proactive', true);
          }
          return trafficAware;
        });
        setHereReady(true);
      } catch (error) {
        pushLog(`HERE routing unavailable - using local route estimate (${error.message})`, 'warning');
        setTrucks((prev) => computeRoutes(binsRef.current, prev.map(initTruck)));
      } finally {
        replanBusyRef.current = false;
      }
    }, REPLAN_DEBOUNCE_MS);
  }, [dispatchAgent, pushLog]);

  const triggerAgent = useCallback(
    async (bin, reason) => {
      if (!dispatchAgent) return;
      pushLog(`Agent: autonomous trigger - ${reason} · ${bin.name}`, 'proactive', true);
      const reply = await dispatchAgent.processEvent(bin, reason, {
        bins: binsRef.current,
        trucks: trucksRef.current,
        stats: {
          avg: Math.round(binsRef.current.reduce((s, b) => s + b.fill, 0) / binsRef.current.length),
        },
      });
      if (reply) {
        pushLog(reply, 'agent-decision', true);
        pushAlert(`Agent: ${bin.name}`, 'route');
      }
      scheduleReplan();
    },
    [dispatchAgent, pushAlert, pushLog, scheduleReplan],
  );

  const runDemoScenario = useCallback((scenario) => {
    if (scenario === 'traffic_peak') {
      trafficOverrideRef.current = {
        until: Date.now() + DEMO_TRAFFIC_MS,
        level: 'high',
        multiplier: 1.65,
        reason: 'demo scenario: peak-hour congestion on Cluj corridors',
        forceHold: true,
      };
      pushLog('Demo: traffic peak activated - the agent decides whether to start trucks now or hold for a better road window', 'proactive', true);
      scheduleReplan(true);
      return;
    }

    if (scenario === 'contamination') {
      setBins((prev) => {
        const target = prev.find((bin) => bin.id === 'B13') ?? prev[0];
        const next = prev.map((bin) =>
          bin.id === target.id ? { ...bin, contaminated: true, fill: Math.max(bin.fill, 82) } : bin,
        );
        pushAlert(`QA alert: demo contamination - ${target.name}`, 'contamination');
        pushLog(`Demo: contamination injected - ${target.name}`, 'warning');
        triggerAgent({ ...target, contaminated: true, fill: Math.max(target.fill, 82) }, 'demo contamination scenario');
        return next;
      });
      scheduleReplan();
      return;
    }

    if (scenario === 'floresti_overflow') {
      setBins((prev) => {
        const next = prev.map((bin) =>
          bin.district === 'Florești'
            ? { ...bin, fill: Math.max(bin.fill, bin.id === 'B17' ? 98 : 93) }
            : bin,
        );
        const target = next.find((bin) => bin.id === 'B17');
        if (target) {
          pushAlert('Overflow demo: Florești cluster', 'overflow');
          pushLog('Demo: Florești pressure activated - the agent prioritizes the suburb', 'danger');
          triggerAgent(target, 'demo overflow scenario in Florești');
        }
        return next;
      });
      scheduleReplan();
      return;
    }

    if (scenario === 'truck_full') {
      setTrucks((prev) =>
        prev.map((truck, index) =>
          index === 0
            ? {
                ...truck,
                loadKg: Math.round((truck.capacityKg ?? DEFAULT_TRUCK_CAPACITY_KG) * 0.92),
                status: 'returning',
                route: [],
                routePlan: [],
                routeGeometry: [],
                activeTargetId: null,
              }
            : truck,
        ),
      );
      pushAlert('Capacity demo: T1 full, returning to depot', 'route');
      pushLog('Demo: T1 is above the load threshold - automatic depot return', 'route', true);
      scheduleReplan();
    }
  }, [pushAlert, pushLog, scheduleReplan, triggerAgent]);

  useEffect(() => {
    scheduleReplan();
    return () => {
      if (replanTimerRef.current) clearTimeout(replanTimerRef.current);
    };
  }, [scheduleReplan]);

  useEffect(() => {
    const tick = () => {
      setBins((prev) => {
        const next = prev.map((bin) => {
          const schedMult = getScheduleMultiplier(bin.district);
          const effective = BASE_FILL * bin.fillRateMultiplier * schedMult;
          const delta = Math.random() * effective - 0.05;
          const fill = Math.min(100, Math.max(0, bin.fill + delta));
          const contaminated = Math.random() < 0.002 ? !bin.contaminated : bin.contaminated;

          updateMemory(bin.id, Math.max(0, delta));

          if (fill > 90 && !alertedRef.current.has(bin.id)) {
            alertedRef.current.add(bin.id);
            pushAlert(`Overflow risk: ${bin.name} ${Math.round(fill)}%`, 'overflow');
            pushLog(`Overflow - ${bin.name} (${bin.suburb}) at ${Math.round(fill)}%`, 'danger');
            triggerAgent({ ...bin, fill }, 'fill level above 90%');
          }
          if (fill < 80) alertedRef.current.delete(bin.id);

          if (contaminated && !bin.contaminated && !contRef.current.has(bin.id)) {
            contRef.current.add(bin.id);
            pushAlert(`QA alert: contamination - ${bin.name}`, 'contamination');
            pushLog(`Contamination - ${bin.name}`, 'warning');
            triggerAgent({ ...bin, fill }, 'contamination detected');
          }
          if (!contaminated) contRef.current.delete(bin.id);

          return { ...bin, fill, contaminated, fillRate: bin.fillRateMultiplier * schedMult };
        });

        const collectedEvents = [];

        setTrucks((prevTrucks) =>
          prevTrucks.map((truck) => {
            if (truck.serviceTicksRemaining > 0) {
              const remaining = truck.serviceTicksRemaining - 1;
              return {
                ...truck,
                status: remaining > 0 ? 'servicing' : 'available',
                serviceTicksRemaining: remaining,
              };
            }

            if (truck.status === 'holding') {
              if (truck.holdUntil && Date.now() < truck.holdUntil) {
                return truck;
              }
              scheduleReplan();
              return { ...truck, status: 'available', holdUntil: null };
            }

            const capacityKg = truck.capacityKg ?? DEFAULT_TRUCK_CAPACITY_KG;
            const loadKg = truck.loadKg ?? 0;
            const depot = { lat: truck.depotLat ?? truck.lat, lng: truck.depotLng ?? truck.lng };

            if (truck.status === 'returning' || loadKg >= capacityKg * RETURN_TO_DEPOT_RATIO) {
              const moved = moveToward(truck, depot);
              if (moved.arrived) {
                pushLog(`${truck.id} unloaded at depot - capacity restored`, 'success');
                scheduleReplan();
                return {
                  ...truck,
                  lat: depot.lat,
                  lng: depot.lng,
                  loadKg: 0,
                  status: 'available',
                  route: [],
                  routePlan: [],
                  routeGeometry: [],
                  routeGeomIdx: 0,
                  activeTargetId: null,
                };
              }
              return {
                ...moved.truck,
                status: 'returning',
                route: [],
                routePlan: [],
                routeGeometry: [],
                activeTargetId: null,
              };
            }

            if (!truck.route.length) {
              return { ...truck, status: 'available', activeTargetId: null };
            }

            const tid = truck.route[truck.routeIdx % truck.route.length];
            const target = next.find((b) => b.id === tid);
            if (!target) return truck;

            const geometry = truck.routeGeometry?.length
              ? truck.routeGeometry
              : [{ lat: truck.lat, lng: truck.lng }, { lat: target.lat, lng: target.lng }];

            const moved = moveAlongGeometry(truck, geometry) ?? moveToward(truck, target);

            if (moved.arrived) {
              const collectedKg = estimateCollectedKg(target);
              collectedEvents.push({ binId: tid, truckId: truck.id, targetName: target.name, collectedKg });
              pushAlert(`Collected: ${truck.id} emptied ${target.name}`, 'ok');
              pushLog(
                `${truck.id} collection completed - ${target.name}, +${collectedKg}kg, HERE replan queued`,
                'success',
              );
              scheduleReplan();
              return {
                ...truck,
                loadKg: Math.min(capacityKg, loadKg + collectedKg),
                status: 'servicing',
                serviceTicksRemaining: SERVICE_TICKS,
                route: truck.route.filter((id) => id !== tid),
                routePlan: (truck.routePlan ?? []).filter((stop) => stop.binId !== tid),
                routeGeometry: [],
                routeGeomIdx: 0,
                activeTargetId: truck.route.find((id) => id !== tid) ?? null,
                routeIdx: 0,
              };
            }
            return { ...moved.truck, status: 'enroute' };
          }),
        );

        if (!collectedEvents.length) return next;
        const emptiedIds = new Set(collectedEvents.map((event) => event.binId));
        return next.map((bin) =>
          emptiedIds.has(bin.id) ? { ...bin, fill: Math.max(8, bin.fill - EMPTY_AMOUNT), contaminated: false } : bin,
        );
      });
    };

    const iv = setInterval(tick, 900);
    return () => clearInterval(iv);
  }, [pushAlert, pushLog, scheduleReplan, triggerAgent, updateMemory]);

  const stats = {
    routeKm: Math.round(trucks.reduce((sum, truck) => {
      const plannedKm = truck.totalRouteKm ?? 0;
      const fallbackKm = (truck.routePlan ?? []).reduce((routeSum, stop) => routeSum + (stop.travelKm ?? 0), 0);
      return sum + (plannedKm || fallbackKm);
    }, 0) * 10) / 10,
    avg: Math.round(bins.reduce((s, b) => s + b.fill, 0) / bins.length),
    urgent: bins.filter((b) => b.fill > 85).length,
    contaminated: bins.filter((b) => b.contaminated).length,
    routing: trucks.filter((t) => t.route.length > 0).length,
    traffic: trafficDecision,
    total: bins.length,
  };
  stats.dieselL = Math.round(stats.routeKm * DIESEL_L_PER_KM * 10) / 10;
  stats.co2Kg = Math.round(stats.dieselL * CO2_KG_PER_L_DIESEL * 10) / 10;
  stats.variableCostEur = Math.round(stats.routeKm * VARIABLE_COST_EUR_PER_KM * 100) / 100;

  useEffect(() => {
    dispatchAgent?.syncStatus?.(bins, trucks, stats);
  }, [bins.length, trucks.length, stats.avg, stats.routing, dispatchAgent]);

  return { bins, trucks, alerts, agentLog, stats, hereReady, runDemoScenario };
};
