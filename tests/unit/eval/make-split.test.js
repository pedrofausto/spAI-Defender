/**
 * Seeded, category-stratified tune/holdout split.
 */
import { readFileSync } from 'node:fs';
import { stratifiedSplit, seededHash } from '../../../eval/scripts/split.js';

const records = [];
for (const category of ['a', 'b']) {
  for (let index = 0; index < 10; index += 1) records.push({ id: `${category}-${index}`, label: 'scam', category });
}

describe('stratifiedSplit', () => {
  test('is deterministic for a seed and splits each category 60/40', () => {
    const first = stratifiedSplit(records, { seed: 7, tune: 0.6 });
    expect(stratifiedSplit(records, { seed: 7, tune: 0.6 })).toEqual(first);
    expect(first.tune.filter(id => id.startsWith('a-'))).toHaveLength(6);
    expect(first.holdout.filter(id => id.startsWith('b-'))).toHaveLength(4);
    expect(new Set([...first.tune, ...first.holdout]).size).toBe(20);
  });

  test('a different seed gives a different order', () => {
    expect(seededHash('ptbr-0001', 7)).not.toBe(seededHash('ptbr-0001', 20261114));
  });

  test('the committed curated split has no overlap and covers every id', () => {
    const split = JSON.parse(readFileSync('eval/datasets/ptbr-curated.split.json', 'utf8'));
    const tune = new Set(split.tune);
    expect(split.holdout.some(id => tune.has(id))).toBe(false);
    expect(split.tune.length + split.holdout.length).toBe(300);
  });
});
