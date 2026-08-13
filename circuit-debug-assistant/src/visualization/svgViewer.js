// visualization/svgViewer.js
// Draws highlight rectangles over the uploaded EasyEDA SVG using the bbox
// table built in file-processing/svg/svgParser.js. This module only ever
// touches the highlight layer it owns — it doesn't know about components or
// nets as concepts, just refs + bounding boxes.

const SVG_NS = 'http://www.w3.org/2000/svg';

export function highlight(container, bboxByRef, refs, currentView) {
  const svgRoot = container.querySelector('svg');
  if (!svgRoot) return;
  const layer = svgRoot.querySelector('#svg-highlight-layer');
  if (!layer) return;
  layer.innerHTML = '';
  refs.forEach((ref) => {
    const b = bboxByRef[ref];
    if (!b) return;
    const rect = document.createElementNS(SVG_NS, 'rect');
    const pad = 4;
    rect.setAttribute('x', b.x - pad);
    rect.setAttribute('y', b.y - pad);
    rect.setAttribute('width', b.width + pad * 2);
    rect.setAttribute('height', b.height + pad * 2);
    rect.setAttribute('rx', 3);
    rect.setAttribute('class', 'svg-highlight-rect');
    layer.appendChild(rect);
  });
  if (currentView === 'svg' && refs.length) {
    const b = bboxByRef[refs[0]];
    if (b) {
      const el = layer.lastElementChild;
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
    }
  }
}

export function clearHighlights(container) {
  const layer = container.querySelector('#svg-highlight-layer');
  if (layer) layer.innerHTML = '';
}
