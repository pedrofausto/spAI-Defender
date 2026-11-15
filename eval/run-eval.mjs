#!/usr/bin/env node
/**
 * Offline evaluation of the deterministic local detection path.
 *
 * Usage: npm run eval -- <file.jsonl> [--threshold 55] [--top 5] [--json]
 *          [--split tune|holdout] [--split-file <split.json>] [--show-text]
 *
 * Each message is scored with PhishingDetector.quickDetect, the lexicon-based heuristic
 * scorer that runs without AI. A message is predicted "scam" when its score is at or
 * above the threshold. No network calls are made.
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PhishingDetector } from '../chrome-extension/src/utils/phishing-detector.js';
import { computeGroupedMetrics, parseJsonl, topErrors } from './metrics.js';

function parseArgs(argv) {
  const options = { file: null, threshold: 55, top: 5, json: false, split: null, splitFile: null, showText: null };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--threshold') options.threshold = Number(argv[++index]);
    else if (arg === '--top') options.top = Number(argv[++index]);
    else if (arg === '--json') options.json = true;
    else if (arg === '--split') options.split = argv[++index];
    else if (arg === '--split-file') options.splitFile = argv[++index];
    else if (arg === '--show-text') options.showText = true;
    else if (!options.file) options.file = arg;
  }
  return options;
}

function pct(value) {
  return value === null ? 'n/a' : `${(value * 100).toFixed(1)}%`;
}

function formatLine(name, m) {
  return `${name.padEnd(10)} n=${String(m.total).padEnd(5)} TP=${m.tp} FP=${m.fp} TN=${m.tn} FN=${m.fn}  ` +
    `precision=${pct(m.precision)} recall=${pct(m.recall)} F1=${pct(m.f1)} FPR=${pct(m.falsePositiveRate)}`;
}

function preview(text, max = 90) {
  const flat = text.replace(/\s+/g, ' ').trim();
  return flat.length > max ? `${flat.slice(0, max - 3)}...` : flat;
}

/**
 * Restrict records to one side of a tune/holdout split file (see eval/scripts/make-split.mjs).
 * The split file defaults to <dataset>.split.json next to the dataset.
 */
function applySplit(records, options) {
  if (!options.split) return records;
  if (!['tune', 'holdout'].includes(options.split)) {
    console.error('--split must be "tune" or "holdout"');
    process.exit(2);
  }
  const splitFile = options.splitFile || options.file.replace(/\.jsonl$/, '.split.json');
  if (!existsSync(splitFile)) {
    console.error(`Split file not found: ${splitFile}. Create it with node eval/scripts/make-split.mjs ${options.file}`);
    process.exit(2);
  }
  const ids = new Set(JSON.parse(readFileSync(resolve(splitFile), 'utf8'))[options.split] || []);
  return records.filter(record => ids.has(record.id));
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (!options.file || !Number.isFinite(options.threshold)) {
    console.error('Usage: npm run eval -- <file.jsonl> [--threshold 55] [--top 5] [--json]');
    process.exit(2);
  }

  const { records: allRecords, errors } = parseJsonl(readFileSync(resolve(options.file), 'utf8'));
  if (errors.length > 0) {
    console.error(`Skipped ${errors.length} invalid line(s):`);
    errors.slice(0, 10).forEach(error => console.error(`  ${error}`));
  }
  const records = applySplit(allRecords, options);
  // Holdout text stays hidden by default so it cannot leak into rule design.
  const showText = options.showText ?? options.split !== 'holdout';
  if (records.length === 0) {
    console.error('No valid records to evaluate.');
    process.exit(1);
  }

  const detector = new PhishingDetector(null);
  const rows = records.map(record => {
    const result = detector.quickDetect(record.text);
    return { ...record, category: record.category || 'none', score: result.score, predicted: result.score >= options.threshold ? 'scam' : 'legit' };
  });

  const { overall, byGroup } = computeGroupedMetrics(rows, 'lang');
  const byCategory = rows.some(row => row.category !== 'none') ? computeGroupedMetrics(rows, 'category').byGroup : {};
  const { falsePositives, falseNegatives } = topErrors(rows, options.top);

  if (options.json) {
    console.log(JSON.stringify({ file: options.file, split: options.split, threshold: options.threshold, overall, byLang: byGroup, byCategory, falsePositives: falsePositives.map(row => (showText ? row : { ...row, text: undefined })), falseNegatives: falseNegatives.map(row => (showText ? row : { ...row, text: undefined })) }, null, 2));
    return;
  }

  console.log(`Dataset: ${options.file}${options.split ? ` [split=${options.split}]` : ''} (${rows.length} messages)`);
  console.log(`Scorer: PhishingDetector.quickDetect, predicted scam when score >= ${options.threshold}`);
  console.log('');
  console.log(formatLine('overall', overall));
  for (const [lang, metrics] of Object.entries(byGroup)) console.log(formatLine(`lang=${lang}`, metrics));
  if (Object.keys(byCategory).length > 0) {
    console.log('');
    console.log('Per category (scam categories report recall, legit categories report FPR):');
    for (const [category, m] of Object.entries(byCategory)) {
      const detail = m.tp + m.fn > 0 ? `recall=${pct(m.recall)}` : `FPR=${pct(m.falsePositiveRate)}`;
      console.log(`  ${category.padEnd(26)} n=${String(m.total).padEnd(3)} flagged=${m.tp + m.fp} ${detail}`);
    }
  }
  console.log('');
  console.log(`Top false positives (legit flagged as scam): ${falsePositives.length}`);
  const describe = row => (showText ? preview(row.text) : `(${row.category}, text hidden)`);
  falsePositives.forEach(row => console.log(`  [${row.id}] score=${row.score} lang=${row.lang} ${describe(row)}`));
  console.log(`Top false negatives (scam missed): ${falseNegatives.length}`);
  falseNegatives.forEach(row => console.log(`  [${row.id}] score=${row.score} lang=${row.lang} ${describe(row)}`));
}

main();
