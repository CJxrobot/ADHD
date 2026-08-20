// backend/src/geminiClient.js
// Server-side Gemini caller. This is the ONLY place the real Gemini API key
// (process.env.GEMINI_API_KEY) is ever read. Request/response shape mirrors
// the original frontend implementation (src/ai/providers/gemini.js) exactly
// — only the "who holds the key" concern moved here.

const DEFAULT_MODEL = process.env.DEFAULT_GEMINI_MODEL || 'gemini-3-flash-preview';

/**
 * @param {{systemPrompt: string, history: {role:'user'|'assistant', text:string}[], model?: string}} params
 * @returns {Promise<{text: string}>}
 */
export async function callGemini({ systemPrompt, history, model }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    const err = new Error('Server is missing GEMINI_API_KEY. Set it in backend/.env.');
    err.status = 500;
    throw err;
  }

  const modelName = (model && String(model).trim() ? String(model).trim() : DEFAULT_MODEL).replace(/^models\//, '');

  const payload = {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents: (history || []).map((h) => ({
      role: h.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: h.text }],
    })),
  };

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }
  );

  const data = await response.json();

  if (!response.ok || data.error) {
    const errMsg = data.error ? `${data.error.code}: ${data.error.message}` : `HTTP ${response.status}`;
    const err = new Error(errMsg);
    err.status = response.status >= 400 ? response.status : 502;
    throw err;
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
  return { text };
}
