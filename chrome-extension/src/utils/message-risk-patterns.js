/**
 * Shared keyword lexicon for the deterministic local message risk heuristics.
 *
 * Both the content script (instant WhatsApp pre-highlights) and PhishingDetector.quickDetect
 * build their category lists from these base lists, so each pattern is defined once.
 * The two consumers keep a few consumer-specific extras to preserve their existing scoring.
 */

export const CREDENTIAL_PATTERNS = Object.freeze([
  /verifi(que|car).*conta/i, /verify.*account/i, /senha/i, /password/i, /credencial/i, /credential/i,
  /c[oó]digo/i, /code/i, /otp/i, /token/i, /pin/i
]);

export const ACCOUNT_THREAT_PATTERNS = Object.freeze([
  /conta.*suspens[ao]/i, /account.*suspend/i, /conta.*bloquead[ao]/i, /account.*block/i,
  /acesso.*não.*autorizado/i, /unauthorized.*access/i, /atividade.*suspeita/i, /suspicious.*activity/i
]);

export const URGENCY_PATTERNS = Object.freeze([
  /urgente/i, /urgent/i, /imediat[ao]/i, /immediate/i, /agora/i, /now/i, /última.*chance/i, /last.*chance/i
]);

export const AUTHORITY_PATTERNS = Object.freeze([
  /banco/i, /bank/i, /suporte/i, /support/i, /administra[cç][aã]o/i, /security team/i, /microsoft/i, /google/i
]);

export const REWARD_PATTERNS = Object.freeze([
  /pr[eê]mio/i, /prize/i, /gr[aá]tis/i, /free/i, /cashback/i, /gift/i
]);

export const PAYMENT_PATTERNS = Object.freeze([
  /pix/i, /boleto/i, /payment/i, /pagamento/i, /transfer/i, /crypto/i, /bitcoin/i
]);

export const LINK_ACTION_PATTERNS = Object.freeze([
  /clique/i, /click/i, /acesse/i, /access here/i, /link/i, /http[s]?:\/\//i, /bit\.ly/i, /tinyurl/i
]);

export const EDUCATIONAL_PATTERNS = Object.freeze([
  /exemplo/i, /example/i, /treinamento/i, /training/i, /educacional/i, /awareness/i, /simula[cç][aã]o/i, /simulation/i
]);

export const NEGATION_PATTERNS = Object.freeze([
  /n[aã]o clique/i, /do not click/i, /nunca compartilhe/i, /never share/i, /golpe/i, /scam alert/i, /phishing awareness/i
]);

/**
 * Category lists used by PhishingDetector.quickDetect.
 */
export const QUICK_DETECT_PATTERNS = Object.freeze({
  credential: CREDENTIAL_PATTERNS,
  accountThreat: ACCOUNT_THREAT_PATTERNS,
  urgency: URGENCY_PATTERNS,
  authority: AUTHORITY_PATTERNS,
  reward: Object.freeze([...REWARD_PATTERNS, /ganhe.*dinheiro/i, /earn.*money/i]),
  payment: PAYMENT_PATTERNS,
  linkAction: LINK_ACTION_PATTERNS,
  educational: EDUCATIONAL_PATTERNS,
  negation: NEGATION_PATTERNS
});

/**
 * Category lists used by the content script for instant local pre-highlights.
 * Account threat wording is folded into the authority category here.
 */
export const LOCAL_MESSAGE_RISK_PATTERNS = Object.freeze({
  credential: Object.freeze([...CREDENTIAL_PATTERNS, /login/i, /sign in/i]),
  urgency: Object.freeze([...URGENCY_PATTERNS, /em at[eé] 24 horas/i, /within 24 hours/i]),
  authority: Object.freeze([
    ...AUTHORITY_PATTERNS,
    /conta.*bloquead[ao]/i, /account.*(blocked|suspend)/i, /atividade.*suspeita/i, /suspicious.*activity/i
  ]),
  reward: Object.freeze([...REWARD_PATTERNS, /bonus/i, /claim/i]),
  payment: PAYMENT_PATTERNS,
  linkAction: LINK_ACTION_PATTERNS,
  educational: EDUCATIONAL_PATTERNS,
  negation: NEGATION_PATTERNS
});
