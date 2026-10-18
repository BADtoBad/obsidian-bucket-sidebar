// Compare JSON snapshots without normalizing missing fields into defaults.
// Object key order is irrelevant, but array order and every stored value matter.
export function matchesSavedSnapshot(expected: unknown, actual: unknown): boolean {
  if (expected === actual) return true;
  if (expected === null || actual === null ||
      typeof expected !== "object" || typeof actual !== "object") return false;
  if (Array.isArray(expected)) {
    return Array.isArray(actual) && expected.length === actual.length &&
      expected.every((value, index) => matchesSavedSnapshot(value, actual[index]));
  }
  if (Array.isArray(actual)) return false;
  const source = expected as Record<string, unknown>;
  const stored = actual as Record<string, unknown>;
  const keys = Object.keys(source);
  return keys.length === Object.keys(stored).length && keys.every(key =>
    Object.prototype.hasOwnProperty.call(stored, key) && matchesSavedSnapshot(source[key], stored[key]));
}
