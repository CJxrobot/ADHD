// ui/main.js
// Entry point. Wires DOM events to services/modules. This file (and render.js)
// is the only place allowed to touch the DOM for application logic.

import { parseNetlist } from '../file-processing/netlist/parseNetlist.js';
import { buildProject, componentCount, netCount } from '../pcb-core/model.js';
import * as svgParser from '../file-processing/svg/svgParser.js';
import * as bom3dLoader from '../file-processing/interactive-bom/bom3dLoader.js';
import { CrossProbeManager } from '../cross-probing/crossProbeManager.js';
import { renderSchematic } from '../visualization/schematicViewer.js';
import * as measurementService from '../measurements/measurementService.js';
import { BackendProvider } from '../ai/providers/backendProvider.js';
import { askAI } from '../ai/aiService.js';
import * as state from '../state/appState.js';
import * as render from './render.js';
import { t, toggleLang, applyTranslations } from '../i18n/i18n.js';

// ---- DOM refs ----
const els = {
  netlistUpload: document.getElementById('netlist-upload'),
  netlistStatus: document.getElementById('netlist-status'),
  svgUpload: document.getElementById('svg-upload'),
  svgStatus: document.getElementById('svg-status'),
  svgContainer: document.getElementById('svg-container'),
  bom3dUpload: document.getElementById('bom3d-upload'),
  bom3dStatus: document.getElementById('bom3d-status'),
  bom3dFrame: document.getElementById('bom3d-frame'),
  bom3dCanvasWrap: document.getElementById('canvas-wrap'),
  bom3dRefmapInput: document.getElementById('bom3d-refmap-input'),
  bom3dRefmapStatus: document.getElementById('bom3d-refmap-status'),
  bom3dApplyBtn: document.getElementById('bom3d-apply-btn'),
  bom3dAutoBtn: document.getElementById('bom3d-auto-btn'),
  circuitSvg: document.getElementById('circuit-svg'),
  tabAuto: document.getElementById('tab-auto'),
  tabSvg: document.getElementById('tab-svg'),
  tab3d: document.getElementById('tab-3d'),
  measNet: document.getElementById('meas-net'),
  measVal: document.getElementById('meas-val'),
  measAddBtn: document.getElementById('meas-add-btn'),
  modelName: document.getElementById('model-name'),
  chatInput: document.getElementById('chat-input'),
  chatSendBtn: document.getElementById('chat-send-btn'),
  langToggleBtn: document.getElementById('lang-toggle-btn'),
  toolEasyedaBtn: document.getElementById('tool-easyeda-btn'),
  toolKicadBtn: document.getElementById('tool-kicad-btn'),
};

// ---- Cross-probe manager wiring ----
const crossProbe = new CrossProbeManager({
  getProject: state.getProject,
  schematicSvgEl: els.circuitSvg,
  svgContainer: els.svgContainer,
  getSvgBboxByRef: state.getSvgBboxByRef,
  bom3dFrame: els.bom3dFrame,
  bom3dCanvasWrap: els.bom3dCanvasWrap,
  getBom3dRefMap: state.getBom3dRefMap,
  getCurrentView: state.getCurrentView,
  onListHighlight: render.setListActive,
});

// ---- AI provider ----
// The Gemini API key lives only on the backend now (backend/.env) — this
// provider just calls our own server's /api/chat endpoint.
const aiProvider = new BackendProvider(() => els.modelName.value);

// ---- View switching ----
function switchView(mode) {
  state.setCurrentView(mode);
  render.switchViewTabs(mode);
}
els.tabAuto.addEventListener('click', () => switchView('auto'));
els.tabSvg.addEventListener('click', () => switchView('svg'));
els.tab3d.addEventListener('click', () => switchView('threeD'));

// ---- Language switching ----
// The status bar's text is set dynamically (not from a static data-i18n
// element), so we remember which key/vars produced it and re-render it in
// the new language whenever the user toggles. Everything else on the page
// is either static markup (handled by applyTranslations()) or transient
// per-action feedback that simply appears in whichever language is active
// when that action runs.
let lastStatus = { key: 'status.notLoaded', vars: undefined, ok: false };
function setStatus(key, vars, ok) {
  lastStatus = { key, vars, ok };
  render.setStatus(t(key, vars), ok);
}

