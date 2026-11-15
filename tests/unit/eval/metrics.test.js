/**
 * Evaluation harness metrics tests
 */
import { computeMetrics, computeGroupedMetrics, parseJsonl, topErrors } from '../../../eval/metrics.js';

const row = (label, predicted, extra = {}) => ({ label, predicted, ...extra });

describe('computeMetrics', () => {
  test('computes confusion counts, precision, recall, F1 and false-positive rate', () => {
    const rows = [
      row('scam', 'scam'), row('scam', 'scam'), row('scam', 'scam'), // 3 TP
      row('scam', 'legit'), // 1 FN
      row('legit', 'scam'), // 1 FP
      row('legit', 'legit'), row('legit', 'legit'), row('legit', 'legit'), row('legit', 'legit') // 4 TN
    ];
    const m = computeMetrics(rows);
    expect(m).toMatchObject({ total: 9, tp: 3, fp: 1, tn: 4, fn: 1 });
    expect(m.precision).toBeCloseTo(0.75);
    expect(m.recall).toBeCloseTo(0.75);
    expect(m.f1).toBeCloseTo(0.75);
    expect(m.falsePositiveRate).toBeCloseTo(0.2);
    expect(m.accuracy).toBeCloseTo(7 / 9);
  });

  test('uses harmonic mean for F1 when precision and recall differ', () => {
    const m = computeMetrics([row('scam', 'scam'), row('scam', 'legit'), row('scam', 'legit'), row('scam', 'legit')]);
    expect(m.precision).toBe(1);
    expect(m.recall).toBe(0.25);
    expect(m.f1).toBeCloseTo(0.4);
    expect(m.falsePositiveRate).toBeNull();
  });

  test('returns null for undefined ratios and zero F1 when nothing is caught', () => {
    expect(computeMetrics([])).toMatchObject({ total: 0, precision: null, recall: null, f1: null, falsePositiveRate: null, accuracy: null });
    const missed = computeMetrics([row('scam', 'legit'), row('legit', 'legit')]);
    expect(missed.precision).toBeNull();
    expect(missed.recall).toBe(0);
    expect(missed.f1).toBeNull();
    const allWrong = computeMetrics([row('scam', 'legit'), row('legit', 'scam')]);
    expect(allWrong.precision).toBe(0);
    expect(allWrong.recall).toBe(0);
    expect(allWrong.f1).toBe(0);
    expect(allWrong.falsePositiveRate).toBe(1);
  });
});

describe('computeGroupedMetrics', () => {
  test('splits metrics by language and keeps an overall total', () => {
    const { overall, byGroup } = computeGroupedMetrics([
      row('scam', 'scam', { lang: 'pt' }), row('legit', 'scam', { lang: 'pt' }),
      row('scam', 'legit', { lang: 'en' }), row('legit', 'legit', { lang: 'en' }),
      row('legit', 'legit', {})
    ]);
    expect(overall.total).toBe(5);
    expect(Object.keys(byGroup)).toEqual(['en', 'pt', 'unknown']);
    expect(byGroup.pt).toMatchObject({ tp: 1, fp: 1 });
    expect(byGroup.en).toMatchObject({ fn: 1, tn: 1 });
    expect(byGroup.unknown.tn).toBe(1);
  });
});

describe('parseJsonl', () => {
  test('parses valid lines, fills defaults and reports invalid ones', () => {
    const text = [
      '{"id":"a","text":"hello","label":"legit","lang":"en","source":"synthetic"}',
      '',
      '{"text":"pay now","label":"scam"}',
      'not json',
      '{"id":"c","text":"x","label":"spam"}',
      '{"id":"d","label":"scam"}'
    ].join('\n');
    const { records, errors } = parseJsonl(text);
    expect(records).toEqual([
      { id: 'a', text: 'hello', label: 'legit', lang: 'en', source: 'synthetic' },
      { id: 'line-3', text: 'pay now', label: 'scam', lang: 'unknown', source: 'unknown' }
    ]);
    expect(errors).toHaveLength(3);
    expect(errors[0]).toMatch(/^line 4: invalid JSON/);
    expect(errors[1]).toMatch(/^line 5: label/);
    expect(errors[2]).toMatch(/^line 6: missing text/);
  });
});

describe('topErrors', () => {
  test('ranks false positives by highest score and false negatives by lowest score', () => {
    const rows = [
      row('legit', 'scam', { id: 'fp-low', score: 60 }),
      row('legit', 'scam', { id: 'fp-high', score: 90 }),
      row('scam', 'legit', { id: 'fn-high', score: 40 }),
      row('scam', 'legit', { id: 'fn-low', score: 5 }),
      row('scam', 'scam', { id: 'tp', score: 99 })
    ];
    const { falsePositives, falseNegatives } = topErrors(rows, 1);
    expect(falsePositives.map(r => r.id)).toEqual(['fp-high']);
    expect(falseNegatives.map(r => r.id)).toEqual(['fn-low']);
  });
});
