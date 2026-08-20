// ai/aiService.js
// Orchestration only: build context -> call provider -> extract the
// HIGHLIGHT directive. This module never touches the DOM and never calls a
// viewer directly — it returns a highlightTarget string (or null) and the
// caller (ui/main.js) is expected to pass it through CrossProbeManager,
// which is what actually validates the ref against the PCB model before
// doing anything (see cross-probing/crossProbeManager.js — same guard the
// original resolveRef() provided, never bypassed).

import { buildSystemPrompt } from './contextBuilder.js';

/**
 * @param {import('./providers/aiProvider.js')} provider - an AIProvider instance
 * @param {object} project - pcb-core project
 * @param {{role:'user'|'assistant', text:string}[]} history
 * @param {string} userText
 * @param {object[]} measurementList
 * @returns {Promise<{replyText: string, highlightTarget: string|null}>}
 */
export async function askAI(provider, project, history, userText, measurementList) {
  const systemPrompt = buildSystemPrompt(project, measurementList);
  const fullHistory = [...history, { role: 'user', text: userText }];
  const { text } = await provider.sendMessage(systemPrompt, fullHistory);
  return extractHighlightDirective(text);
}

/**
 * Parses out the HIGHLIGHT directive line-by-line, tolerant of markdown
 * wrapping (**HIGHLIGHT:** R2) some models add despite instructions —
 * same regex/behavior as the original sendChat().
 */
export function extractHighlightDirective(replyText) {
  let highlightTarget = null;
  const keptLines = [];
  for (const line of replyText.split('\n')) {
    const m = line.match(/HIGHLIGHT[:\s*]*([^\s*]+)/i);
    if (m) {
      highlightTarget = m[1].replace(/[.,;*]+$/, '');
    } else {
      keptLines.push(line);
    }
  }
  return { replyText: keptLines.join('\n').trim(), highlightTarget };
}
