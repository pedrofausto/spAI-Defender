/**
 * Scam-pattern rules behind PhishingDetector.quickDetect.
 * All messages are synthetic and written for these tests.
 */
import {
  normalizeText,
  isNegatedAt,
  findAffirmed,
  analyzeLinks,
  scoreMessage,
  SCAM_RULE_FAMILIES
} from '../../../chrome-extension/src/utils/scam-rules.js';
import { PhishingDetector } from '../../../chrome-extension/src/utils/phishing-detector.js';

const THRESHOLD = 55;
const families = text => scoreMessage(text).familyHits.map(hit => hit.id);

describe('normalizeText', () => {
  test('strips diacritics, lowercases and collapses whitespace', () => {
    expect(normalizeText('  Código   de VERIFICAÇÃO  ')).toBe('codigo de verificacao');
  });

  test('removes apostrophes so "don\'t" becomes a single negator token', () => {
    expect(normalizeText('Don’t share')).toBe('dont share');
  });

  test('handles empty input', () => {
    expect(normalizeText(null)).toBe('');
  });
});

describe('accent-insensitive matching', () => {
  test('accented and unaccented spellings score the same', () => {
    const accented = scoreMessage('Me passa o código que chegou aí, é urgente');
    const plain = scoreMessage('me passa o codigo que chegou ai, e urgente');
    expect(accented.score).toBe(plain.score);
    expect(accented.score).toBeGreaterThanOrEqual(THRESHOLD);
  });
});

describe('word boundaries', () => {
  test('"shopping" does not match "pin"', () => {
    expect(findAffirmed(normalizeText('fui ao shopping, me manda o shopping list'), /\bpin\b/)).toBeNull();
    expect(scoreMessage('send me the shopping list please').familyHits).toEqual([]);
  });

  test('"pin" as a word is still a secret', () => {
    expect(families('send me your PIN')).toContain('share_code');
  });

  test('"codex" is not "code" and "pixel" is not "pix"', () => {
    expect(families('me passa o codex do jogo')).not.toContain('share_code');
    expect(scoreMessage('o pixel da camera queimou').cues.pixMention).toBeUndefined();
  });
});

describe('negation handling', () => {
  test('isNegatedAt sees a negator within the window before the match', () => {
    const text = normalizeText('Nao compartilhe este codigo');
    expect(isNegatedAt(text, text.indexOf('compartilhe'), text.indexOf('compartilhe') + 11)).toBe(true);
  });

  test('a comma or "but" starts a new clause', () => {
    const text = normalizeText('do not click, but pay now');
    expect(isNegatedAt(text, text.indexOf('pay'), text.indexOf('pay') + 3)).toBe(false);
  });

  test('trailing "a ninguem" negates the request', () => {
    const text = normalizeText('informe a senha a ninguem');
    expect(isNegatedAt(text, 0, 'informe a senha'.length)).toBe(true);
  });

  test.each([
    'Seu código é 482193. Não compartilhe este código com ninguém.',
    'Use 902117 para entrar. Nunca informe este codigo por telefone.',
    'Codigo 803344. Nao repasse, o banco nunca pede por mensagem.',
    'Nunca pedimos sua senha ou codigo.',
    'Your code is 112233. Never share this code with anyone.',
    'Do not share your password with anyone.'
  ])('OTP or bank notice stays below the threshold: %s', (text) => {
    const result = scoreMessage(text);
    expect(result.score).toBeLessThan(THRESHOLD);
    expect(result.familyHits.map(hit => hit.id)).not.toContain('share_code');
  });

  test('a negated span silences shorter patterns inside it', () => {
    expect(scoreMessage('O banco nao solicita instalação de aplicativos de acesso remoto.').cues.remoteAccess).toBeUndefined();
  });

  test('a code request is detected even when the message also contains "nao"', () => {
    const result = scoreMessage('Nao perde tempo. Me passa o codigo que chegou por SMS');
    expect(result.familyHits.map(hit => hit.id)).toContain('share_code');
  });
});

