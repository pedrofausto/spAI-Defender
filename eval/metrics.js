/**
 * Binary classification metrics for the evaluation harness.
 * The positive class is "scam".
 */

export const LABELS = Object.freeze(['scam', 'legit']);

function safeDivide(numerator, denominator) {
  return denominator === 0 ? null : numerator / denominator;
}

/**
 * Compute confusion counts and metrics.
 * @param {Array<{label: string, predicted: string}>} rows
 */
export function computeMetrics(rows = []) {
  let tp = 0;
  let fp = 0;
  let tn = 0;
  let fn = 0;
  for (const row of rows) {
    const actualScam = row.label === 'scam';
    const predictedScam = row.predicted === 'scam';
    if (actualScam && predictedScam) tp += 1;
    else if (!actualScam && predictedScam) fp += 1;
    else if (!actualScam && !predictedScam) tn += 1;
    else fn += 1;
  }
  const precision = safeDivide(tp, tp + fp);
  const recall = safeDivide(tp, tp + fn);
  let f1 = null;
  if (precision !== null && recall !== null) {
    f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);
  }
  return {
    total: rows.length,
    tp,
    fp,
    tn,
    fn,
    precision,
    recall,
    f1,
    falsePositiveRate: safeDivide(fp, fp + tn),
    accuracy: safeDivide(tp + tn, rows.length)
  };
}

/**
 * Compute metrics overall and per value of a grouping field (for example "lang").
 */
export function computeGroupedMetrics(rows = [], field = 'lang') {
  const groups = new Map();
  for (const row of rows) {
    const key = row[field] == null || row[field] === '' ? 'unknown' : String(row[field]);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }
  const byGroup = {};
  for (const key of [...groups.keys()].sort()) byGroup[key] = computeMetrics(groups.get(key));
  return { overall: computeMetrics(rows), byGroup };
}

/**
 * Validate and parse JSONL text. Returns records and a list of line errors.
 */
export function parseJsonl(text) {
  const records = [];
  const errors = [];
  String(text || '').split(/\r?\n/).forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    let record;
    try {
      record = JSON.parse(trimmed);
    } catch (error) {
      errors.push(`line ${index + 1}: invalid JSON (${error.message})`);
      return;
    }
    if (typeof record.text !== 'string' || record.text.length === 0) {
      errors.push(`line ${index + 1}: missing text`);
      return;
    }
    if (!LABELS.includes(record.label)) {
      errors.push(`line ${index + 1}: label must be "scam" or "legit"`);
      return;
    }
    records.push({
      id: record.id == null ? `line-${index + 1}` : String(record.id),
      text: record.text,
      label: record.label,
      lang: record.lang == null ? 'unknown' : String(record.lang),
      source: record.source == null ? 'unknown' : String(record.source)
    });
  });
  return { records, errors };
}

/**
 * Pick the most confident mistakes. False positives are legit messages sorted by
 * descending score; false negatives are scam messages sorted by ascending score.
 */
export function topErrors(rows = [], limit = 5) {
  const falsePositives = rows
    .filter(row => row.label === 'legit' && row.predicted === 'scam')
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
  const falseNegatives = rows
    .filter(row => row.label === 'scam' && row.predicted !== 'scam')
    .sort((a, b) => a.score - b.score)
    .slice(0, limit);
  return { falsePositives, falseNegatives };
}