els.langToggleBtn.addEventListener('click', () => {
  toggleLang();
  render.setStatus(t(lastStatus.key, lastStatus.vars), lastStatus.ok);
});

// ---- Tool format switching (reserved) ----
// EasyEDA is the only implemented parsing/viewer path today. The KiCad
// button is reserved for future support and intentionally does not change
// any parsing behavior yet — clicking it just surfaces a "not implemented"
// notice via the status bar.
els.toolEasyedaBtn.addEventListener('click', () => {
  state.setToolFormat('easyeda');
  els.toolEasyedaBtn.classList.add('tool-active');
  els.toolKicadBtn.classList.remove('tool-active');
});
els.toolKicadBtn.addEventListener('click', () => {
  render.setStatus(t('tool.kicadReserved'), false);
});

// ---- Netlist upload ----
function parseAndRender(text) {
  if (!text || !text.trim()) {
    alert(t('netlist.emptyContent'));
    return;
  }
  const parsed = parseNetlist(text);
  const project = buildProject(parsed);
  state.setProject(project);

  const compCount = componentCount(project);
  const netCnt = netCount(project);
  if (compCount === 0 && netCnt === 0) {
    setStatus('status.parseFailed', undefined, false);
    return;
  }
  setStatus('status.loaded', { compCount, netCnt }, true);
  render.renderLists(project, crossProbe);
  renderSchematic(els.circuitSvg, project, (ref) => crossProbe.selectComponent(ref, true));

  state.resetChatHistory();
  document.getElementById('chat-log').innerHTML = `<div class="msg sys">${t('chat.netlistLoadedHint')}</div>`;
}

els.netlistUpload.addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    parseAndRender(e.target.result);
    els.netlistStatus.textContent = t('netlist.fileLoaded', { name: file.name });
  };
  reader.onerror = () => { els.netlistStatus.textContent = t('common.readFailed'); };
  reader.readAsText(file);
});

// ---- SVG upload ----
// Supports selecting multiple .svg files at once (input has `multiple`).
// Each file is read, then all of them are mounted together in the order
// they were selected — mountSvg() stacks every top-level <svg> root it's
// given (whether that root came from the same file or a different one)
// into one continuous, scrollable sequence, and treats the whole set as a
// single logical SVG viewer for highlighting purposes.
function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = () => reject(new Error('READ_FAILED'));
    reader.readAsText(file);
  });
}

els.svgUpload.addEventListener('change', async (event) => {
  const files = Array.from(event.target.files || []);
  if (files.length === 0) return;

  els.svgStatus.textContent = t('svg.reading', { count: files.length });
  let texts;
  try {
    texts = await Promise.all(files.map(readFileAsText));
  } catch (e) {
    els.svgStatus.textContent = t('common.readFailed');
    return;
  }

  const combinedText = texts.join('\n');
  const svgRoots = svgParser.mountSvg(els.svgContainer, combinedText);
  if (!svgRoots || svgRoots.length === 0) {
    els.svgStatus.textContent = t('svg.parseFailed');
    return;
  }
  switchView('svg');
  const { bboxByRef, matchedCount } = svgParser.extractRefBBoxes(svgRoots, state.getProject().components);
  state.setSvgBboxByRef(bboxByRef);
  const fileNote = files.length > 1 ? t('svg.multiFileNote', { files: files.length, pages: svgRoots.length }) : '';
  els.svgStatus.textContent = t('svg.matched', { count: matchedCount, note: fileNote });
});

// ---- Interactive BOM / 3D upload ----
els.bom3dUpload.addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (!file) return;
  els.bom3dStatus.textContent = t('bom3d.reading', { name: file.name });
  const reader = new FileReader();
  reader.onload = (e) => {
    const htmlText = e.target.result;
    state.setBom3dOriginalHtml(htmlText);
    const blob = new Blob([htmlText], { type: 'text/html' });
    const objectUrl = URL.createObjectURL(blob);

    bom3dLoader.mountBom3d(els.bom3dFrame, htmlText);
    switchView('threeD');
    bom3dLoader.isolateCanvasIn3D(els.bom3dFrame);
    bom3dLoader.subscribeBom3dModelId(els.bom3dFrame);

    els.bom3dStatus.innerHTML = '';
    els.bom3dStatus.append(t('bom3d.loaded', { name: file.name }));
    const restoreLink = document.createElement('a');
    restoreLink.href = '#';
    restoreLink.textContent = t('bom3d.restoreLink');
    restoreLink.style.color = 'var(--accent)';
    restoreLink.onclick = (ev) => {
      ev.preventDefault();
      bom3dLoader.resetBom3d(els.bom3dFrame, state.getBom3dOriginalHtml());
    };
    els.bom3dStatus.append(restoreLink, ' · ');
    const openLink = document.createElement('a');
    openLink.href = '#';
    openLink.textContent = t('bom3d.openLink');
    openLink.style.color = 'var(--accent)';
    openLink.onclick = (ev) => { ev.preventDefault(); window.open(objectUrl, '_blank'); };
    els.bom3dStatus.append(openLink);
  };
  reader.onerror = () => { els.bom3dStatus.textContent = t('common.readFailed'); };
  reader.readAsText(file);
});

