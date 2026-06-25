import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

const NVIDIA_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';
const PORT = process.env.PORT || 3000;
const DEFAULT_REASONING_EFFORT = process.env.NV_REASONING_EFFORT || 'none';

app.post('/api/chat', async (req, res) => {
  try {
    const payload = {
      model: req.body.model || 'mistralai/mistral-medium-3.5-128b',
      reasoning_effort: req.body.reasoning_effort || DEFAULT_REASONING_EFFORT,
      messages: req.body.messages || [{ role: 'user', content: req.body.prompt || '' }],
      max_tokens: req.body.max_tokens || 1024,
      temperature: req.body.temperature ?? 0.7,
      top_p: req.body.top_p ?? 1.0,
      stream: false
    };

    const response = await axios.post(NVIDIA_URL, payload, {
      headers: {
        Authorization: `Bearer ${process.env.NV_API_KEY}`,
        Accept: 'application/json'
      },
      responseType: 'json',
      timeout: 120000
    });

    res.json(response.data);
  } catch (err) {
    const status = err.response?.status || 500;
    const data = err.response?.data || { error: err.message };
    res.status(status).json(data);
  }
});

// OpenAI-compatible proxy endpoint for Mistral via NVIDIA NIM
app.post('/v1/chat/completions', async (req, res) => {
  try {
    const { model, messages, max_tokens, temperature, top_p, reasoning_effort } = req.body;
    const nvMessages = (messages || []).map((m) => ({
      role: m.role || 'user',
      content: m.content || m
    }));

    const payload = {
      model: model || 'mistralai/mistral-medium-3.5-128b',
      reasoning_effort: reasoning_effort || DEFAULT_REASONING_EFFORT,
      messages: nvMessages.length > 0 ? nvMessages : [{ role: 'user', content: '' }],
      max_tokens: max_tokens || 1024,
      temperature: temperature ?? 0.7,
      top_p: top_p ?? 1.0,
      stream: false,
    };

    const response = await axios.post(NVIDIA_URL, payload, {
      headers: {
        Authorization: `Bearer ${process.env.NV_API_KEY}`,
        Accept: 'application/json',
      },
      responseType: 'json',
      timeout: 120000,
    });

    res.json({
      id: response.data.id ?? null,
      object: 'chat.completion',
      created: Date.now(),
      model: payload.model,
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content:
              response.data.choices?.[0]?.message?.content ||
              response.data.choices?.[0]?.text ||
              JSON.stringify(response.data),
          },
        },
      ],
    });
  } catch (err) {
    const status = err.response?.status || 500;
    const data = err.response?.data || { error: err.message };
    res.status(status).json(data);
  }
});

app.listen(PORT, () => {
  console.log(`Mistral AI proxy server running on http://localhost:${PORT}`);
});
