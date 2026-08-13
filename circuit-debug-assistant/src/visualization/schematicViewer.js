// visualization/schematicViewer.js
// Auto-generated grid-layout schematic (no real geometry — same as the
// original renderCircuit()). Owns only its own rendering + highlight state;
// it never reaches into other viewers. CrossProbeManager is what fans a
// selection out to this plus the other viewers.

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Renders the schematic into `svgEl` from `project` (pcb-core shape).
 * `onComponentClick(ref)` is called when a component box is clicked.
 */
export function renderSchematic(svgEl, project, onComponentClick) {
  svgEl.innerHTML = '';
  const refs = Object.keys(project.components).sort();
  const cols = Math.ceil(Math.sqrt(refs.length * 1.6));
  const boxW = 90, boxH = 40, gapX = 60, gapY = 50, padX = 40, padY = 40;

  const compPositions = {};
  refs.forEach((ref, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    compPositions[ref] = {
      x: padX + col * (boxW + gapX),
      y: padY + row * (boxH + gapY),
      w: boxW, h: boxH,
    };
  });

  const linesGroup = document.createElementNS(SVG_NS, 'g');
  linesGroup.id = 'lines-group';
  svgEl.appendChild(linesGroup);

  Object.entries(project.nets).forEach(([netName, pins]) => {
    const refsInNet = pins.map((p) => p.split('.')[0]).filter((r) => compPositions[r]);
    for (let i = 0; i < refsInNet.length - 1; i++) {
      const a = compPositions[refsInNet[i]];
      const b = compPositions[refsInNet[i + 1]];
      if (!a || !b) continue;
      const line = document.createElementNS(SVG_NS, 'path');
      const x1 = a.x + a.w / 2, y1 = a.y + a.h / 2, x2 = b.x + b.w / 2, y2 = b.y + b.h / 2;
      line.setAttribute('d', `M ${x1} ${y1} L ${x2} ${y2}`);
      let cls = 'net-line';
      if (/gnd/i.test(netName)) cls += ' gnd';
      else if (/v$|vout|48v|vcc/i.test(netName)) cls += ' power';
      line.setAttribute('class', cls);
      line.setAttribute('data-net', netName);
      linesGroup.appendChild(line);
    }
  });

  const boxGroup = document.createElementNS(SVG_NS, 'g');
  boxGroup.id = 'boxes-group';
  svgEl.appendChild(boxGroup);

  refs.forEach((ref) => {
    const pos = compPositions[ref];
    const rect = document.createElementNS(SVG_NS, 'rect');
    rect.setAttribute('x', pos.x); rect.setAttribute('y', pos.y);
    rect.setAttribute('width', pos.w); rect.setAttribute('height', pos.h);
    rect.setAttribute('rx', 5);
    rect.setAttribute('class', 'comp-box');
    rect.id = 'box-' + ref;
    rect.style.cursor = 'pointer';
    if (onComponentClick) rect.onclick = () => onComponentClick(ref);
    boxGroup.appendChild(rect);

    const label = document.createElementNS(SVG_NS, 'text');
    label.setAttribute('x', pos.x + pos.w / 2);
    label.setAttribute('y', pos.y + pos.h / 2 - 2);
    label.setAttribute('text-anchor', 'middle');
    label.setAttribute('class', 'comp-label');
    label.textContent = ref;
    boxGroup.appendChild(label);

    const val = document.createElementNS(SVG_NS, 'text');
    val.setAttribute('x', pos.x + pos.w / 2);
    val.setAttribute('y', pos.y + pos.h / 2 + 11);
    val.setAttribute('text-anchor', 'middle');
    val.setAttribute('class', 'comp-val');
    val.textContent = project.components[ref].value || project.components[ref].footprint.split('_')[0].slice(0, 14);
    boxGroup.appendChild(val);
  });

  const maxRow = Math.ceil(refs.length / cols);
  svgEl.setAttribute('width', padX * 2 + cols * (boxW + gapX));
  svgEl.setAttribute('height', padY * 2 + maxRow * (boxH + gapY));
}

export function highlightComponent(svgEl, ref, componentNets, scroll) {
  const box = svgEl.querySelector('#box-' + ref);
  if (box) {
    box.classList.add('highlight');
    if (scroll) box.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
  }
  (componentNets || []).forEach((n) => {
    svgEl.querySelectorAll(`.net-line[data-net="${CSS.escape(n)}"]`).forEach((l) => l.classList.add('highlight'));
  });
}

export function highlightNet(svgEl, netName, refsInNet, scroll) {
  svgEl.querySelectorAll(`.net-line[data-net="${CSS.escape(netName)}"]`).forEach((l) => {
    l.classList.add('highlight');
    if (scroll) l.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
  refsInNet.forEach((ref) => {
    const box = svgEl.querySelector('#box-' + ref);
    if (box) box.classList.add('highlight');
  });
}

export function clearHighlights(svgEl) {
  svgEl.querySelectorAll('.comp-box.highlight').forEach((e) => e.classList.remove('highlight'));
  svgEl.querySelectorAll('.net-line.highlight').forEach((e) => e.classList.remove('highlight'));
}
