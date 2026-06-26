const env = import.meta.env ?? {};
const API_BASE_URL = (env.VITE_API_BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '');

const requestJson = async (path, options = {}) => {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  });

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { error: text };
  }

  if (!res.ok) {
    throw new Error(data?.error?.message ?? data?.error ?? res.statusText);
  }

  return data;
};

export const fetchHereConfig = () => requestJson('/api/config');

export const fetchTravelMatrix = (origins, destinations) =>
  requestJson('/api/matrix', {
    method: 'POST',
    body: JSON.stringify({ origins, destinations }),
  });

export const fetchRoute = (origin, destination, via = []) =>
  requestJson('/api/route', {
    method: 'POST',
    body: JSON.stringify({ origin, destination, via }),
  });
