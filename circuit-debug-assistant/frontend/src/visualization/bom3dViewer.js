// visualization/bom3dViewer.js
// Best-effort highlight in the EasyEDA 3D iframe: always shows a floating
// label (guaranteed to work), and additionally drives the real 3D mesh via
// the reverse-engineered setModelChecked RPC call when a ref -> groupId
// mapping exists. Only supports single-component highlight, same as the
// original tryHighlight3D() — net highlighting was never wired to 3D.
//
// Bug fix: clearHighlight() used to only hide the floating label and reset
// the local `lastGroupId` variable — it never told the 3D engine itself to
// uncheck the mesh it had last checked. Since CrossProbeManager calls
// clear() before every new selection, that meant each selection's
// "uncheck the previous one" logic in highlightComponent() below saw
// lastGroupId already wiped to null and skipped it, so the previously
// checked mesh was never actually unchecked in the engine — highlighted
// meshes silently piled up across selections instead of there ever being
// just one. clearHighlight() now takes the iframe and actually issues the
// setModelChecked(..., false) RPC call for whatever was last checked
// before resetting state, so at most one component is ever highlighted.

let lastGroupId = null;

function uncheckModel(frame, groupId) {
  if (!groupId) return;
  try {
    const bus = frame && frame.contentWindow && frame.contentWindow._MSG_BUS_;
    if (bus && typeof bus.rpcCall === 'function') {
      bus.rpcCall('/engine/model/setModelChecked', [groupId, false]);
    }
  } catch (e) {
    /* iframe navigated away / not ready — nothing more we can do */
  }
}

function ensureLabel(canvasWrap) {
  let label = document.getElementById('bom3d-label');
  if (!label) {
    label = document.createElement('div');
    label.id = 'bom3d-label';
    label.style.cssText = 'position:absolute; top:52px; left:14px; z-index:10; background:rgba(79,209,197,0.15); border:1px solid var(--accent); color:var(--accent); font-family:var(--mono); font-size:12px; padding:4px 10px; border-radius:5px; pointer-events:none;';
    canvasWrap.appendChild(label);
  }
  return label;
}

export function highlightComponent(frame, canvasWrap, ref, groupId, currentView) {
  if (!frame.srcdoc) return; // nothing uploaded, nothing to do

  const label = ensureLabel(canvasWrap);
  label.textContent = '🔍 ' + ref;
  label.style.display = currentView === 'threeD' ? 'block' : 'none';

  if (groupId) {
    try {
      const bus = frame.contentWindow && frame.contentWindow._MSG_BUS_;
      if (bus && typeof bus.rpcCall === 'function') {
        if (lastGroupId && lastGroupId !== groupId) {
          bus.rpcCall('/engine/model/setModelChecked', [lastGroupId, false]);
        }
        bus.rpcCall('/engine/model/setModelChecked', [groupId, true]);
        lastGroupId = groupId;
      }
    } catch (e) {
      /* mapping exists but the call still failed — label above is the fallback */
    }
  }
}

/** @param {HTMLIFrameElement} [frame] - when given, actually unchecks the last-highlighted mesh in the 3D engine */
export function clearHighlight(frame) {
  const label = document.getElementById('bom3d-label');
  if (label) label.style.display = 'none';
  uncheckModel(frame, lastGroupId);
  lastGroupId = null;
}
