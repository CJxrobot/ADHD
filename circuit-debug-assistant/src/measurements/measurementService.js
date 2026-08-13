// measurements/measurementService.js
// Normalized Measurement model (see the architecture doc §6). Manual entry
// is the only source implemented today — it produces the exact same shape a
// future BLE instrument reading would, so nothing downstream (analysis, AI
// context) needs to change when instrumentation/ stops being a stub.
//
//   confidence: 'measured'  -> a real reading (manual today, instrument later)
//   confidence: 'expected'  -> a stated target value, never treated as fact
//   confidence: 'inferred'  -> an AI guess, must never be mixed with 'measured'

let nextId = 1;
const byId = new Map(); // insertion-ordered
const listeners = [];

function emit() {
  listeners.forEach((cb) => {
    try { cb(list()); } catch (e) { console.error('[measurements] listener error', e); }
  });
}

/** Subscribe to the full measurement list on every change. Returns an unsubscribe fn. */
export function onChange(cb) {
  listeners.push(cb);
  return () => {
    const i = listeners.indexOf(cb);
    if (i >= 0) listeners.splice(i, 1);
  };
}

/**
 * Records a manual reading against a net. Mirrors the original addMeasurement()
 * UX (net name + numeric value, unit assumed "V") but stores a typed record.
 */
export function addManualMeasurement(netName, value, unit = 'V') {
  const id = 'm' + nextId++;
  const measurement = {
    id,
    instrumentId: null,
    type: unit === 'V' ? 'voltage' : 'voltage', // manual entry is voltage-only today, same as the original UI
    value,
    unit,
    timestamp: Date.now(),
    target: { kind: 'net', id: netName },
    confidence: 'measured',
    quality: 'valid',
  };
  byId.set(id, measurement);
  emit();
  return measurement;
}

export function remove(id) {
  byId.delete(id);
  emit();
}

export function list() {
  return Array.from(byId.values());
}

/** Latest measurement for a given net, or null. Used by the AI context builder. */
export function latestForNet(netName) {
  const matches = list().filter((m) => m.target.kind === 'net' && m.target.id === netName);
  if (matches.length === 0) return null;
  return matches.reduce((a, b) => (a.timestamp > b.timestamp ? a : b));
}

export function clearAll() {
  byId.clear();
  emit();
}
