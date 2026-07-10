/**
 * Popup behavior tests
 */

function renderPopupDom() {
  document.body.innerHTML = `
    <div id="statusIcon"></div>
    <div id="aiStatus"></div>
    <div id="tabTitle"></div>
    <div id="tabUrl"></div>
    <div id="riskScore"></div>
    <div id="threatsCount"></div>
    <div id="pagesCount"></div>
    <div id="riskFill"></div>
    <button id="extractBtn"></button>
    <button id="summarizeBtn" disabled></button>
    <button id="analyzeBtn" disabled></button>
    <button id="customPromptBtn" disabled></button>
    <button id="phishingScanBtn" disabled></button>
    <button id="sentimentBtn" disabled></button>
    <section id="promptSection" style="display:none"><textarea id="promptInput"></textarea></section>
    <button id="sendPromptBtn"></button>
    <button id="cancelPromptBtn"></button>
    <section id="resultsSection" style="display:none"><div id="resultsContent"></div></section>
    <button id="clearResultsBtn"></button>
    <div id="loadingOverlay" style="display:none"></div>
    <a id="helpLink" href="#"></a>
    <a id="aboutLink" href="#"></a>
    <section id="advancedMetrics" style="display:none">
      <button id="closeMetricsBtn"></button>
      <div id="valenceFill"></div><div id="valenceValue"></div>
      <div id="arousalFill"></div><div id="arousalValue"></div>
      <div id="dominanceFill"></div><div id="dominanceValue"></div>
      <div id="emotionalState"></div>
      <div id="lexiconScores"></div>
      <div id="anomaliesList"></div>
      <div id="confidenceScores"></div>
    </section>
  `;
}

function setupPopupChrome(responses = {}) {
  const tab = { id: 7, title: 'Example <b>Tab</b>', url: 'https://example.test/page' };
  global.chrome = {
    tabs: {
      query: jest.fn().mockResolvedValue([tab])
    },
    runtime: {
      lastError: null,
      sendMessage: jest.fn((message, callback) => {
        const response = responses[message.type] || { success: true };
        callback(response);
      })
    }
  };
  return { tab };
}

async function flushAsync() {
  await new Promise(resolve => setTimeout(resolve, 0));
  await Promise.resolve();
}

async function importPopup() {
  jest.resetModules();
  await import('../../../chrome-extension/src/popup/popup.js');
  document.dispatchEvent(new Event('DOMContentLoaded'));
  await flushAsync();
  await flushAsync();
}

