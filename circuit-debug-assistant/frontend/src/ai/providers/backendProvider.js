// ai/providers/backendProvider.js
// Implements AIProvider (see aiProvider.js) by calling our own backend's
// POST /api/chat instead of Gemini directly. The Gemini API key now lives
// only in backend/.env (see backend/src/geminiClient.js) — this file never
// sees it. Swapping AI vendors later is still just a backend-side change;
// this provider's contract (and everything above it: aiService.js,
// contextBuilder.js) doesn't need to know or care.

export class BackendProvider {
  /**
   * @param {() => string} getModelName - optional model override, not secret
   * @param {string} apiBase - base path for the backend API (default '/api')
   */
  constructor(getModelName, apiBase = '/api') {
    this.getModelName = getModelName;
    this.apiBase = apiBase;
  }

  /**
   * @param {string} systemPrompt
   * @param {{role: 'user'|'assistant', text: string}[]} history
   * @returns {Promise<{text: string}>}
   */
  async sendMessage(systemPrompt, history) {
    const model = (this.getModelName ? this.getModelName() : '').trim();

    let response;
    try {
      response = await fetch(`${this.apiBase}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ systemPrompt, history, model: model || undefined }),
      });
    } catch (e) {
      throw new Error('無法連線到後端伺服器,確認 backend 是否已啟動');
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok || data.error) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }

    return { text: data.text || '' };
  }
}
