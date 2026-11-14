#!/usr/bin/env node
/**
 * Prepares FraudWhatsApp.Br / FraudTelegram.Br (SBSeg 2023, LSBD/UFC) for the evaluation harness.
 *
 * The datasets are not public. This script makes no network calls: it only converts CSV files
 * that the repository owner obtained from the authors into JSONL under the gitignored data/fraud-br/.
 *
 * Usage: npm run eval:fetch-fraud-br -- [input.csv ...] [--text-column text] [--label-column label]
 *        [--positive fraude,1] [--source fraudwhatsapp-br] [--out-dir data/fraud-br]
 * Environment variables: FRAUD_BR_INPUT (file or directory), FRAUD_BR_TEXT_COLUMN,
 * FRAUD_BR_LABEL_COLUMN, FRAUD_BR_POSITIVE_LABELS (comma separated), FRAUD_BR_DELIMITER.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { convertCsv, sourceFromFileName } from './fraud-br-converter.js';

const DEFAULT_RAW_DIR = 'data/fraud-br/raw';
const DEFAULT_OUT_DIR = 'data/fraud-br';

const INSTRUCTIONS = `FraudWhatsApp.Br / FraudTelegram.Br input not found.

These datasets (SBSeg 2023, LSBD/UFC) are not publicly available. The authors' GitHub
repository is empty and has no license. Paper: https://sol.sbc.org.br/index.php/sbseg/article/view/27211

To use them:
  1. Request the data directly from the authors and agree to their terms of use.
  2. Place the CSV file(s) in ${DEFAULT_RAW_DIR}/ (or pass a path, or set FRAUD_BR_INPUT).
  3. Run: npm run eval:fetch-fraud-br -- --text-column <col> --label-column <col> --positive <values>
  4. Evaluate: npm run eval -- ${DEFAULT_OUT_DIR}/<name>.jsonl

Never commit the raw or converted data. The messages may contain personal data protected
by the LGPD (Lei 13.709/2018); the data/ folder is gitignored for this reason.`;

function parseArgs(argv, env) {
  const options = {
    inputs: [],
    textColumn: env.FRAUD_BR_TEXT_COLUMN || 'text',
    labelColumn: env.FRAUD_BR_LABEL_COLUMN || 'label',
    positiveLabels: (env.FRAUD_BR_POSITIVE_LABELS || 'fraude,fraud,golpe,scam,1,true').split(','),
    delimiter: env.FRAUD_BR_DELIMITER || null,
    source: null,
    outDir: DEFAULT_OUT_DIR
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = () => {
      const value = argv[++i];
      if (value === undefined) throw new Error(`Missing value for ${arg}.`);
      return value;
    };
    if (arg === '--text-column') options.textColumn = next();
    else if (arg === '--label-column') options.labelColumn = next();
    else if (arg === '--positive') options.positiveLabels = next().split(',');
    else if (arg === '--delimiter') options.delimiter = next();
    else if (arg === '--source') options.source = next();
    else if (arg === '--out-dir') options.outDir = next();
    else if (arg.startsWith('--')) throw new Error(`Unknown option ${arg}.`);
    else options.inputs.push(arg);
  }
  if (options.inputs.length === 0) options.inputs.push(env.FRAUD_BR_INPUT || DEFAULT_RAW_DIR);
  options.positiveLabels = options.positiveLabels.map(v => v.trim()).filter(Boolean);
  return options;
}

function expandInputs(inputs) {
  const files = [];
  for (const input of inputs) {
    const path = resolve(input);
    if (!existsSync(path)) continue;
    if (statSync(path).isDirectory()) {
      readdirSync(path).filter(name => name.toLowerCase().endsWith('.csv')).sort().forEach(name => files.push(join(path, name)));
    } else files.push(path);
  }
  return files;
}

function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2), process.env);
  } catch (error) {
    console.error(error.message);
    process.exit(2);
  }
  const files = expandInputs(options.inputs);
  if (files.length === 0) {
    console.log(INSTRUCTIONS);
    process.exit(1);
  }
  mkdirSync(resolve(options.outDir), { recursive: true });
  let failed = false;
  for (const file of files) {
    const source = options.source || sourceFromFileName(basename(file));
    try {
      const { records, skipped } = convertCsv(readFileSync(file, 'utf8'), { ...options, source });
      const outFile = resolve(options.outDir, `${basename(file).replace(/\.csv$/i, '')}.jsonl`);
      writeFileSync(outFile, records.map(r => JSON.stringify(r)).join('\n') + '\n');
      const scams = records.filter(r => r.label === 'scam').length;
      console.log(`${basename(file)}: wrote ${records.length} records (${scams} scam, ${records.length - scams} legit, ${skipped} skipped) to ${outFile}`);
    } catch (error) {
      failed = true;
      console.error(`${basename(file)}: ${error.message}`);
      console.error('Set the columns with --text-column, --label-column and --positive (or the FRAUD_BR_* environment variables).');
    }
  }
  if (failed) process.exit(1);
}

main();