describe('pattern families', () => {
  test('lists every family id', () => {
    expect(SCAM_RULE_FAMILIES).toEqual(expect.arrayContaining([
      'identity_change_money', 'share_code', 'credential_data', 'pressure_payment', 'fake_bank_central',
      'job_task', 'investment', 'prize_fee', 'delivery_fee', 'romance_extortion', 'pix_pretext', 'fake_app'
    ]));
  });

  test.each([
    ['identity_change_money', 'Oi mae, troquei de numero. Faz um pix de 800 pra mim?'],
    ['identity_change_money', 'Mom, this is my new number. Can you send me 300 dollars today?'],
    ['share_code', 'Mandei um codigo pro seu celular sem querer, pode me passar?'],
    ['share_code', 'Please forward the verification code you just received'],
    ['credential_data', 'Atualize seus dados do cartao no link hoje: https://x.example.invalid'],
    ['pressure_payment', 'Ultimo aviso: pague a taxa ate hoje para evitar bloqueio'],
    ['fake_bank_central', 'Sou da central do banco, instale o app de acesso remoto para cancelar a compra'],
    ['fake_bank_central', 'Transfira o saldo para a conta segura que vou te passar'],
    ['job_task', 'Ganhe 300 por dia so curtindo videos, para liberar deposite 50'],
    ['job_task', 'Earn money: paid per like, 20 per task'],
    ['investment', 'Lucro garantido de 20% ao mes em bitcoin, sem risco'],
    ['investment', 'Seu saldo na plataforma esta liberado, pague a taxa de saque'],
    ['prize_fee', 'Voce ganhou um premio! Pague a taxa de envio de 19,90'],
    ['delivery_fee', 'Sua encomenda foi taxada, pague o imposto pelo link https://x.example.invalid'],
    ['romance_extortion', 'Gravei voce pela camera. Envie 2 mil ou eu vou vazar'],
    ['romance_extortion', 'meu amor, to preso no aeroporto, me manda 1500 reais'],
    ['pix_pretext', 'O pix caiu errado, consegue devolver pra essa outra chave?'],
    ['fake_app', 'Baixe o WhatsApp Gold no link https://x.example.invalid']
  ])('%s fires for: %s', (family, text) => {
    const result = scoreMessage(text);
    expect(result.familyHits.map(hit => hit.id)).toContain(family);
    expect(result.score).toBeGreaterThanOrEqual(THRESHOLD);
    expect(result.evidence.some(line => line.startsWith(`${family}:`))).toBe(true);
  });

  test.each([
    'Mae, troquei de numero. Te liguei agora pra confirmar, nao preciso de nada',
    'amor, transfere 100 pro gas? te passo de volta',
    'o boleto venceu ontem, paguei hoje com multa',
    'Seu pedido saiu para entrega. Nao ha valores a pagar.',
    'Vaga de vendedor com salario e comissao, mande o curriculo',
    'aquele cripto caiu 40%, ainda bem que nao entrei',
    'ganhei o sorteio do restaurante, fui buscar o voucher',
    'te amo, boa noite'
  ])('benign look-alike stays below the threshold: %s', (text) => {
    expect(scoreMessage(text).score).toBeLessThan(THRESHOLD);
  });

  test('isolated keywords no longer reach the threshold', () => {
    expect(scoreMessage('urgente').score).toBeLessThan(THRESHOLD);
    expect(scoreMessage('pix').score).toBeLessThan(THRESHOLD);
    expect(scoreMessage('banco').score).toBe(0);
  });

  test('a family is capped: repeating the lure does not add points', () => {
    const once = scoreMessage('me passa o codigo');
    const many = scoreMessage('me passa o codigo, me passa o codigo, me passa o codigo');
    expect(many.score).toBe(once.score);
  });
});

describe('suspicious links', () => {
  test('flags shorteners, IP hosts, punycode and .invalid domains', () => {
    const { findings } = analyzeLinks('a http://bit.ly/x b http://192.168.0.10/login c https://xn--bnco-0qa.com d https://a.example.invalid');
    expect(findings.join('|')).toMatch(/shortened link/);
    expect(findings.join('|')).toMatch(/raw IP address/);
    expect(findings.join('|')).toMatch(/punycode/);
    expect(findings.join('|')).toMatch(/\.invalid/);
  });

  test('flags link text that shows a different domain', () => {
    expect(analyzeLinks('[www.meubanco.com.br](https://evil.example.com/x)').findings.join('|')).toMatch(/link text .* points to evil\.example\.com/);
    expect(analyzeLinks('<a href="https://evil.example.com">meubanco.com.br</a>').findings.join('|')).toMatch(/points to evil/);
    expect(analyzeLinks('[meubanco.com.br](https://meubanco.com.br/x)').findings).toEqual([]);
  });

  test('flags lure words in hyphenated hosts', () => {
    expect(analyzeLinks('https://banco-seguro.example.com').findings.join('|')).toMatch(/lure-word/);
  });

  test('a suspicious link alone stays below the threshold', () => {
    expect(scoreMessage('olha isso http://bit.ly/abc').score).toBeLessThan(THRESHOLD);
  });

  test('ignores malformed URLs', () => {
    expect(analyzeLinks('http://[bad').findings).toEqual([]);
  });

  test('host names do not trigger word cues', () => {
    expect(scoreMessage('https://example.invalid/premio').context.educational).toBe(false);
  });
});

