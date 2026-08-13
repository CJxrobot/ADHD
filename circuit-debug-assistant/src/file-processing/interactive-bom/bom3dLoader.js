// file-processing/interactive-bom/bom3dLoader.js
// EasyEDA's "Interactive BOM" export is a self-contained proprietary HTML
// file (WebGL/WASM, no documented API). This module loads it into an iframe
// and reverse-engineers a ref -> internal-group-id map via its internal
// postMessage bus, exactly as the original prototype did. Kept as a distinct
// module because none of this is a stable public API — it's expected to be
// fragile and EasyEDA-version-specific, so it should never leak into
// pcb-core or the cross-probe manager.

/** Loads html text into the iframe via srcdoc. Returns nothing; caller switches the view. */
export function mountBom3d(frame, htmlText) {
  frame.srcdoc = htmlText;
}

/** Reloads the iframe from the original HTML, undoing any hidden-element isolation. */
export function resetBom3d(frame, originalHtmlText) {
  frame.srcdoc = originalHtmlText;
}

/** Walks from `canvas` up to `doc.body`, hiding every sibling at each ancestor level. */
function hideNonCanvasAncestorSiblings(doc, canvas) {
  let node = canvas;
  while (node && node.parentElement && node !== doc.body) {
    const parent = node.parentElement;
    Array.from(parent.children).forEach((sib) => {
      if (sib !== node) sib.style.setProperty('display', 'none', 'important');
    });
    node = parent;
  }
  canvas.style.setProperty('width', '100%', 'important');
  canvas.style.setProperty('height', '100%', 'important');
  if (canvas.parentElement) {
    canvas.parentElement.style.setProperty('width', '100%', 'important');
    canvas.parentElement.style.setProperty('height', '100%', 'important');
  }
}

/**
 * Polls the iframe until its internal canvas appears, then hides every
 * sibling at each ancestor level so only the 3D viewport is visible
 * (collapses EasyEDA's toolbars / BOM list panels).
 *
 * Some EasyEDA exports mount the toolbar asynchronously — after the canvas
 * itself is already showing — so a single one-time hide can miss it. A
 * MutationObserver re-runs the same hide pass whenever the iframe's DOM
 * changes, so a toolbar panel that appears later still gets caught.
 */
export function isolateCanvasIn3D(frame) {
  let attempts = 0;
  let observer = null;
  const tryIsolate = () => {
    attempts++;
    let doc;
    try {
      doc = frame.contentDocument;
    } catch (e) {
      return false;
    }
    if (!doc) return false;
    const canvas = doc.querySelector('canvas');
    if (!canvas) {
      if (attempts > 40) clearInterval(timer); // ~10s, SPA never rendered a canvas — give up quietly
      return false;
    }
    hideNonCanvasAncestorSiblings(doc, canvas);
    clearInterval(timer);

    if (!observer) {
      observer = new MutationObserver(() => {
        const stillThere = doc.body && doc.body.contains(canvas);
        hideNonCanvasAncestorSiblings(doc, stillThere ? canvas : doc.querySelector('canvas') || canvas);
      });
      observer.observe(doc.body, { childList: true, subtree: true });
    }
    return true;
  };
  const timer = setInterval(tryIsolate, 250);
}

/**
 * Subscribes to the iframe's internal message bus (`_MSG_BUS_`) once it
 * appears, and patches rpcCall to log every real call the app itself makes
 * (useful for manually discovering the right method/params from devtools).
 */
export function subscribeBom3dModelId(frame, onModelId) {
  let attempts = 0;
  const timer = setInterval(() => {
    attempts++;
    let bus;
    try {
      bus = frame.contentWindow && frame.contentWindow._MSG_BUS_;
    } catch (e) {
      bus = null;
    }
    if (bus && typeof bus.subscribe === 'function') {
      clearInterval(timer);
      bus.subscribe('/engine/model/finishLoading', (payload) => {
        const modelId = payload && typeof payload === 'object'
          ? (payload.model || payload.id || payload.uuid || payload)
          : payload;
        if (onModelId) onModelId(modelId, payload);
        console.log('[3D] captured model id from finishLoading:', modelId, 'raw payload:', payload);
      });

      if (typeof bus.rpcCall === 'function' && !bus.__patchedForLogging) {
        const originalRpcCall = bus.rpcCall.bind(bus);
        bus.rpcCall = function (method, params) {
          try {
            console.log('[3D] rpcCall:', method, params === undefined ? '(no params)' : params);
          } catch (logErr) {
            /* never let logging break the real call */
          }
          return originalRpcCall(method, params);
        };
        bus.__patchedForLogging = true;
      }
    } else if (attempts > 40) {
      clearInterval(timer); // ~10s, message bus never appeared — give up quietly
    }
  }, 250);
}

/** Parses the manual "REF: groupId" textarea contents into a map. Returns {refMap, count}. */
export function parseRefMapText(text) {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const refMap = {};
  let count = 0;
  lines.forEach((line) => {
    const m = line.match(/^([^:：]+)[:：]\s*(\S+)/);
    if (m) {
      refMap[m[1].trim()] = m[2].trim();
      count++;
    }
  });
  return { refMap, count };
}

function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

/**
 * Experimental: simulates a click on every DOM text node matching a known
 * component ref inside the iframe, capturing the group id each click
 * triggers via setModelChecked. Returns { refMap, foundCount, candidateCount }
 * or throws a descriptive Error if the iframe/bus/components aren't ready.
 */
export async function autoBuildBom3dRefMap(frame, componentRefs) {
  let doc, bus;
  try {
    doc = frame.contentDocument;
    bus = frame.contentWindow && frame.contentWindow._MSG_BUS_;
  } catch (e) {
    doc = null;
    bus = null;
  }
  if (!doc || !bus || typeof bus.rpcCall !== 'function') {
    throw new Error('3D_NOT_READY');
  }
  if (componentRefs.length === 0) {
    throw new Error('NO_COMPONENTS');
  }

  const candidates = [];
  doc.querySelectorAll('*').forEach((el) => {
    if (el.children.length === 0) {
      const t = (el.textContent || '').trim();
      if (componentRefs.includes(t)) candidates.push({ ref: t, el });
    }
  });

  if (candidates.length === 0) {
    throw new Error('NO_CANDIDATES');
  }

  const refMap = {};
  let found = 0;
  for (const { ref, el } of candidates) {
    let capturedId = null;
    const originalRpcCall = bus.rpcCall;
    bus.rpcCall = function (method, params) {
      if (method === '/engine/model/setModelChecked' && Array.isArray(params) && params[1] === true) {
        capturedId = params[0];
      }
      return originalRpcCall.call(bus, method, params);
    };
    try {
      el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: frame.contentWindow }));
    } catch (e) {
      /* keep going even if one click fails */
    }
    await sleep(300);
    bus.rpcCall = originalRpcCall;
    if (capturedId) {
      refMap[ref] = capturedId;
      found++;
    }
  }

  return { refMap, foundCount: found, candidateCount: candidates.length };
}
