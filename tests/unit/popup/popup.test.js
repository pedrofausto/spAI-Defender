function renderPopupDom() {
  document.body.innerHTML = `
    <div id="aiChip"><span id="statusIcon"></span><span id="aiStatus"></span></div><div id="tabContext"></div>
    <div id="progressLabel"></div><div id="progressValue"></div><div id="progressFill"></div>
    <section id="riskPanel"><span data-i18n="currentRisk"></span><strong id="riskScore"></strong><span id="riskLevel"></span>
      <strong id="classification"></strong><span id="analysisStatus"></span><p id="recommendation"></p>
      <div id="confidenceFill"></div><strong id="confidenceValue"></strong></section>
    ${['stepExtract','stepRisk','stepSentiment','stepSummary'].map(id=>`<div id="${id}"><span></span><div><strong></strong><small></small></div></div>`).join('')}
    <div id="metricAnalyses"></div><div id="metricMalicious"></div><div id="metricInconclusive"></div>
    <div id="metricAvgRisk"></div><div id="metricLatency"></div><div id="metricTrend"></div>
    <span id="evidenceCount"></span><div id="signalChips"></div><ul id="evidenceList"></ul>
    <div id="contentPlatform"></div><div id="contentLanguage"></div><div id="contentWords"></div>
    <div id="contentMessages"></div><div id="contentLinks"></div><div id="contentForms"></div>
    <p id="summaryContent"></p><div id="valenceValue"></div><div id="arousalValue"></div><div id="dominanceValue"></div>
    <div id="urgencyValue"></div><div id="manipulationValue"></div><div id="trustValue"></div>
    <div id="riskDistribution"></div><p id="historyStatus"></p><div id="chatHistoryList"></div><div id="dangerousChatList"></div><div id="chatInspector"></div><strong id="chatInspectorTitle"></strong><p id="chatInspectorStatus"></p><div id="chatInspectorCurrentRisk"></div><div id="chatInspectorHistoricalRisk"></div><div id="chatInspectorVisibleMessages"></div><div id="chatInspectorLinks"></div><div id="chatInspectorObservations"></div><div id="chatInspectorUpdatedAt"></div>
    <button id="reanalyzeBtn"></button><button id="moreBtn"></button><div id="moreMenu" hidden>
      <button id="extractBtn"></button><button id="customPromptBtn"></button><button id="technicalBtn"></button></div>
    <section id="promptSection" hidden><textarea id="promptInput"></textarea><button id="sendPromptBtn"></button><button id="cancelPromptBtn"></button></section>
    <section id="technicalSection" hidden><pre id="technicalContent"></pre><button id="closeTechnicalBtn"></button></section>
    <div id="notice" hidden></div>
    <span data-i18n="reanalyze"></span><span data-i18n="evidence"></span>
  `;
}

function setupChrome(responses = {}) {
  global.chrome = {
    tabs: { query: jest.fn().mockResolvedValue([{ id:7, title:'Secure Inbox', url:'https://web.whatsapp.com/' }]) },
    runtime: {
      lastError:null,
      sendMessage:jest.fn((message, callback) => {
        const response = typeof responses[message.type] === 'function'
          ? responses[message.type](message)
          : responses[message.type];
        callback(response || { success:false, error:'missing mock' });
      })
    }
  };
}

async function flushPipeline() {
  for (let index=0; index<16; index++) {
    await Promise.resolve();
    await new Promise(resolve=>setTimeout(resolve,0));
  }
}

async function importPopup() {
  jest.resetModules();
  await import('../../../chrome-extension/src/popup/popup.js');
  document.dispatchEvent(new Event('DOMContentLoaded'));
  await flushPipeline();
}

const dashboard = {
  available:true, period:{days:7,maxEvents:250},
  totals:{analyses:12,malicious:3,inconclusive:2,failed:1,highCritical:3},
  averages:{riskScore:37,confidence:78,latencyMs:1250},
  byRiskLevel:{LOW:7,HIGH:3,UNKNOWN:2}, byPlatform:{WHATSAPP:12},
  trend:{last24h:4,previous24h:2,delta:2}, recent:[]
};
const whatsappChats = [{ tabId:7, chatId:'finance', chatName:'Finance Team', severity:'high', maxRiskScore:92, historicalMaxRiskScore:92, historicalSeverity:'high', visibleMessages:3, links:1, observations:4, updatedAt:'2026-07-12T10:30:00.000Z' }];
const dangerousChats = [{ tabId:9, chatId:'payroll', chatName:'Payroll', severity:'medium', maxRiskScore:61, historicalMaxRiskScore:97, historicalSeverity:'high', visibleMessages:2, links:3, observations:7, updatedAt:'2026-07-11T09:15:00.000Z' }];