describe('discounts', () => {
  test('educational wording without a request lowers the score', () => {
    const result = scoreMessage('Exemplo de treinamento: mensagens com urgente e pix podem ser golpe');
    expect(result.context.educational).toBe(true);
    expect(result.score).toBeLessThan(25);
  });

  test('credential requests disable the educational discount', () => {
    const plain = scoreMessage('send your password now');
    const educational = scoreMessage('Example: send your password now');
    expect(educational.context.educational).toBe(true);
    expect(educational.score).toBe(plain.score);
  });
});

describe('quickDetect integration', () => {
  const detector = new PhishingDetector(null);

  test('keeps the public return shape', () => {
    const result = detector.quickDetect('Me passa o codigo de 6 digitos que chegou, urgente');
    expect(result).toEqual(expect.objectContaining({
      score: expect.any(Number),
      level: expect.any(String),
      matches: expect.any(Array),
      semanticSignals: expect.any(Array),
      suspiciousPhrases: expect.any(Array),
      context: { educational: false, negated: false }
    }));
    expect(result.level).toBe('MEDIUM');
    expect(result.matches[0]).toEqual(expect.objectContaining({ pattern: expect.any(String), severity: 'CRITICAL', category: 'credential' }));
    expect(result.semanticSignals).toEqual(expect.arrayContaining(['otp_request', 'credential_request', 'urgent_action']));
  });

  test('maps scores to levels', () => {
    expect(detector.quickDetect('bom dia').level).toBe('SAFE');
    expect(detector.quickDetect('Verify your account now, enter your password: http://bit.ly/x').level).toBe('HIGH');
  });

  test('returns an empty result for non-string input', () => {
    expect(detector.quickDetect(42)).toEqual(expect.objectContaining({ score: 0, level: 'SAFE', evidence: [] }));
  });
});

describe('awareness context (forwarded warnings)', () => {
  const warning = 'GENTE ATENÇÃO!! Está circulando um golpe: mandam mensagem dizendo que trocaram de número e pedem um pix urgente. Não caiam! Repassem pros grupos da família';

  test('a forwarded warning that describes scam wording stays below the threshold', () => {
    const result = scoreMessage(warning);
    expect(result.awareness).toBe(true);
    expect(result.score).toBeLessThan(THRESHOLD);
    expect(result.evidence.some(line => line.startsWith('awareness_context'))).toBe(true);
  });

  test('wording inside quotation marks is quoted, not asked', () => {
    const quoted = "Se alguém te mandar 'me passa o código que chegou no seu celular', é golpe, tá? Avisem os mais velhos";
    expect(scoreMessage(quoted).score).toBeLessThan(THRESHOLD);
    expect(scoreMessage(quoted).awareness).toBe(true);
  });

  test('describing ("eles pedem o código") differs from asking ("me manda o código")', () => {
    const described = 'Cuidado com o golpe: eles pedem pra você passar o código do SMS e depois clonam o zap. Repassem!';
    const asked = 'Cuidado com golpes! Para sua segurança, me manda o código que chegou por SMS agora';
    expect(scoreMessage(described).score).toBeLessThan(THRESHOLD);
    expect(scoreMessage(asked).score).toBeGreaterThanOrEqual(THRESHOLD);
    expect(scoreMessage(asked).awareness).toBe(false);
  });

  test('awareness wording does not hide a direct request with a link', () => {
    const disguised = 'ALERTA! Sua conta será excluída. Para evitar, ative a verificação pelo link https://seguranca-zap.example.invalid e digite o PIN';
    const result = scoreMessage(disguised);
    expect(result.awareness).toBe(false);
    expect(result.score).toBeGreaterThanOrEqual(THRESHOLD);
  });

  test('a lone weak marker ("cuidado") does not open awareness context', () => {
    const result = scoreMessage('Cuidado: pague agora a taxa de liberação da encomenda em https://taxa.example.invalid');
    expect(result.awareness).toBe(false);
    expect(result.score).toBeGreaterThanOrEqual(THRESHOLD);
  });

  test('negated advice still stays quiet ("nunca passe o código")', () => {
    expect(families('Nunca passe o código para ninguém, golpistas pedem isso.')).not.toContain('share_code');
  });
});

