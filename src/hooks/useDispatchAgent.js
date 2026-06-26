import { useCallback, useRef, useState } from 'react';
import {
  getScheduleToday,
  SUBURB_TRENDS,
  WASTE_FRACTIONS,
} from '../data/bins';
import { buildDispatchSummary, getBinUrgencySnapshot } from '../services/routeService';
import { analyzeTrafficWindow } from '../services/trafficService';
import { distanceKm } from '../utils/routeOptimizer';

const formatTruckPlan = (truck) => {
  const stops = truck.routePlan ?? [];
  if (!stops.length) return `${truck.label}: standing by`;
  const path = stops
    .map((s, i) => `${i + 1}. ${s.binName} (${Math.round(s.fill)}%, ${s.etaMin ?? '?'}m)`)
    .join(' → ');
  return `${truck.label}: ${path} · ${truck.totalRouteKm ?? '?'} km / ${truck.totalRouteMin ?? '?'} min (HERE)`;
};

const formatDistancePlan = (truck) => {
  const stops = truck.routePlan ?? [];
  if (!stops.length) return `${truck.label}: no active route`;
  const legs = stops
    .map((stop, index) => `${index + 1}. ${stop.binName}: ${stop.travelKm ?? '?'} km / ${stop.etaMin ?? stop.cumulativeMin ?? '?'} min`)
    .join('; ');
  return `${truck.label}: ${truck.totalRouteKm ?? '?'} km total · ${legs}`;
};

const buildStatusMessage = (bins, trucks, stats) => {
  const summary = buildDispatchSummary(bins, trucks);
  const suburbs = [...new Set(bins.map((b) => b.suburb))];

  return [
    'Dispatch agent active - Cluj-Napoca municipal waste collection.',
    `Monitoring ${bins.length} collection points across ${suburbs.length} zones · average fill ${stats.avg}%.`,
    `${summary.activeTrucks} trucks on HERE routes · ${summary.totalDriveKm.toFixed(1)} km planned.`,
    'The 4-fraction collection schedule is the baseline; live fill level, contamination, and truck capacity can override the route.',
  ].join(' ');
};

