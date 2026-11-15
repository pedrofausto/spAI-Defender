/**
 * The shared lexicon must reproduce the legacy PhishingDetector.quickDetect category lists, so detection stays equivalent.
 */
import { QUICK_DETECT_PATTERNS } from '../../../chrome-extension/src/utils/message-risk-patterns.js';
import { PhishingDetector } from '../../../chrome-extension/src/utils/phishing-detector.js';

const sources = list => list.map(pattern => `${pattern.source}/${pattern.flags}`).sort();
const asSources = list => sources(list);

const LEGACY_QUICK = {
  credential: [/verifi(que|car).*conta/i, /verify.*account/i, /senha/i, /password/i, /credencial/i, /credential/i, /c[oó]digo/i, /code/i, /otp/i, /token/i, /pin/i],
  accountThreat: [/conta.*suspens[ao]/i, /account.*suspend/i, /conta.*bloquead[ao]/i, /account.*block/i, /acesso.*não.*autorizado/i, /unauthorized.*access/i, /atividade.*suspeita/i, /suspicious.*activity/i],
  urgency: [/urgente/i, /urgent/i, /imediat[ao]/i, /immediate/i, /agora/i, /now/i, /última.*chance/i, /last.*chance/i],
  authority: [/banco/i, /bank/i, /suporte/i, /support/i, /administra[cç][aã]o/i, /security team/i, /microsoft/i, /google/i],
  reward: [/pr[eê]mio/i, /prize/i, /gr[aá]tis/i, /free/i, /ganhe.*dinheiro/i, /earn.*money/i, /cashback/i, /gift/i],
  payment: [/pix/i, /boleto/i, /payment/i, /pagamento/i, /transfer/i, /crypto/i, /bitcoin/i],
  linkAction: [/clique/i, /click/i, /acesse/i, /access here/i, /link/i, /http[s]?:\/\//i, /bit\.ly/i, /tinyurl/i],
  educational: [/exemplo/i, /example/i, /treinamento/i, /training/i, /educacional/i, /awareness/i, /simula[cç][aã]o/i, /simulation/i],
  negation: [/n[aã]o clique/i, /do not click/i, /nunca compartilhe/i, /never share/i, /golpe/i, /scam alert/i, /phishing awareness/i]
};

describe('shared message risk patterns', () => {
  test.each(Object.keys(LEGACY_QUICK))('quickDetect category %s matches the legacy list', (category) => {
    expect(sources(QUICK_DETECT_PATTERNS[category])).toEqual(asSources(LEGACY_QUICK[category]));
  });


  test('has no extra categories', () => {
    expect(Object.keys(QUICK_DETECT_PATTERNS).sort()).toEqual(Object.keys(LEGACY_QUICK).sort());
  });

  test('PhishingDetector uses the shared quickDetect lists', () => {
    expect(new PhishingDetector({}).quickPatterns).toBe(QUICK_DETECT_PATTERNS);
  });

  test('shared lists cannot be mutated by a consumer', () => {
    expect(Object.isFrozen(QUICK_DETECT_PATTERNS)).toBe(true);
    expect(Object.isFrozen(QUICK_DETECT_PATTERNS.credential)).toBe(true);
  });
});
