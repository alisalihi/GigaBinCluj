import { minutesToLevel } from '../utils/routeOptimizer.js';

const PEAK_HOURS = new Set([7, 8, 16, 17, 18]);
const SHOULDER_HOURS = new Set([6, 9, 12, 13, 15, 19]);

const getBaseTraffic = (date = new Date(), override = null) => {
  if (override) {
    return {
      level: override.level ?? 'high',
      multiplier: override.multiplier ?? 1.55,
      reason: override.reason ?? 'demo scenario: heavy traffic',
      forceHold: override.forceHold ?? false,
    };
  }

  const hour = date.getHours();
  if (PEAK_HOURS.has(hour)) return { level: 'high', multiplier: 1.45, reason: 'urban peak window' };
  if (SHOULDER_HOURS.has(hour)) return { level: 'moderate', multiplier: 1.2, reason: 'transition traffic' };
  return { level: 'low', multiplier: 1.0, reason: 'favorable operating window' };
};

const getCorridorPressure = (truck) => {
  const districts = truck.districts ?? [];
  if (districts.includes('Centru') || districts.includes('Mărăști')) return 1.12;
  if (districts.includes('Florești')) return 1.18;
  if (districts.includes('Apahida') || districts.includes('Gilău')) return 1.08;
  return 1.0;
};

const hasCriticalTarget = (truck) => {
  const top = truck.routePlan?.[0];
  if (!top) return false;
  return top.fill >= 90 || top.reason?.includes('contamination') || top.minutesTo90 <= 30;
};

export const analyzeTrafficWindow = (bins, trucks, date = new Date(), override = null) => {
  const base = getBaseTraffic(date, override);
  const criticalBins = bins.filter(
    (bin) => bin.fill >= 90 || bin.contaminated || minutesToLevel(bin, 90) <= 30,
  );
  const activeRoutes = trucks.filter((truck) => truck.routePlan?.length);
  const corridorMultiplier =
    activeRoutes.length > 0
      ? activeRoutes.reduce((sum, truck) => sum + getCorridorPressure(truck), 0) / activeRoutes.length
      : 1;
  const multiplier = Math.round(base.multiplier * corridorMultiplier * 100) / 100;
  const shouldStartNow = criticalBins.length > 0 || (!base.forceHold && base.multiplier < 1.35);
  const delayMinutes = shouldStartNow ? 0 : 15;

  return {
    level: base.level,
    multiplier,
    reason: base.reason,
    criticalCount: criticalBins.length,
    delayMinutes,
    decision: shouldStartNow ? 'start_now' : 'hold_for_window',
    message: shouldStartNow
      ? `Start now: ${criticalBins.length} critical points exceed the acceptable risk threshold.`
      : `Hold ${delayMinutes} minutes: traffic is high and there are no immediate critical points.`,
  };
};

export const shouldHoldTruckForTraffic = (truck, traffic) => {
  if (!truck.routePlan?.length) return false;
  if (traffic.decision !== 'hold_for_window') return false;
  return !hasCriticalTarget(truck);
};