export const useDispatchAgent = () => {
  const [messages, setMessages] = useState([
    {
      role: 'system',
      text: 'Dispatch agent online. HERE Maps routing · Supercom SA operator context.',
      id: 'init',
    },
  ]);
  const busyRef = useRef(false);

  const addMsg = useCallback((text, role = 'agent') => {
    setMessages((prev) => [...prev, { role, text, id: Date.now() + Math.random() }]);
  }, []);

  const explainDecision = useCallback((bin, reason, truck, routePlan) => {
    const loadPct = Math.round(((truck?.loadKg ?? 0) / (truck?.capacityKg ?? 6500)) * 100);
    const stops = (routePlan ?? truck?.routePlan ?? [])
      .slice(0, 3)
      .map((s) => s.binName)
      .join(' → ');
    const truckLabel = truck?.label ?? 'no truck assigned';

    return [
      `DECISION: ${bin.name} (${bin.suburb}) - ${reason}.`,
      `Truck ${truckLabel} (load ${loadPct}%) - optimized HERE route: ${stops || 'reallocation in progress'}.`,
      `Citizen notification: ${bin.fill >= 90 || bin.contaminated ? 'YES' : 'NO'} · Recommendation: keep containers at household collection points according to the Supercom SA schedule.`,
    ].join(' ');
  }, []);

  const explainReroute = useCallback((truck) => {
    const top = truck.routePlan?.[0];
    if (!top) return `${truck.label}: no active destination.`;
    return `${truck.label} rerouted -> ${top.binName} ${Math.round(top.fill)}%, road ETA ${top.etaMin ?? top.cumulativeMin ?? '?'}m, ${top.reason} · total ${truck.totalRouteKm ?? '?'} km`;
  }, []);

  const processEvent = useCallback(
    async (bin, reason, context) => {
      if (busyRef.current) return null;
      busyRef.current = true;

      const { trucks } = context;
      const truck = trucks.find((t) => t.route?.includes(bin.id));
      const reply = explainDecision(bin, reason, truck, truck?.routePlan);

      setTimeout(() => {
        busyRef.current = false;
      }, 5000);

      return reply;
    },
    [explainDecision],
  );

  const answerQuery = useCallback((query, { bins, trucks, stats }) => {
    const q = query.toLowerCase();
    const summary = buildDispatchSummary(bins, trucks);

    if (q.includes('trafic') || q.includes('traffic') || q.includes('start') || q.includes('depart') || q.includes('hold')) {
      const traffic = stats.traffic ?? analyzeTrafficWindow(bins, trucks);
      const reply = `Traffic Start Agent: ${traffic.message} Traffic level ${traffic.level}, multiplier ${traffic.multiplier}x. Autonomous rule: if overflow, contamination, or risk under 30 minutes exists, trucks start even during peak traffic; otherwise they can wait for a more efficient window.`;
      addMsg(query, 'user');
      addMsg(reply, 'agent');
      return reply;
    }

    if (q.includes('distan') || q.includes('kilomet') || q.includes('km') || q.includes('cost') || q.includes('co2')) {
      const active = trucks.filter((t) => t.routePlan?.length);
      const totalKm = summary.totalDriveKm || active.reduce((sum, truck) => {
        let current = truck;
        return sum + (truck.routePlan ?? []).reduce((routeSum, stop) => {
          const km = stop.travelKm ?? distanceKm(current, stop);
          current = stop;
          return routeSum + km;
        }, 0);
      }, 0);
      const dieselL = totalKm * 0.35;
      const co2Kg = dieselL * 2.63;
      const variableCost = totalKm * 0.89;
      const reply = `Active distances: ${active.map(formatDistancePlan).join(' | ') || 'no active route'}. Estimated total ${totalKm.toFixed(1)} km, diesel ~${dieselL.toFixed(1)} L, CO2 ~${co2Kg.toFixed(1)} kg, variable cost ~€${variableCost.toFixed(2)} for this cycle.`;
      addMsg(query, 'user');
      addMsg(reply, 'agent');
      return reply;
    }

    if (q.includes('drum') || q.includes('road') || q.includes('strad') || q.includes('here')) {
      const plans = trucks.filter((t) => t.routePlan?.length).map(formatTruckPlan).join(' | ');
      const reply = plans
        ? `Road Routing Agent: routes are ordered with a road-time matrix and 2-opt improvement; when HERE is unavailable, the system uses local distance as fallback. ${plans}`
        : 'Road Routing Agent: no active route right now; the system remains on standby until live risk or the operating schedule creates a need.';
      addMsg(query, 'user');
      addMsg(reply, 'agent');
      return reply;
    }

    if (q.includes('urgent') || q.includes('zone')) {
      const list =
        summary.urgentBins.length > 0
          ? summary.urgentBins.map((b) => `${b.name} ${Math.round(b.fill)}%`).join(', ')
          : 'no active overflow';
      const reply = `Urgent zones: ${list}. ${summary.activeTrucks} trucks are active on the HERE road network.`;
      addMsg(query, 'user');
      addMsg(reply, 'agent');
      return reply;
    }

    if (q.includes('contamin')) {
      const list =
        summary.contaminatedBins.length > 0
          ? summary.contaminatedBins.map((b) => b.name).join(', ')
          : 'none';
      const reply = `Contamination alerts: ${list}. Waste fractions must remain separated according to the city schedule: plastic/metal, paper/cardboard, glass, residual.`;
      addMsg(query, 'user');
      addMsg(reply, 'agent');
      return reply;
    }

    if (q.includes('florești') || q.includes('floresti') || q.includes('trend')) {
      const cluj = SUBURB_TRENDS['Cluj-Napoca'];
      const fl = SUBURB_TRENDS.Florești;
      const reply = `Supercom SA trend: Cluj-Napoca ${cluj.trend} (${cluj.monthlyDeltaKg > 0 ? '+' : ''}${cluj.monthlyDeltaKg} kg/month), Florești ${fl.trend} (${fl.monthlyDeltaKg > 0 ? '+' : ''}${fl.monthlyDeltaKg} kg/month). The agent allocates T3 toward Florești/Apahida when live pressure exceeds the fixed schedule.`;
      addMsg(query, 'user');
      addMsg(reply, 'agent');
      return reply;
    }

    if (q.includes('program') || q.includes('schedule') || q.includes('today')) {
      const districts = [...new Set(bins.map((b) => b.district))];
      const today = districts
        .map((d) => {
          const types = getScheduleToday(d);
          return types.length ? `${d}: ${types.join(', ')}` : null;
        })
        .filter(Boolean)
        .join('; ');
      const reply = `Today schedule baseline: ${today || 'no scheduled collection today'}. Live override: ${summary.urgentCount} overflow points, ${summary.contaminatedCount} contamination alerts - HERE routes can deviate from the schedule.`;
      addMsg(query, 'user');
      addMsg(reply, 'agent');
      return reply;
    }

    if (q.includes('optim') || q.includes('route') || q.includes('reroute')) {
      const plans = trucks
        .filter((t) => t.routePlan?.length)
        .map(formatTruckPlan)
        .join(' | ');
      const reply = plans
        ? `Optimized routes (HERE shortest-road estimate): ${plans}`
        : 'All trucks are standing by - no live override is currently required.';
      addMsg(query, 'user');
      addMsg(reply, 'agent');
      return reply;
    }

    if (q.includes('frac') || q.includes('selective') || q.includes('recycling')) {
      const frac = WASTE_FRACTIONS.map((f) => `${f.label} (${f.color})`).join(', ');
      const reply = `Mandatory selective collection - 4 fractions: ${frac}. The daily schedule remains visible through the municipality; the agent overrides truck routes, not the waste fraction being collected.`;
      addMsg(query, 'user');
      addMsg(reply, 'agent');
      return reply;
    }

    const topUrgent = bins
      .map(getBinUrgencySnapshot)
      .sort((a, b) => b.urgency - a.urgency)
      .slice(0, 3)
      .map((b) => `${b.name} (${b.urgency})`)
      .join(', ');

    const reply = `Status: ${stats.avg}% average fill · ${summary.activeTrucks} trucks · ${summary.totalDriveKm.toFixed(1)} total km. Priorities: ${topUrgent}.`;
    addMsg(query, 'user');
    addMsg(reply, 'agent');
    return reply;
  }, [addMsg]);

  const syncStatus = useCallback((bins, trucks, stats) => {
    const text = buildStatusMessage(bins, trucks, stats);
    setMessages((prev) => {
      if (prev.length === 1) {
        return [...prev, { role: 'agent', text, id: 'status-boot' }];
      }
      return prev;
    });
  }, []);

  return {
    messages,
    isTyping: false,
    addMsg,
    explainDecision,
    explainReroute,
    processEvent,
    answerQuery,
    syncStatus,
    providerLabel: 'Dispatch Agent · HERE Routing',
  };
};
