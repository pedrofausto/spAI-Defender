const translations = {
  en: {
    currentRisk:'Current risk',confidence:'Confidence',extract:'Extract',risk:'Risk',language:'Language',summary:'Summary',
    analyses7d:'Analyses · 7d',malicious:'Malicious',inconclusive:'Inconclusive',avgRisk:'Avg. risk',
    avgLatency:'Avg. latency',trend24h:'24h trend',evidence:'Observed evidence',awaitingEvidence:'Awaiting validated evidence.',
    contentMetrics:'Content metrics',platform:'Platform',languageDetected:'Language',words:'Words',visibleMessages:'Visible messages',
    links:'Links',forms:'Forms',executiveSummary:'Executive summary',emotionalProfile:'Emotional profile',urgency:'Urgency',
    manipulation:'Manipulation',trust:'Trust',history:'Local history',reanalyze:'Reanalyze',extractAgain:'Extract again',
    customPrompt:'Custom prompt',technicalDetails:'Technical details',cancel:'Cancel',send:'Send',
    pending:'Pending',running:'Running',done:'Done',failed:'Failed',checking:'Checking',available:'Available',
    unavailable:'Unavailable',downloading:'Downloading',preparing:'Preparing local analysis',extracting:'Extracting visible content',
    analyzingRisk:'Analyzing phishing and scam risk',analyzingLanguage:'Analyzing emotional manipulation',
    summarizing:'Generating local summary',complete:'Local analysis complete',partial:'Analysis completed with partial results',
    noEvidence:'No validated malicious evidence was observed.',storageUnavailable:'Local metrics unavailable',
    aiUnavailable:'Gemini Nano is unavailable. Risk remains inconclusive.',noContent:'No analyzable content was extracted.',
    promptComplete:'Custom analysis completed.',yes:'Yes',no:'No',unknown:'Unknown',historyWindow:'days',localMetadataEvents:'local metadata events',recentChats:'Recent chats',dangerousChats:'Most dangerous chats',noRecentChats:'No recent WhatsApp chats yet.',noDangerousChats:'No dangerous WhatsApp chats yet.',highRisk:'High risk',mediumRisk:'Medium risk',visibleNow:'visible now',statusValid:'Valid',statusInconclusive:'Inconclusive',statusFailed:'Failed',classPhishing:'Phishing',classScam:'Scam',classSocialEngineering:'Social engineering',classSuspicious:'Suspicious',classSafe:'Safe',riskLow:'Low',riskMedium:'Medium',riskMediumHigh:'Medium high',riskHigh:'High',riskCritical:'Critical',platformWhatsApp:'WhatsApp',platformTelegram:'Telegram',platformGmail:'Gmail',platformOutlook:'Outlook',platformWeb:'Web',urgencyHigh:'High',urgencyMedium:'Medium',urgencyLow:'Low',trustLow:'Low',trustMedium:'Medium',trustHigh:'High',loadingCurrentTab:'Loading current tab...',awaitingAnalysis:'Awaiting analysis',localRecommendation:'Content remains local while Gemini Nano evaluates the active tab.',pendingLocalSummary:'Pending local analysis.',moreActions:'More actions',close:'Close',languageEnglish:'English',languagePortuguese:'Portuguese',chatInspector:'Selected chat',historicalPeak:'Historical peak',observations:'Observations',lastUpdated:'Last updated',noChatSelected:'Select a recent or dangerous chat to inspect its local metadata.',activeChat:'Active chat',selectedFromHistory:'Selected from local history',currentRiskHigh:'High',currentRiskMedium:'Medium',currentRiskLow:'Low',telegramNotReady:'Telegram Web support is coming soon. For now, spAI-Defender analyzes WhatsApp Web chats.'
  },
  'pt-BR': {
    currentRisk:'Risco atual',confidence:'Confiança',extract:'Extração',risk:'Risco',language:'Linguagem',summary:'Resumo',
    analyses7d:'Análises · 7d',malicious:'Maliciosos',inconclusive:'Inconclusivos',avgRisk:'Risco médio',
    avgLatency:'Latência média',trend24h:'Tendência 24h',evidence:'Evidências observadas',awaitingEvidence:'Aguardando evidências validadas.',
    contentMetrics:'Métricas do conteúdo',platform:'Plataforma',languageDetected:'Idioma',words:'Palavras',visibleMessages:'Mensagens visíveis',
    links:'Links',forms:'Formulários',executiveSummary:'Resumo executivo',emotionalProfile:'Perfil emocional',urgency:'Urgência',
    manipulation:'Manipulação',trust:'Confiança',history:'Histórico local',reanalyze:'Reanalisar',extractAgain:'Extrair novamente',
    customPrompt:'Prompt personalizado',technicalDetails:'Detalhes técnicos',cancel:'Cancelar',send:'Enviar',
    pending:'Pendente',running:'Executando',done:'Concluído',failed:'Falhou',checking:'Verificando',available:'Disponível',
    unavailable:'Indisponível',downloading:'Baixando',preparing:'Preparando análise local',extracting:'Extraindo conteúdo visível',
    analyzingRisk:'Analisando risco de phishing e golpe',analyzingLanguage:'Analisando manipulação emocional',
    summarizing:'Gerando resumo local',complete:'Análise local concluída',partial:'Análise concluída com resultados parciais',
    noEvidence:'Nenhuma evidência maliciosa validada foi observada.',storageUnavailable:'Métricas locais indisponíveis',
    aiUnavailable:'Gemini Nano indisponível. O risco permanece inconclusivo.',noContent:'Nenhum conteúdo analisável foi extraído.',
    promptComplete:'Análise personalizada concluída.',yes:'Sim',no:'Não',unknown:'Desconhecido',historyWindow:'dias',localMetadataEvents:'eventos locais de metadados',recentChats:'Chats recentes',dangerousChats:'Chats mais perigosos',noRecentChats:'Nenhum chat recente do WhatsApp ainda.',noDangerousChats:'Nenhum chat perigoso do WhatsApp ainda.',highRisk:'Alto risco',mediumRisk:'Risco médio',visibleNow:'visíveis agora',statusValid:'Válido',statusInconclusive:'Inconclusivo',statusFailed:'Falha',classPhishing:'Phishing',classScam:'Golpe',classSocialEngineering:'Engenharia social',classSuspicious:'Suspeito',classSafe:'Seguro',riskLow:'Baixo',riskMedium:'Médio',riskMediumHigh:'Médio-alto',riskHigh:'Alto',riskCritical:'Crítico',platformWhatsApp:'WhatsApp',platformTelegram:'Telegram',platformGmail:'Gmail',platformOutlook:'Outlook',platformWeb:'Web',urgencyHigh:'Alta',urgencyMedium:'Média',urgencyLow:'Baixa',trustLow:'Baixa',trustMedium:'Média',trustHigh:'Alta',loadingCurrentTab:'Carregando aba atual...',awaitingAnalysis:'Aguardando análise',localRecommendation:'O conteúdo permanece local enquanto o Gemini Nano avalia a aba ativa.',pendingLocalSummary:'Análise local pendente.',moreActions:'Mais ações',close:'Fechar',languageEnglish:'Inglês',languagePortuguese:'Português',chatInspector:'Chat selecionado',historicalPeak:'Pico histórico',observations:'Ocorrências',lastUpdated:'Última atualização',noChatSelected:'Selecione um chat recente ou perigoso para inspecionar os metadados locais.',activeChat:'Chat ativo',selectedFromHistory:'Selecionado do histórico local',currentRiskHigh:'Alto',currentRiskMedium:'Médio',currentRiskLow:'Baixo',telegramNotReady:'O suporte ao Telegram Web chegará em breve. Por enquanto, o spAI-Defender analisa conversas do WhatsApp Web.'
  }
};

