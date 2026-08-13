// file-processing/svg/svgParser.js
// Mounts an EasyEDA-exported SVG into a container and extracts per-component
// bounding boxes (used later for highlight overlays). Split from the original
// handleSvgUpload() into a parse/mount step and a highlight-layer step so the
// viewer (visualization/svgViewer.js) doesn't need to know about parsing.

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Strips XML prolog/DOCTYPE (breaks innerHTML parsing) and mounts into container.
 * Returns the first <svg> root, or null if invalid.
 *
 * Some exports contain more than one top-level <svg> (multi-page/multi-sheet
 * schematics). Previously only the first root had its width/height
 * normalized, so any additional pages kept their original sizing and
 * default inline layout — they could end up clipped, overlapping, or
 * otherwise not laid out in a scrollable flow. Every root found is now
 * normalized and stacked vertically so scrolling the container down reveals
 * each page correctly; the highlight layer/bbox behavior below is
 * unchanged and still applies only to the first (primary) page.
 */
export function mountSvg(container, svgText) {
  const cleaned = svgText.replace(/<\?xml[^>]*\?>/i, '').replace(/<!DOCTYPE[^>]*>/i, '').trim();
  container.innerHTML = cleaned;
  const svgRoots = Array.from(container.querySelectorAll('svg'));
  if (svgRoots.length === 0) return null;

  svgRoots.forEach((el, i) => {
    el.removeAttribute('width');
    el.removeAttribute('height');
    el.style.width = '1200px';
    el.style.height = 'auto';
    el.style.display = 'block'; // avoid default inline SVG layout so multi-page files stack instead of overlapping
    el.style.marginBottom = i < svgRoots.length - 1 ? '24px' : '0';
  });

  const svgRoot = svgRoots[0];
  const oldLayer = svgRoot.querySelector('#svg-highlight-layer');
  if (oldLayer) oldLayer.remove();
  const layer = document.createElementNS(SVG_NS, 'g');
  layer.id = 'svg-highlight-layer';
  svgRoot.appendChild(layer);

  return svgRoot;
}

/**
 * Matches EasyEDA's part-attribute text nodes against known component refs
 * and captures each part group's bounding box.
 * Returns { bboxByRef, matchedCount }.
 */
export function extractRefBBoxes(svgRoot, components) {
  const bboxByRef = {};
  const attrTexts = svgRoot.querySelectorAll('[c_partid="part_attr"]');
  const seen = new Set();
  let matched = 0;
  attrTexts.forEach((textEl) => {
    const content = (textEl.textContent || '').trim();
    if (!components[content] || seen.has(content)) return;
    const partGroup = textEl.closest('[c_partid="part"]');
    if (!partGroup) return;
    try {
      const bbox = partGroup.getBBox();
      bboxByRef[content] = { x: bbox.x, y: bbox.y, width: bbox.width, height: bbox.height };
      seen.add(content);
      matched++;
    } catch (e) {
      /* ignore unmeasurable elements */
    }
  });
  return { bboxByRef, matchedCount: matched };
}
