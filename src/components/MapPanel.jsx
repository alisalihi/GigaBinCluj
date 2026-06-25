import L from "leaflet";
import { useEffect, useRef } from "react";
import { getBinColor, buildPopupContent } from "../utils/binColors";
import { minutesToLevel } from "../utils/routeOptimizer";

const makeBinIcon = (bin) => {
  const color = getBinColor(bin);
  const size = bin.fill > 85 ? 30 : 24;
  const pulse = bin.fill > 90 ? `animation:binPulse 1s infinite;` : "";
  const ring = bin.contaminated
    ? "0 0 0 3px #8b5cf6, 0 0 12px rgba(139,92,246,0.5)"
    : bin.fill > 85
      ? "0 0 0 2px rgba(239,68,68,0.6), 0 2px 10px rgba(239,68,68,0.4)"
      : "0 2px 8px rgba(0,0,0,0.5)";
  return L.divIcon({
    className: "",
    html: `<div style="width:${size}px;height:${size}px;border-radius:9999px;background:${color};display:flex;align-items:center;justify-content:center;box-shadow:${ring};font-size:${size > 26 ? 9 : 8}px;font-weight:800;color:#fff;${pulse}">${Math.round(bin.fill)}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

const makeTruckIcon = (truck) =>
  L.divIcon({
    className: "",
    html: `<div style="width:34px;height:20px;border-radius:6px;background:${truck.color};display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:800;color:#fff;box-shadow:0 0 0 2px rgba(15,23,42,0.9),0 4px 14px rgba(0,0,0,0.5);letter-spacing:0.05em">${truck.label}</div>`,
    iconSize: [34, 20],
    iconAnchor: [17, 10],
  });

const buildTruckPopupContent = (truck, bins) => {
  const target = truck.routePlan?.[0];
  const targetBin = target ? bins.find((bin) => bin.id === target.binId) : null;
  const loadPct = Math.round(((truck.loadKg ?? 0) / (truck.capacityKg ?? 6500)) * 100);
  const targetText = targetBin
    ? `${targetBin.name} (${Math.round(targetBin.fill)}%)`
    : truck.status === "returning"
      ? "Depot"
      : "No live dispatch target";

  return `
    <div style="min-width:190px;font-family:Inter,system-ui,sans-serif;color:#e2e8f0;background:#0f172a;padding:10px;border-radius:10px">
      <div style="display:flex;justify-content:space-between;gap:8px;align-items:center">
        <strong style="font-size:13px">${truck.label}</strong>
        <span style="font-size:10px;text-transform:uppercase;color:#94a3b8">${truck.status ?? "available"}</span>
      </div>
      <div style="margin-top:7px;font-size:11px;color:#cbd5e1">Target: <strong>${targetText}</strong></div>
      <div style="margin-top:4px;font-size:11px;color:#cbd5e1">Load: ${Math.round(truck.loadKg ?? 0)}kg / ${truck.capacityKg ?? 6500}kg (${loadPct}%)</div>
      ${
        target
          ? `<div style="margin-top:4px;font-size:11px;color:#93c5fd">ETA ${target.etaMin}m · ${target.reason}</div>`
          : ""
      }
    </div>`;
};

const CHIP = {
  overflow: "border-rose-500/30 bg-rose-500/15 text-rose-200",
  contamination: "border-purple-500/30 bg-purple-500/15 text-purple-200",
  ok: "border-emerald-500/30 bg-emerald-500/15 text-emerald-200",
  route: "border-blue-500/30 bg-blue-500/15 text-blue-200",
};

export const MapPanel = ({ bins, trucks, alerts }) => {
  const mapDivRef = useRef(null); // ref to the DOM element
  const stateRef = useRef(null); // ref to leaflet state
  const liveOverride = bins.some(
    (bin) => bin.fill > 85 || bin.contaminated || (bin.fill < 90 && minutesToLevel(bin, 90) <= 120),
  );

  useEffect(() => {
    // Wait until the div is in the DOM
    if (!mapDivRef.current || stateRef.current) return;

    const map = L.map(mapDivRef.current, {
      center: [46.76, 23.58],
      zoom: 12,
      zoomControl: true,
      attributionControl: false,
    });

    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      {
        maxZoom: 19,
      },
    ).addTo(map);

    L.control
      .attribution({ prefix: "© OpenStreetMap · CartoDB · Supercom SA data" })
      .addTo(map);

    stateRef.current = {
      map,
      binMarkers: {},
      truckMarkers: {},
      routeLayers: {},
    };

    // ── FIX 1: invalidateSize after a short delay so the container
    //           has its final CSS dimensions before tiles are requested
    setTimeout(() => map.invalidateSize(), 100);
    setTimeout(() => map.invalidateSize(), 400);

    // ── FIX 2: ResizeObserver keeps tiles correct if the layout shifts
    //           (e.g. sidebar opens, window resizes, agent log slides up)
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(mapDivRef.current);

    return () => {
      ro.disconnect();
      map.remove();
      stateRef.current = null;
    };
  }, []);

  useEffect(() => {
    const s = stateRef.current;
    if (!s) return;
    const { map, binMarkers } = s;
    bins.forEach((bin) => {
      if (!binMarkers[bin.id]) {
        binMarkers[bin.id] = L.marker([bin.lat, bin.lng], {
          icon: makeBinIcon(bin),
        })
          .bindPopup(buildPopupContent(bin), { maxWidth: 230 })
          .addTo(map);
      } else {
        binMarkers[bin.id].setIcon(makeBinIcon(bin));
        if (binMarkers[bin.id].isPopupOpen())
          binMarkers[bin.id].setPopupContent(buildPopupContent(bin));
      }
    });
  }, [bins]);

  useEffect(() => {
    if (!stateRef.current) return;
    const { map, truckMarkers, routeLayers } = stateRef.current;
    trucks.forEach((truck) => {
      if (!truckMarkers[truck.id]) {
        truckMarkers[truck.id] = L.marker([truck.lat, truck.lng], {
          icon: makeTruckIcon(truck),
          zIndexOffset: 1000,
        })
          .bindPopup(buildTruckPopupContent(truck, bins), { maxWidth: 240 })
          .addTo(map);
      } else {
        truckMarkers[truck.id].setLatLng([truck.lat, truck.lng]);
        truckMarkers[truck.id].setIcon(makeTruckIcon(truck));
        if (truckMarkers[truck.id].isPopupOpen()) {
          truckMarkers[truck.id].setPopupContent(buildTruckPopupContent(truck, bins));
        }
      }
    });
    Object.values(routeLayers).forEach((l) => map.removeLayer(l));
    trucks.forEach((truck) => {
      if (!truck.route.length) return;
      const pts = [
        [truck.lat, truck.lng],
        ...truck.route
          .map((id) => {
            const b = bins.find((x) => x.id === id);
            return b ? [b.lat, b.lng] : null;
          })
          .filter(Boolean),
      ];
      routeLayers[truck.id] = L.polyline(pts, {
        color: truck.color,
        weight: 2.5,
        opacity: 0.65,
        dashArray: "8 5",
      }).addTo(map);
    });
  }, [trucks, bins]);

  return (
    <section className="relative flex-1 overflow-hidden">
      <div ref={mapDivRef} className="h-full w-full" />

      {/* Alert chips */}
      <div className="absolute left-3 top-3 z-[1000] flex flex-col gap-1.5 pointer-events-none max-w-[230px]">
        {alerts.map((a) => (
          <div
            key={a.id}
            className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold backdrop-blur-md animate-fade-in ${CHIP[a.type] ?? CHIP.overflow}`}
          >
            {a.text}
          </div>
        ))}
      </div>

      <div className="absolute right-4 top-4 z-[1000] max-w-[320px] rounded-xl border border-slate-700/70 bg-slate-950/92 px-3 py-2 text-[11px] shadow-xl backdrop-blur-md">
        <div className="flex items-center justify-between gap-3">
          <span className="font-black uppercase tracking-widest text-slate-500">Dispatch policy</span>
          <span className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${
            liveOverride ? "bg-sky-500/20 text-sky-200" : "bg-slate-800 text-slate-500"
          }`}>
            {liveOverride ? "Live override" : "Schedule baseline"}
          </span>
        </div>
        <div className="mt-1.5 text-slate-400">
          Fixed collection days are a baseline. The agent reroutes when fill level, contamination, predicted overflow, ETA, or truck capacity changes the priority.
        </div>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-[1000] rounded-2xl border border-slate-700/60 bg-slate-900/92 backdrop-blur-md px-4 py-3 text-[11px] text-slate-300 shadow-xl">
        {[
          ["#22c55e", "Low (<60%)"],
          ["#f59e0b", "High (60–85%)"],
          ["#ef4444", "Overflow (>85%)"],
          ["#8b5cf6", "Contaminated"],
        ].map(([c, l]) => (
          <div key={l} className="flex items-center gap-2 py-0.5">
            <div
              className="h-2.5 w-2.5 rounded-full shrink-0"
              style={{ background: c }}
            />
            {l}
          </div>
        ))}
        <div className="flex items-center gap-2 py-0.5">
          <div className="h-2.5 w-2.5 rounded-sm shrink-0 bg-blue-500" />
          Truck (routing)
        </div>
      </div>

      {/* Data source badge */}
      <div className="absolute bottom-4 right-4 z-[1000] rounded-xl border border-slate-700/40 bg-slate-900/85 px-3 py-1.5 text-[10px] text-slate-500 backdrop-blur-sm">
        Simulation · real data: Supercom SA Cluj · operator: Supercom SA
      </div>
    </section>
  );
};
