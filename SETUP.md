# SmartCycle — Salubritate menajeră Cluj-Napoca

Dashboard de dispecerat pentru colectarea deșeurilor menajere, aliniat cu modelul [Primăria Cluj-Napoca — Salubritate menajeră](https://primariaclujnapoca.ro/salubritate/salubritate-menajera/): localizare mașini pe hartă, traseu în timp real, operator Supercom SA.

## Quick Start

### 1. Install
```bash
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env` and add your HERE API key:
```bash
HERE_API_KEY=your_key_here
```

Get a key from: https://developer.here.com/

### 3. Start Backend (HERE routing proxy)
```bash
npm run start:server
```
Server runs on `http://localhost:3000`

### 4. Start Frontend
```bash
npm run dev
```
Frontend runs on `http://localhost:5173`

## Architecture

| Layer | Technology |
|-------|------------|
| Map | HERE Maps JavaScript API |
| Routing | HERE Routing v8 + Matrix API (via Express proxy) |
| Agent | Single dispatch agent — deterministic optimizer + template explanations (no external LLM) |
| Data | Supercom SA bin data, 4-fraction collection schedule |

## API Endpoints

```
GET  /api/config   — HERE key + operator metadata for map init
POST /api/route    — road route + polyline between waypoints
POST /api/matrix   — travel time matrix for stop ordering (TSP)
```

## Features

- **HERE Maps** — real map tiles and road-following route polylines
- **Path optimizer** — urgency scoring + shortest visit order via HERE matrix + 2-opt TSP
- **Single dispatch agent** — observes, predicts overflow, decides routes, acts on trucks, explains in log/panel
- **Municipal pattern** — 4 waste fractions, Supercom SA operator, live truck tracking UI

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `HERE_API_KEY is not configured` | Add key to `.env`, restart `node server.js` |
| Map uses fallback tiles | Add `HERE_API_KEY`, start backend on port 3000, then reload |
| Straight-line routes | HERE routing failed or key missing — fallback uses local distance estimates |
| `Unexpected token import` | Old Node on PATH (often Brackets). Run `npm run start:server` again — launcher auto-finds Node 18+ in `C:\Program Files\nodejs`. Or fix PATH so modern Node comes first. |
