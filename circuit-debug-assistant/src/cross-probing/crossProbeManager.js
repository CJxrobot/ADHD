// cross-probing/crossProbeManager.js
// The only place that knows about every viewer. Nothing else should reach
// into schematicViewer/svgViewer/bom3dViewer directly to highlight
// something — call CrossProbeManager instead. Future consumers (measurement
// panel, AI context) subscribe via onSelect() instead of getting hardcoded
// in here.
//
// Note: the three viewers are NOT forced into one uniform interface. The 3D
// viewer only ever supported single-component highlight (never nets) in the
// original prototype, and that constraint is preserved deliberately rather
// than papered over.

import * as pcbCore from '../pcb-core/model.js';
import * as schematicViewer from '../visualization/schematicViewer.js';
import * as svgViewer from '../visualization/svgViewer.js';
import * as bom3dViewer from '../visualization/bom3dViewer.js';

export class CrossProbeManager {
  /**
   * @param {object} deps
   * @param {() => object} deps.getProject - returns the current pcb-core project
   * @param {SVGElement} deps.schematicSvgEl
   * @param {HTMLElement} deps.svgContainer
   * @param {() => object} deps.getSvgBboxByRef
   * @param {HTMLIFrameElement} deps.bom3dFrame
   * @param {HTMLElement} deps.bom3dCanvasWrap
   * @param {() => object} deps.getBom3dRefMap
   * @param {() => string} deps.getCurrentView
   * @param {(ref: string|null) => void} deps.onListHighlight - update BOM/net list "active" DOM state
   */
  constructor(deps) {
    this.deps = deps;
    this.listeners = [];
  }

  /** Subscribe to selection changes: cb({kind: 'component'|'net', id, refs}) */
  onSelect(cb) {
    this.listeners.push(cb);
  }

  _notify(event) {
    this.listeners.forEach((cb) => {
      try { cb(event); } catch (e) { console.error('[cross-probe] listener error', e); }
    });
  }

  clear() {
    const { schematicSvgEl, svgContainer } = this.deps;
    schematicViewer.clearHighlights(schematicSvgEl);
    svgViewer.clearHighlights(svgContainer);
    bom3dViewer.clearHighlight();
    this.deps.onListHighlight(null);
  }

  /** Returns true if the ref was found and highlighted, false otherwise (same contract as the original highlightComponent()). */
  selectComponent(ref, scroll) {
    const project = this.deps.getProject();
    const found = pcbCore.findComponent(project, ref);
    if (!found) return false;
    const resolvedRef = found.ref;

    this.clear();
    this.deps.onListHighlight(resolvedRef);

    const nets = pcbCore.getNetsForComponent(project, resolvedRef);
    schematicViewer.highlightComponent(this.deps.schematicSvgEl, resolvedRef, nets, scroll);
    svgViewer.highlight(this.deps.svgContainer, this.deps.getSvgBboxByRef(), [resolvedRef], this.deps.getCurrentView());
    const groupId = this.deps.getBom3dRefMap()[resolvedRef];
    bom3dViewer.highlightComponent(this.deps.bom3dFrame, this.deps.bom3dCanvasWrap, resolvedRef, groupId, this.deps.getCurrentView());

    this._notify({ kind: 'component', id: resolvedRef, refs: [resolvedRef] });
    return true;
  }

  /** Returns true if the net was found and highlighted, false otherwise. */
  selectNet(netName, scroll) {
    const project = this.deps.getProject();
    const found = pcbCore.findNet(project, netName);
    if (!found) return false;
    const resolvedName = found.name;

    this.clear();

    const refsInNet = pcbCore.getComponentsOnNet(project, resolvedName);
    schematicViewer.highlightNet(this.deps.schematicSvgEl, resolvedName, refsInNet, scroll);
    svgViewer.highlight(this.deps.svgContainer, this.deps.getSvgBboxByRef(), refsInNet, this.deps.getCurrentView());
    // Note: 3D highlight intentionally not called for nets — matches original behavior.

    this._notify({ kind: 'net', id: resolvedName, refs: refsInNet });
    return true;
  }

  /** Tries component first, then net — same fallback order the AI highlight-directive handler used. */
  select(refOrNetName, scroll) {
    return this.selectComponent(refOrNetName, scroll) || this.selectNet(refOrNetName, scroll);
  }
}
