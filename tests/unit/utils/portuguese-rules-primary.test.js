/**
 * Portuguese is not a documented supported language of Chrome's Prompt API, so for Portuguese
 * content the deterministic rules are the primary decision maker. Gemini Nano may raise risk
 * but must never lower it below the rule score. Real HybridScorer/analyzers are used here.
 */
import { PhishingDetector } from '../../../chrome-extension/src/utils/phishing-detector.js';
import { setupChromeMocks } from '../../helpers/chrome-api-mock.js';

const PT_SCAM = 'oi mae, esse e meu numero novo, me faz um pix urgente';
const PT_LEGIT = 'Oi mae, vou chegar em casa as sete. Compra pao no caminho, por favor.';

const ai = (overrides = {}) => JSON.stringify({
  status: 'VALID', language: 'pt-BR', riskScore: 0, riskLevel: 'LOW', confidence: 90,
  classification: 'SAFE', semanticSignals: [], evidence: [], suspiciousPhrases: [],
  recommendation: 'SAFE', ...overrides
});

// promptFn undefined simulates an unavailable model (session creation fails).
function makeDetector(promptFn) {
  const manager = {
    getPooledSession: jest.fn().mockReturnValue(null),
    getOrCreateSession: promptFn
      ? jest.fn().mockResolvedValue({ prompt: promptFn })
      : jest.fn().mockRejectedValue(new Error('model unavailable')),
    returnSessionToPool: jest.fn()
  };
  return new PhishingDetector(manager);
}

const scenarios = {
  'SAFE with score 0 and no evidence': () => jest.fn().mockResolvedValue(ai()),
  'SAFE with evidence': () => jest.fn().mockResolvedValue(ai({ riskScore: 5, evidence: ['casual family chat'], suspiciousPhrases: ['pix'] })),
  'INCONCLUSIVE': () => jest.fn().mockResolvedValue(ai({ status: 'INCONCLUSIVE', riskLevel: 'UNKNOWN', classification: 'INCONCLUSIVE', recommendation: 'CAUTION' })),
  'schema-invalid output': () => jest.fn().mockResolvedValue('not json at all'),
  'prompt timeout or error': () => jest.fn().mockRejectedValue(new Error('timed out')),
  'unavailable model': () => undefined
};

describe('Portuguese content: rules primary, AI may only raise', () => {
  beforeEach(() => {
    setupChromeMocks();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => jest.restoreAllMocks());

  test('the Portuguese scam sample is flagged by rules alone', () => {
    const quick = makeDetector(undefined).quickDetect(PT_SCAM);
    expect(quick.score).toBeGreaterThanOrEqual(55);
  });

  describe.each(Object.keys(scenarios))('AI outcome: %s', (name) => {
    test.each([['advanced', true], ['simple', false]])('%s path never drops below the rule score and still flags', async (_label, advanced) => {
      const detector = makeDetector(scenarios[name]());
      const rule = detector.quickDetect(PT_SCAM).score;
      const result = await detector.detectPhishing('https://web.whatsapp.com', PT_SCAM, 'WhatsApp', [], advanced);

      expect(result.finalRiskScore).toBeGreaterThanOrEqual(rule);
      if (result.riskScore !== undefined) expect(result.riskScore).toBeGreaterThanOrEqual(rule);
      expect(result.heuristicScore).toBe(rule);
      expect(result.classification).not.toBe('SAFE');
      expect(result.recommendation).not.toBe('SAFE');
    });
  });

  // Intentional change: the earlier expectation was that a lone AI high-risk verdict on benign text
  // reached >= 75 on the simple path. Under the lone-AI policy (lone-ai-verdict.js), rules at 0 cap it at 54
  // and report it as SUSPICIOUS ("needs review") instead of a malicious alarm.
  test('legit Portuguese message with AI high risk: a lone AI verdict is capped at 54 and needs review', async () => {
    const highRisk = ai({
      riskScore: 85, riskLevel: 'HIGH', classification: 'SCAM', recommendation: 'DANGEROUS',
      semanticSignals: ['payment_request', 'urgent_action'], evidence: ['asks to buy something'], suspiciousPhrases: ['por favor']
    });
    const detector = makeDetector(jest.fn().mockResolvedValue(highRisk));
    expect(detector.quickDetect(PT_LEGIT).score).toBeLessThan(20);

    const simple = await detector.detectPhishing('https://web.whatsapp.com', PT_LEGIT, 'WhatsApp', [], false);
    expect(simple.heuristicScore).toBeLessThan(20);
    expect(simple.finalRiskScore).toBe(54);
    expect(simple.classification).toBe('SUSPICIOUS');
    expect(simple.isPhishing).toBe(false);
    expect(simple.recommendation).toBe('CAUTION');
    expect(simple.loneAiVerdictCapped).toBe(true);

    const advanced = await detector.detectPhishing('https://web.whatsapp.com', PT_LEGIT, 'WhatsApp', [], true);
    expect(advanced.finalRiskScore).toBeLessThanOrEqual(54);
    expect(advanced.finalRiskScore).toBeGreaterThanOrEqual(advanced.heuristicScore); // the floor still holds
    expect(['PHISHING', 'SCAM', 'SOCIAL_ENGINEERING']).not.toContain(advanced.classification);
  });

  test('rules at 40 (below the scam threshold but above the floor): the AI may still raise the score above the cap', async () => {
    const PT_MODERATE = 'Seu pix foi estornado, confirme seus dados aqui';
    const highRisk = ai({
      riskScore: 85, riskLevel: 'HIGH', classification: 'SCAM', recommendation: 'DANGEROUS',
      semanticSignals: ['payment_request', 'urgent_action'], evidence: ['asks for personal data'], suspiciousPhrases: ['confirme']
    });
    const detector = makeDetector(jest.fn().mockResolvedValue(highRisk));
    const rule = detector.quickDetect(PT_MODERATE).score;
    expect(rule).toBeGreaterThanOrEqual(20);
    expect(rule).toBeLessThan(55);

    const simple = await detector.detectPhishing('https://web.whatsapp.com', PT_MODERATE, 'WhatsApp', [], false);
    expect(simple.finalRiskScore).toBeGreaterThanOrEqual(75);
    expect(simple.loneAiVerdictCapped).toBeUndefined();
  });
});
