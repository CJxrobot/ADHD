// visualization/bom3dViewer.js
// Best-effort highlight in the EasyEDA 3D iframe: always shows a floating
// label (guaranteed to work), and additionally drives the real 3D mesh via
// the reverse-engineered setModelChecked RPC call when a ref -> groupId
// mapping exists. Only supports single-component highlight, same as the
// original tryHighlight3D() — net highlighting was never wired to 3D.

let lastGroupId = null;

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

export function clearHighlight() {
  const label = document.getElementById('bom3d-label');
  if (label) label.style.display = 'none';
  lastGroupId = null;
}
