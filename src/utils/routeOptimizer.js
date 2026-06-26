const MAX_ROUTE_STOPS = 5;
const MIN_HOME_FILL = 58;
const EMERGENCY_FILL = 90;
const REROUTE_MARGIN = 12;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export const distanceKm = (a, b) => {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
};

export const estimateFillPerHour = (bin) => {
  const liveRate = bin.fillRate ?? bin.fillRateMultiplier ?? 1;
  return clamp(liveRate * 4.5, 0.6, 18);
};

export const minutesToLevel = (bin, level = 90) => {
  if (bin.fill >= level) return 0;
  return ((level - bin.fill) / estimateFillPerHour(bin)) * 60;
};

export const getBinUrgency = (bin) => {
  const minsTo90 = minutesToLevel(bin, 90);
  const predictedOverflowRisk =
    bin.fill >= 95
      ? 100
      : bin.fill >= 90
        ? 92
        : clamp(100 - (minsTo90 / 240) * 100, 0, 100);

  const contaminationScore = bin.contaminated ? 100 : 0;
  const schedulePressure =
    (bin.fillRate ?? bin.fillRateMultiplier ?? 1) >
    (bin.fillRateMultiplier ?? 1) * 1.25
      ? 100
      : 0;
  const volumePressure = clamp(
    ((bin.monthlyWeightKg ?? 0) / 1_000_000) * 20,
    0,
    100,
  );

  return clamp(
    bin.fill * 0.45 +
      predictedOverflowRisk * 0.28 +
      contaminationScore * 0.15 +
      schedulePressure * 0.07 +
      volumePressure * 0.05,
    0,
    100,
  );
};

const getRouteReason = (bin, isHomeZone) => {
  if (bin.contaminated) return 'contamination response';
  if (bin.fill >= EMERGENCY_FILL) return isHomeZone ? 'overflow priority' : 'cross-zone emergency';
  if (minutesToLevel(bin, 90) <= 90) return 'predicted overflow';
  if ((bin.fillRate ?? 0) > (bin.fillRateMultiplier ?? 1) * 1.25) return 'schedule pressure';
  return 'fill-level priority';
};

const scoreCandidate = (truck, bin) => {
  const isHomeZone = truck.districts.includes(bin.district);
  const urgency = getBinUrgency(bin);
  const travelKm = distanceKm(truck, bin);
  const etaMin = Math.max(1, Math.round((travelKm / 24) * 60));
  const loadRatio = (truck.loadKg ?? 0) / (truck.capacityKg ?? 6500);
  const outsideZonePenalty = isHomeZone ? 0 : 18;
  const loadPenalty = loadRatio * 10;
  const travelPenalty = travelKm * 4.2;
  const score = urgency - outsideZonePenalty - loadPenalty - travelPenalty;

  return {
    id: bin.id,
    binId: bin.id,
    binName: bin.name,
    district: bin.district,
    lat: bin.lat,
    lng: bin.lng,
    fill: bin.fill,
    urgency,
    score,
    travelKm,
    etaMin,
    isHomeZone,
    reason: getRouteReason(bin, isHomeZone),
    minutesTo90: minutesToLevel(bin, 90),
  };
};

const shouldConsiderBin = (truck, bin) => {
  const isHomeZone = truck.districts.includes(bin.district);
  const urgentEnough = getBinUrgency(bin) >= 54;
  const emergency =
    bin.contaminated || bin.fill >= EMERGENCY_FILL || minutesToLevel(bin, 90) <= 90;

  return isHomeZone
    ? bin.fill >= MIN_HOME_FILL || urgentEnough
    : emergency && urgentEnough;
};

const keepCurrentTargetWhenReasonable = (truck, candidates) => {
  const currentId = truck.activeTargetId ?? truck.route?.[truck.routeIdx ?? 0];
  if (!currentId || candidates.length < 2) return candidates;

  const current = candidates.find((c) => c.binId === currentId);
  const best = candidates[0];
  if (!current || current.binId === best.binId) return candidates;
  if (current.fill < MIN_HOME_FILL && !current.isHomeZone) return candidates;

  if (best.score - current.score < REROUTE_MARGIN) {
    return [current, ...candidates.filter((c) => c.binId !== current.binId)];
  }

  return candidates;
};

export const computeRouteCandidates = (truck, bins) => {
  const candidates = bins
    .filter((bin) => shouldConsiderBin(truck, bin))
    .map((bin) => scoreCandidate(truck, bin))
    .filter((candidate) => candidate.score > 20)
    .sort((a, b) => b.score - a.score);

  const stable = keepCurrentTargetWhenReasonable(truck, candidates);
  return stable.slice(0, MAX_ROUTE_STOPS);
};

export const computeRoutes = (bins, trucks) => {
  const firstTargets = new Set();

  return trucks.map((truck) => {
    if (truck.status === 'servicing' || truck.status === 'returning') {
      return { ...truck, route: truck.route ?? [], routePlan: truck.routePlan ?? [] };
    }

    const routePlan = computeRouteCandidates(truck, bins).filter((candidate, index) => {
      if (index > 0) return true;
      if (!firstTargets.has(candidate.binId)) {
        firstTargets.add(candidate.binId);
        return true;
      }
      return false;
    });

    return {
      ...truck,
      routeIdx: truck.routeIdx ?? 0,
      activeTargetId: routePlan[0]?.binId ?? null,
      route: routePlan.map((stop) => stop.binId),
      routePlan,
    };
  });
};
