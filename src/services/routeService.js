import { fetchRoute, fetchTravelMatrix } from '../utils/hereApi.js';
import {
  computeRouteCandidates,
  distanceKm,
  getBinUrgency,
  minutesToLevel,
} from '../utils/routeOptimizer.js';

const matrixCache = new Map();
const routeCache = new Map();
const CACHE_TTL_MS = 45000;

const cacheGet = (cache, key) => {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.ts > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return hit.value;
};

const cacheSet = (cache, key, value) => {
  cache.set(key, { ts: Date.now(), value });
};

const pointKey = (p) => `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`;

const nearestNeighborOrder = (matrix, stopCount) => {
  const visited = new Set([0]);
  const order = [];
  let current = 0;

  while (order.length < stopCount) {
    let bestIdx = -1;
    let bestTime = Infinity;

    for (let i = 1; i <= stopCount; i += 1) {
      if (visited.has(i)) continue;
      const time = matrix[current]?.[i]?.travelTimeSec;
      if (time != null && time < bestTime) {
        bestTime = time;
        bestIdx = i;
      }
    }

    if (bestIdx < 0) break;
    visited.add(bestIdx);
    order.push(bestIdx - 1);
    current = bestIdx;
  }

  return order;
};

const twoOptImprove = (order, matrix, stopCount) => {
  const route = [...order];
  if (route.length < 2) return route;

  const pathCost = (seq) => {
    let total = matrix[0]?.[seq[0] + 1]?.travelTimeSec ?? Infinity;
    for (let i = 0; i < seq.length - 1; i += 1) {
      total += matrix[seq[i] + 1]?.[seq[i + 1] + 1]?.travelTimeSec ?? Infinity;
    }
    return total;
  };

  let improved = true;
  while (improved) {
    improved = false;
    for (let i = 0; i < route.length - 1; i += 1) {
      for (let j = i + 1; j < route.length; j += 1) {
        const next = [...route.slice(0, i), ...route.slice(i, j + 1).reverse(), ...route.slice(j + 1)];
        if (pathCost(next) < pathCost(route)) {
          route.splice(0, route.length, ...next);
          improved = true;
        }
      }
    }
  }

  return route;
};

const buildPairwiseMatrix = async (points) => {
  const key = points.map(pointKey).join('|');
  const cached = cacheGet(matrixCache, key);
  if (cached) return cached;

  const data = await fetchTravelMatrix(points, points);
  const size = points.length;
  const matrix = Array.from({ length: size }, (_, i) =>
    Array.from({ length: size }, (_, j) => {
      if (i === j) return { travelTimeSec: 0, distanceM: 0 };
      const cell = data.grid?.[i]?.[j];
      if (cell?.travelTimeSec != null) return cell;
      return {
        travelTimeSec: Math.round((distanceKm(points[i], points[j]) / 24) * 3600),
        distanceM: Math.round(distanceKm(points[i], points[j]) * 1000),
      };
    }),
  );

  cacheSet(matrixCache, key, matrix);
  return matrix;
};

const orderStopsByRoadTime = async (origin, stops) => {
  if (stops.length <= 1) return stops;

  const points = [origin, ...stops.map((s) => ({ lat: s.lat, lng: s.lng }))];
  const matrix = await buildPairwiseMatrix(points);
  const nn = nearestNeighborOrder(matrix, stops.length);
  const optimized = twoOptImprove(nn, matrix, stops.length);
  const ordered = optimized.map((idx) => stops[idx]);

  return ordered.map((stop, index) => {
    const fromIdx = index === 0 ? 0 : optimized[index - 1] + 1;
    const toIdx = optimized[index] + 1;
    const leg = matrix[fromIdx]?.[toIdx];
    return {
      ...stop,
      etaMin: Math.max(1, Math.round((leg?.travelTimeSec ?? 0) / 60)),
      travelKm: Math.round(((leg?.distanceM ?? 0) / 1000) * 10) / 10,
      legTimeSec: leg?.travelTimeSec ?? null,
    };
  });
};