els.bom3dApplyBtn.addEventListener('click', () => {
  const { refMap, count } = bom3dLoader.parseRefMapText(els.bom3dRefmapInput.value);
  state.mergeBom3dRefMap(refMap);
  els.bom3dRefmapStatus.textContent = t('bom3d.applied', { count, total: Object.keys(state.getBom3dRefMap()).length });
});

els.bom3dAutoBtn.addEventListener('click', async () => {
  const project = state.getProject();
  if (componentCount(project) === 0) {
    els.bom3dRefmapStatus.textContent = t('bom3d.needNetlistFirst');
    return;
  }
  els.bom3dRefmapStatus.textContent = t('bom3d.autoStart');
  try {
    const { refMap, foundCount, candidateCount } = await bom3dLoader.autoBuildBom3dRefMap(
      els.bom3dFrame,
      Object.keys(project.components)
    );
    state.mergeBom3dRefMap(refMap);
    els.bom3dRefmapInput.value = Object.entries(state.getBom3dRefMap()).map(([r, g]) => `${r}: ${g}`).join('\n');
    els.bom3dRefmapStatus.textContent = t('bom3d.autoDone', {
      found: foundCount,
      candidate: candidateCount,
      total: Object.keys(state.getBom3dRefMap()).length,
    });
  } catch (err) {
    const messages = {
      '3D_NOT_READY': t('bom3d.err3dNotReady'),
      'NO_COMPONENTS': t('bom3d.needNetlistFirst'),
      'NO_CANDIDATES': t('bom3d.errNoCandidates'),
    };
    els.bom3dRefmapStatus.textContent = messages[err.message] || t('common.errorPrefix', { msg: err.message });
  }
});

// ---- Measurements ----
function refreshMeasLog() {
  render.renderMeasLog(measurementService.list(), (id) => measurementService.remove(id));
}
measurementService.onChange(refreshMeasLog);

els.measAddBtn.addEventListener('click', () => {
  const net = els.measNet.value.trim();
  const val = els.measVal.value.trim();
  if (!net || !val) return;
  const numeric = Number(val);
  measurementService.addManualMeasurement(net, Number.isNaN(numeric) ? val : numeric, 'V');
  els.measNet.value = '';
  els.measVal.value = '';
});

// ---- AI chat ----
async function sendChat() {
  const text = els.chatInput.value.trim();
  if (!text) return;
  const project = state.getProject();
  if (componentCount(project) === 0) {
    render.appendChatMsg('sys', t('chat.needNetlistFirst'));
    return;
  }
  els.chatInput.value = '';
  render.appendChatMsg('user', text);

  const thinkingId = render.appendChatMsg('ai', t('chat.thinking'));

  try {
    const { replyText, highlightTarget } = await askAI(
      aiProvider,
      project,
      state.getChatHistory(),
      text,
      measurementService.list()
    );
    render.setChatMsgText(thinkingId, replyText);
    state.pushChatMessage({ role: 'user', text });
    state.pushChatMessage({ role: 'assistant', text: replyText });

    if (highlightTarget) {
      // CrossProbeManager validates against the PCB model before doing
      // anything — an AI-hallucinated ref is silently ignored, same
      // guarantee the original resolveRef() gave.
      crossProbe.select(highlightTarget, true);
    }
  } catch (err) {
    render.setChatMsgText(thinkingId, t('chat.apiError', { msg: err.message }));
  }
}
els.chatSendBtn.addEventListener('click', sendChat);
els.chatInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') sendChat();
});

// ---- Init ----
applyTranslations();
switchView('auto');
