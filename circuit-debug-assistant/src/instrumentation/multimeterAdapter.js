// instrumentation/multimeterAdapter.js
// Reserved abstraction boundary — no Bluetooth protocol is implemented here
// or anywhere else in this codebase. Do not build a real adapter until a
// specific multimeter's protocol is known. See the architecture doc §7.
//
// Contract a future adapter (e.g. BluetoothMultimeterAdapter) must satisfy:
//
//   interface MultimeterAdapter {
//     connect(): Promise<void>
//     disconnect(): Promise<void>
//     getStatus(): 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'MEASURING' | 'PAUSED' | 'ERROR'
//     onMeasurement(cb: (measurement) => void): void   // measurement matches
//                                                        // measurements/measurementService.js's shape,
//                                                        // with confidence: 'measured' and a real instrumentId
//   }
//
// InstrumentManager (not built yet) would hold a registry of adapters keyed
// by instrument type and hand normalized output to MeasurementService — the
// same function manual entries already flow through.

export const INSTRUMENT_STATUS = Object.freeze({
  DISCONNECTED: 'DISCONNECTED',
  CONNECTING: 'CONNECTING',
  CONNECTED: 'CONNECTED',
  MEASURING: 'MEASURING',
  PAUSED: 'PAUSED',
  ERROR: 'ERROR',
});

/** Stub adapter — always disconnected, never emits. Placeholder so UI code can wire against the real interface shape today. */
export class NullMultimeterAdapter {
  async connect() {
    throw new Error('No multimeter protocol implemented yet.');
  }
  async disconnect() {}
  getStatus() {
    return INSTRUMENT_STATUS.DISCONNECTED;
  }
  onMeasurement(_cb) {
    /* no-op */
  }
}
