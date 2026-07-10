/**
 * Content script behavior tests
 */

function renderContentPage() {
  document.body.innerHTML = `
    <header>Header</header>
    <main>
      <h1 id="main-title">Security Awareness</h1>
      <p>Legitimate paragraph about urgent security training.</p>
      <p id="selectable">Selected content for analysis</p>
      <ul><li>First item</li><li>Second item</li></ul>
      <a href="https://external.test/path" title="External">External link</a>
      <img src="https://example.test/logo.png" alt="Logo">
      <table><tr><th>Name</th></tr><tr><td>Value</td></tr></table>
    </main>
    <footer>Footer</footer>
    <meta name="description" content="Test description">
  `;
  document.body.innerText = document.body.textContent;
  document.title = 'Content Test Page';
}

function setupContentChrome() {
  const listeners = { message: null };
  global.chrome = {
    runtime: {
      onMessage: { addListener: jest.fn((listener) => { listeners.message = listener; }) },
      sendMessage: jest.fn((message, callback) => {
        if (typeof callback === 'function') callback({ success: true });
        return Promise.resolve({ success: true, analysis: { riskScore: 10, riskLevel: 'LOW', redFlags: [] } });
      }),
      lastError: null
    }
  };
  return listeners;
}

async function importContentScript() {
  jest.resetModules();
  const listeners = setupContentChrome();
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  await import('../../../chrome-extension/src/content/content-script.js');
  document.dispatchEvent(new Event('DOMContentLoaded'));
  await new Promise(resolve => setTimeout(resolve, 0));
  return listeners;
}

function sendContentMessage(listener, request) {
  const responses = [];
  const keepAlive = listener(request, {}, (response) => responses.push(response));
  return { keepAlive, response: responses[0], responses };
}