describe('popup UI behavior', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    renderPopupDom();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    document.body.innerHTML = '';
  });

  test('initializes tab, AI status, threat dashboard, platform, and auto extraction', async () => {
    setupPopupChrome({
      CHECK_AI_AVAILABILITY: { success: true, availability: 'readily', hasSummarizationAPI: true },
      GET_THREAT_STATS: { success: true, stats: { total: 2, today: 1, recent: [{ riskLevel: 'HIGH' }] } },
      GET_PLATFORM_INFO: { success: true, platform: 'GENERIC' },
      GET_TAB_CONTENT: { success: true, content: { title: 'Page', bodyText: 'Body', url: 'https://example.test' } }
    });

    await importPopup();

    expect(document.getElementById('tabTitle').textContent).toBe('Example <b>Tab</b>');
    expect(document.getElementById('tabUrl').textContent).toBe('https://example.test/page');
    expect(document.getElementById('aiStatus').textContent).toBe('Available');
    expect(document.getElementById('summarizeBtn').disabled).toBe(false);
    expect(document.getElementById('threatsCount').textContent).toBe('1');
    expect(document.getElementById('riskScore').textContent).toBe('HIGH');
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(expect.objectContaining({ type: 'GET_TAB_CONTENT' }), expect.any(Function));
  });

  test('renders help/about/result content as text rather than HTML', async () => {
    setupPopupChrome({
      CHECK_AI_AVAILABILITY: { success: false },
      GET_THREAT_STATS: { success: true, stats: { total: 0, today: 0, recent: [] } },
      GET_PLATFORM_INFO: { success: true, platform: 'GENERIC' },
      GET_TAB_CONTENT: { success: true, content: { title: 'Unsafe', bodyText: '<img src=x onerror=alert(1)>', url: 'https://example.test' } }
    });

    await importPopup();
    document.getElementById('helpLink').click();

    const results = document.getElementById('resultsContent');
    expect(results.querySelector('strong')).toBeNull();
    expect(results.textContent).toContain('<strong>How to Use spAI-Defender:</strong>');

    document.getElementById('clearResultsBtn').click();
    expect(results.textContent).toBe('');
    expect(document.getElementById('resultsSection').style.display).toBe('none');
  });

  test('extract and phishing scan update results and advanced metrics safely', async () => {
    setupPopupChrome({
      CHECK_AI_AVAILABILITY: { success: true, availability: 'readily', hasSummarizationAPI: false },
      GET_THREAT_STATS: { success: true, stats: { total: 1, today: 1, recent: [{ riskLevel: 'HIGH' }] } },
      GET_PLATFORM_INFO: { success: true, platform: 'GENERIC' },
      GET_TAB_CONTENT: {
        success: true,
        content: {
          title: 'Login',
          url: 'https://example.test',
          bodyText: 'Verify account now',
          images: [{ src: 'https://example.test/logo.png' }],
          stats: { wordCount: 3 },
          meta: {}
        }
      },
      DETECT_PHISHING: {
        success: true,
        analysis: {
          riskLevel: 'HIGH',
          riskScore: 88,
          isPhishing: true,
          redFlags: ['<img src=x onerror=alert(1)>'],
          dominantFactors: ['credential'],
          recommendation: { action: 'AVOID' },
          details: { sentiment: { valence: -0.4, arousal: 0.8, dominance: 0.2, emotionalState: 'urgent' } },
          originalAnalysis: { sentiment: { dominantLexicons: ['urgency'], linguisticFeatures: { anomalies: ['all caps'] } } },
          breakdown: { sentiment: 60, phishing: 88, image: 0, linguistic: 40 }
        }
      }
    });

    await importPopup();
    document.getElementById('extractBtn').click();
    await flushAsync();

    expect(document.getElementById('resultsContent').textContent).toContain('Content Extracted');

    document.getElementById('phishingScanBtn').click();
    await flushAsync();

    expect(document.getElementById('riskScore').textContent).toBe('HIGH');
    expect(document.getElementById('advancedMetrics').style.display).toBe('block');
    expect(document.getElementById('resultsContent').querySelector('img')).toBeNull();
    expect(document.getElementById('resultsContent').textContent).toContain('<img src=x onerror=alert(1)>');
  });

  test('summarizes, analyzes, and sends custom prompt using extracted content', async () => {
    setupPopupChrome({
      CHECK_AI_AVAILABILITY: { success: true, availability: 'readily', hasSummarizationAPI: true },
      GET_THREAT_STATS: { success: true, stats: { total: 0, today: 0, recent: [] } },
      GET_PLATFORM_INFO: { success: true, platform: 'GENERIC' },
      GET_TAB_CONTENT: { success: true, content: { title: 'Report', url: 'https://example.test', bodyText: 'Body text for analysis', stats: {}, meta: {} } },
      SUMMARIZE_CONTENT: { success: true, summary: '<b>summary</b>' },
      ANALYZE_TAB_CONTENT: { success: true, analysis: '<script>alert(1)</script>analysis' }
    });

    await importPopup();

    document.getElementById('summarizeBtn').click();
    await flushAsync();
    expect(document.getElementById('resultsContent').textContent).toContain('<b>summary</b>');
    expect(document.getElementById('resultsContent').querySelector('b')).toBeNull();

    document.getElementById('analyzeBtn').click();
    await flushAsync();
    expect(document.getElementById('resultsContent').textContent).toContain('<script>alert(1)</script>analysis');
    expect(document.getElementById('resultsContent').querySelector('script')).toBeNull();

    document.getElementById('customPromptBtn').click();
    expect(document.getElementById('promptSection').style.display).toBe('block');
    document.getElementById('promptInput').value = 'Explain risk';
    document.getElementById('sendPromptBtn').click();
    await flushAsync();
    expect(document.getElementById('promptSection').style.display).toBe('none');
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(expect.objectContaining({ type: 'ANALYZE_TAB_CONTENT' }), expect.any(Function));
  });

  test('sentiment flow displays result safely and handles missing content errors', async () => {
    setupPopupChrome({
      CHECK_AI_AVAILABILITY: { success: true, availability: 'readily', hasSummarizationAPI: false },
      GET_THREAT_STATS: { success: true, stats: { total: 0, today: 0, recent: [] } },
      GET_PLATFORM_INFO: { success: true, platform: 'GENERIC' },
      GET_TAB_CONTENT: { success: false, error: 'No content script' },
      ANALYZE_SENTIMENT: {
        success: true,
        analysis: {
          sentiment: '<img src=x onerror=alert(1)>NEGATIVE',
          urgencyLevel: 'HIGH',
          manipulationDetected: true,
          emotionalTriggers: ['fear'],
          trustworthiness: 'CAUTION',
          recommendation: 'WARNING',
          valence: -0.5,
          arousal: 0.7,
          dominance: 0.2,
          emotionalState: 'pressured'
        }
      }
    });

    await importPopup();
    document.getElementById('summarizeBtn').click();
    await flushAsync();
    expect(document.getElementById('resultsContent').textContent).toContain('Please extract content first');

    document.getElementById('extractBtn').click();
    await flushAsync();
    expect(document.getElementById('resultsContent').textContent).toContain('No content script');
  });

  test('shows AI availability error states and closes advanced metrics', async () => {
    setupPopupChrome({
      CHECK_AI_AVAILABILITY: { success: true, availability: 'after-download', hasSummarizationAPI: false },
      GET_THREAT_STATS: { success: true, stats: { total: 1, today: 0, recent: [] } },
      GET_PLATFORM_INFO: { success: true, platform: 'GENERIC' },
      GET_TAB_CONTENT: { success: true, content: { title: 'Page', url: 'https://example.test', bodyText: 'content', stats: {}, meta: {} } }
    });

    await importPopup();

    expect(document.getElementById('aiStatus').textContent).toBe('Download Required');
    expect(document.getElementById('riskScore').textContent).toBe('MEDIUM');

    document.getElementById('advancedMetrics').style.display = 'block';
    document.getElementById('closeMetricsBtn').click();
    expect(document.getElementById('advancedMetrics').style.display).toBe('none');

    document.getElementById('aboutLink').click();
    expect(document.getElementById('resultsContent').textContent).toContain('<strong>spAI-Defender Tab Reader</strong>');
    expect(document.getElementById('resultsContent').querySelector('strong')).toBeNull();
  });
});

