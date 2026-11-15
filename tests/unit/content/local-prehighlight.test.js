/**
 * The WhatsApp local pre-highlight must use the shared scam-rules scorer (same as quickDetect).
 */
import {
  evaluateLocalMessageRisk,
  isLocalPrehighlightCandidate,
  isAiAnalysisCandidate,
  localRulesSeeLowRisk,
  LOCAL_PREHIGHLIGHT_MEDIUM_THRESHOLD,
  LOCAL_PREHIGHLIGHT_HIGH_THRESHOLD
} from '../../../chrome-extension/src/content/local-prehighlight.js';
import { scoreMessage } from '../../../chrome-extension/src/utils/scam-rules.js';
import { PhishingDetector } from '../../../chrome-extension/src/utils/phishing-detector.js';
import fs from 'fs';
import path from 'path';

const NEW_NUMBER_PIX = 'Oi mae, troquei de numero, esse e meu numero novo. Preciso que voce faca um pix de 800 reais urgente pra mim, depois te devolvo.';
const BANK_WARNING = 'Banco: nunca pedimos seu codigo, senha ou token por mensagem. Nao compartilhe com ninguem.';

describe('AI analysis candidate rule', () => {
  test('outgoing messages are never sent to AI, same as the pre-highlight rule', () => {
    expect(isAiAnalysisCandidate({ direction: 'out' })).toBe(false);
    expect(isAiAnalysisCandidate({ direction: 'out' })).toBe(isLocalPrehighlightCandidate({ direction: 'out' }));
  });

  test('incoming and undetermined messages are sent to AI', () => {
    expect(isAiAnalysisCandidate({ direction: 'in' })).toBe(true);
    expect(isAiAnalysisCandidate({ direction: 'unknown' })).toBe(true);
    expect(isAiAnalysisCandidate(null)).toBe(false);
  });
});

describe('local pre-highlight uses scam-rules', () => {
  test('thresholds align with the detector scam threshold', () => {
    expect(LOCAL_PREHIGHLIGHT_MEDIUM_THRESHOLD).toBe(55);
    expect(LOCAL_PREHIGHLIGHT_HIGH_THRESHOLD).toBe(80);
  });

  test('"numero novo + pix" message is pre-highlighted with scam-rules evidence', () => {
    const risk = evaluateLocalMessageRisk(NEW_NUMBER_PIX);
    const reference = scoreMessage(NEW_NUMBER_PIX);
    expect(risk.score).toBe(reference.score);
    expect(risk.evidence).toEqual(reference.evidence);
    expect(risk.score).toBeGreaterThanOrEqual(55);
    expect(risk.severity).not.toBeNull();
    expect(localRulesSeeLowRisk(NEW_NUMBER_PIX)).toBe(false);
  });

  test('bank "nunca pedimos seu codigo" warning is not pre-highlighted', () => {
    const risk = evaluateLocalMessageRisk(BANK_WARNING);
    expect(risk.score).toBeLessThan(55);
    expect(risk.severity).toBeNull();
    expect(localRulesSeeLowRisk(BANK_WARNING)).toBe(true);
  });

  test.each([NEW_NUMBER_PIX, BANK_WARNING, 'Bom dia, tudo bem?', 'Seu codigo e 1234, me passa agora urgente'])(
    'score matches PhishingDetector.quickDetect for %s', (text) => {
      expect(evaluateLocalMessageRisk(text).score).toBe(new PhishingDetector({}).quickDetect(text).score);
    }
  );

  test('severity mapping follows quickDetect levels', () => {
    for (const text of [NEW_NUMBER_PIX, BANK_WARNING, 'Seu codigo e 1234, me passa agora urgente']) {
      const level = new PhishingDetector({}).quickDetect(text).level;
      const expected = level === 'HIGH' ? 'high' : level === 'MEDIUM' ? 'medium' : null;
      expect(evaluateLocalMessageRisk(text).severity).toBe(expected);
    }
  });

  test('empty input is safe', () => {
    expect(evaluateLocalMessageRisk('').severity).toBeNull();
    expect(evaluateLocalMessageRisk(null).score).toBe(0);
  });

  test('only incoming or undetermined messages are candidates', () => {
    expect(isLocalPrehighlightCandidate({ direction: 'in' })).toBe(true);
    expect(isLocalPrehighlightCandidate({ direction: 'unknown' })).toBe(true);
    expect(isLocalPrehighlightCandidate({ direction: 'out' })).toBe(false);
    expect(isLocalPrehighlightCandidate(null)).toBe(false);
  });

  test('content script has no leftover local keyword lexicons', () => {
    const src = fs.readFileSync(path.join(__dirname, '../../../chrome-extension/src/content/content-script.js'), 'utf8');
    expect(src).not.toMatch(/LOCAL_MESSAGE_RISK_PATTERNS|message-risk-patterns/);
    expect(src).toMatch(/from '\.\/local-prehighlight\.js'/);
    expect(src).toMatch(/localRulesSeeLowRisk\(message\.text\)/);
  });
});
