// analysis/analysisEngine.js
// Deterministic checks only — no AI calls in this file. AI reads the output
// of this module; it doesn't replace it.
//
// Nets in pcb-core/model.js are still plain pin arrays (unchanged from the
// original DATA.nets shape) — there's no UI yet for setting an expected
// value per net. `expectedValues` here is therefore a separate, optional
// {netName: {value, unit}} map passed in by the caller, kept out of the
// core model until that UI actually exists. This function is unused by the
// UI today; it's here so wiring an "expected value" input later doesn't
// require inventing this logic under time pressure.

/** Compares one net's latest measurement against an expected value. Returns null if either is missing. */
export function compareNetToExpected(netName, expected, latestMeasurement) {
  if (!expected || !latestMeasurement) return null;
  const deltaPct = expected.value !== 0
    ? Math.abs((latestMeasurement.value - expected.value) / expected.value) * 100
    : null;
  return {
    net: netName,
    expected,
    measured: { value: latestMeasurement.value, unit: latestMeasurement.unit, timestamp: latestMeasurement.timestamp },
    deltaPct,
    abnormal: deltaPct !== null && deltaPct > 10, // simple 10% threshold, adjust once real boards are in use
  };
}

/** Runs compareNetToExpected across every net that has both an expected value and a measurement. */
export function runAnalysis(project, expectedValues, getLatestMeasurementForNet) {
  const results = [];
  for (const netName of Object.keys(project.nets)) {
    const expected = expectedValues[netName];
    if (!expected) continue;
    const latest = getLatestMeasurementForNet(netName);
    const result = compareNetToExpected(netName, expected, latest);
    if (result) results.push(result);
  }
  return results;
}
