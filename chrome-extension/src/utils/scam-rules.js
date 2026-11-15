/**
 * Scam-pattern rules for the deterministic local scorer (PhishingDetector.quickDetect).
 *
 * Design:
 * - Text is normalized first: Unicode NFD, diacritics stripped, lowercase, apostrophes removed,
 *   whitespace collapsed. All patterns are written against this accent-free form and use word
 *   boundaries, so "codigo" matches "código" and "pin" does not match "shopping".
 * - Atomic cues (for example "asks to forward a code", "new phone number", "payment demand")
 *   are detected first. A cue occurrence is ignored when a negator ("nao", "nunca", "never",
 *   "ninguem", "nem", ...) appears within a few words before it in the same sentence, or when it
 *   is followed by "a ninguem", "with anyone" and similar. This lets bank notices such as
 *   "nao compartilhe este codigo" stay quiet while "me passa o codigo" still fires.
 * - Scores come from scam-pattern families that combine cues (identity change plus money request,
 *   urgency or threat plus payment, task job plus deposit, and so on). Each family is capped, and
 *   families are summed with diminishing weight so one noisy family cannot dominate.
 * - Every matched family produces a human-readable evidence string.
 */

const NEGATORS = new Set([
  'nao', 'nunca', 'jamais', 'nem', 'ninguem', 'nenhum', 'nenhuma',
  'never', 'not', 'dont', 'doesnt', 'wont', 'nobody', 'no one'
]);
const NEGATION_WINDOW_WORDS = 4;
const TRAILING_NEGATION = /^\W{0,3}(?:\S+\s+){0,2}(a|com|para|pra|to|with)\s+(ninguem|anyone|nobody|terceiros)\b/;

/**
 * Normalize text for matching: strip diacritics, lowercase, drop apostrophes, collapse spaces.
 */