const fetchRoadRoute = async (origin, stops) => {
  if (!stops.length) return { polyline: [], durationMin: 0, distanceKm: 0 };

  const destination = stops[stops.length - 1];
  const via = stops.slice(0, -1);
  const key = [pointKey(origin), ...stops.map((s) => pointKey(s))].join('>');
  const cached = cacheGet(routeCache, key);
  if (cached) return cached;

  try {
    const route = await fetchRoute(origin, { lat: destination.lat, lng: destination.lng }, via);
    const value = {
      polyline: route.polyline ?? [],
      durationMin: route.durationMin ?? 1,
      distanceKm: route.distanceKm ?? 0,
    };
    cacheSet(routeCache, key, value);
    return value;
  } catch {
    const fallback = [
      origin,
      ...stops.map((s) => ({ lat: s.lat, lng: s.lng })),
    ];
    return {
      polyline: fallback,
      durationMin: Math.max(1, Math.round(fallback.reduce((sum, p, i, arr) => {
        if (i === 0) return 0;
        return sum + (distanceKm(arr[i - 1], p) / 24) * 60;
      }, 0))),
      distanceKm: Math.round(fallback.reduce((sum, p, i, arr) => {
        if (i === 0) return 0;
        return sum + distanceKm(arr[i - 1], p);
      }, 0) * 10) / 10,
    };
  }
};

export const replanTruckFromCandidates = async (truck, candidates) => {
  if (!candidates.length) {
    return {
      ...truck,
      routeIdx: 0,
      activeTargetId: null,
      route: [],
      routePlan: [],
      routeGeometry: [],
      routeGeomIdx: 0,
      totalRouteMin: 0,
      totalRouteKm: 0,
    };
  }

  const origin = { lat: truck.lat, lng: truck.lng };
  const ordered = await orderStopsByRoadTime(origin, candidates);
  const road = await fetchRoadRoute(origin, ordered);

  let cumulativeSec = 0;
  const routePlan = ordered.map((stop, index) => {
    cumulativeSec += stop.legTimeSec ?? stop.etaMin * 60;
    return {
      ...stop,
      order: index + 1,
      cumulativeMin: Math.max(1, Math.round(cumulativeSec / 60)),
    };
  });

  return {
    ...truck,
    routeIdx: 0,
    routeGeomIdx: 0,
    activeTargetId: routePlan[0]?.binId ?? null,
    route: routePlan.map((stop) => stop.binId),
    routePlan,
    routeGeometry: road.polyline,
    totalRouteMin: road.durationMin,
    totalRouteKm: road.distanceKm,
  };
};

export const replanTruckRoute = async (truck, bins) =>
  replanTruckFromCandidates(truck, computeRouteCandidates(truck, bins));

export const replanAllTrucks = async (bins, trucks) => {
  const active = trucks.filter((t) => t.status !== 'servicing' && t.status !== 'returning');
  const frozen = trucks.filter((t) => t.status === 'servicing' || t.status === 'returning');
  const firstTargets = new Set();

  const replanned = [];
  for (const truck of active) {
    const candidates = computeRouteCandidates(truck, bins).filter((candidate, index) => {
      if (index > 0) return true;
      if (!firstTargets.has(candidate.binId)) {
        firstTargets.add(candidate.binId);
        return true;
      }
      return false;
    });
    replanned.push(await replanTruckFromCandidates(truck, candidates));
  }
  const frozenWithRoutes = frozen.map((truck) => ({
    ...truck,
    route: truck.route ?? [],
    routePlan: truck.routePlan ?? [],
    routeGeometry: truck.routeGeometry ?? [],
  }));

  const byId = Object.fromEntries([...replanned, ...frozenWithRoutes].map((t) => [t.id, t]));
  return trucks.map((truck) => byId[truck.id] ?? truck);
};

export const buildDispatchSummary = (bins, trucks) => {
  const urgent = bins.filter((b) => b.fill > 85);
  const contaminated = bins.filter((b) => b.contaminated);
  const active = trucks.filter((t) => (t.routePlan?.length ?? 0) > 0);

  return {
    urgentCount: urgent.length,
    contaminatedCount: contaminated.length,
    activeTrucks: active.length,
    totalDriveMin: active.reduce((sum, t) => sum + (t.totalRouteMin ?? 0), 0),
    totalDriveKm: active.reduce((sum, t) => sum + (t.totalRouteKm ?? 0), 0),
    urgentBins: urgent,
    contaminatedBins: contaminated,
    trucks: active,
  };
};

export const getBinUrgencySnapshot = (bin) => ({
  id: bin.id,
  name: bin.name,
  suburb: bin.suburb,
  district: bin.district,
  fill: Math.round(bin.fill),
  urgency: Math.round(getBinUrgency(bin)),
  minutesTo90: Math.round(minutesToLevel(bin, 90)),
  contaminated: bin.contaminated,
});
