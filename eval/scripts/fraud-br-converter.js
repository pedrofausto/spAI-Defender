/**
 * Converts a FraudWhatsApp.Br / FraudTelegram.Br CSV export into the evaluation JSONL format.
 * Pure functions only: no file system or network access, so it can be unit tested.
 */

/**
 * Parses CSV text (RFC 4180 style: quoted fields, doubled quotes, newlines inside quotes).
 * @param {string} text
 * @param {string} delimiter
 * @returns {string[][]} rows of fields
 */
export function parseCsv(text, delimiter = ',') {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  const input = text.replace(/^﻿/, '');
  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];
    if (inQuotes) {
      if (ch === '"' && input[i + 1] === '"') { field += '"'; i += 1; }
      else if (ch === '"') inQuotes = false;
      else field += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === delimiter) { row.push(field); field = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && input[i + 1] === '\n') i += 1;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += ch;
  }
  if (field !== '' || row.length > 0) { row.push(field); rows.push(row); }
  return rows.filter(r => !(r.length === 1 && r[0].trim() === ''));
}

/** Guesses the delimiter from the header line (comma, semicolon or tab). */
export function detectDelimiter(text) {
  const header = text.split(/\r?\n/, 1)[0] || '';
  const counts = [',', ';', '\t'].map(d => [d, header.split(d).length - 1]);
  counts.sort((a, b) => b[1] - a[1]);
  return counts[0][1] > 0 ? counts[0][0] : ',';
}

/**
 * Converts CSV text to harness records.
 * @param {string} csvText
 * @param {object} options
 * @param {string} options.textColumn - header name of the message text column
 * @param {string} options.labelColumn - header name of the label column
 * @param {string[]} options.positiveLabels - label values meaning fraud/scam (case-insensitive)
 * @param {string} options.source - value for the source field
 * @param {string} [options.idPrefix]
 * @param {string} [options.delimiter]
 * @returns {{records: object[], skipped: number}}
 */
export function convertCsv(csvText, options) {
  const { textColumn, labelColumn, positiveLabels, source } = options;
  if (!textColumn || !labelColumn) throw new Error('Both a text column and a label column must be configured.');
  if (!Array.isArray(positiveLabels) || positiveLabels.length === 0) {
    throw new Error('At least one positive label value must be configured (for example "fraude" or "1").');
  }
  const rows = parseCsv(csvText, options.delimiter || detectDelimiter(csvText));
  if (rows.length === 0) throw new Error('The CSV file is empty.');
  const header = rows[0].map(h => h.trim());
  const textIndex = header.indexOf(textColumn);
  const labelIndex = header.indexOf(labelColumn);
  const missing = [[textColumn, textIndex], [labelColumn, labelIndex]].filter(([, idx]) => idx === -1).map(([n]) => `"${n}"`);
  if (missing.length > 0) {
    throw new Error(`Column(s) ${missing.join(', ')} not found. Available columns: ${header.map(h => `"${h}"`).join(', ')}.`);
  }
  const positives = new Set(positiveLabels.map(v => String(v).trim().toLowerCase()));
  const prefix = options.idPrefix || source;
  const records = [];
  let skipped = 0;
  rows.slice(1).forEach((row, index) => {
    const text = (row[textIndex] || '').trim();
    const rawLabel = (row[labelIndex] || '').trim();
    if (!text || !rawLabel) { skipped += 1; return; }
    records.push({
      id: `${prefix}-${String(index + 1).padStart(6, '0')}`,
      text,
      label: positives.has(rawLabel.toLowerCase()) ? 'scam' : 'legit',
      lang: 'pt',
      source
    });
  });
  return { records, skipped };
}

/** Picks the source name from a file name; defaults to fraudwhatsapp-br. */
export function sourceFromFileName(fileName) {
  return /telegram/i.test(fileName) ? 'fraudtelegram-br' : 'fraudwhatsapp-br';
}
