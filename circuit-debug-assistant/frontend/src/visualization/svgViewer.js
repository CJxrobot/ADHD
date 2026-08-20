// visualization/svgViewer.js
// Draws highlight rectangles over the uploaded EasyEDA SVG(s) using the bbox
// table built in file-processing/svg/svgParser.js. This module only ever
// touches the highlight layer(s) it owns — it doesn't know about components
// or nets as concepts, just refs + bounding boxes.
//
// The container can hold more than one <svg> root (multi-page schematics,
// or several files uploaded together — see svgParser.mountSvg). Each root
// has its own '#svg-highlight-layer', and each bbox records which root
// (`pageIndex`) it was measured in, so a highlight always lands in the
// right page's own coordinate space instead of always the first page.

const SVG_NS = 'http://www.w3.org/2000/svg';

function layerForPage(container, pageIndex) {
  const roots = container.querySelectorAll('svg');
  const svgRoot = roots[pageIndex || 0];
  if (!svgRoot) return null;
  return svgRoot.querySelector('#svg-highlight-layer');
}

export function highlight(container, bboxByRef, refs, currentView) {
  clearHighlights(container);
  let firstHighlightEl = null;
  refs.forEach((ref) => {
    const b = bboxByRef[ref];
    if (!b) return;
    const layer = layerForPage(container, b.pageIndex);
    if (!layer) return;
    const rect = document.createElementNS(SVG_NS, 'rect');
    const pad = 4;
    rect.setAttribute('x', b.x - pad);
    rect.setAttribute('y', b.y - pad);
    rect.setAttribute('width', b.width + pad * 2);
    rect.setAttribute('height', b.height + pad * 2);
    rect.setAttribute('rx', 3);
    rect.setAttribute('class', 'svg-highlight-rect');
    layer.appendChild(rect);
    if (!firstHighlightEl) firstHighlightEl = rect;
  });
  if (currentView === 'svg' && firstHighlightEl) {
    firstHighlightEl.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
  }
}

export function clearHighlights(container) {
  container.querySelectorAll('#svg-highlight-layer').forEach((layer) => {
    layer.innerHTML = '';
  });
}
