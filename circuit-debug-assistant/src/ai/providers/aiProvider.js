// ai/providers/aiProvider.js
// Every provider (gemini.js today, a future claude.js, etc.) must implement:
//
//   interface AIProvider {
//     sendMessage(systemPrompt: string, history: ChatMessage[]): Promise<{ text: string }>
//   }
//
//   ChatMessage = { role: 'user' | 'assistant', text: string }
//
// Nothing outside providers/ should know a specific vendor's request/response
// shape (Gemini's systemInstruction field, role naming, etc.) — that
// translation stays inside each provider file.
export {};
