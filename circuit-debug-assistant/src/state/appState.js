// state/appState.js
// Replaces the original module-global `let DATA`, `currentView`,
// `bom3dRefMap`, `svgRefBBox`, `chatHistory`. Still a single mutable object
// (no need for a flux-style store at this scale), but now it's the one place
// those variables live instead of being scattered across the whole script.

import { createEmptyProject } from '../pcb-core/model.js';

const state = {
  project: createEmptyProject(),
  currentView: 'auto',      // 'auto' | 'svg' | 'threeD'
  svgBboxByRef: {},
  bom3dRefMap: {},
  bom3dOriginalHtml: null,  // kept for resetBom3d()
  chatHistory: [],          // [{role:'user'|'assistant', text}]
};

export function getProject() { return state.project; }
export function setProject(project) { state.project = project; }

export function getCurrentView() { return state.currentView; }
export function setCurrentView(view) { state.currentView = view; }

export function getSvgBboxByRef() { return state.svgBboxByRef; }
export function setSvgBboxByRef(map) { state.svgBboxByRef = map; }

export function getBom3dRefMap() { return state.bom3dRefMap; }
export function mergeBom3dRefMap(partial) { Object.assign(state.bom3dRefMap, partial); }

export function getBom3dOriginalHtml() { return state.bom3dOriginalHtml; }
export function setBom3dOriginalHtml(html) { state.bom3dOriginalHtml = html; }

export function getChatHistory() { return state.chatHistory; }
export function pushChatMessage(msg) { state.chatHistory.push(msg); }
export function popChatMessage() { return state.chatHistory.pop(); }
export function resetChatHistory() { state.chatHistory = []; }