export function normalizeText(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[’'`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * True when the match at [start, end) is negated by a nearby negator.
 */
export function isNegatedAt(normalized, start, end) {
  const sentenceStart = Math.max(
    normalized.lastIndexOf('.', start - 1),
    normalized.lastIndexOf('!', start - 1),
    normalized.lastIndexOf('?', start - 1),
    normalized.lastIndexOf(';', start - 1),
    normalized.lastIndexOf(':', start - 1)
  ) + 1;
  // A comma or a contrastive word ("mas", "but") starts a new clause, so "do not click, but pay"
  // still counts as a payment request.
  const clause = normalized.slice(sentenceStart, start).split(/,|\b(?:mas|but|porem|however)\b/).pop();
  const before = clause.split(/[^a-z0-9]+/).filter(Boolean);
  const window = before.slice(-NEGATION_WINDOW_WORDS);
  if (window.some(word => NEGATORS.has(word))) return true;
  return TRAILING_NEGATION.test(normalized.slice(end, end + 40));
}

/**
 * Find the first non-negated match of a single pattern. Returns the matched text or null.
 */
export function findAffirmed(normalized, pattern) {
  return findCue(normalized, [pattern], true);
}

// Shared building blocks (normalized, accent-free text).
const SECRET = '(codigos?|code|codes|token|otp|pin|senha|senhas|password|passcode|sms)';
const SHARE_VERB = '(me passa|me passe|passa|passe|passar|me manda|manda|mande|mandar|envia|envie|enviar|informe|informa|informar|informando|repasse|repassa|repassar|responda com|responder com|confirme|confirmar|digite|digitar|compartilhe|compartilhar|fala|diga|validar|valide|send|share|forward|tell me|give me|reply with|enter|type)';
const MONEY_NOUN = '(pix|dinheiro|reais|real|r\\$ ?\\d|\\d+(?:[.,]\\d+)? ?(?:mil|reais|k)\\b|\\d{2,}|transferencia|deposito|boleto|valor|grana|money|cash|usd|\\$\\d|gift ?cards?|carteira)';
const MONEY_VERB = '(faz|faca|fazer|manda|mande|mandar|me manda|envia|envie|enviar|transfere|transfira|transferir|deposite|deposita|depositar|pague|paga|pagar|empresta|emprestar|me empresta|consegue|pode|poderia|preciso de|send|transfer|pay|wire|lend)';

// Atomic cues. Each entry: [name, regex, negationAware].
const CUES = {
  newNumber: [
    /\b(troquei|mudei) (de|o) (numero|chip|celular|telefone)\b/,
    /\b(meu )?numero novo\b/, /\bnovo numero\b/, /\b(esse|este) (e|eh) (o )?meu numero\b/,
    /\bto com numero novo\b/, /\besse numero e novo\b/, /\bsalva (esse|este|meu) (numero|contato)\b/,
    /\bperdi (meu|o) (celular|telefone)\b/, /\b(celular|telefone) (emprestado|de um amigo)\b/,
    /\bclonaram (o|meu)\b/, /\bapaga o (antigo|outro)\b/,
    /\b(new|changed my) (phone )?number\b/, /\blost my phone\b/
  ],
  verifiedIdentity: [
    /\bte liguei\b/, /\bme liga\b/, /\bme liguem\b/, /\bpode me ligar\b/, /\bconfirm(ei|ar) (com|por) (a |o )?(mae|pai|ligacao)/,
    /\bnao (preciso|vou pedir) (de )?nada\b/, /\bcall me to confirm\b/
  ],
  moneyAsk: [
    new RegExp(`\\b${MONEY_VERB}\\b.{0,40}\\b${MONEY_NOUN}`),
    /\b(consegue|pode|poderia) (pagar|transferir|depositar)\b/,
    /\bpague uma coisa\b/, /\bpreciso (de um favor|que voce pague|q vc pague|que vc pague)\b/,
    /\bme (empresta|emprestar)\b/, /\bajuda com a passagem\b/,
    /\b(send|lend) me\b.{0,30}\b(money|\$|\d+)/
  ],
  shareSecret: [
    new RegExp(`\\b${SHARE_VERB}\\b.{0,50}\\b${SECRET}\\b`),
    new RegExp(`\\b${SECRET}\\b.{0,60}\\b(pode me passar|me passa|me passe|passa pra mim|me manda|manda pra mim|me envia|me envie|send it|forward it)\\b`),
    /\b(chegou|chegar|recebido|enviado|que te mandamos)\b.{0,30}\b(me passa|me passe|pode me passar)\b/,
    /\bcom a senha\b/
  ],
  dataRequest: [
    /\b(informe|informando|informar|confirme|confirmar|preencha|digite|atualize|recadastre|cadastre-se|cadastre se|regularize|valide|enter|confirm|update|verify)\b.{0,40}\b(dados|cpf|cartao|dados bancarios|chave pix|agencia|conta e senha|login|details|card|account)\b/,
    /\b(verify|confirm) (your )?account\b/, /\bverifi(que|car) (sua )?conta\b/,
    /\b(reset|update|verify|confirm|enter) (your )?password\b/, /\bpassword (needs|must)\b/,
    /\busando seu login\b/, /\bdados do cartao\b/
  ],
  urgency: [
    /\burgente\b/, /\burgencia\b/, /\bimediatamente\b/, /\bimediato\b/,
    /\b(ate|so|apenas|ainda) (hoje|hj)\b/, /\b(expira|expiram|expirar|vence|vencem)\b/, /\bvao expirar\b/,
    /\bultim[oa]s? (aviso|dia|chance|vagas|oportunidade)\b/, /\bprazo final\b/,
    /\bem (24|48|72|\d{1,2}) ?(h|horas|minutos|min)\b/, /\bantes que (seja tarde|expire)\b/,
    /\bvagas limitadas\b/, /\brapidinho\b/, /\bsem falta\b/, /\b(pra|para) nao perder\b/, /\bnao perca\b/,
    /\bacabando\b/, /\brelampago\b/, /\boutros \d+ interessados\b/, /\bnao desligue\b/,
    /\b(pague|pagar|transfira|faca|faz|deposite|regularize|resgate|ative) (agora|ja|hoje|hj)\b/,
    /\bagora (para|pra)\b/,
    /\burgent(ly)?\b/, /\bimmediately\b/, /\bact now\b/, /\btoday only\b/, /\blast chance\b/,
    /\bwithin \d+ hours\b/, /\bexpires?\b/, /\b(pay|send|transfer|enter|do it) .{0,25}\bnow\b/, /\bnow\b.{0,25}\b(pay|send|enter)\b/
  ],
  threat: [
    /\b(sera|vai ser|foi|esta|seja|ser) (bloquead[oa]|suspens[oa]|desativad[oa]|cancelad[oa]|excluid[oa]|apagad[oa]|devolvid[oa]|taxad[oa]|denunciad[oa]|retid[oa]|clonad[oa])\b/,
    /\b(bloqueio|suspensao|negativacao|serasa|destruicao|fianca|processo|violacao)\b/,
    /\b(compra|acesso) .{0,25}\b(bloquead[oa]|suspens[oa])\b/,
    /\bevitar (o |a )?(bloqueio|suspensao|devolucao|negativacao|multa|cancelamento)\b/,
    /\b(encomenda|premio|objeto) retid[oa]\b/, /\bretid[oa]\b/, /\bpendencia\b/, /\btaxa .{0,15}pendente\b/,
    /\b(account|conta)\b.{0,25}\b(suspended|blocked|locked|closed|desativad[ao]|suspens[ao]|bloquead[ao])\b/,
    /\b(suspended|locked|blocked)\b/
  ],
  paymentDemand: [
    /\b(pague|paga|pagar|pagamento|quite|quitar|deposite|deposita|depositar|deposito|transfira|transferencia|faca o pix|faz o pix|faz um pix|faca um pix|pix de|via pix|pelo pix|no pix|pay|payment|deposit|wire)\b/,
    /\btaxa\b/, /\bfee\b/, /\bfrete\b/, /\bcobranca\b/, /\bfianca\b/
  ],
  feeDemand: [
    /\b(pague|pagar|paga|deposite|depositar|pay)\b.{0,40}\b(taxa|frete|imposto|tarifa|kit|seguro|diferenca|emplacamento|ipva|cadastro|fee|tax|alfandega)\b/,
    /\b(taxa|frete|imposto|tarifa) (de|do|da|postal|de cadastro|de envio|de imposto)\b/,
    /\b(pague|pay) r\$ ?\d/, /\bso falta pagar\b/, /\bpague antecipado\b/, /\bpix antecipado\b/,
    /\bdeposite\b/, /\bdeposito\b/
  ],
  link: [
    /\b(clique|clica|clicar|click|acesse|acessar|baixe|baixar|download|ative em|tap)\b/, /\blink\b/
  ],
  authority: [
    /\b(banco|bank|central|gerente|agencia|analista|setor|suporte|support|equipe|atendimento|delegacia|policia|receita|governo|gov|correios|whatsapp|whats|zap|telegram|security team|administracao)\b/
  ],
  remoteAccess: [
    /\binstal\w* .{0,30}\b(app|aplicativo)s?\b.{0,20}\bacesso remoto\b/, /\bacesso remoto\b/, /\b(anydesk|teamviewer)\b/,
    /\bremote access\b/, /\bconta segura\b/, /\bsafe account\b/, /\bmotoboy\b/, /\bbuscar o cartao\b/,
    /\bcartao .{0,20}cortado\b/, /\bvalores esquecidos\b/
  ],
  bankPretext: [
    /\b(cartao|conta|token|chave pix|pix agendado|emprestimo|compra internacional|acesso ao app)\b.{0,60}\b(clonado|suspens[oa]|bloquead[oa]|desatualizad[oa]|excluid[oa]|identificamos|em seu nome|seja bloquead)/,
    /\bidentificamos (um|uma) (pix|emprestimo|compra|transferencia)\b/,
    /\bseu gerente esta de ferias\b/, /\bfalo da agencia\b/
  ],
  jobLure: [
    /\b(curtindo|curtir|dar likes?|likes no|seguir perfis|avaliar produtos|cada avaliacao|avaliacao de hoteis|assistir videos|tarefas? premium|tarefa \d|missao|renda extra|trabalho simples|meio periodo em casa|operador remoto|digitacao de documentos)\b/,
    /\b(ganhe|ganhar|paga|pago|recebe|receber)\b.{0,25}\b\d+\b.{0,15}\b(por|ao|a) (dia|semana|hora|tarefa|like|avaliacao)\b/,
    /\b(ganhe|ganhar) (de|ate)? ?\d+/, /\bemprestar (ela|sua conta|a conta)\b/, /\bpago por pix na hora\b/,
    /\b(paid|earn)\b.{0,20}\bper (like|review|task|day)\b/
  ],
  jobContext: [
    /\b(vaga|emprego|trampo|trabalho|salario|recrutador[a]?|selecionad[oa]|tarefa|tarefas|cadastro|home office|comissao)\b/
  ],
  investBait: [
    /\b(lucro|retorno|rendimento|ganhos?) (garantid[oa]|certo)\b/, /\bgarantia de lucro\b/, /\bsem risco\b/,
    /\b\d+ ?% (ao|por|a) (dia|mes|semana)\b/, /\bretorno de \d+ ?%/, /\bmultiplique\b/, /\bbonus de \d+ ?%/,
    /\binvista \d+.{0,30}\breceba\b/, /\breceba \d[\d.,]* em \d+ dias\b/, /\brobo de trade\b/, /\barbitragem\b/,
    /\bguaranteed (return|profit)s?\b/, /\b(no|zero) risk\b/
  ],
  investContext: [
    /\b(bitcoin|cripto|criptomoedas?|crypto|moeda nova|pre-venda|pre venda|exchanges?|corretora|plataforma|fundo|day trade|trade|mentor|mentoria|investimento|invista|saldo)\b/
  ],
  withdrawFee: [
    /\b(saque|sacar|saldo|liberar|liberacao|resgate)\b.{0,60}\b(taxa|imposto|tarifa|deposite)\b/,
    /\b(taxa|imposto|tarifa)\b.{0,60}\b(saque|sacar|liberar|liberacao)\b/
  ],
  prize: [
    /\b(voce )?(ganhou|foi (escolhid|selecionad|sorteado)\w*|acumulou)\b/, /\bpremio\b/, /\bsorteio\b/, /\bcashback\b/,
    /\bbonus\b/, /\bbrinde\b/, /\bresgat\w*\b/, /\bmilhas\b/, /\bpontos\b/, /\b(gratis|de graca)\b/, /\bganhe\b/,
    /\b(you )?(won|have won)\b/, /\bprize\b/, /\bfree\b/, /\bgift\b/
  ],
  promoBait: [
    /\b(promocao|oferta|desconto|liquidacao)\b/, /\bde \d+ por \d+/
  ],
  delivery: [
    /\b(encomenda|pacote|objeto|rastreio|alfandeg\w*|remetente|correios|entrega|entregador|logistica|kit)\b/
  ],
  romanceStory: [
    /\b(preso no aeroporto|aeroporto|militar|viuvo|plataforma de petroleo|em missao|cofre|dolares|despachante|nao posso ligar|unica em quem confio|achei seu perfil|te conhecer)\b/,
    /\b(stuck at the airport|military|widower|oil rig)\b/
  ],
  extortion: [
    /\b(gravei|gravamos|hackeei|vazar|vazo|nudes|fotos intimas|video intimo)\b/, /\bvai pro seu trabalho\b/,
    /\bsua (esposa|marido|familia) vai\b/, /\bsequestr\w*\b/, /\bfoi denunciad[oa]\b/, /\bdelegacia\b/,
    /\barquivar o processo\b/, /\bfica tudo entre nos\b/, /\bnao chame (a )?policia\b/,
    /\b(recorded you|intimate (photos|video)|kidnapped)\b/
  ],
  pixRedirect: [
    /\bpix\b.{0,40}\b(caiu errado|sem querer|por engano)\b/, /\b(sem querer|por engano)\b.{0,40}\bpix\b/,
    /\b(mudou|mudamos|nova|outra|essa nova|essa outra) (de )?chave( pix)?\b/, /\bchave aqui\b/,
    /\b(mandar|manda) de novo\b/, /\b(consegue|pode|poderia) devolver\b/, /\bdevolva\b/
  ],
  advanceSale: [
    /\b(pix|pagamento) antecipado\b/, /\bsinal de \d+/, /\bpague antecipado\b/, /\bseguro a data\b/
  ],
  fakeApp: [
    /\b(versao|whatsapp|whats) gold\b/, /\bquem (visitou|viu) seu perfil\b/, /\bselo verde\b/,
    /\bcompartilhe .{0,30}\bcom \d+ contatos\b/, /\bbaixe .{0,30}\b(apk|versao)\b/, /\bpassara a ser pago\b/
  ],
  pixMention: [/\bpix\b/],
  moneyAmount: [/(r\$ ?\d|\b\d+(?:[.,]\d+)? ?(mil|reais|k)\b)/],
  warning: [
    /\bpode ser golpe\b/, /\be golpe\b/, /\bcaiu num golpe\b/, /\bcaiu no golpe\b/, /\bdesconfie\b/, /\bcuidado com\b/,
    /\bnunca (pedimos|pediremos|pede|solicita)\b/, /\bnao (solicita|pede|pedimos|cobramos)\b/, /\bscam alert\b/,
    /\bphishing awareness\b/, /\bnever (share|ask)\b/, /\bdo not (click|share)\b/, /\bnao (clique|compartilhe|repasse)\b/,
    /\bnunca (compartilhe|informe)\b/, /\bse (alguem|nao foi voce)\b/
  ],
  educational: [
    /\b(exemplo|example|treinamento|training|educacional|awareness|simulacao|simulation)\b/
  ],
  officialChannel: [
    /\b(app|site|loja|canais?|numero) oficia(l|is)\b/, /\bpelo app (da|do) (loja|empresa|prefeitura)\b/
  ]
};

const SHORTENERS = /\b(bit\.ly|tinyurl\.com|t\.co|cutt\.ly|is\.gd|goo\.gl|ow\.ly|rebrand\.ly|shorturl\.at|encurtador\.com\.br|tiny\.cc|s\.id|t\.ly)\b/i;
const LURE_HOST_WORDS = /(seguro|segura|verific|login|token|pix|premio|resgate|estorno|recadastro|rastrei|alfandega|gold|quem-viu|att|banco|oferta|moeda|milhas|desbloque|liberacao)/;

/**
 * Inspect URLs in the raw text for structural red flags.
 */
export function analyzeLinks(rawText) {
  const text = String(rawText || '');
  const urls = text.match(/\b(?:https?:\/\/|www\.)[^\s<>"')\]]+/gi) || [];
  const findings = [];
  for (const url of urls) {
    let host = '';
    try {
      host = new URL(url.startsWith('www.') ? `http://${url}` : url).hostname.toLowerCase();
    } catch {
      continue;
    }
    if (SHORTENERS.test(host)) findings.push(`shortened link (${host})`);
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) findings.push(`raw IP address link (${host})`);
    if (host.split('.').some(label => label.startsWith('xn--'))) findings.push(`punycode domain (${host})`);
    if (host.endsWith('.invalid')) findings.push(`non-resolvable .invalid domain (${host})`);
    const firstLabel = host.split('.')[0] || '';
    if (firstLabel.includes('-') && LURE_HOST_WORDS.test(firstLabel)) findings.push(`lure-word hyphenated host (${host})`);
  }
  // Link text that shows one domain while pointing at another: [bank.com](http://evil) or <a href>.
  const anchorPatterns = [
    /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/gi,
    /<a\s[^>]*href=["'](https?:\/\/[^"']+)["'][^>]*>([^<]+)<\/a>/gi
  ];
  for (const [index, pattern] of anchorPatterns.entries()) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const label = index === 0 ? match[1] : match[2];
      const href = index === 0 ? match[2] : match[1];
      const shown = (label.match(/([a-z0-9-]+\.)+[a-z]{2,}/i) || [])[0];
      try {
        const target = new URL(href).hostname.toLowerCase();
        if (shown && !target.endsWith(shown.toLowerCase().replace(/^www\./, ''))) {
          findings.push(`link text ${shown} points to ${target}`);
        }
      } catch {
        // ignore malformed href
      }
    }
  }
  return { urls, findings: Array.from(new Set(findings)) };
}

const NEGATION_AWARE_CUES = new Set(['shareSecret', 'dataRequest', 'moneyAsk', 'paymentDemand', 'feeDemand', 'remoteAccess', 'link', 'newNumber']);

/**
 * Find the first affirmed occurrence of a cue across its patterns. A match that sits inside the
 * span of a negated match of the same cue is negated too, so "nao solicita instalacao de
 * aplicativos de acesso remoto" silences both the long and the short remote-access pattern.
 */
function findCue(normalized, patterns, negationAware) {
  const occurrences = [];
  for (const pattern of patterns) {
    const regex = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`);
    let match;
    while ((match = regex.exec(normalized)) !== null) {
      if (match[0].length === 0) {
        regex.lastIndex += 1;
        continue;
      }
      const start = match.index;
      const end = start + match[0].length;
      occurrences.push({ text: match[0], start, end, negated: negationAware && isNegatedAt(normalized, start, end) });
    }
  }
  const negatedSpans = occurrences.filter(occurrence => occurrence.negated);
  const affirmed = occurrences.find(occurrence => !occurrence.negated &&
    !negatedSpans.some(span => occurrence.start >= span.start && occurrence.end <= span.end));
  return affirmed ? affirmed.text : null;
}

function detectCues(normalized) {
  const found = {};
  for (const [name, patterns] of Object.entries(CUES)) {
    const hit = findCue(normalized, patterns, NEGATION_AWARE_CUES.has(name));
    if (hit) found[name] = hit.trim().slice(0, 60);
  }
  return found;
}

/**
 * Scam-pattern families. Each rule fires when all of its required cues are present.
 * Within a family only the strongest matching rule counts (the family cap).
 */
const FAMILIES = [
  {
    id: 'identity_change_money', signal: 'identity_change', category: 'payment', severity: 'CRITICAL',
    rules: [
      { when: c => c.newNumber && c.moneyAsk && !c.verifiedIdentity, points: 70, why: c => `new number ("${c.newNumber}") plus money request ("${c.moneyAsk}")` },
      { when: c => c.newNumber && c.moneyAsk, points: 45, why: c => `new number plus money request ("${c.moneyAsk}")` },
      { when: c => c.newNumber && c.urgency && !c.verifiedIdentity, points: 45, why: c => `new number plus urgency ("${c.urgency}")` }
    ]
  },
  {
    id: 'share_code', signal: 'otp_request', category: 'credential', severity: 'CRITICAL',
    rules: [
      { when: c => c.shareSecret, points: 65, why: c => `asks to share a code or password ("${c.shareSecret}")` }
    ]
  },
  {
    id: 'credential_data', signal: 'credential_request', category: 'credential', severity: 'CRITICAL',
    rules: [
      { when: c => c.dataRequest && (c.link || c.urgency || c.threat), points: 60, why: c => `asks for personal or bank data ("${c.dataRequest}") with a link, urgency or threat` },
      { when: c => c.dataRequest, points: 40, why: c => `asks for personal or bank data ("${c.dataRequest}")` }
    ]
  },
  {
    id: 'pressure_payment', signal: 'payment_request', category: 'payment', severity: 'WARNING',
    rules: [
      { when: c => (c.urgency || c.threat) && (c.feeDemand || c.paymentDemand) && c.link, points: 65, why: c => `urgency or threat plus payment ("${c.feeDemand || c.paymentDemand}") plus link` },
      { when: c => (c.urgency || c.threat) && c.feeDemand, points: 60, why: c => `urgency or threat plus fee demand ("${c.feeDemand}")` },
      { when: c => c.threat && c.paymentDemand, points: 55, why: c => `threat ("${c.threat}") plus payment ("${c.paymentDemand}")` },
      { when: c => c.urgency && c.paymentDemand, points: 55, why: c => `urgency ("${c.urgency}") plus payment ("${c.paymentDemand}")` },
      { when: c => (c.urgency || c.threat) && c.link && c.authority, points: 55, why: c => `urgency or threat from an authority ("${c.authority}") plus link` }
    ]
  },
  {
    id: 'fake_bank_central', signal: 'authority_impersonation', category: 'authority', severity: 'CRITICAL',
    rules: [
      { when: c => c.remoteAccess, points: 65, why: c => `fake bank procedure ("${c.remoteAccess}")` },
      { when: c => c.bankPretext && (c.dataRequest || c.link || c.shareSecret || c.urgency), points: 60, why: c => `bank pretext ("${c.bankPretext}") plus data request, link or urgency` },
      { when: c => c.bankPretext, points: 35, why: c => `bank pretext ("${c.bankPretext}")` }
    ]
  },
  {
    id: 'job_task', signal: 'job_scam', category: 'reward', severity: 'WARNING',
    rules: [
      { when: c => c.jobLure && (c.feeDemand || c.paymentDemand), points: 70, why: c => `paid task job ("${c.jobLure}") plus deposit or fee` },
      { when: c => c.jobLure, points: 55, why: c => `paid task or easy-money job offer ("${c.jobLure}")` },
      { when: c => c.jobContext && c.feeDemand, points: 60, why: c => `job offer that requires a fee ("${c.feeDemand}")` }
    ]
  },
  {
    id: 'investment', signal: 'investment_scam', category: 'reward', severity: 'WARNING',
    rules: [
      { when: c => c.investBait && (c.investContext || c.paymentDemand || c.urgency), points: 70, why: c => `guaranteed or high return ("${c.investBait}")` },
      { when: c => c.investBait, points: 55, why: c => `guaranteed or high return ("${c.investBait}")` },
      { when: c => c.withdrawFee && (c.investContext || c.prize), points: 65, why: c => `fee to withdraw a balance ("${c.withdrawFee}")` },
      { when: c => c.investContext && (c.paymentDemand || c.feeDemand) && (c.urgency || c.link), points: 55, why: c => `investment platform ("${c.investContext}") plus deposit and pressure` }
    ]
  },
  {
    id: 'prize_fee', signal: 'financial_reward', category: 'reward', severity: 'WARNING',
    rules: [
      { when: c => c.prize && (c.feeDemand || c.withdrawFee), points: 65, why: c => `prize ("${c.prize}") plus fee` },
      { when: c => c.prize && (c.shareSecret || c.dataRequest), points: 65, why: c => `prize ("${c.prize}") plus code or data request` },
      { when: c => c.prize && c.link && (c.urgency || c.paymentDemand || c.moneyAsk), points: 60, why: c => `prize ("${c.prize}") plus link and pressure` },
      { when: c => c.prize && (c.paymentDemand || c.link), points: 45, why: c => `prize ("${c.prize}") plus payment or link` },
      { when: c => c.promoBait && c.urgency && c.link, points: 55, why: c => `promotion with urgency and link ("${c.promoBait}")` }
    ]
  },
  {
    id: 'delivery_fee', signal: 'delivery_fee', category: 'payment', severity: 'WARNING',
    rules: [
      { when: c => c.delivery && (c.feeDemand || c.paymentDemand) && (c.link || c.urgency || c.threat), points: 70, why: c => `delivery ("${c.delivery}") plus fee and link or pressure` },
      { when: c => c.delivery && (c.feeDemand || c.paymentDemand), points: 60, why: c => `delivery ("${c.delivery}") plus fee or payment` },
      { when: c => c.delivery && (c.dataRequest || c.shareSecret), points: 60, why: c => `delivery ("${c.delivery}") plus data or code request` },
      { when: c => c.delivery && c.threat && (c.link || c.urgency), points: 55, why: c => `delivery ("${c.delivery}") plus threat and pressure` }
    ]
  },
  {
    id: 'romance_extortion', signal: 'romance_extortion', category: 'accountThreat', severity: 'CRITICAL',
    rules: [
      { when: c => c.extortion && (c.moneyAsk || c.paymentDemand || c.moneyAmount || c.urgency), points: 75, why: c => `threat or extortion ("${c.extortion}") plus money demand` },
      { when: c => c.romanceStory && (c.moneyAsk || c.paymentDemand || c.feeDemand), points: 65, why: c => `romance pretext ("${c.romanceStory}") plus money request` },
      { when: c => c.extortion, points: 45, why: c => `threat or extortion ("${c.extortion}")` },
      { when: c => c.romanceStory, points: 25, why: c => `romance pretext ("${c.romanceStory}")` }
    ]
  },
  {
    id: 'pix_pretext', signal: 'payment_request', category: 'payment', severity: 'WARNING',
    rules: [
      { when: c => c.pixRedirect && (c.moneyAsk || c.paymentDemand || c.pixMention), points: 65, why: c => `PIX refund or new key pretext ("${c.pixRedirect}")` },
      { when: c => c.advanceSale && (c.urgency || c.paymentDemand), points: 55, why: c => `advance payment demand ("${c.advanceSale}")` }
    ]
  },
  {
    id: 'fake_app', signal: 'account_threat', category: 'accountThreat', severity: 'WARNING',
    rules: [
      { when: c => c.fakeApp && (c.link || c.dataRequest || c.paymentDemand), points: 60, why: c => `fake feature or app bait ("${c.fakeApp}") plus link` },
      { when: c => c.authority && c.threat && (c.link || c.dataRequest), points: 55, why: c => `support or authority threat ("${c.threat}") plus link or data request` }
    ]
  }
];

const LINK_POINTS_CAP = 20;

/**
 * Score a message. Returns the quickDetect-compatible fields plus evidence.
 */
export function scoreMessage(rawText) {
  const normalized = normalizeText(rawText);
  // URLs become a neutral token so host names ("example", "premio") do not trigger word cues.
  const cues = detectCues(normalized.replace(/\b(?:https?:\/\/|www\.)\S+/g, ' link '));
  const linkInfo = analyzeLinks(rawText);
  const familyHits = [];

  for (const family of FAMILIES) {
    const rule = family.rules.find(candidate => candidate.when(cues));
    if (rule) familyHits.push({ family, points: rule.points, evidence: `${family.id}: ${rule.why(cues)}` });
  }
  familyHits.sort((a, b) => b.points - a.points);

  // Diminishing combination: strongest family in full, then half, then a quarter of the rest.
  let score = 0;
  familyHits.forEach((hit, index) => {
    score += index === 0 ? hit.points : index === 1 ? hit.points * 0.5 : hit.points * 0.25;
  });

  // Weak standalone signals only add a little and never reach the alert threshold alone.
  const weak = [];
  if (familyHits.length === 0) {
    if (cues.urgency) weak.push(['urgency', 10]);
    if (cues.threat) weak.push(['threat', 12]);
    if (cues.moneyAsk || cues.paymentDemand) weak.push(['money', 10]);
    if (cues.newNumber) weak.push(['new number', 15]);
    if (cues.prize) weak.push(['prize', 8]);
    if (cues.investContext) weak.push(['investment', 8]);
    score += weak.reduce((sum, [, points]) => sum + points, 0);
  }

  let linkPoints = 0;
  if (linkInfo.findings.length > 0) {
    const structural = linkInfo.findings.filter(finding => !finding.startsWith('non-resolvable')).length;
    linkPoints = Math.min(LINK_POINTS_CAP, structural * 10 + (linkInfo.findings.length - structural) * 5);
    // Suspicious links amplify an existing lure; alone they stay below the alert threshold.
    if (familyHits.length === 0) linkPoints = Math.min(linkPoints, 15);
    score += linkPoints;
  }

  const hardSignal = Boolean(cues.shareSecret || cues.dataRequest || cues.feeDemand || cues.remoteAccess ||
    familyHits.some(hit => ['share_code', 'credential_data', 'identity_change_money', 'pressure_payment'].includes(hit.family.id)));
  const educational = Boolean(cues.educational);
  const negated = Boolean(cues.warning);

  // Warning or educational wording lowers the score only when no un-negated credential, code
  // or fee request is present, so a lure cannot hide behind "exemplo" or "nunca compartilhe".
  if (!hardSignal) {
    if (educational) score -= 18;
    if (negated) score -= 20;
    if (cues.officialChannel) score -= 10;
  }

  score = Math.round(Math.max(0, Math.min(100, score)));

  return {
    score,
    normalized,
    cues,
    familyHits: familyHits.map(hit => ({ id: hit.family.id, points: hit.points, evidence: hit.evidence })),
    linkFindings: linkInfo.findings,
    weakSignals: weak.map(([name]) => name),
    context: { educational, negated },
    evidence: [
      ...familyHits.map(hit => hit.evidence),
      ...linkInfo.findings.map(finding => `suspicious_link: ${finding}`)
    ],
    matches: [
      ...familyHits.map(hit => ({ pattern: hit.evidence, severity: hit.family.severity, category: hit.family.category, family: hit.family.id })),
      ...linkInfo.findings.map(finding => ({ pattern: `suspicious_link: ${finding}`, severity: 'WARNING', category: 'linkAction', family: 'suspicious_link' }))
    ],
    semanticSignals: Array.from(new Set([
      ...familyHits.map(hit => hit.family.signal),
      ...(cues.shareSecret || cues.dataRequest ? ['credential_request'] : []),
      ...(cues.urgency ? ['urgent_action'] : []),
      ...(cues.threat ? ['account_threat'] : []),
      ...(cues.link ? ['link_action'] : []),
      ...(cues.paymentDemand || cues.moneyAsk ? ['payment_request'] : []),
      ...(linkInfo.findings.length > 0 ? ['suspicious_link'] : [])
    ]))
  };
}

export const SCAM_RULE_FAMILIES = Object.freeze(FAMILIES.map(family => family.id));
