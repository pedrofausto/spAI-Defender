/**
 * Lone AI verdict policy.
 *
 * The deterministic rules (scam-rules.js) are the primary signal. When they score below the floor, they
 * found no real scam pattern, so a risky verdict from the on-device AI alone cannot be a high-risk alarm.
 * Such a result is capped just below the scam threshold (55) and reported as SUSPICIOUS, which means
 * "needs review" in the existing classification set. The cap never lowers a score: it only limits how far
 * the AI can raise it when rules see nothing.
 */

export const LONE_AI_RULE_FLOOR = 20;
export const LONE_AI_VERDICT_CAP = 54;

const MALICIOUS_CLASSIFICATIONS = new Set(['PHISHING', 'SCAM', 'SOCIAL_ENGINEERING']);
const ALARM_RECOMMENDATIONS = new Set(['WARNING', 'DANGEROUS', 'AVOID']);

/** True when the deterministic rule score is below the floor (0 included). */
export function isLoneAiVerdict(heuristicScore) {
  return Number(heuristicScore || 0) < LONE_AI_RULE_FLOOR;
}

function riskLevelForScore(score) {
  if (score >= 90) return 'CRITICAL';
  if (score >= 75) return 'HIGH';
  if (score >= 50) return 'MEDIUM_HIGH';
  if (score >= 30) return 'MEDIUM';
  return 'LOW';
}

/**
 * Returns the result unchanged unless the rules are under the floor and the final score is above the cap.
 * When it applies, returns a copy with the score capped, a SUSPICIOUS classification in place of a malicious
 * one, a non-alarm recommendation and loneAiVerdictCapped set to true.
 */
export function applyLoneAiVerdictCap(result, heuristicScore) {
  if (!result || !isLoneAiVerdict(heuristicScore)) return result;

  const current = Number(result.finalRiskScore ?? result.riskScore ?? 0);
  if (current <= LONE_AI_VERDICT_CAP) return result;

  const capped = { ...result, finalRiskScore: LONE_AI_VERDICT_CAP, riskLevel: riskLevelForScore(LONE_AI_VERDICT_CAP), loneAiVerdictCapped: true };
  if ('riskScore' in result) capped.riskScore = LONE_AI_VERDICT_CAP;
  if (MALICIOUS_CLASSIFICATIONS.has(result.classification)) {
    capped.classification = 'SUSPICIOUS';
    capped.isPhishing = false;
  }
  if (ALARM_RECOMMENDATIONS.has(result.recommendation)) capped.recommendation = 'CAUTION';
  return capped;
}
