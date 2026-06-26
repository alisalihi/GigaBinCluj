import express from "express";
import axios from "axios";
import dotenv from "dotenv";
import cors from "cors";
import { decode as decodeFlexPolyline } from "@here/flexpolyline";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

const PORT = process.env.PORT || 3000;
const HERE_API_KEY = (process.env.HERE_API_KEY || "")
  .replace(/^["']|["']$/g, "")
  .trim();
const ROUTER_BASE = "https://router.hereapi.com/v8";
const MATRIX_BASE = "https://matrix.router.hereapi.com/v8";

const hereHeaders = { Accept: "application/json" };

const decodeFlexiblePolyline = (encoded) => {
  if (!encoded) return [];
  try {
    const { polyline } = decodeFlexPolyline(encoded);
    return polyline.map(([lat, lng]) => ({ lat, lng }));
  } catch {
    return [];
  }
};

const extractPolyline = (route) => {
  const points = [];
  for (const section of route?.sections ?? []) {
    const encoded =
      typeof section.polyline === "string"
        ? section.polyline
        : section.polyline?.polyline;
    if (encoded) points.push(...decodeFlexiblePolyline(encoded));
  }
  return points;
};

const requireHereKey = (res) => {
  if (!HERE_API_KEY) {
    res.status(500).json({ error: "HERE_API_KEY is not configured in .env" });
    return false;
  }
  return true;
};

app.get("/api/config", (_req, res) => {
  res.json({
    hereApiKey: HERE_API_KEY || null,
    operator: "SC Supercom SA",
    operatorPhone: "0264-954",
    municipality: "Primăria Municipiului Cluj-Napoca",
  });
});

app.post("/api/matrix", async (req, res) => {
  if (!requireHereKey(res)) return;

  try {
    const { origins = [], destinations = [] } = req.body;
    const payload = {
      origins: origins.map((p) => ({ lat: p.lat, lng: p.lng })),
      destinations: destinations.map((p) => ({ lat: p.lat, lng: p.lng })),
      regionDefinition: { type: "world" },
      transportMode: "truck",
      matrixAttributes: ["travelTimes", "distances"],
    };

    const response = await axios.post(`${MATRIX_BASE}/matrix`, payload, {
      params: { apiKey: HERE_API_KEY, async: false },
      headers: hereHeaders,
      timeout: 60000,
    });

    const matrix = response.data?.matrix;
    const travelTimes = matrix?.travelTimes ?? [];
    const distances = matrix?.distances ?? [];
    const numOrigins = origins.length;
    const numDestinations = destinations.length;

    const asGrid = Array.from({ length: numOrigins }, (_, i) =>
      Array.from({ length: numDestinations }, (_, j) => ({
        travelTimeSec: travelTimes[i * numDestinations + j] ?? null,
        distanceM: distances[i * numDestinations + j] ?? null,
      })),
    );

    res.json({ travelTimes, distances, grid: asGrid });
  } catch (err) {
    const status = err.response?.status || 500;
    const data = err.response?.data || { error: err.message };
    res.status(status).json(data);
  }
});

app.post("/api/route", async (req, res) => {
  if (!requireHereKey(res)) return;

  try {
    const { origin, destination, via = [] } = req.body;
    if (!origin || !destination) {
      res.status(400).json({ error: "origin and destination are required" });
      return;
    }

    const params = new URLSearchParams({
      transportMode: "truck",
      origin: `${origin.lat},${origin.lng}`,
      destination: `${destination.lat},${destination.lng}`,
      return: "summary,polyline",
      apiKey: HERE_API_KEY,
    });

    via.forEach((point) => {
      params.append("via", `${point.lat},${point.lng}!passThrough=true`);
    });

    const response = await axios.get(
      `${ROUTER_BASE}/routes?${params.toString()}`,
      {
        headers: hereHeaders,
        timeout: 60000,
      },
    );

    const route = response.data?.routes?.[0];
    const polyline = extractPolyline(route);
    const summary = route?.sections?.reduce(
      (acc, section) => ({
        durationSec: acc.durationSec + (section.summary?.duration ?? 0),
        lengthM: acc.lengthM + (section.summary?.length ?? 0),
      }),
      { durationSec: 0, lengthM: 0 },
    ) ?? { durationSec: 0, lengthM: 0 };

    res.json({
      polyline,
      durationSec: summary.durationSec,
      distanceM: summary.lengthM,
      durationMin: Math.max(1, Math.round(summary.durationSec / 60)),
      distanceKm: Math.round((summary.lengthM / 1000) * 10) / 10,
    });
  } catch (err) {
    const status = err.response?.status || 500;
    const data = err.response?.data || { error: err.message };
    res.status(status).json(data);
  }
});

app.listen(PORT, () => {
  console.log(`SmartCycle HERE routing server on http://localhost:${PORT}`);
  if (!HERE_API_KEY) {
    console.warn("Warning: HERE_API_KEY is missing — set it in .env");
  }
});
