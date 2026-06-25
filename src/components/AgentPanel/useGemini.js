import { useCallback, useRef, useState } from "react";
import {
  getScheduleToday,
  getNextCollection,
  SUBURB_TRENDS,
} from "../../data/bins";

const NV_MODEL = import.meta.env.VITE_NV_MODEL ?? 'mistralai/mistral-medium-3.5-128b';
const LOCAL_AI_URL = import.meta.env.VITE_LOCAL_AI_URL ?? "http://localhost:3000";
const PROVIDER_LABEL = "Mistral (via local proxy)";

const readJsonResponse = async (res) => {
  const raw = await res.text();
  let data = null;

  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = { raw };
  }

  if (!res.ok) {
    const details =
      data?.error?.message ??
      data?.error ??
      data?.message ??
      data?.raw ??
      res.statusText;
    throw new Error(`Proxy returned ${res.status}: ${details}`);
  }

  return data;
};

const buildSystemPrompt = (bins, trucks, stats) => {
  const urgent = bins.filter((b) => b.fill > 85);
  const cont = bins.filter((b) => b.contaminated);
  const suburbs = [...new Set(bins.map((b) => b.suburb))];
  const truckSummary = trucks
    .map((truck) => {
      const target = truck.routePlan?.[0];
      const loadPct = Math.round(((truck.loadKg ?? 0) / (truck.capacityKg ?? 6500)) * 100);
      return target
        ? `${truck.id}=${truck.status ?? "available"}, load ${loadPct}%, target ${target.binName} (${Math.round(target.fill)}%, ETA ${target.etaMin}m, ${target.reason})`
        : `${truck.id}=${truck.status ?? "available"}, load ${loadPct}%, no live target`;
    })
    .join("; ");
  const trendSummary = suburbs
    .map((s) => {
      const t = SUBURB_TRENDS[s];
      return t
        ? `${s}: ${t.trend} (${t.monthlyDeltaKg > 0 ? "+" : ""}${t.monthlyDeltaKg}kg/mo, avg ${(t.avgMonthlyKg / 1000).toFixed(0)}t/mo)`
        : s;
    })
    .join("; ");

  return `You are an autonomous smart city waste management agent for Cluj-Napoca, Romania.
You have access to REAL beverage packaging return data from Supercom SA (2024–2026).
You monitor ${bins.length} bins across ${suburbs.length} suburbs: ${suburbs.join(", ")}.

LIVE SENSOR STATE:
- Average fill: ${stats.avg}%
- Overflow bins (>85%): ${urgent.length > 0 ? urgent.map((b) => `${b.name}/${b.suburb} ${Math.round(b.fill)}%`).join(", ") : "none"}
- Contaminated: ${cont.length > 0 ? cont.map((b) => `${b.name}`).join(", ") : "none"}
- Live truck dispatch: ${truckSummary || "no active truck data"}
- Baseline districts: T1=Centru+Mănăștur, T2=Mărăști+Someșeni, T3=Florești+Apahida+Baciu+Gilău
- Dispatch rule: schedule is advisory; live fill, contamination, predicted overflow, ETA, and truck capacity can override planned district routes.
- Agentic loop: Observe live bins/trucks/schedule → Predict overflow/contamination risk → Decide truck priority → Act by rerouting → Explain in the log/chat → Learn fast-filling patterns.

REAL DATA TRENDS (Supercom SA 2024-2026):
${trendSummary}

TODAY'S COLLECTION SCHEDULE (Supercom SA):
${[...new Set(bins.map((b) => b.district))]
  .map((d) => {
    const today = getScheduleToday(d);
    const next = getNextCollection(d);
    return `${d}: ${today.length > 0 ? today.join(", ") + " TODAY" : "next: " + next}`;
  })
  .join("; ")}

Be concise (2-4 sentences). Use real bin names, suburb names, data figures, and dispatch reasons. When asked about schedules, explain that schedules are a baseline and live risk can override them. You are an autonomous agent — not a chatbot.`;
};

export const useMistral = (bins, trucks, stats) => {
  const [messages, setMessages] = useState([
    {
      role: "system",
      text: "Agent online. Monitoring real Supercom SA data across Cluj-Napoca suburbs.",
      id: "init",
    },
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [n8nMode, setN8nMode] = useState(false);
  const [n8nUrl, setN8nUrl] = useState("");
  const historyRef = useRef([]);

  const addMsg = useCallback((text, role) => {
    setMessages((p) => [...p, { role, text, id: Date.now() + Math.random() }]);
  }, []);

  const callProxy = useCallback(
    async (userMsg) => {
      // Always use the local proxy endpoint provided by the project.
      const base = LOCAL_AI_URL ? LOCAL_AI_URL.replace(/\/$/, '') : '';
      const endpoint = base ? `${base}/v1/chat/completions` : '/v1/chat/completions';

      // Push user message into history in the existing format
      historyRef.current.push({ role: 'user', parts: [{ text: userMsg }] });

      // Build OpenAI-style messages array
      const messages = [
        { role: 'system', content: buildSystemPrompt(bins, trucks, stats) },
        ...historyRef.current.map((item) => ({
          role: item.role === 'model' ? 'assistant' : item.role,
          content: item.parts?.[0]?.text ?? '',
        })),
      ];

      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: NV_MODEL, messages, max_tokens: 320, temperature: 0.7 }),
        });
        const data = await readJsonResponse(res);
        if (data.error) {
          return `API error: ${data.error.message ?? data.error}`;
        }

        // Support both OpenAI-style and our proxy-shaped responses
        const reply = data.choices?.[0]?.message?.content ?? data.choices?.[0]?.text ?? data?.candidates?.[0]?.content?.parts?.[0]?.text ?? JSON.stringify(data);
        historyRef.current.push({ role: 'model', parts: [{ text: reply }] });
        return reply;
      } catch (error) {
        return `Connection error at ${endpoint}. ${error.message}`;
      }
    },
    [bins, trucks, stats],
  );

  const callN8n = useCallback(
    async (userMsg) => {
      let url = n8nUrl;
      if (!url) {
        url = (window.prompt("Enter your n8n webhook URL:") ?? "").trim();
        if (!url) return "No n8n URL provided.";
        setN8nUrl(url);
      }
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: userMsg,
            sensorData: { bins, trucks, stats },
          }),
        });
        const data = await res.json();
        return data.reply ?? data.message ?? JSON.stringify(data);
      } catch {
        return "n8n webhook error. Check URL and make sure workflow is active.";
      }
    },
    [n8nUrl, bins, trucks, stats],
  );

  // This is also exported so useSimulation can call it for autonomous triggers
  const callAgent = useCallback(
    async (prompt) => {
      return await callProxy(prompt);
    },
    [callProxy],
  );

  const sendMessage = useCallback(
    async (text) => {
      if (!text.trim()) return;
      addMsg(text, "user");
      setIsTyping(true);
      const reply = await (n8nMode ? callN8n(text) : callProxy(text));
      setIsTyping(false);
      addMsg(reply, "agent");
    },
    [addMsg, callN8n, callProxy, n8nMode],
  );

  return {
    messages,
    isTyping,
    sendMessage,
    callAgent,
    n8nMode,
    setN8nMode,
    providerLabel: PROVIDER_LABEL,
  };
};
