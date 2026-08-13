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
import { GeminiProvider } from '../ai/providers/gemini.js';
import { askAI } from '../ai/aiService.js';
import * as state from '../state/appState.js';
import * as render from './render.js';

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
  apiKey: document.getElementById('api-key'),
  modelName: document.getElementById('model-name'),
  chatInput: document.getElementById('chat-input'),
  chatSendBtn: document.getElementById('chat-send-btn'),
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
const geminiProvider = new GeminiProvider(
  () => els.apiKey.value,
  () => els.modelName.value
);

// ---- View switching ----
function switchView(mode) {
  state.setCurrentView(mode);
  render.switchViewTabs(mode);
}
els.tabAuto.addEventListener('click', () => switchView('auto'));
els.tabSvg.addEventListener('click', () => switchView('svg'));
els.tab3d.addEventListener('click', () => switchView('threeD'));

// ---- Netlist upload ----
function parseAndRender(text) {
  if (!text || !text.trim()) {
    alert('netlist 內容是空的');
    return;
  }
  const parsed = parseNetlist(text);
  const project = buildProject(parsed);
  state.setProject(project);

  const compCount = componentCount(project);
  const netCnt = netCount(project);
  if (compCount === 0 && netCnt === 0) {
    render.setStatus('解析失敗:抓不到任何元件或net,確認匯出格式是 Protel(不是 PADS 或其他格式)', false);
    return;
  }
  render.setStatus(`已載入:${compCount} 元件 / ${netCnt} nets`, true);
  render.renderLists(project, crossProbe);
  renderSchematic(els.circuitSvg, project, (ref) => crossProbe.selectComponent(ref, true));

  state.resetChatHistory();
  document.getElementById('chat-log').innerHTML = '<div class="msg sys">netlist 已載入,可以開始提問</div>';
}

els.netlistUpload.addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    parseAndRender(e.target.result);
    els.netlistStatus.textContent = `已載入檔案:${file.name}`;
  };
  reader.onerror = () => { els.netlistStatus.textContent = '檔案讀取失敗'; };
  reader.readAsText(file);
});

// ---- SVG upload ----
els.svgUpload.addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const svgRoot = svgParser.mountSvg(els.svgContainer, e.target.result);
    if (!svgRoot) {
      els.svgStatus.textContent = '無法解析這個檔案,確認是否為有效的 SVG';
      return;
    }
    switchView('svg');
    const { bboxByRef, matchedCount } = svgParser.extractRefBBoxes(svgRoot, state.getProject().components);
    state.setSvgBboxByRef(bboxByRef);
    els.svgStatus.textContent = `成功定位 ${matchedCount} 個元件`;
  };
  reader.readAsText(file);
});

// ---- Interactive BOM / 3D upload ----
els.bom3dUpload.addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (!file) return;
  els.bom3dStatus.textContent = `讀取中:${file.name}...`;
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
    els.bom3dStatus.append(`已載入:${file.name} — `);
    const restoreLink = document.createElement('a');
    restoreLink.href = '#';
    restoreLink.textContent = '還原完整畫面(含BOM清單)';
    restoreLink.style.color = 'var(--accent)';
    restoreLink.onclick = (ev) => {
      ev.preventDefault();
      bom3dLoader.resetBom3d(els.bom3dFrame, state.getBom3dOriginalHtml());
    };
    els.bom3dStatus.append(restoreLink, ' · ');
    const openLink = document.createElement('a');
    openLink.href = '#';
    openLink.textContent = '在新分頁開啟';
    openLink.style.color = 'var(--accent)';
    openLink.onclick = (ev) => { ev.preventDefault(); window.open(objectUrl, '_blank'); };
    els.bom3dStatus.append(openLink);
  };
  reader.onerror = () => { els.bom3dStatus.textContent = '檔案讀取失敗'; };
  reader.readAsText(file);
});

els.bom3dApplyBtn.addEventListener('click', () => {
  const { refMap, count } = bom3dLoader.parseRefMapText(els.bom3dRefmapInput.value);
  state.mergeBom3dRefMap(refMap);
  els.bom3dRefmapStatus.textContent = `已套用 ${count} 筆對照(累計 ${Object.keys(state.getBom3dRefMap()).length} 筆)`;
});

els.bom3dAutoBtn.addEventListener('click', async () => {
  const project = state.getProject();
  if (componentCount(project) === 0) {
    els.bom3dRefmapStatus.textContent = '請先解析 netlist,才知道要找哪些元件編號';
    return;
  }
  els.bom3dRefmapStatus.textContent = '開始逐一模擬點擊...';
  try {
    const { refMap, foundCount, candidateCount } = await bom3dLoader.autoBuildBom3dRefMap(
      els.bom3dFrame,
      Object.keys(project.components)
    );
    state.mergeBom3dRefMap(refMap);
    els.bom3dRefmapInput.value = Object.entries(state.getBom3dRefMap()).map(([r, g]) => `${r}: ${g}`).join('\n');
    els.bom3dRefmapStatus.textContent =
      `完成 — 自動對應了 ${foundCount}/${candidateCount} 個元件(累計 ${Object.keys(state.getBom3dRefMap()).length} 筆,結果已填入上面文字框,可以自己核對/修改)`;
  } catch (err) {
    const messages = {
      '3D_NOT_READY': '3D 還沒載入完成,或抓不到內部介面,先確認 3D 分頁已經顯示出來再試',
      'NO_COMPONENTS': '請先解析 netlist,才知道要找哪些元件編號',
      'NO_CANDIDATES': '在 3D 畫面裡找不到任何跟元件編號完全相符的文字,可能BOM清單目前是隱藏的 — 先點「還原完整畫面」再試一次',
    };
    els.bom3dRefmapStatus.textContent = messages[err.message] || `發生錯誤:${err.message}`;
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
    render.appendChatMsg('sys', '請先解析 netlist');
    return;
  }
  if (!els.apiKey.value.trim()) {
    render.appendChatMsg('sys', '請先在上面貼上你的 Gemini API key');
    return;
  }
  els.chatInput.value = '';
  render.appendChatMsg('user', text);

  const thinkingId = render.appendChatMsg('ai', '思考中...');

  try {
    const { replyText, highlightTarget } = await askAI(
      geminiProvider,
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
    const msg = err.message === 'MISSING_API_KEY'
      ? '請先在上面貼上你的 Gemini API key'
      : 'AI API 錯誤: ' + err.message;
    render.setChatMsgText(thinkingId, msg);
  }
}
els.chatSendBtn.addEventListener('click', sendChat);
els.chatInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') sendChat();
});

// ---- Init ----
switchView('auto');