const locale = String(navigator.language || 'en').toLowerCase().startsWith('pt') ? 'pt-BR' : 'en';
const t = key => translations[locale][key] || translations.en[key] || key;
const byId = id => document.getElementById(id);
const el = {
  aiChip:byId('aiChip'), statusIcon:byId('statusIcon'), aiStatus:byId('aiStatus'), tabContext:byId('tabContext'),
  progressLabel:byId('progressLabel'), progressValue:byId('progressValue'), progressFill:byId('progressFill'),
  riskPanel:byId('riskPanel'), riskScore:byId('riskScore'), riskLevel:byId('riskLevel'), classification:byId('classification'),
  analysisStatus:byId('analysisStatus'), recommendation:byId('recommendation'), confidenceFill:byId('confidenceFill'),
  confidenceValue:byId('confidenceValue'), evidenceCount:byId('evidenceCount'), signalChips:byId('signalChips'),
  evidenceList:byId('evidenceList'), summaryContent:byId('summaryContent'), notice:byId('notice'),
  contentPlatform:byId('contentPlatform'), contentLanguage:byId('contentLanguage'), contentWords:byId('contentWords'),
  contentMessages:byId('contentMessages'), contentLinks:byId('contentLinks'), contentForms:byId('contentForms'),
  valenceValue:byId('valenceValue'), arousalValue:byId('arousalValue'), dominanceValue:byId('dominanceValue'),
  urgencyValue:byId('urgencyValue'), manipulationValue:byId('manipulationValue'), trustValue:byId('trustValue'),
  metricAnalyses:byId('metricAnalyses'), metricMalicious:byId('metricMalicious'),
  metricInconclusive:byId('metricInconclusive'), metricAvgRisk:byId('metricAvgRisk'),
  metricLatency:byId('metricLatency'), metricTrend:byId('metricTrend'), riskDistribution:byId('riskDistribution'),
  historyStatus:byId('historyStatus'), chatHistoryList:byId('chatHistoryList'), dangerousChatList:byId('dangerousChatList'), chatInspector:byId('chatInspector'), chatInspectorTitle:byId('chatInspectorTitle'), chatInspectorStatus:byId('chatInspectorStatus'), chatInspectorCurrentRisk:byId('chatInspectorCurrentRisk'), chatInspectorHistoricalRisk:byId('chatInspectorHistoricalRisk'), chatInspectorVisibleMessages:byId('chatInspectorVisibleMessages'), chatInspectorLinks:byId('chatInspectorLinks'), chatInspectorObservations:byId('chatInspectorObservations'), chatInspectorUpdatedAt:byId('chatInspectorUpdatedAt'), reanalyzeBtn:byId('reanalyzeBtn'), moreBtn:byId('moreBtn'), moreMenu:byId('moreMenu'),
  extractBtn:byId('extractBtn'), customPromptBtn:byId('customPromptBtn'), technicalBtn:byId('technicalBtn'),
  promptSection:byId('promptSection'), promptInput:byId('promptInput'), sendPromptBtn:byId('sendPromptBtn'),
  cancelPromptBtn:byId('cancelPromptBtn'), technicalSection:byId('technicalSection'),
  technicalContent:byId('technicalContent'), closeTechnicalBtn:byId('closeTechnicalBtn')
};

