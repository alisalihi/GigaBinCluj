# BIPCLUJ2 Setup Guide

## Quick Start

### 1. Clone & Install
```bash
cd BIPCLUJ2
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env` and add your NVIDIA NIM API key:
```bash
cp .env.example .env
# Edit .env and add your NV_API_KEY
```

Get your key from: https://build.nvidia.com/mistralai/mistral-medium-3-5-128b

### 3. Start Backend Server
```bash
node server.js
```
Server runs on `http://localhost:3000`

### 4. Start Frontend (in another terminal)
```bash
npm run dev
```
Frontend runs on `http://localhost:5173` (Vite default)

## How It Works

### Architecture
- **Backend**: Express.js proxy to NVIDIA NIM Mistral API
- **Frontend**: React app with interactive waste management dashboard
- **AI**: Mistral Medium 3.5 (128B context) via NVIDIA NIM

### Key Components
1. **Map Panel** - Visualizes bins across Cluj-Napoca suburbs
2. **Stats Bar** - Shows KPIs (avg fill, overflow count, active trucks)
3. **Agent Panel** - AI chat interface for waste analysis
4. **Simulation** - Real-time bin fill simulation

### API Endpoints
```
POST /api/chat                    - Direct Mistral API
POST /v1/chat/completions        - OpenAI-compatible endpoint (for frontend)
```

Both endpoints require `NV_API_KEY` environment variable.

## Configuration

### Required
- `NV_API_KEY` - NVIDIA NIM API key for Mistral access

### Optional
- `VITE_NV_MODEL` - Override default Mistral model
- `VITE_LOCAL_AI_URL` - Use local proxy instead of public endpoint
- `PORT` - Backend server port (default 3000)

## Features

✅ **AI Agent Analysis**
- Real-time bin monitoring
- Route optimization suggestions
- Trend analysis across suburbs
- Contamination alerts

✅ **Flexible Backend**
- Primary: NVIDIA NIM Mistral (production)
- Optional: n8n webhook integration (toggle in UI)

✅ **Real Data**
- Supercom SA bin database (2024-2026)
- 8 suburbs, 3 truck routes
- Live collection schedules

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `NV_API_KEY not found` | Ensure `.env` file exists with valid key |
| `401 Unauthorized` | Check API key validity on NVIDIA website |
| Frontend can't reach backend | Verify backend running on port 3000 |
| Agent not responding | Check browser console for fetch errors |
| Build errors | Run `npm install` and check Node.js version (16+) |

## Development

### Scripts
```bash
npm run dev          # Start Vite dev server
npm run build        # Production build to dist/
npm run preview      # Preview production build
npm start:server     # Start Express backend
```

### File Structure
```
src/
├── components/
│   ├── AgentPanel/
│   │   ├── AgentPanel.jsx       # Chat UI
│   │   └── useGemini.js         # Mistral hook (legacy name)
│   ├── MapPanel.jsx              # Leaflet map
│   ├── StatsBar.jsx              # KPI display
│   └── ...
├── hooks/
│   └── useSimulation.js          # Data generation
├── utils/
│   ├── nvApi.js                  # Mistral client
│   └── ...
├── data/
│   └── bins.js                   # Supercom SA data
└── App.jsx
```

### Technology Stack
- **Frontend**: React 18, Vite, Tailwind CSS, Leaflet
- **Backend**: Express 5, Axios, CORS
- **AI**: Mistral Medium 3.5 (via NVIDIA NIM)

## Example Queries

Try these in the Agent Panel:
- "Which zones need urgent collection?"
- "Any contamination alerts?"
- "Compare Florești vs Cluj-Napoca waste trends."
- "What's today's collection schedule?"
- "Optimize truck routes for efficiency."

## Notes

- **Only Mistral AI**: No OpenAI, no Gemini. NVIDIA NIM Mistral only.
- **Autonomous Mode**: Agent responds in 2-4 sentences (not conversational)
- **Real Data**: All bin data from actual Supercom SA database
- **n8n Optional**: Can swap AI backend via n8n webhook toggle

## Support

For issues:
1. Check `.env` has valid `NV_API_KEY`
2. Verify backend running: `curl http://localhost:3000/v1/chat/completions` (should fail with 405)
3. Check NVIDIA API status
4. Review browser console for errors

## License
Private project
