/**
 * Lone AI verdict cap: when the deterministic rules see almost nothing (score under the floor),
 * an AI-only risk verdict is capped just below the scam threshold and reported as needing review.
 */
import {
  LONE_AI_RULE_FLOOR,
  LONE_AI_VERDICT_CAP,
  isLoneAiVerdict,
  applyLoneAiVerdictCap
} from '../../../chrome-extension/src/utils/lone-ai-verdict.js';

const riskyAi = (overrides = {}) => ({
  status: 'VALID',
  classification: 'SCAM',
  riskLevel: 'HIGH',
  riskScore: 91,
  finalRiskScore: 91,
  isPhishing: true,
  recommendation: 'DANGEROUS',
  ...overrides
});

describe('lone AI verdict policy constants', () => {
  test('floor is 20 and cap is 54, just below the scam threshold of 55', () => {
    expect(LONE_AI_RULE_FLOOR).toBe(20);
    expect(LONE_AI_VERDICT_CAP).toBe(54);
  });
});

describe('isLoneAiVerdict', () => {
  test('is true for rule scores of 0 and anything below the floor', () => {
    expect(isLoneAiVerdict(0)).toBe(true);
    expect(isLoneAiVerdict(19)).toBe(true);
    expect(isLoneAiVerdict(undefined)).toBe(true);
  });

  test('is false from the floor upwards', () => {
    expect(isLoneAiVerdict(20)).toBe(false);
    expect(isLoneAiVerdict(40)).toBe(false);
  });
});

describe('applyLoneAiVerdictCap', () => {
  test('caps a risky AI verdict that rules score at 0 and reports it as needing review', () => {
    const capped = applyLoneAiVerdictCap(riskyAi(), 0);

    expect(capped.finalRiskScore).toBe(54);
    expect(capped.riskScore).toBe(54);
    expect(capped.classification).toBe('SUSPICIOUS');
    expect(capped.isPhishing).toBe(false);
    expect(capped.riskLevel).toBe('MEDIUM_HIGH');
    expect(capped.recommendation).toBe('CAUTION');
    expect(capped.loneAiVerdictCapped).toBe(true);
  });

  test('applies below the floor, not only at zero', () => {
    expect(applyLoneAiVerdictCap(riskyAi(), 19).finalRiskScore).toBe(54);
  });

  test('keeps non-malicious classifications and only caps the score', () => {
    const capped = applyLoneAiVerdictCap(riskyAi({ classification: 'INCONCLUSIVE', recommendation: 'SAFE', isPhishing: false }), 0);

    expect(capped.classification).toBe('INCONCLUSIVE');
    expect(capped.recommendation).toBe('SAFE');
    expect(capped.finalRiskScore).toBe(54);
  });

  test('does not change the result when rules reach the floor', () => {
    const verdict = riskyAi();
    expect(applyLoneAiVerdictCap(verdict, 20)).toBe(verdict);
  });

  test('does not change a result already at or under the cap', () => {
    const verdict = riskyAi({ finalRiskScore: 54, riskScore: 54, classification: 'SUSPICIOUS', recommendation: 'CAUTION', isPhishing: false });
    expect(applyLoneAiVerdictCap(verdict, 0)).toBe(verdict);
    expect(applyLoneAiVerdictCap(riskyAi({ finalRiskScore: 40, riskScore: 40 }), 0).finalRiskScore).toBe(40);
  });

  test('does not add a riskScore field to results that only carry finalRiskScore', () => {
    const { riskScore: _ignored, ...withoutRiskScore } = riskyAi();
    const capped = applyLoneAiVerdictCap(withoutRiskScore, 0);

    expect(capped.finalRiskScore).toBe(54);
    expect(capped).not.toHaveProperty('riskScore');
  });

  test('does not mutate the input object', () => {
    const verdict = riskyAi();
    applyLoneAiVerdictCap(verdict, 0);

    expect(verdict.finalRiskScore).toBe(91);
    expect(verdict.classification).toBe('SCAM');
  });
});