let currentTab = null;
let currentPlatform = 'UNKNOWN';
let extractedContent = null;
let currentAnalysis = null;
let currentSentiment = null;
let currentSummary = '';
let threatStats = null;
let recentChats = [];
let dangerousChats = [];
let currentChatSnapshot = null;
let aiAvailable = false;
let selectedHistoryChatKey = null;
let running = false;

function setText(node, value) { if (node) node.textContent = value == null ? '' : String(value); }
function applyTranslations() {
  document.documentElement.lang = locale;
  document.querySelectorAll('[data-i18n]').forEach(node => setText(node, t(node.dataset.i18n)));
  setText(el.progressLabel, t('preparing'));
  setText(el.aiStatus, t('checking'));
  setText(el.tabContext, t('loadingCurrentTab'));
  setText(el.classification, t('awaitingAnalysis'));
  setText(el.recommendation, t('localRecommendation'));
  setText(el.summaryContent, t('pendingLocalSummary'));
  ['stepExtract','stepRisk','stepSentiment','stepSummary'].forEach(id => setText(byId(id)?.querySelector('small'), t('pending')));
  el.moreBtn?.setAttribute('aria-label', t('moreActions'));
  el.closeTechnicalBtn?.setAttribute('aria-label', t('close'));
}
function sendMessage(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, response => {
      if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
      else resolve(response || { success:false, error:'Empty response' });
    });
  });
}
function setProgress(percent, label) {
  const value = Math.max(0, Math.min(100, percent));
  el.progressFill.style.width = value + '%';
  setText(el.progressValue, value + '%');
  setText(el.progressLabel, label);
}
function setStep(id, state, detail) {
  const node = byId(id);
  node.dataset.state = state;
  setText(node.querySelector('small'), detail || t(state));
}
function resetPipeline() {
  ['stepExtract','stepRisk','stepSentiment','stepSummary'].forEach(id => setStep(id, 'pending', t('pending')));
  setProgress(0, t('preparing'));
}
function showNotice(message) {
  setText(el.notice, message);
  el.notice.hidden = !message;
}
function formatLatency(ms) {
  const value = Number(ms);
  if (!Number.isFinite(value)) return '--';
  return value < 1000 ? Math.round(value) + ' ms' : (value / 1000).toFixed(1) + ' s';
}
function localizeRiskLevel(level) {
  switch (String(level || '').toUpperCase()) {
    case 'LOW': return t('riskLow');
    case 'MEDIUM': return t('riskMedium');
    case 'MEDIUM_HIGH': return t('riskMediumHigh');
    case 'HIGH': return t('riskHigh');
    case 'CRITICAL': return t('riskCritical');
    default: return String(level || t('unknown'));
  }
}
function localizeClassification(value) {
  switch (String(value || '').toUpperCase()) {
    case 'PHISHING': return t('classPhishing');
    case 'SCAM': return t('classScam');
    case 'SOCIAL_ENGINEERING': return t('classSocialEngineering');
    case 'SUSPICIOUS': return t('classSuspicious');
    case 'SAFE': return t('classSafe');
    case 'INCONCLUSIVE': return t('statusInconclusive');
    default: return String(value || t('unknown'));
  }
}
function localizeStatus(value) {
  switch (String(value || '').toUpperCase()) {
    case 'VALID': return t('statusValid');
    case 'INCONCLUSIVE': return t('statusInconclusive');
    case 'FAILED': return t('statusFailed');
    default: return String(value || t('unknown'));
  }
}
function localizePlatform(value) {
  switch (String(value || '').toUpperCase()) {
    case 'WHATSAPP': return t('platformWhatsApp');
    case 'TELEGRAM': return t('platformTelegram');
    case 'GMAIL': return t('platformGmail');
    case 'OUTLOOK': return t('platformOutlook');
    case 'WEB': return t('platformWeb');
    case 'GENERIC': return t('platformWeb');
    default: return String(value || t('unknown'));
  }
}
function localizeSignal(value) {
  return String(value || '')
    .split(/[\_\s]+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}
function localizeLanguageCode(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized || normalized === 'unknown') return t('unknown');
  if (normalized.startsWith('pt')) return t('languagePortuguese');
  if (normalized.startsWith('en')) return t('languageEnglish');
  return String(value);
}
const UNSUPPORTED_PAGE_CODE = 'UNSUPPORTED_PAGE';
const PLATFORM_NOT_READY_CODE = 'PLATFORM_NOT_READY';
const WHATSAPP_REANALYSIS_TIMEOUT_MS = 5000;
const SUPPORTED_HOSTS = ['web.whatsapp.com', 'web.telegram.org'];
function isSupportedPageUrl(url) {
  try {
    const parsed = new URL(String(url || ''));
    return parsed.protocol === 'https:' && SUPPORTED_HOSTS.includes(parsed.hostname);
  } catch {
    return false;
  }
}
function friendlyErrorMessage(error) {
  // The toolbar action is disabled outside the supported hosts, so this code should not reach the user.
  if (error?.message === UNSUPPORTED_PAGE_CODE) return '';
  if (error?.message === PLATFORM_NOT_READY_CODE) return t('telegramNotReady');
  return error?.message || t('failed');
}
function isWhatsAppCurrentTab() {
  // A detected platform is authoritative. The URL is only a fallback while detection is unknown.
  if (currentPlatform !== 'UNKNOWN') return currentPlatform === 'WHATSAPP';
  return Boolean((currentTab?.url || '').includes('web.whatsapp.com'));
}
async function requestWhatsAppVisibleReanalysis() {
  if (!currentTab?.id || !isWhatsAppCurrentTab()) return;
  // Continue as soon as the service worker answers. The timeout only guards against a stalled response.
  let timerId = null;
  const timeout = new Promise(resolve => { timerId = setTimeout(resolve, WHATSAPP_REANALYSIS_TIMEOUT_MS); });
  try {
    await Promise.race([sendMessage({ type:'FORCE_WHATSAPP_REANALYSIS', tabId:currentTab.id }), timeout]);
  } catch {
  } finally {
    clearTimeout(timerId);
  }
}
function statusFromAvailability(status) {
  if (['readily','available'].includes(status)) return 'available';
  if (['downloading','downloadable','after-download'].includes(status)) return 'downloading';
  return status === 'error' ? 'error' : 'unavailable';
}
async function loadCurrentTab() {
  const [tab] = await chrome.tabs.query({ active:true, currentWindow:true });
  currentTab = tab || null;
  setText(el.tabContext, tab ? (tab.title || tab.url || 'Untitled') : t('unknown'));
}
async function checkAIAvailability() {
  try {
    const response = await sendMessage({ type:'CHECK_AI_AVAILABILITY' });
    const availability = response.success ? response.availability : 'unavailable';
    const state = statusFromAvailability(availability);
    el.aiChip.dataset.state = state;
    aiAvailable = ['available','downloading'].includes(state);
    setText(el.aiStatus, state === 'available' ? t('available') : state === 'downloading' ? t('downloading') : t('unavailable'));
  } catch {
    el.aiChip.dataset.state = 'error';
    setText(el.aiStatus, t('unavailable'));
    aiAvailable = false;
  }
}
async function detectPlatform() {
  if (!currentTab) return;
  try {
    const response = await sendMessage({ type:'GET_PLATFORM_INFO', url:currentTab.url || '' });
    if (response.success) currentPlatform = String(response.platform || 'UNKNOWN').toUpperCase();
  } catch { currentPlatform = 'UNKNOWN'; }
  setText(el.contentPlatform, localizePlatform(currentPlatform));
}
async function loadThreatStats() {
  try {
    const [statsResponse, chatResponse] = await Promise.all([
      sendMessage({ type:'GET_THREAT_STATS' }).catch(() => ({ success:false })),
      sendMessage({ type:'GET_WHATSAPP_CHAT_HISTORY' }).catch(() => ({ success:false, chats:[] }))
    ]);
    threatStats = statsResponse.success ? statsResponse.stats : null;
    recentChats = chatResponse.success ? (chatResponse.recentChats || chatResponse.chats || []) : [];
    dangerousChats = chatResponse.success ? (chatResponse.dangerousChats || []) : [];
  } catch {
    threatStats = null;
    recentChats = [];
    dangerousChats = [];
  }
  renderHistory();
}
function findActiveChatHistoryEntry() {
  if (!currentChatSnapshot || !currentTab) return null;
  const candidates = [...recentChats, ...dangerousChats];
  return candidates.find(chat =>
    (currentChatSnapshot.chatId && chat.chatId === currentChatSnapshot.chatId) ||
    (chat.tabId === currentTab.id && chat.chatName === currentChatSnapshot.chatName)
  ) || null;
}
function getChatHistoryEntryKey(chat = {}) {
  return [
    String(chat.tabId || ''),
    String(chat.chatId || ''),
    String(chat.chatName || '')
  ].join('::');
}
function getAllHistoryCandidates() {
  return [...recentChats, ...dangerousChats];
}
function getSelectedHistoryEntry() {
  if (!selectedHistoryChatKey) return null;
  return getAllHistoryCandidates().find(chat => getChatHistoryEntryKey(chat) === selectedHistoryChatKey) || null;
}
function localizeChatSeverity(value) {
  switch (String(value || '').toUpperCase()) {
    case 'CRITICAL': return t('riskCritical');
    case 'HIGH': return t('currentRiskHigh');
    case 'MEDIUM_HIGH': return t('riskMediumHigh');
    case 'MEDIUM': return t('currentRiskMedium');
    case 'LOW': return t('currentRiskLow');
    default: return localizeRiskLevel(value);
  }
}
function formatLocalTimestamp(value) {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  try {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: 'short',
      timeStyle: 'short'
    }).format(date);
  } catch {
    return date.toISOString();
  }
}function buildChatHistoryRows(chats = []) {
  return chats.slice(0, 10).map(chat => {
    const item = document.createElement('button');
    item.type = 'button';
    item.dataset.chatKey = getChatHistoryEntryKey(chat);
    const severity = String(chat.historicalSeverity || chat.severity || 'low').toLowerCase();
    item.className = 'chat-history-item';
    item.dataset.severity = severity;
    if (item.dataset.chatKey === selectedHistoryChatKey) item.classList.add('is-selected');
    const title = document.createElement('strong');
    title.textContent = chat.chatName || t('unknown');
    const meta = document.createElement('span');
    const severityLabel = severity === 'high'
      ? t('highRisk')
      : severity === 'medium'
        ? t('mediumRisk')
        : localizeRiskLevel(severity);
    const score = Number(chat.historicalMaxRiskScore ?? chat.maxRiskScore ?? 0);
    meta.textContent = `${severityLabel} · ${score} · ${Number(chat.visibleMessages || 0)} ${t('visibleNow')}`;
    item.append(title, meta);
    item.addEventListener('click', () => {
      selectedHistoryChatKey = item.dataset.chatKey;
      renderChatHistory();
    });
    return item;
  });
}
function renderChatHistory() {
  if (!el.chatHistoryList || !el.dangerousChatList) return;
  const activeEntry = findActiveChatHistoryEntry();
  if (!selectedHistoryChatKey && activeEntry) {
    selectedHistoryChatKey = getChatHistoryEntryKey(activeEntry);
  }
  if (selectedHistoryChatKey && !getAllHistoryCandidates().some(chat => getChatHistoryEntryKey(chat) === selectedHistoryChatKey)) {
    selectedHistoryChatKey = activeEntry ? getChatHistoryEntryKey(activeEntry) : null;
  }
  if (!Array.isArray(recentChats) || recentChats.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'detail-copy';
    empty.textContent = t('noRecentChats');
    el.chatHistoryList.replaceChildren(empty);
  } else {
    el.chatHistoryList.replaceChildren(...buildChatHistoryRows(recentChats));
  }
  if (!Array.isArray(dangerousChats) || dangerousChats.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'detail-copy';
    empty.textContent = t('noDangerousChats');
    el.dangerousChatList.replaceChildren(empty);
  } else {
    el.dangerousChatList.replaceChildren(...buildChatHistoryRows(dangerousChats));
  }
  renderChatInspector();
}
function renderChatInspector() {
  if (!el.chatInspector) return;
  const selectedEntry = getSelectedHistoryEntry();
  const activeEntry = findActiveChatHistoryEntry();
  const target = selectedEntry || activeEntry;
  if (!target) {
    setText(el.chatInspectorTitle, '--');
    setText(el.chatInspectorStatus, t('noChatSelected'));
    setText(el.chatInspectorCurrentRisk, '--');
    setText(el.chatInspectorHistoricalRisk, '--');
    setText(el.chatInspectorVisibleMessages, '--');
    setText(el.chatInspectorLinks, '--');
    setText(el.chatInspectorObservations, '--');
    setText(el.chatInspectorUpdatedAt, '--');
    return;
  }
  const isActive = Boolean(
    activeEntry &&
    getChatHistoryEntryKey(activeEntry) === getChatHistoryEntryKey(target)
  );
  setText(el.chatInspectorTitle, target.chatName || t('unknown'));
  setText(el.chatInspectorStatus, isActive ? t('activeChat') : t('selectedFromHistory'));
  setText(el.chatInspectorCurrentRisk, `${Number(target.maxRiskScore ?? 0)} · ${localizeChatSeverity(target.severity || 'UNKNOWN')}`);
  setText(el.chatInspectorHistoricalRisk, `${Number(target.historicalMaxRiskScore ?? target.maxRiskScore ?? 0)} · ${localizeChatSeverity(target.historicalSeverity || target.severity || 'UNKNOWN')}`);
  setText(el.chatInspectorVisibleMessages, Number(target.visibleMessages ?? 0));
  setText(el.chatInspectorLinks, Number(target.links ?? 0));
  setText(el.chatInspectorObservations, Number(target.observations ?? 0));
  setText(el.chatInspectorUpdatedAt, formatLocalTimestamp(target.updatedAt));
}function renderHistory() {
  const metrics = threatStats?.dashboard;
  if (!metrics?.available) {
    [el.metricAnalyses,el.metricMalicious,el.metricInconclusive,el.metricAvgRisk,el.metricLatency,el.metricTrend].forEach(n=>setText(n,'--'));
    setText(el.historyStatus, t('storageUnavailable'));
    el.riskDistribution.replaceChildren();
    renderChatHistory();
    return;
  }
  setText(el.metricAnalyses, metrics.totals.analyses);
  setText(el.metricMalicious, metrics.totals.malicious);
  setText(el.metricInconclusive, metrics.totals.inconclusive);
  setText(el.metricAvgRisk, metrics.averages.riskScore);
  setText(el.metricLatency, formatLatency(metrics.averages.latencyMs));
  const delta = metrics.trend.delta;
  setText(el.metricTrend, (delta > 0 ? '+' : '') + delta);
  const max = Math.max(1, ...Object.values(metrics.byRiskLevel || {}));
  const levels = ['LOW','MEDIUM','MEDIUM_HIGH','HIGH','CRITICAL','UNKNOWN'];
  const rows = levels.filter(level => metrics.byRiskLevel?.[level]).map(level => {
    const row=document.createElement('div'); row.className='distribution-row';
    const label=document.createElement('span'); label.textContent=localizeRiskLevel(level);
    const track=document.createElement('div'); track.className='distribution-track';
    const fill=document.createElement('div'); fill.className='distribution-fill';
    fill.style.width=(metrics.byRiskLevel[level]/max*100)+'%'; track.appendChild(fill);
    const count=document.createElement('strong'); count.textContent=String(metrics.byRiskLevel[level]);
    row.append(label,track,count); return row;
  });
  el.riskDistribution.replaceChildren(...rows);
  setText(el.historyStatus, `${metrics.period.days} ${t('historyWindow')} · max ${metrics.period.maxEvents} ${t('localMetadataEvents')}`);
  renderChatHistory();
}
async function extractContent({ preferSnapshot=true } = {}) {
  if (!currentTab) throw new Error(t('noContent'));
  if (!isSupportedPageUrl(currentTab.url)) throw new Error(UNSUPPORTED_PAGE_CODE);
  if ((currentTab.url || '').includes('web.whatsapp.com')) {
    try {
      const snapshot = await sendMessage({ type:'GET_LAST_WHATSAPP_SNAPSHOT' });
      if (snapshot.success && snapshot.snapshot?.tabId === currentTab.id) {
        currentChatSnapshot = snapshot.snapshot;
        if (preferSnapshot) return snapshot.snapshot.content;
      }
    } catch {}
  }
  const response = await sendMessage({ type:'GET_TAB_CONTENT', tabId:currentTab.id });
  if (response.error === UNSUPPORTED_PAGE_CODE || response.error === PLATFORM_NOT_READY_CODE) throw new Error(response.error);
  if (!response.success || !response.content) throw new Error(response.error || t('noContent'));
  return response.content;
}
function renderContentMetrics() {
  const stats = extractedContent?.stats || {};
  setText(el.contentPlatform, localizePlatform(currentPlatform));
  setText(el.contentWords, stats.wordCount ?? '--');
  setText(el.contentMessages, stats.paragraphCount ?? extractedContent?.paragraphs?.length ?? '--');
  setText(el.contentLinks, stats.linkCount ?? extractedContent?.links?.length ?? 0);
  setText(el.contentForms, stats.formCount ?? extractedContent?.forms?.length ?? 0);
}
function normalizeAnalysis(analysis={}) {
  const score = Number(analysis.finalRiskScore ?? analysis.riskScore);
  const classification = analysis.classification || (analysis.isPhishing ? 'PHISHING' : 'INCONCLUSIVE');
  const level = analysis.riskLevel || 'UNKNOWN';
  const status = analysis.status || (classification === 'INCONCLUSIVE' || level === 'UNKNOWN' ? 'INCONCLUSIVE' : 'VALID');
  return {
    raw:analysis, score:Number.isFinite(score)?Math.max(0,Math.min(100,Math.round(score))):0,
    classification, level, status, confidence:Math.max(0,Math.min(100,Math.round(Number(analysis.confidence)||0))),
    recommendation:typeof analysis.recommendation==='object' ? analysis.recommendation.action : analysis.recommendation,
    evidence:Array.isArray(analysis.evidence)?analysis.evidence:(Array.isArray(analysis.redFlags)?analysis.redFlags:[]),
    signals:Array.isArray(analysis.semanticSignals)?analysis.semanticSignals:(Array.isArray(analysis.dominantFactors)?analysis.dominantFactors:[]),
    language:analysis.language || 'unknown'
  };
}
function renderRisk(analysis) {
  const result=normalizeAnalysis(analysis);
  currentAnalysis=result;
  setText(el.riskScore,result.score); setText(el.riskLevel,localizeRiskLevel(result.level)); setText(el.classification,localizeClassification(result.classification));
  setText(el.analysisStatus,localizeStatus(result.status)); setText(el.recommendation,result.recommendation || t('noEvidence'));
  setText(el.confidenceValue,result.confidence+'%'); el.confidenceFill.style.width=result.confidence+'%';
  el.riskPanel.dataset.level=result.level.toLowerCase(); setText(el.contentLanguage,localizeLanguageCode(result.language));
  const chips=result.signals.map(signal=>{const node=document.createElement('span');node.className='signal-chip';node.textContent=localizeSignal(signal);return node;});
  el.signalChips.replaceChildren(...chips);
  const evidence=result.evidence.length?result.evidence:[t('noEvidence')];
  el.evidenceList.replaceChildren(...evidence.map(value=>{const node=document.createElement('li');node.textContent=String(value);return node;}));
  setText(el.evidenceCount,result.evidence.length);
}
function renderSentiment(analysis={}) {
  currentSentiment=analysis;
  setText(el.valenceValue, Number.isFinite(Number(analysis.valence))?Number(analysis.valence).toFixed(2):'--');
  setText(el.arousalValue, Number.isFinite(Number(analysis.arousal))?Number(analysis.arousal).toFixed(2):'--');
  setText(el.dominanceValue, Number.isFinite(Number(analysis.dominance))?Number(analysis.dominance).toFixed(2):'--');
  setText(el.urgencyValue, analysis.urgencyLevel ? localizeRiskLevel(analysis.urgencyLevel) : '--');
  const manipulated=analysis.manipulationDetected || Number(analysis.manipulationScore)>0.3;
  setText(el.manipulationValue, manipulated?t('yes'):t('no'));
  setText(el.trustValue, analysis.trustworthiness ? localizeRiskLevel(analysis.trustworthiness) : '--');
}
function updateTechnical() {
  const safe = { platform:currentPlatform, contentStats:extractedContent?.stats||{}, risk:currentAnalysis?.raw||null, sentiment:currentSentiment, summaryAvailable:Boolean(currentSummary) };
  setText(el.technicalContent, JSON.stringify(safe,null,2));
}
async function runFullAnalysis({ forceExtract=true }={}) {
  if (running) return;
  // Defensive no-op: the popup is only enabled on WhatsApp Web and Telegram Web.
  if (currentTab && !isSupportedPageUrl(currentTab.url)) return;
  running=true; el.reanalyzeBtn.disabled=true; showNotice(''); resetPipeline(); let partial=false;
  try {
    if (forceExtract && isWhatsAppCurrentTab()) {
      await requestWhatsAppVisibleReanalysis();
    }
    if (forceExtract || !extractedContent) {
      setStep('stepExtract','running',t('running')); setProgress(8,t('extracting'));
      try { extractedContent=await extractContent({ preferSnapshot: !forceExtract }); renderContentMetrics(); setStep('stepExtract','done',t('done')); }
      catch(error){setStep('stepExtract','failed',t('failed'));showNotice(friendlyErrorMessage(error));setProgress(100,t('partial'));return;}
    } else setStep('stepExtract','done',t('done'));
    if (!aiAvailable) {
      renderRisk({ status:'INCONCLUSIVE',classification:'INCONCLUSIVE',riskLevel:'UNKNOWN',confidence:0,recommendation:t('aiUnavailable') });
      ['stepRisk','stepSentiment','stepSummary'].forEach(id=>setStep(id,'failed',t('unavailable')));
      showNotice(t('aiUnavailable')); setProgress(100,t('partial')); return;
    }
    setStep('stepRisk','running',t('running')); setProgress(25,t('analyzingRisk'));
    try {
      const response=await sendMessage({type:'DETECT_PHISHING',data:{url:extractedContent.url||currentTab.url,content:extractedContent.bodyText||'',title:extractedContent.title||currentTab.title,images:[],platform:currentPlatform}});
      if(!response.success)throw new Error(response.error||t('failed'));renderRisk(response.analysis);setStep('stepRisk','done',t('done'));
    } catch(error){partial=true;renderRisk({status:'INCONCLUSIVE',classification:'INCONCLUSIVE',riskLevel:'UNKNOWN',recommendation:error.message});setStep('stepRisk','failed',t('failed'));}
    setStep('stepSentiment','running',t('running'));setProgress(55,t('analyzingLanguage'));
    try {
      const response=await sendMessage({type:'ANALYZE_SENTIMENT',data:{content:extractedContent.bodyText||'',url:extractedContent.url||currentTab.url}});
      if(!response.success)throw new Error(response.error||t('failed'));renderSentiment(response.analysis);setStep('stepSentiment','done',t('done'));
    } catch{partial=true;setStep('stepSentiment','failed',t('failed'));}
    setStep('stepSummary','running',t('running'));setProgress(78,t('summarizing'));
    try {
      const response=await sendMessage({type:'SUMMARIZE_CONTENT',data:{content:extractedContent.bodyText||'',maxLength:120}});
      if(!response.success)throw new Error(response.error||t('failed'));currentSummary=response.summary||'';setText(el.summaryContent,currentSummary);setStep('stepSummary','done',t('done'));
    } catch{partial=true;setText(el.summaryContent,t('failed'));setStep('stepSummary','failed',t('failed'));}
    await loadThreatStats(); updateTechnical(); setProgress(100,partial?t('partial'):t('complete'));
  } finally { running=false; el.reanalyzeBtn.disabled=false; }
}
function setupEvents() {
  el.reanalyzeBtn.addEventListener('click',()=>runFullAnalysis({forceExtract:true}));
  el.moreBtn.addEventListener('click',()=>{el.moreMenu.hidden=!el.moreMenu.hidden;el.moreBtn.setAttribute('aria-expanded',String(!el.moreMenu.hidden));});
  el.extractBtn.addEventListener('click',()=>{el.moreMenu.hidden=true;runFullAnalysis({forceExtract:true});});
  el.customPromptBtn.addEventListener('click',()=>{el.moreMenu.hidden=true;el.promptSection.hidden=false;el.promptInput.focus();});
  el.cancelPromptBtn.addEventListener('click',()=>{el.promptSection.hidden=true;});
  el.technicalBtn.addEventListener('click',()=>{el.moreMenu.hidden=true;updateTechnical();el.technicalSection.hidden=false;});
  el.closeTechnicalBtn.addEventListener('click',()=>{el.technicalSection.hidden=true;});
  el.sendPromptBtn.addEventListener('click',async()=>{
    const prompt=el.promptInput.value.trim();if(!prompt||!extractedContent)return;el.sendPromptBtn.disabled=true;
    try{const response=await sendMessage({type:'ANALYZE_TAB_CONTENT',data:{content:extractedContent.bodyText,url:extractedContent.url,title:extractedContent.title,prompt}});setText(el.technicalContent,response.analysis||response.error||'');el.technicalSection.hidden=false;el.promptSection.hidden=true;showNotice(t('promptComplete'));}
    finally{el.sendPromptBtn.disabled=false;}
  });
}
async function init() {
  applyTranslations(); setupEvents();
  await Promise.all([loadCurrentTab(),checkAIAvailability(),loadThreatStats()]);
  await detectPlatform();
  await runFullAnalysis({forceExtract:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();