describe('content script message handling', () => {
  beforeEach(() => {
    renderContentPage();
    Object.defineProperty(window, 'location', {
      value: new URL('https://example.test/page'),
      configurable: true
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    document.body.innerHTML = '';
  });

  test('registers message listener and extracts structured page content', async () => {
    const listeners = await importContentScript();

    const result = sendContentMessage(listeners.message, { type: 'EXTRACT_CONTENT' });

    expect(result.keepAlive).toBe(true);
    expect(result.response.success).toBe(true);
    expect(result.response.content).toMatchObject({
      url: 'https://example.test/page',
      title: 'Content Test Page'
    });
    expect(result.response.content.headings).toEqual([{ level: 1, text: 'Security Awareness', id: 'main-title' }]);
    expect(result.response.content.paragraphs).toContain('Legitimate paragraph about urgent security training.');
    expect(result.response.content.links[0]).toMatchObject({ text: 'External link', external: true });
    expect(result.response.content.tables[0].rows).toEqual([['Name'], ['Value']]);
  });

  test('extracts selection text with context and position', async () => {
    const listeners = await importContentScript();
    const range = document.createRange();
    const selected = document.getElementById('selectable').firstChild;
    range.setStart(selected, 0);
    range.setEnd(selected, 8);
    range.getBoundingClientRect = () => ({ top: 1, left: 2, width: 3, height: 4 });
    window.getSelection().removeAllRanges();
    window.getSelection().addRange(range);

    const result = sendContentMessage(listeners.message, { type: 'EXTRACT_SELECTION' });

    expect(result.response).toMatchObject({
      success: true,
      selection: {
        text: 'Selected',
        context: { tagName: 'P', className: '', id: 'selectable' },
        position: { top: 1, left: 2, width: 3, height: 4 }
      }
    });
  });

  test('starts and stops content monitoring through messages', async () => {
    const listeners = await importContentScript();

    expect(sendContentMessage(listeners.message, { type: 'START_MONITORING' }).response).toEqual({
      success: true,
      message: 'Content monitoring started'
    });
    expect(sendContentMessage(listeners.message, { type: 'START_MONITORING' }).response).toEqual({
      success: false,
      error: 'Monitoring already active'
    });
    expect(sendContentMessage(listeners.message, { type: 'STOP_MONITORING' }).response).toEqual({
      success: true,
      message: 'Content monitoring stopped'
    });
  });

  test('keeps the disabled security badge widget removed even when requested', async () => {
    const listeners = await importContentScript();

    const result = sendContentMessage(listeners.message, {
      type: 'SHOW_SECURITY_BADGE',
      data: { riskLevel: 'HIGH', riskScore: 90, indicators: ['<img src=x onerror=alert(1)>'] }
    });

    expect(result.response).toEqual({ success: true });
    expect(document.getElementById('spai-security-badge')).toBeNull();
  });

  test('returns page info and unknown message errors', async () => {
    const listeners = await importContentScript();

    expect(sendContentMessage(listeners.message, { type: 'GET_PAGE_INFO' }).response).toMatchObject({
      success: true,
      info: { url: 'https://example.test/page', title: 'Content Test Page' }
    });
    expect(sendContentMessage(listeners.message, { type: 'UNKNOWN' }).response).toEqual({ error: 'Unknown message type' });
  });

  test('extracts WhatsApp chat content from the main pane without sidebar messages', async () => {
    Object.defineProperty(window, 'location', {
      value: new URL('https://web.whatsapp.com/'),
      configurable: true
    });
    document.body.innerHTML = `
      <div id="pane-side">
        <div role="row"><span class="selectable-text"><span>Sidebar preview should not be exported</span></span></div>
      </div>
      <div id="main" role="main">
        <header><span dir="auto" title="Security Team">Security Team</span></header>
        <div role="row" data-id="m1"><div class="message-in"><span class="selectable-text"><span>Please verify your account now</span></span></div></div>
        <div role="row" data-id="m2"><div class="message-out"><span class="selectable-text"><span>I will check internally</span></span></div></div>
        <a href="https://example.test/login">Account portal</a>
      </div>
    `;
    document.body.innerText = document.body.textContent;
    document.title = 'WhatsApp';

    const listeners = await importContentScript();
    const result = sendContentMessage(listeners.message, { type: 'EXTRACT_CONTENT' });

    expect(result.response.success).toBe(true);
    expect(result.response.content.title).toBe('WhatsApp');
    expect(result.response.content.headings).toEqual([{ level: 1, text: 'Chat with Security Team' }]);
    expect(result.response.content.bodyText).toContain('Contact: Please verify your account now');
    expect(result.response.content.bodyText).toContain('You: I will check internally');
    expect(result.response.content.bodyText).not.toContain('Sidebar preview should not be exported');
    expect(result.response.content.links[0]).toMatchObject({ href: 'https://example.test/login' });
  });

  test('publishes WhatsApp snapshot only after debounce when chat changes', async () => {
    Object.defineProperty(window, 'location', {
      value: new URL('https://web.whatsapp.com/'),
      configurable: true
    });
    document.body.innerHTML = `
      <div id="main" role="main">
        <header><span dir="auto" title="Security Team">Security Team</span></header>
        <div role="row" data-id="m1"><div class="message-in"><span class="selectable-text"><span>Review this login</span></span></div></div>
      </div>
    `;
    document.body.innerText = document.body.textContent;

    await importContentScript();
    document.querySelector('#main').appendChild(document.createElement('div'));
    await new Promise(resolve => setTimeout(resolve, 650));

    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(expect.objectContaining({
      type: 'CONTENT_SCRIPT_READY',
      url: 'https://web.whatsapp.com/'
    }));
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(expect.objectContaining({
      type: 'WHATSAPP_CHAT_SNAPSHOT',
      data: expect.objectContaining({
        chatName: 'Security Team',
        content: expect.objectContaining({ bodyText: expect.stringContaining('Review this login') })
      })
    }));
  });
});


