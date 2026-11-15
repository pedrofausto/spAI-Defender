#!/usr/bin/env node
/**
 * Create a deterministic, category-stratified tune/holdout split of a JSONL dataset.
 *
 * Usage: node eval/scripts/make-split.mjs <file.jsonl> [--seed 20261114] [--tune 0.6] [--out <split.json>]
 *
 * Within each category (records without one form a single group) the ids are ordered by a
 * seeded FNV-1a hash and the first round(n * tune) go to the tune split. The output lists ids
 * only, so creating the split never requires looking at message text.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseJsonl } from '../metrics.js';
import { stratifiedSplit } from './split.js';

function main() {
  const argv = process.argv.slice(2);
  const options = { file: null, seed: 20261114, tune: 0.6, out: null };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--seed') options.seed = Number(argv[++index]);
    else if (arg === '--tune') options.tune = Number(argv[++index]);
    else if (arg === '--out') options.out = argv[++index];
    else if (!options.file) options.file = arg;
  }
  if (!options.file) {
    console.error('Usage: node eval/scripts/make-split.mjs <file.jsonl> [--seed N] [--tune 0.6] [--out split.json]');
    process.exit(2);
  }
  const { records } = parseJsonl(readFileSync(resolve(options.file), 'utf8'));
  const split = stratifiedSplit(records, options);
  const out = options.out || options.file.replace(/\.jsonl$/, '.split.json');
  const payload = { dataset: options.file, seed: options.seed, tuneFraction: options.tune, stratifiedBy: ['category', 'label'], ...split };
  writeFileSync(out, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`Wrote ${out}: tune=${split.tune.length} holdout=${split.holdout.length}`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
