// file-processing/svg/svgParser.js
// Mounts an EasyEDA-exported SVG into a container and extracts per-component
// bounding boxes (used later for highlight overlays). Split from the original
// handleSvgUpload() into a parse/mount step and a highlight-layer step so the
// viewer (visualization/svgViewer.js) doesn't need to know about parsing.

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Strips XML prolog/DOCTYPE (breaks innerHTML parsing) and mounts into
 * container. Returns an array of every top-level <svg> root mounted (in
 * document order), or an empty array if none were found.
 *
 * `svgText` may contain more than one top-level <svg> — either because a
 * single EasyEDA export has multiple pages/sheets, or because the caller
 * concatenated several separately-uploaded .svg files into one string (see
 * ui/main.js's multi-file SVG upload). Either way every root found is
 * treated identically: normalized and stacked vertically so scrolling the
 * container down reveals each page/file in order, one continuous view.
 * Each root gets its own '#svg-highlight-layer' group, since highlight
 * coordinates from extractRefBBoxes() below are local to whichever root
 * they were measured in.
 */
export function mountSvg(container, svgText) {
  const cleaned = svgText.replace(/<\?xml[^>]*\?>/gi, '').replace(/<!DOCTYPE[^>]*>/gi, '').trim();
  container.innerHTML = cleaned;
  const svgRoots = Array.from(container.querySelectorAll('svg'));
  if (svgRoots.length === 0) return [];

  svgRoots.forEach((el, i) => {
    el.removeAttribute('width');
    el.removeAttribute('height');
    el.style.width = '1200px';
    el.style.height = 'auto';
    el.style.display = 'block'; // avoid default inline SVG layout so multiple pages stack instead of overlapping
    el.style.marginBottom = i < svgRoots.length - 1 ? '24px' : '0';

    const oldLayer = el.querySelector('#svg-highlight-layer');
    if (oldLayer) oldLayer.remove();
    const layer = document.createElementNS(SVG_NS, 'g');
    layer.id = 'svg-highlight-layer';
    el.appendChild(layer);
  });

  return svgRoots;
}

/**
 * Matches EasyEDA's part-attribute text nodes against known component refs
 * and captures each part group's bounding box, across every mounted page.
 * `svgRoots` is the array returned by mountSvg() (also accepts a single
 * root for backward compatibility). Each bbox records which page it came
 * from (`pageIndex`, matching svgRoots' order) so the viewer can draw the
 * highlight in that page's own coordinate space.
 * Returns { bboxByRef, matchedCount }.
 */
export function extractRefBBoxes(svgRoots, components) {
  const roots = Array.isArray(svgRoots) ? svgRoots : [svgRoots];
  const bboxByRef = {};
  let matched = 0;
  roots.forEach((svgRoot, pageIndex) => {
    if (!svgRoot) return;
    const attrTexts = svgRoot.querySelectorAll('[c_partid="part_attr"]');
    const seen = new Set();
    attrTexts.forEach((textEl) => {
      const content = (textEl.textContent || '').trim();
      if (!components[content] || seen.has(content) || bboxByRef[content]) return;
      const partGroup = textEl.closest('[c_partid="part"]');
      if (!partGroup) return;
      try {
        const bbox = partGroup.getBBox();
        bboxByRef[content] = { x: bbox.x, y: bbox.y, width: bbox.width, height: bbox.height, pageIndex };
        seen.add(content);
        matched++;
      } catch (e) {
        /* ignore unmeasurable elements */
      }
    });
  });
  return { bboxByRef, matchedCount: matched };
}
