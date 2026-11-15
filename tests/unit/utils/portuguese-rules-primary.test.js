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

  test('legit Portuguese message with AI high risk: AI may raise (documented behavior)', async () => {
    const highRisk = ai({
      riskScore: 85, riskLevel: 'HIGH', classification: 'SCAM', recommendation: 'DANGEROUS',
      semanticSignals: ['payment_request', 'urgent_action'], evidence: ['asks to buy something'], suspiciousPhrases: ['por favor']
    });
    const detector = makeDetector(jest.fn().mockResolvedValue(highRisk));
    expect(detector.quickDetect(PT_LEGIT).score).toBeLessThan(25);

    const simple = await detector.detectPhishing('https://web.whatsapp.com', PT_LEGIT, 'WhatsApp', [], false);
    expect(simple.heuristicScore).toBeLessThan(25);
    expect(simple.finalRiskScore).toBeGreaterThanOrEqual(75); // simple path: the AI verdict raises the score uncapped

    const advanced = await detector.detectPhishing('https://web.whatsapp.com', PT_LEGIT, 'WhatsApp', [], true);
    expect(advanced.finalRiskScore).toBeGreaterThanOrEqual(advanced.heuristicScore); // advanced path: weighted, may be diluted
  });
});
