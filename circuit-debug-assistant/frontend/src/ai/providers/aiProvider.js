// ai/providers/aiProvider.js
// Every provider (backendProvider.js today, a future direct-provider file,
// etc.) must implement:
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
