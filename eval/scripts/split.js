/**
 * Seeded, category-stratified tune/holdout split helpers used by make-split.mjs.
 */

export function seededHash(value, seed) {
  let hash = 0x811c9dc5 ^ (seed >>> 0);
  const input = `${seed}:${value}`;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

export function stratifiedSplit(records, { seed = 20261114, tune = 0.6 } = {}) {
  const groups = new Map();
  for (const record of records) {
    const key = `${record.category || 'none'}|${record.label}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(String(record.id));
  }
  const result = { tune: [], holdout: [] };
  for (const key of [...groups.keys()].sort()) {
    const ids = groups.get(key).sort((a, b) => seededHash(a, seed) - seededHash(b, seed) || a.localeCompare(b));
    const cut = Math.round(ids.length * tune);
    result.tune.push(...ids.slice(0, cut));
    result.holdout.push(...ids.slice(cut));
  }
  result.tune.sort();
  result.holdout.sort();
  return result;
}
