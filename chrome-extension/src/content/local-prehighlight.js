/**
 * Local (instant, no-AI) pre-highlight scoring for WhatsApp messages.
 *
 * Uses the shared scorer in utils/scam-rules.js, the same scoring behind
 * PhishingDetector.quickDetect, so the pre-highlight score and evidence match the detector.
 *
 * Threshold mapping (scam-rules score, 0-100), aligned with quickDetect levels:
 * - 80 or higher (quickDetect HIGH): pre-highlight severity "high"
 * - 55 to 79 (quickDetect MEDIUM, the scam threshold): pre-highlight severity "medium"
 * - below 55 (quickDetect LOW or SAFE): no pre-highlight; this is also the "local rules see
 *   low risk" condition that lets a non-threat AI verdict clear an existing highlight.
 *
 * The visual pre-highlight stays amber for both severities until a validated AI result upgrades it.
 */
import { scoreMessage } from '../utils/scam-rules.js';

export const LOCAL_PREHIGHLIGHT_MEDIUM_THRESHOLD = 55;
export const LOCAL_PREHIGHLIGHT_HIGH_THRESHOLD = 80;

export function evaluateLocalMessageRisk(text = '') {
  if (!text || typeof text !== 'string') {
    return { score: 0, severity: null, signals: [], matches: [], evidence: [], context: { educational: false, negated: false } };
  }

  const result = scoreMessage(text);
  const score = result.score;
  const severity = score >= LOCAL_PREHIGHLIGHT_HIGH_THRESHOLD ? 'high'
    : score >= LOCAL_PREHIGHLIGHT_MEDIUM_THRESHOLD ? 'medium'
    : null;

  return {
    score,
    severity,
    signals: result.semanticSignals,
    matches: result.matches,
    evidence: result.evidence,
    context: result.context
  };
}

/** Only incoming (or undetermined) messages get a local pre-highlight; the user's own messages do not. */
export function isLocalPrehighlightCandidate(message) {
  return Boolean(message) && message.direction !== 'out';
}

/** True when local rules agree the message is low risk (below the scam threshold). */
export function localRulesSeeLowRisk(text) {
  return !evaluateLocalMessageRisk(text).severity;
}
