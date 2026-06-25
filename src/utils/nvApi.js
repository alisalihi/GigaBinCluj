export async function callNvChat({ prompt, model, temperature } = {}) {
  const body = {
    prompt,
    messages: [{ role: 'user', content: prompt }],
    model: model || 'mistralai/mistral-medium-3.5-128b',
    temperature: temperature ?? 0.7
  };

  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(txt || 'NV API proxy error');
  }
  return res.json();
}
