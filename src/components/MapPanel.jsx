import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getBinColor, buildPopupContent } from '../utils/binColors';
import { minutesToLevel } from '../utils/routeOptimizer';
import { fetchHereConfig } from '../utils/hereApi.js';

const makeBinIcon = (bin) => {
  const color = getBinColor(bin);
  const size = bin.fill > 85 ? 30 : 24;
  const pulse = bin.fill > 90 ? 'animation:binPulse 1s infinite;' : '';
  return L.divIcon({
    className: '',
    html: `<div style="width:${size}px;height:${size}px;border-radius:9999px;background:${color};display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 2px rgba(255,255,255,0.95),0 2px 10px rgba(15,23,42,0.28);font-size:${size > 26 ? 9 : 8}px;font-weight:800;color:#fff;${pulse}">${Math.round(bin.fill)}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

const makeTruckIcon = (truck) =>
  L.divIcon({
    className: '',
    html: `<div style="width:34px;height:20px;border-radius:5px;background:${truck.color};display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:800;color:#fff;box-shadow:0 0 0 2px rgba(255,255,255,0.95),0 4px 14px rgba(15,23,42,0.28);letter-spacing:0.05em">${truck.label}</div>`,
    iconSize: [34, 20],
    iconAnchor: [17, 10],
  });

const buildTruckPopup = (truck, bins) => {
  const target = truck.routePlan?.[0];
  const targetBin = target ? bins.find((bin) => bin.id === target.binId) : null;
  const loadPct = Math.round(((truck.loadKg ?? 0) / (truck.capacityKg ?? 6500)) * 100);
  const targetText = targetBin
    ? `${targetBin.name} (${Math.round(targetBin.fill)}%)`
    : truck.status === 'returning'
      ? 'Depot'
      : 'No destination';

  return `
    <div style="min-width:200px;font-family:Inter,system-ui,sans-serif;color:#0f172a">
      <strong style="color:#005BAA">${truck.label}</strong>
      <div style="margin-top:6px;font-size:12px">Target: ${targetText}</div>
      <div style="font-size:12px">Load: ${Math.round(truck.loadKg ?? 0)}kg (${loadPct}%)</div>
      ${target ? `<div style="font-size:12px;color:#005BAA;font-weight:600">ETA ${target.etaMin ?? target.cumulativeMin ?? '?'}m · ${target.reason}</div>` : ''}
      ${truck.totalRouteKm ? `<div style="font-size:11px;color:#64748b">HERE route: ${truck.totalRouteKm} km / ${truck.totalRouteMin} min</div>` : ''}
    </div>`;
};

const CHIP = {
  overflow: 'border-[#E31E24]/30 bg-white text-[#B91C1C]',
  contamination: 'border-violet-500/30 bg-white text-violet-700',
  ok: 'border-emerald-500/30 bg-white text-emerald-700',
  route: 'border-[#0099D8]/30 bg-white text-[#005BAA]',
};

const hereTileUrl = (apiKey) =>
  `https://maps.hereapi.com/v3/base/mc/{z}/{x}/{y}/png8?style=explore.day&apiKey=${apiKey}`;

const fallbackTileUrl = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

export const MapPanel = ({ bins, trucks, alerts, onMapReady }) => {
  const mapDivRef = useRef(null);
  const stateRef = useRef(null);
  const onMapReadyRef = useRef(onMapReady);
  const [mapError, setMapError] = useState(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapProvider, setMapProvider] = useState('Fallback map');

  useEffect(() => {
    onMapReadyRef.current = onMapReady;
  }, [onMapReady]);

  const liveOverride = bins.some(
    (bin) => bin.fill > 85 || bin.contaminated || (bin.fill < 90 && minutesToLevel(bin, 90) <= 120),
  );

  useEffect(() => {
    let map = null;
    let resizeObserver;
    let cancelled = false;

    const init = async () => {
      const container = mapDivRef.current;
      if (!container || stateRef.current) return;

      try {
        let config = null;
        try {
          config = await fetchHereConfig();
        } catch {
          config = { hereApiKey: null };
        }
        if (cancelled) return;

        map = L.map(container, {
          center: [46.76, 23.58],
          zoom: 12,
          zoomControl: true,
          attributionControl: false,
        });

        L.tileLayer(config.hereApiKey ? hereTileUrl(config.hereApiKey) : fallbackTileUrl, {
          maxZoom: 20,
          attribution: config.hereApiKey ? '© HERE · Supercom SA' : '© OpenStreetMap · CartoDB',
        }).addTo(map);

        L.control
          .attribution({ prefix: config.hereApiKey ? '© HERE · Cluj-Napoca City Hall' : 'Fallback map · Cluj-Napoca City Hall' })
          .addTo(map);

        stateRef.current = {
          map,
          binMarkers: {},
          truckMarkers: {},
          routeLayers: {},
        };

        const resize = () => map?.invalidateSize();
        resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(container);
        setTimeout(resize, 100);
        setTimeout(resize, 400);

        if (!cancelled) {
          setMapProvider(config.hereApiKey ? 'HERE' : 'Fallback map');
          setMapReady(true);
          setMapError(null);
          onMapReadyRef.current?.(true);
        }
      } catch (error) {
        if (!cancelled) {
          setMapError(error.message);
          onMapReadyRef.current?.(false);
        }
      }
    };

    init();

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      if (map) {
        map.remove();
        map = null;
      }
      stateRef.current = null;
      setMapReady(false);
      onMapReadyRef.current?.(false);
    };
  }, []);

  useEffect(() => {
    const s = stateRef.current;
    if (!s || !mapReady) return;
    const { map, binMarkers, truckMarkers, routeLayers } = s;

    bins.forEach((bin) => {
      if (!binMarkers[bin.id]) {
        binMarkers[bin.id] = L.marker([bin.lat, bin.lng], { icon: makeBinIcon(bin) })
          .bindPopup(buildPopupContent(bin), { maxWidth: 230 })
          .addTo(map);
      } else {
        binMarkers[bin.id].setLatLng([bin.lat, bin.lng]);
        binMarkers[bin.id].setIcon(makeBinIcon(bin));
        if (binMarkers[bin.id].isPopupOpen()) {
          binMarkers[bin.id].setPopupContent(buildPopupContent(bin));
        }
      }
    });

    trucks.forEach((truck) => {
      if (!truckMarkers[truck.id]) {
        truckMarkers[truck.id] = L.marker([truck.lat, truck.lng], {
          icon: makeTruckIcon(truck),
          zIndexOffset: 1000,
        })
          .bindPopup(buildTruckPopup(truck, bins), { maxWidth: 240 })
          .addTo(map);
      } else {
        truckMarkers[truck.id].setLatLng([truck.lat, truck.lng]);
        truckMarkers[truck.id].setIcon(makeTruckIcon(truck));
        if (truckMarkers[truck.id].isPopupOpen()) {
          truckMarkers[truck.id].setPopupContent(buildTruckPopup(truck, bins));
        }
      }

      if (routeLayers[truck.id]) {
        map.removeLayer(routeLayers[truck.id]);
        delete routeLayers[truck.id];
      }

      const points =
        truck.routeGeometry?.length > 1
          ? truck.routeGeometry.map((p) => [p.lat, p.lng])
          : [
              [truck.lat, truck.lng],
              ...truck.route
                .map((id) => bins.find((b) => b.id === id))
                .filter(Boolean)
                .map((b) => [b.lat, b.lng]),
            ];

      if (points.length > 1) {
        routeLayers[truck.id] = L.polyline(points, {
          color: truck.color,
          weight: truck.routeGeometry?.length > 1 ? 4 : 3,
          opacity: 0.7,
          dashArray: '8 6',
        }).addTo(map);
      }
    });
  }, [bins, trucks, mapReady]);

  return (
    <section className="relative min-h-0 flex-1 overflow-hidden" data-testid="map-panel">
      <div ref={mapDivRef} className="absolute inset-0 z-0" />

      {!mapReady && !mapError && (
        <div className="absolute inset-0 z-[1001] flex items-center justify-center bg-white/80 text-sm font-semibold text-slate-600">
          Loading HERE map...
        </div>
      )}

      {mapError && (
        <div className="absolute inset-0 z-[1002] flex items-center justify-center bg-white/95 p-6 text-center text-sm font-semibold text-[#B91C1C]">
          HERE map did not load: {mapError}.
          <br />
          <span className="mt-2 block text-xs font-normal text-slate-500">
            Start the backend with <code className="text-[#005BAA]">npm run start:server</code> and reload the page.
          </span>
        </div>
      )}

      <div className="pointer-events-none absolute left-3 top-3 z-[1000] flex max-w-[240px] flex-col gap-1.5">
        {alerts.map((a) => (
          <div
            key={a.id}
            className={`animate-fade-in rounded-full border px-3 py-1.5 text-[11px] font-bold shadow-md backdrop-blur-md ${CHIP[a.type] ?? CHIP.overflow}`}
          >
            {a.text}
          </div>
        ))}
      </div>

      <div className="absolute right-4 top-4 z-[1000] max-w-[340px] rounded-lg border border-slate-200 bg-white/95 px-3 py-2 text-[11px] shadow-xl backdrop-blur-md">
        <div className="flex items-center justify-between gap-3">
          <span className="font-black uppercase tracking-widest text-[#005BAA]">Municipal waste dispatch</span>
          <span className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${
            liveOverride ? 'bg-[#0099D8]/10 text-[#005BAA]' : 'bg-slate-100 text-slate-500'
          }`}>
            {liveOverride ? 'Live override' : 'Baseline schedule'}
          </span>
        </div>
        <div className="mt-1.5 text-slate-600">
          Live truck location and route status - Supercom SA operator context (0264-954).
        </div>
      </div>

      <div className="absolute bottom-4 left-4 z-[1000] rounded-lg border border-slate-200 bg-white/95 px-4 py-3 text-[11px] font-medium text-slate-700 shadow-xl backdrop-blur-md">
        {[
          ['#22c55e', 'Low (<60%)'],
          ['#f59e0b', 'High (60-85%)'],
          ['#ef4444', 'Overflow (>85%)'],
          ['#8b5cf6', 'Contaminated'],
        ].map(([c, l]) => (
          <div key={l} className="flex items-center gap-2 py-0.5">
            <div className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: c }} />
            {l}
          </div>
        ))}
        <div className="flex items-center gap-2 py-0.5">
          <div className="h-2.5 w-2.5 shrink-0 rounded-sm bg-[#005BAA]" />
          Truck route (HERE)
        </div>
      </div>

      <div className="absolute bottom-4 right-4 z-[1000] rounded-lg border border-slate-200 bg-white/90 px-3 py-1.5 text-[10px] font-medium text-slate-500 shadow-sm backdrop-blur-sm">
        {mapProvider === 'HERE' ? '© HERE' : 'Fallback map'} · Supercom SA · Cluj-Napoca City Hall
      </div>
    </section>
  );
};
