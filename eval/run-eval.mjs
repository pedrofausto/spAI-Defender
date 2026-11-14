#!/usr/bin/env node
/**
 * Offline evaluation of the deterministic local detection path.
 *
 * Usage: npm run eval -- <file.jsonl> [--threshold 55] [--top 5] [--json]
 *
 * Each message is scored with PhishingDetector.quickDetect, the lexicon-based heuristic
 * scorer that runs without AI. A message is predicted "scam" when its score is at or
 * above the threshold. No network calls are made.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PhishingDetector } from '../chrome-extension/src/utils/phishing-detector.js';
import { computeGroupedMetrics, parseJsonl, topErrors } from './metrics.js';

function parseArgs(argv) {
  const options = { file: null, threshold: 55, top: 5, json: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--threshold') options.threshold = Number(argv[++index]);
    else if (arg === '--top') options.top = Number(argv[++index]);
    else if (arg === '--json') options.json = true;
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

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (!options.file || !Number.isFinite(options.threshold)) {
    console.error('Usage: npm run eval -- <file.jsonl> [--threshold 55] [--top 5] [--json]');
    process.exit(2);
  }

  const { records, errors } = parseJsonl(readFileSync(resolve(options.file), 'utf8'));
  if (errors.length > 0) {
    console.error(`Skipped ${errors.length} invalid line(s):`);
    errors.slice(0, 10).forEach(error => console.error(`  ${error}`));
  }
  if (records.length === 0) {
    console.error('No valid records to evaluate.');
    process.exit(1);
  }

  const detector = new PhishingDetector(null);
  const rows = records.map(record => {
    const result = detector.quickDetect(record.text);
    return { ...record, score: result.score, predicted: result.score >= options.threshold ? 'scam' : 'legit' };
  });

  const { overall, byGroup } = computeGroupedMetrics(rows, 'lang');
  const { falsePositives, falseNegatives } = topErrors(rows, options.top);

  if (options.json) {
    console.log(JSON.stringify({ file: options.file, threshold: options.threshold, overall, byLang: byGroup, falsePositives, falseNegatives }, null, 2));
    return;
  }

  console.log(`Dataset: ${options.file} (${rows.length} messages)`);
  console.log(`Scorer: PhishingDetector.quickDetect, predicted scam when score >= ${options.threshold}`);
  console.log('');
  console.log(formatLine('overall', overall));
  for (const [lang, metrics] of Object.entries(byGroup)) console.log(formatLine(`lang=${lang}`, metrics));
  console.log('');
  console.log(`Top false positives (legit flagged as scam): ${falsePositives.length}`);
  falsePositives.forEach(row => console.log(`  [${row.id}] score=${row.score} lang=${row.lang} ${preview(row.text)}`));
  console.log(`Top false negatives (scam missed): ${falseNegatives.length}`);
  falseNegatives.forEach(row => console.log(`  [${row.id}] score=${row.score} lang=${row.lang} ${preview(row.text)}`));
}

main();
