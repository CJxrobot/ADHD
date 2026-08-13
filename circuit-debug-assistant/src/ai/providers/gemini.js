// ai/providers/gemini.js
// Implements AIProvider (see aiProvider.js) for Google's Gemini API.
// Request/response shape and the API-key-in-URL call pattern are unchanged
// from the original prototype — that's a known issue (see the architecture
// doc's "move the API key server-side" migration step), not something this
// refactor silently fixes. Kept isolated here so fixing it later, or adding
// a second provider, doesn't touch context-builder or aiService.

export class GeminiProvider {
  /**
   * @param {() => string} getApiKey
   * @param {() => string} getModelName
   */
  constructor(getApiKey, getModelName) {
    this.getApiKey = getApiKey;
    this.getModelName = getModelName;
  }

  /**
   * @param {string} systemPrompt
   * @param {{role: 'user'|'assistant', text: string}[]} history
   * @returns {Promise<{text: string}>}
   */
  async sendMessage(systemPrompt, history) {
    const apiKey = this.getApiKey().trim();
    let modelName = (this.getModelName().trim() || 'gemini-3-flash-preview').replace(/^models\//, '');

    if (!apiKey) {
      throw new Error('MISSING_API_KEY');
    }

    const payload = {
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: history.map((h) => ({
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
      throw new Error(errMsg);
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
    return { text };
  }
}