describe('enterprise popup', () => {
  beforeEach(() => {
    renderPopupDom();
    Object.defineProperty(global.navigator,'language',{value:'en-US',configurable:true});
    jest.spyOn(console,'error').mockImplementation(()=>{});
    jest.spyOn(console,'warn').mockImplementation(()=>{});
  });
  afterEach(()=>{jest.restoreAllMocks();document.body.innerHTML='';});

  test('runs extraction, risk, sentiment and summary automatically with progressive metrics', async () => {
    setupChrome({
      CHECK_AI_AVAILABILITY:{success:true,availability:'readily'},
      GET_THREAT_STATS:{success:true,stats:{total:3,today:1,recent:[],dashboard}},
      GET_WHATSAPP_CHAT_HISTORY:{success:true,chats:whatsappChats,recentChats:whatsappChats,dangerousChats},
      GET_PLATFORM_INFO:{success:true,platform:'WHATSAPP'},
      GET_LAST_WHATSAPP_SNAPSHOT:{success:true,snapshot:{tabId:7,chatId:'finance',chatName:'Finance Team',content:{title:'Chat',url:'https://web.whatsapp.com/',bodyText:'verify account now',stats:{wordCount:3,paragraphCount:1,linkCount:1}}}},
      FORCE_WHATSAPP_REANALYSIS:{success:true,queued:false,visibleMessages:3},
      GET_TAB_CONTENT:{success:true,content:{title:'Chat',url:'https://web.whatsapp.com/',bodyText:'verify account now',stats:{wordCount:3,paragraphCount:1,linkCount:1}}},
      DETECT_PHISHING:{success:true,analysis:{status:'VALID',classification:'PHISHING',riskLevel:'HIGH',riskScore:88,confidence:84,recommendation:'DANGEROUS',language:'en',semanticSignals:['credential_request'],evidence:['<img src=x onerror=alert(1)>']}},
      ANALYZE_SENTIMENT:{success:true,analysis:{valence:-0.5,arousal:0.8,dominance:0.2,urgencyLevel:'HIGH',manipulationDetected:true,trustworthiness:'LOW'}},
      SUMMARIZE_CONTENT:{success:true,summary:'<script>alert(1)</script> summary'}
    });
    await importPopup();

    expect(chrome.runtime.sendMessage.mock.calls.map(([message])=>message.type)).toEqual(expect.arrayContaining(['GET_TAB_CONTENT','DETECT_PHISHING','ANALYZE_SENTIMENT','SUMMARIZE_CONTENT']));
    expect(document.getElementById('riskScore').textContent).toBe('88');
    expect(document.getElementById('classification').textContent).toBe('Phishing');
    expect(document.getElementById('metricAnalyses').textContent).toBe('12');
    expect(document.getElementById('progressValue').textContent).toBe('100%');
    expect(document.getElementById('evidenceList').textContent).toContain('<img src=x onerror=alert(1)>');
    expect(document.getElementById('evidenceList').querySelector('img')).toBeNull();
    expect(document.getElementById('summaryContent').textContent).toContain('<script>alert(1)</script>');
    expect(document.getElementById('summaryContent').querySelector('script')).toBeNull();
    expect(document.getElementById('chatHistoryList').textContent).toContain('Finance Team');
    expect(document.getElementById('dangerousChatList').textContent).toContain('Payroll');
    expect(document.getElementById('chatInspectorTitle').textContent).toBe('Finance Team');
    expect(document.getElementById('chatInspectorStatus').textContent).toBe('Active chat');
  });

  test('uses Portuguese labels automatically and exposes unavailable metrics honestly', async () => {
    Object.defineProperty(global.navigator,'language',{value:'pt-BR',configurable:true});
    setupChrome({
      CHECK_AI_AVAILABILITY:{success:false},
      GET_THREAT_STATS:{success:true,stats:{dashboard:{available:false,error:'storage_corrupt'}}},
      GET_WHATSAPP_CHAT_HISTORY:{success:true,chats:[],recentChats:[],dangerousChats:[]},
      GET_PLATFORM_INFO:{success:true,platform:'WEB'},
      GET_TAB_CONTENT:{success:true,content:{title:'Página',url:'https://example.test',bodyText:'conteúdo',stats:{wordCount:1}}}
    });
    await importPopup();

    expect(document.querySelector('[data-i18n="currentRisk"]').textContent).toBe('Risco atual');
    expect(document.querySelector('[data-i18n="reanalyze"]').textContent).toBe('Reanalisar');
    expect(document.getElementById('classification').textContent).toBe('Inconclusivo');
    expect(document.getElementById('summaryContent').textContent).toBe('Análise local pendente.');
    expect(document.getElementById('metricAnalyses').textContent).toBe('--');
    expect(document.getElementById('analysisStatus').textContent).toBe('Inconclusivo');
    expect(chrome.runtime.sendMessage.mock.calls.map(([message])=>message.type)).not.toContain('DETECT_PHISHING');
    expect(document.getElementById('chatHistoryList').textContent).toContain('Nenhum chat recente');
  });

  test('forces WhatsApp visible reanalysis when the user clicks Reanalyze', async () => {
    setupChrome({
      CHECK_AI_AVAILABILITY:{success:true,availability:'readily'},
      GET_THREAT_STATS:{success:true,stats:{dashboard}},
      GET_WHATSAPP_CHAT_HISTORY:{success:true,chats:whatsappChats,recentChats:whatsappChats,dangerousChats},
      GET_PLATFORM_INFO:{success:true,platform:'WHATSAPP'},
      GET_LAST_WHATSAPP_SNAPSHOT:{success:true,snapshot:{tabId:7,chatId:'finance',chatName:'Finance Team',content:{title:'Chat',url:'https://web.whatsapp.com/',bodyText:'verify account now',stats:{wordCount:3,paragraphCount:1,linkCount:1}}}},
      FORCE_WHATSAPP_REANALYSIS:{success:true,queued:false,visibleMessages:4},
      GET_TAB_CONTENT:{success:true,content:{title:'Chat',url:'https://web.whatsapp.com/',bodyText:'verify account now',stats:{wordCount:3,paragraphCount:1,linkCount:1}}},
      DETECT_PHISHING:{success:true,analysis:{status:'VALID',classification:'SUSPICIOUS',riskLevel:'MEDIUM',riskScore:58,confidence:73,evidence:['asks for verification'],semanticSignals:['credential_request'],language:'en'}},
      ANALYZE_SENTIMENT:{success:true,analysis:{valence:-0.2,arousal:0.5,dominance:0.4}},
      SUMMARIZE_CONTENT:{success:true,summary:'Local summary'}
    });
    await importPopup();
    chrome.runtime.sendMessage.mockClear();

    document.getElementById('reanalyzeBtn').click();
    await flushPipeline();

    const sentTypes = chrome.runtime.sendMessage.mock.calls.map(([message])=>message.type);
    expect(sentTypes).toContain('FORCE_WHATSAPP_REANALYSIS');
    expect(sentTypes).toContain('GET_LAST_WHATSAPP_SNAPSHOT');
    expect(sentTypes).toContain('DETECT_PHISHING');
  });

  test('navigates dangerous and recent chats in the local history inspector', async () => {
    setupChrome({
      CHECK_AI_AVAILABILITY:{success:true,availability:'readily'},
      GET_THREAT_STATS:{success:true,stats:{dashboard}},
      GET_WHATSAPP_CHAT_HISTORY:{success:true,chats:whatsappChats,recentChats:whatsappChats,dangerousChats},
      GET_PLATFORM_INFO:{success:true,platform:'WHATSAPP'},
      GET_LAST_WHATSAPP_SNAPSHOT:{success:true,snapshot:{tabId:7,chatId:'finance',chatName:'Finance Team',content:{title:'Chat',url:'https://web.whatsapp.com/',bodyText:'verify account now',stats:{wordCount:3,paragraphCount:1,linkCount:1}}}},
      FORCE_WHATSAPP_REANALYSIS:{success:true,queued:false,visibleMessages:3},
      GET_TAB_CONTENT:{success:true,content:{title:'Chat',url:'https://web.whatsapp.com/',bodyText:'verify account now',stats:{wordCount:3,paragraphCount:1,linkCount:1}}},
      DETECT_PHISHING:{success:true,analysis:{status:'VALID',classification:'PHISHING',riskLevel:'HIGH',riskScore:88,confidence:84,language:'en',semanticSignals:['credential_request'],evidence:['asks for verification']}},
      ANALYZE_SENTIMENT:{success:true,analysis:{valence:-0.1,arousal:0.4,dominance:0.5}},
      SUMMARIZE_CONTENT:{success:true,summary:'Local summary'}
    });
    await importPopup();

    const dangerousButton = Array.from(document.querySelectorAll('#dangerousChatList .chat-history-item')).find(node => node.textContent.includes('Payroll'));
    dangerousButton.click();

    expect(document.getElementById('chatInspectorTitle').textContent).toBe('Payroll');
    expect(document.getElementById('chatInspectorStatus').textContent).toBe('Selected from local history');
    expect(document.getElementById('chatInspectorHistoricalRisk').textContent).toContain('97');
    expect(document.getElementById('chatInspectorVisibleMessages').textContent).toBe('2');
    expect(document.getElementById('chatInspectorObservations').textContent).toBe('7');
  });

  test('stays silent on sites other than WhatsApp Web and Telegram Web', async () => {
    setupChrome({
      CHECK_AI_AVAILABILITY:{success:true,availability:'readily'},
      GET_THREAT_STATS:{success:true,stats:{dashboard}},
      GET_WHATSAPP_CHAT_HISTORY:{success:true,chats:[],recentChats:[],dangerousChats:[]},
      GET_PLATFORM_INFO:{success:true,platform:'WEB'}
    });
    chrome.tabs.query.mockResolvedValue([{ id:3, title:'Example', url:'https://example.test/' }]);
    await importPopup();

    const sentTypes = chrome.runtime.sendMessage.mock.calls.map(([message])=>message.type);
    expect(sentTypes).not.toContain('GET_TAB_CONTENT');
    expect(sentTypes).not.toContain('DETECT_PHISHING');
    expect(document.getElementById('notice').hidden).toBe(true);
    expect(document.getElementById('notice').textContent).toBe('');
  });

  test('treats lookalike hosts and plain http as unsupported', async () => {
    setupChrome({
      CHECK_AI_AVAILABILITY:{success:true,availability:'readily'},
      GET_THREAT_STATS:{success:true,stats:{dashboard}},
      GET_WHATSAPP_CHAT_HISTORY:{success:true,chats:[],recentChats:[],dangerousChats:[]},
      GET_PLATFORM_INFO:{success:true,platform:'WEB'}
    });
    chrome.tabs.query.mockResolvedValue([{ id:3, title:'Fake', url:'http://web.whatsapp.com.example.test/' }]);
    await importPopup();

    const sentTypes = chrome.runtime.sendMessage.mock.calls.map(([message])=>message.type);
    expect(sentTypes).not.toContain('GET_TAB_CONTENT');
  });

  test('shows a localized coming-soon message on Telegram Web', async () => {
    setupChrome({
      CHECK_AI_AVAILABILITY:{success:true,availability:'readily'},
      GET_THREAT_STATS:{success:true,stats:{dashboard}},
      GET_WHATSAPP_CHAT_HISTORY:{success:true,chats:[],recentChats:[],dangerousChats:[]},
      GET_PLATFORM_INFO:{success:true,platform:'TELEGRAM'},
      GET_TAB_CONTENT:{success:false,error:'PLATFORM_NOT_READY'}
    });
    chrome.tabs.query.mockResolvedValue([{ id:4, title:'Telegram', url:'https://web.telegram.org/k/' }]);
    await importPopup();

    expect(document.getElementById('notice').textContent).toContain('Telegram Web support is coming soon');
    expect(document.getElementById('notice').textContent).not.toContain('PLATFORM_NOT_READY');
    expect(document.getElementById('stepExtract').dataset.state).toBe('failed');
  });

  test('shows the Telegram coming-soon message in Portuguese', async () => {
    Object.defineProperty(global.navigator,'language',{value:'pt-BR',configurable:true});
    setupChrome({
      CHECK_AI_AVAILABILITY:{success:true,availability:'readily'},
      GET_THREAT_STATS:{success:true,stats:{dashboard}},
      GET_WHATSAPP_CHAT_HISTORY:{success:true,chats:[],recentChats:[],dangerousChats:[]},
      GET_PLATFORM_INFO:{success:true,platform:'TELEGRAM'},
      GET_TAB_CONTENT:{success:false,error:'PLATFORM_NOT_READY'}
    });
    chrome.tabs.query.mockResolvedValue([{ id:4, title:'Telegram', url:'https://web.telegram.org/a/' }]);
    await importPopup();

    expect(document.getElementById('notice').textContent).toContain('Telegram Web chegará em breve');
  });

  test('keeps completed risk when sentiment and summary fail', async () => {
    setupChrome({
      CHECK_AI_AVAILABILITY:{success:true,availability:'readily'},
      GET_THREAT_STATS:{success:true,stats:{dashboard}},
      GET_WHATSAPP_CHAT_HISTORY:{success:true,chats:[],recentChats:[],dangerousChats:[]},
      GET_PLATFORM_INFO:{success:true,platform:'WEB'},
      GET_TAB_CONTENT:{success:true,content:{title:'Page',url:'https://example.test',bodyText:'normal content',stats:{wordCount:2}}},
      DETECT_PHISHING:{success:true,analysis:{status:'VALID',classification:'SAFE',riskLevel:'LOW',riskScore:4,confidence:75,evidence:[],semanticSignals:[]}},
      ANALYZE_SENTIMENT:{success:false,error:'sentiment failed'},
      SUMMARIZE_CONTENT:{success:false,error:'summary failed'}
    });
    await importPopup();

    expect(document.getElementById('riskScore').textContent).toBe('4');
    expect(document.getElementById('classification').textContent).toBe('Safe');
    expect(document.getElementById('stepSentiment').dataset.state).toBe('failed');
    expect(document.getElementById('stepSummary').dataset.state).toBe('failed');
    expect(document.getElementById('progressLabel').textContent).toBe('Analysis completed with partial results');
  });
});

