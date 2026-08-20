// ui/render.js
// Presentation only. Calls back into crossProbe.select* on click; never
// touches pcb-core, parsers, or AI directly.

import { t } from '../i18n/i18n.js';

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

export function renderLists(project, crossProbe) {
  const compList = document.getElementById('comp-list');
  const netList = document.getElementById('net-list');
  document.getElementById('comp-count').textContent = Object.keys(project.components).length;
  document.getElementById('net-count').textContent = Object.keys(project.nets).length;

  compList.innerHTML = '';
  Object.entries(project.components).sort().forEach(([ref, info]) => {
    const div = document.createElement('div');
    div.className = 'list-item';
    div.id = 'comp-item-' + ref;
    div.innerHTML = `<span>${ref}</span><span class="val">${escapeHtml(info.value || info.footprint.split('_')[0])}</span>`;
    div.onclick = () => crossProbe.selectComponent(ref, true);
    compList.appendChild(div);
  });

  netList.innerHTML = '';
  Object.entries(project.nets).sort().forEach(([name, pins]) => {
    const div = document.createElement('div');
    div.className = 'list-item';
    div.innerHTML = `<span>${escapeHtml(name)}</span><span class="val">${t('net.pinsCount', { count: pins.length })}</span>`;
    div.onclick = () => crossProbe.selectNet(name, true);
    netList.appendChild(div);
  });
}

/** Adds/removes the "active" class on the matching list item. Pass null to clear. */
export function setListActive(ref) {
  document.querySelectorAll('.list-item.active').forEach((e) => e.classList.remove('active'));
  if (ref) {
    const item = document.getElementById('comp-item-' + ref);
    if (item) item.classList.add('active');
  }
}

export function setStatus(text, ok) {
  const el = document.getElementById('status');
  // Once JS starts driving this element's text dynamically, it no longer
  // matches the static "not loaded" label — drop data-i18n so a later
  // language toggle's applyTranslations() pass doesn't stomp it back to
  // the default string. (ui/main.js remembers the i18n key/vars that
  // produced the current status and re-renders it in the new language
  // itself when the user toggles.)
  el.removeAttribute('data-i18n');
  el.textContent = text;
  el.classList.toggle('ok', !!ok);
}

export function renderMeasLog(measurements, onDelete) {
  const log = document.getElementById('meas-log');
  log.innerHTML = '';
  measurements.forEach((m) => {
    const div = document.createElement('div');
    div.className = 'meas-log-item';
    div.style.display = 'flex';
    div.style.justifyContent = 'space-between';
    div.style.alignItems = 'center';
    const time = new Date(m.timestamp).toLocaleTimeString();
    div.innerHTML = `<span><b>${escapeHtml(m.target.id)}</b> = ${escapeHtml(String(m.value))} ${escapeHtml(m.unit)} <span style="opacity:.5">(${time})</span></span>`;
    const delBtn = document.createElement('span');
    delBtn.textContent = '×';
    delBtn.style.cursor = 'pointer';
    delBtn.style.color = 'var(--text-dim)';
    delBtn.style.padding = '0 4px';
    delBtn.onclick = () => onDelete(m.id);
    div.appendChild(delBtn);
    log.appendChild(div);
  });
}

export function appendChatMsg(role, text) {
  const log = document.getElementById('chat-log');
  const div = document.createElement('div');
  const id = 'msg-' + Date.now() + Math.random().toString(36).slice(2, 6);
  div.id = id;
  div.className = 'msg ' + role;
  div.innerHTML = `<span class="text">${escapeHtml(text)}</span>`;
  log.appendChild(div);
  log.scrollTop = log.scrollHeight;
  return id;
}

export function setChatMsgText(id, text) {
  const el = document.getElementById(id);
  if (el) el.querySelector('.text').textContent = text;
}

export function switchViewTabs(mode) {
  document.getElementById('circuit-svg').style.display = mode === 'auto' ? 'block' : 'none';
  document.getElementById('svg-container').style.display = mode === 'svg' ? 'block' : 'none';
  document.getElementById('bom3d-frame').style.display = mode === 'threeD' ? 'block' : 'none';
  document.getElementById('tab-auto').classList.toggle('tab-active', mode === 'auto');
  document.getElementById('tab-svg').classList.toggle('tab-active', mode === 'svg');
  document.getElementById('tab-3d').classList.toggle('tab-active', mode === 'threeD');
  const label = document.getElementById('bom3d-label');
  if (label) label.style.display = mode === 'threeD' ? 'block' : 'none';
}