describe('legit payment chat and notices', () => {
  test.each([
    'Pix enviado! R$ 45 do churrasco, vê aí se caiu',
    'Já paguei o uber, te mandei o comprovante agora há pouco',
    'Racha da conta de ontem: 4 pessoas, total R$ 312. Fica R$ 78 cada, vou mandar o QR code do bar',
    'Pessoal, o boleto do streaming dividido vence sexta. Cada um paga R$ 14,90 pra mim por pix',
    'Mandei pix errado pra você agora há pouco, R$ 25, era pro Rafa. Pode me devolver quando puder? Obrigado!',
    'Assinamos o contrato ontem na imobiliária, o depósito caução foi de dois meses e consta no contrato. Já tenho o recibo'
  ])('receipt or shared bill stays low: %s', text => {
    expect(scoreMessage(text).score).toBeLessThan(THRESHOLD);
  });

  test('a due date alone is not pressure', () => {
    const reminder = 'Lembrete: sua fatura de energia vence dia 10. O valor é R$ 187,40. Você pode pagar pelo app da distribuidora ou no débito automático';
    expect(scoreMessage(reminder).score).toBeLessThan(THRESHOLD);
    expect(scoreMessage(reminder).cues.urgency).toBeUndefined();
  });

  test('"frete grátis" and "nada a pagar" are not a fee demand', () => {
    const notice = 'Sua compra foi despachada. O frete grátis já foi aplicado no pedido, nada a pagar na entrega';
    expect(scoreMessage(notice).score).toBeLessThan(THRESHOLD);
  });

  test('a PIX "mistake" refund request needs another signal to reach the threshold', () => {
    const plain = scoreMessage('Caiu um pix por engano na sua conta, pode devolver?');
    const pressured = scoreMessage('URGENTE: caiu um pix por engano na sua conta, devolva agora pela chave nova https://devolve.example.invalid');
    expect(plain.score).toBeLessThan(THRESHOLD);
    expect(pressured.score).toBeGreaterThanOrEqual(THRESHOLD);
  });

  test('"qr code" and "código de barras" are not secrets', () => {
    expect(scoreMessage('me manda o qr code do bar').cues.shareSecret).toBeUndefined();
    expect(scoreMessage('me manda o código de barras do boleto').cues.shareSecret).toBeUndefined();
    expect(scoreMessage('me manda o código do SMS').cues.shareSecret).toBeDefined();
  });
});

describe('families for the common miss categories', () => {
  test.each([
    ['media_bait', 'Olha essa foto sua que alguém postou 😳 https://fotos-album.example.invalid/ver'],
    ['pix_pretext', 'Fiz um novo QR code pra receber, o antigo foi bloqueado. Faz o pix nele que a conta mudou'],
    ['rental_deposit', 'Kitnet linda R$ 700. Quem pagar o sinal primeiro fica com ela, faço o contrato depois. Pix pra reservar'],
    ['job_task', 'Aprovado no processo seletivo! Efetue o pagamento da taxa de admissão em até 24h para não perder a vaga'],
    ['friend_money', 'Ei, vc pode me fazer um pix de 250 rapidinho? Meu cartão travou e preciso pagar uma coisa agora. Depois te explico'],
    ['fake_charity', 'Campanha urgente: criança de 4 anos precisa de cirurgia. Doe qualquer valor por pix na chave abaixo, cada real salva uma vida']
  ])('%s fires and reaches the threshold', (family, text) => {
    const result = scoreMessage(text);
    expect(families(text)).toContain(family);
    expect(result.score).toBeGreaterThanOrEqual(THRESHOLD);
    expect(result.evidence.some(line => line.startsWith(`${family}:`))).toBe(true);
  });

  test('legit lookalikes of those families stay low', () => {
    [
      'Vou pagar o aluguel na segunda por pix, o salário só cai no sábado. Tudo bem?',
      'Quem ainda não pagou a vaquinha do presente da professora? Falta só a Bia e o Léo, R$ 20 cada',
      'Consegue me fazer um pix de 50 até sexta? Meu salário cai dia 5 e aí eu te devolvo certinho',
      'Segue a foto sua do casamento que tirei ontem, ficou linda'
    ].forEach(text => expect(scoreMessage(text).score).toBeLessThan(THRESHOLD));
  });
});
