/**
 * Content script behavior tests
 */

function setTestUrl(url) {
  global.__jsdom.reconfigure({ url });
}

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
      id: 'test-extension-id',
      onMessage: { addListener: jest.fn((listener) => { listeners.message = listener; }) },
      sendMessage: jest.fn((message, callback) => {
        const response = global.__contentRuntimeResponder?.(message) ||
          { success: true, analysis: { riskScore: 10, riskLevel: 'LOW', redFlags: [] } };
        if (response && typeof response.then === 'function') {
          if (typeof callback === 'function') response.then(value => callback(value));
          return response;
        }
        if (typeof callback === 'function') callback(response);
        return Promise.resolve(response);
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
    delete window.__spaiDefenderContentScript;
    renderContentPage();
    setTestUrl('https://web.telegram.org/k/');
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete window.__spaiDefenderContentScript;
    document.body.innerHTML = '';
  });

  test('stays idle on Telegram Web: answers pings, reports not ready, and sends nothing', async () => {
    const listeners = await importContentScript();
    await new Promise(resolve => setTimeout(resolve, 50));

    const ping = sendContentMessage(listeners.message, { type: 'SPAI_PING' });
    expect(ping.keepAlive).toBe(true);
    expect(ping.response).toMatchObject({ success: true, ready: true });

    const extract = sendContentMessage(listeners.message, { type: 'EXTRACT_CONTENT' });
    expect(extract.response).toEqual({ success: false, error: 'PLATFORM_NOT_READY' });

    expect(chrome.runtime.sendMessage).not.toHaveBeenCalled();
    expect(document.querySelector('.spai-highlighted, .spai-image-container')).toBeNull();
    expect(console.error).not.toHaveBeenCalled();
  });

  test('does not respond to removed generic page messages', async () => {
    const listeners = await importContentScript();

    for (const type of ['EXTRACT_SELECTION', 'START_MONITORING', 'STOP_MONITORING', 'GET_PAGE_INFO']) {
      expect(sendContentMessage(listeners.message, { type }).response).toEqual({ error: 'Unknown message type' });
    }
  });

  test('ignores requests for the removed security badge widget', async () => {
    const listeners = await importContentScript();

    const result = sendContentMessage(listeners.message, {
      type: 'SHOW_SECURITY_BADGE',
      data: { riskLevel: 'HIGH', riskScore: 90, indicators: ['<img src=x onerror=alert(1)>'] }
    });

    expect(result.response).toEqual({ error: 'Unknown message type' });
    expect(document.getElementById('spai-security-badge')).toBeNull();
  });

  test('returns an error for unknown message types', async () => {
    const listeners = await importContentScript();

    expect(sendContentMessage(listeners.message, { type: 'UNKNOWN' }).response).toEqual({ error: 'Unknown message type' });
  });

  test('extracts WhatsApp chat content from the main pane without sidebar messages', async () => {
    setTestUrl('https://web.whatsapp.com/');
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

  test('extracts only visible WhatsApp messages from the main pane', async () => {
    setTestUrl('https://web.whatsapp.com/');
    document.body.innerHTML = `
      <div id="main" role="main">
        <header><span dir="auto" title="Security Team">Security Team</span></header>
        <div role="row" data-id="old"><div class="message-in"><span class="selectable-text"><span>Old hidden history message</span></span></div></div>
        <div role="row" data-id="visible"><div class="message-in"><span class="selectable-text"><span>Visible current message</span></span></div></div>
        <div role="row" data-id="future"><div class="message-out"><span class="selectable-text"><span>Below viewport message</span></span></div></div>
      </div>
    `;
    document.body.innerText = document.body.textContent;
    document.title = 'WhatsApp';

    document.querySelector('#main').getBoundingClientRect = () => ({ top: 0, bottom: 500, left: 0, right: 800, width: 800, height: 500 });
    document.querySelector('[data-id="old"]').getBoundingClientRect = () => ({ top: -240, bottom: -120, left: 0, right: 700, width: 700, height: 120 });
    document.querySelector('[data-id="visible"]').getBoundingClientRect = () => ({ top: 120, bottom: 220, left: 0, right: 700, width: 700, height: 100 });
    document.querySelector('[data-id="future"]').getBoundingClientRect = () => ({ top: 620, bottom: 740, left: 0, right: 700, width: 700, height: 120 });

    const listeners = await importContentScript();
    const result = sendContentMessage(listeners.message, { type: 'EXTRACT_CONTENT' });

    expect(result.response.success).toBe(true);
    expect(result.response.content.bodyText).toContain('Visible current message');
    expect(result.response.content.bodyText).not.toContain('Old hidden history message');
    expect(result.response.content.bodyText).not.toContain('Below viewport message');
    expect(result.response.content.stats.paragraphCount).toBe(1);
  });
  test('reanalyzes newly visible WhatsApp messages after scroll changes the viewport', async () => {
    setTestUrl('https://web.whatsapp.com/');
    document.body.innerHTML = `
      <div id="main" role="main">
        <header><span dir="auto" title="Security Team">Security Team</span></header>
        <div role="row" data-id="visible"><div class="message-in"><span class="selectable-text"><span>Visible current message</span></span></div></div>
        <div role="row" data-id="future"><div class="message-out"><span class="selectable-text"><span>Future suspicious message</span></span></div></div>
      </div>
    `;
    document.body.innerText = document.body.textContent;
    document.title = 'WhatsApp';

    const main = document.querySelector('#main');
    const visible = document.querySelector('[data-id="visible"]');
    const future = document.querySelector('[data-id="future"]');
    main.getBoundingClientRect = () => ({ top: 0, bottom: 500, left: 0, right: 800, width: 800, height: 500 });
    visible.getBoundingClientRect = () => ({ top: 120, bottom: 220, left: 0, right: 700, width: 700, height: 100 });
    future.getBoundingClientRect = () => ({ top: 620, bottom: 720, left: 0, right: 700, width: 700, height: 100 });

    global.__contentRuntimeResponder = message => {
      if (message.type !== 'DETECT_PHISHING') return { success: true };
      return {
        success: true,
        analysis: message.data.content.includes('Future')
          ? { status: 'VALID', classification: 'SUSPICIOUS', riskLevel: 'MEDIUM', riskScore: 55, confidence: 74 }
          : { status: 'VALID', classification: 'SAFE', riskLevel: 'LOW', riskScore: 5, confidence: 90 }
      };
    };

    await importContentScript();
    await new Promise(resolve => setTimeout(resolve, 1200));
    expect(chrome.runtime.sendMessage.mock.calls.filter(([message]) => message.type === 'DETECT_PHISHING' && message.data?.content)).toHaveLength(1);

    future.getBoundingClientRect = () => ({ top: 140, bottom: 240, left: 0, right: 700, width: 700, height: 100 });
    visible.getBoundingClientRect = () => ({ top: -180, bottom: -80, left: 0, right: 700, width: 700, height: 100 });
    main.dispatchEvent(new Event('scroll'));
    await new Promise(resolve => setTimeout(resolve, 1400));

    const phishingCalls = chrome.runtime.sendMessage.mock.calls.filter(([message]) => message.type === 'DETECT_PHISHING' && message.data?.content);
    expect(phishingCalls).toHaveLength(2);
    expect(phishingCalls[1][0].data.content).toContain('Future suspicious message');
    expect(document.querySelector('[data-id="future"]').querySelector('.spai-suspicious-message')).not.toBeNull();
    delete global.__contentRuntimeResponder;
  });

  test('publishes WhatsApp snapshot only after debounce when chat changes', async () => {
    setTestUrl('https://web.whatsapp.com/');
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

    expect(chrome.runtime.sendMessage).not.toHaveBeenCalledWith(expect.objectContaining({
      type: 'CONTENT_SCRIPT_READY'
    }));
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(expect.objectContaining({
      type: 'WHATSAPP_CHAT_SNAPSHOT',
      data: expect.objectContaining({
        chatName: 'Security Team',
        content: expect.objectContaining({ bodyText: expect.stringContaining('Review this login') })
      })
    }));
  });


  test('stops runtime messaging after the extension context is invalidated', async () => {
    setTestUrl('https://web.whatsapp.com/');
    document.body.innerHTML = `<div id="main" role="main"><header><span dir="auto" title="Security Team">Security Team</span></header><div role="row" data-id="m1"><div class="message-in"><span class="selectable-text"><span>Review this login</span></span></div></div></div>`;
    document.body.innerText = document.body.textContent;

    await importContentScript();
    chrome.runtime.sendMessage.mockRejectedValue(new Error('Extension context invalidated.'));
    document.querySelector('#main').appendChild(document.createElement('div'));
    await new Promise(resolve => setTimeout(resolve, 650));
    const callsAfterInvalidation = chrome.runtime.sendMessage.mock.calls.length;

    document.querySelector('#main').appendChild(document.createElement('div'));
    await new Promise(resolve => setTimeout(resolve, 650));

    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(expect.objectContaining({ type: 'WHATSAPP_CHAT_SNAPSHOT' }));
    expect(chrome.runtime.sendMessage).toHaveBeenCalledTimes(callsAfterInvalidation);
    expect(console.error).not.toHaveBeenCalledWith(expect.stringContaining('publishWhatsAppSnapshot'), expect.anything());
  });


  test('outlines only validated malicious WhatsApp bubbles without styling message text', async () => {
    setTestUrl('https://web.whatsapp.com/');
    document.body.innerHTML = `
      <div id="main" role="main">
        <header><span dir="auto" title="Security Team">Security Team</span></header>
        <div role="row" data-id="malicious"><div class="message-in"><div class="copyable-text" data-pre-plain-text="[10:00] Attacker:"><span class="selectable-text"><span id="maliciousText">Verify your account now</span></span></div></div></div>
        <div role="row" data-id="benign"><div class="message-in"><div class="copyable-text" data-pre-plain-text="[10:01] Friend:"><span class="selectable-text"><span id="benignText">Lunch at noon</span></span></div></div></div>
      </div>
    `;
    document.body.innerText = document.body.textContent;
    global.__contentRuntimeResponder = message => {
      if (message.type !== 'DETECT_PHISHING') return { success: true };
      const malicious = message.data.content.includes('Verify');
      return {
        success: true,
        analysis: malicious
          ? { status: 'VALID', classification: 'PHISHING', riskLevel: 'HIGH', riskScore: 91, confidence: 88 }
          : { status: 'VALID', classification: 'SAFE', riskLevel: 'LOW', riskScore: 2, confidence: 90 }
      };
    };

    await importContentScript();
    await new Promise(resolve => setTimeout(resolve, 1200));

    const maliciousBubble = document.querySelector('[data-id="malicious"] .message-in');
    const benignBubble = document.querySelector('[data-id="benign"] .message-in');
    expect(maliciousBubble.classList.contains('spai-malicious-message')).toBe(true);
    expect(benignBubble.classList.contains('spai-malicious-message')).toBe(false);
    expect(document.getElementById('maliciousText').classList.contains('spai-highlighted-text')).toBe(false);
    expect(document.getElementById('maliciousText').style.backgroundColor).toBe('');
    expect(document.querySelector('[data-id="malicious"]').style.border).toBe('');
    delete global.__contentRuntimeResponder;
  });

  test('shows local heuristic yellow highlight before the final Nano-backed result escalates to red', async () => {
    setTestUrl('https://web.whatsapp.com/');
    document.body.innerHTML = `
      <div id="main" role="main">
        <header><span dir="auto" title="Security Team">Security Team</span></header>
        <div role="row" data-id="pending-risk"><div class="message-in"><div class="copyable-text" data-pre-plain-text="[10:00] Unknown:"><span class="selectable-text"><span>Oi mae, troquei de numero, esse e meu numero novo. Preciso que voce faca um pix de 800 reais urgente pra mim, depois te devolvo.</span></span></div></div></div>
      </div>
    `;
    document.body.innerText = document.body.textContent;
    global.__contentRuntimeResponder = message => {
      if (message.type !== 'DETECT_PHISHING') return { success: true };
      return new Promise(resolve => setTimeout(() => resolve({
        success: true,
        analysis: { status: 'VALID', classification: 'PHISHING', riskLevel: 'HIGH', riskScore: 91, confidence: 86 }
      }), 1200));
    };

    await importContentScript();
    await new Promise(resolve => setTimeout(resolve, 700));

    const bubble = document.querySelector('[data-id="pending-risk"] .message-in');
    expect(bubble.classList.contains('spai-suspicious-message')).toBe(true);
    expect(bubble.classList.contains('spai-malicious-message')).toBe(false);

    await new Promise(resolve => setTimeout(resolve, 1300));
    expect(bubble.classList.contains('spai-malicious-message')).toBe(true);
    expect(bubble.classList.contains('spai-suspicious-message')).toBe(false);
    delete global.__contentRuntimeResponder;
  });
  test('keeps the local pre-highlight when the AI result is safe but local rules still flag the message', async () => {
    setTestUrl('https://web.whatsapp.com/');
    document.body.innerHTML = `
      <div id="main" role="main">
        <header><span dir="auto" title="Security Team">Security Team</span></header>
        <div role="row" data-id="local-only"><div class="message-in"><div class="copyable-text" data-pre-plain-text="[10:00] Unknown:"><span class="selectable-text"><span>Oi mae, troquei de numero, esse e meu numero novo. Preciso que voce faca um pix de 800 reais urgente pra mim, depois te devolvo.</span></span></div></div></div>
      </div>
    `;
    document.body.innerText = document.body.textContent;
    global.__contentRuntimeResponder = message => {
      if (message.type !== 'DETECT_PHISHING') return { success: true };
      return {
        success: true,
        analysis: { status: 'VALID', classification: 'SAFE', riskLevel: 'LOW', riskScore: 3, confidence: 90 }
      };
    };

    await importContentScript();
    await new Promise(resolve => setTimeout(resolve, 1200));

    const bubble = document.querySelector('[data-id="local-only"] .message-in');
    expect(bubble.classList.contains('spai-suspicious-message')).toBe(true);
    delete global.__contentRuntimeResponder;
  });

  test.each([
    ['bank warning (local rules see low risk)', 'in', 'Banco: nunca pedimos seu codigo, senha ou token por mensagem. Nao compartilhe com ninguem.'],
    ['outgoing scam-looking message', 'out', 'Oi mae, troquei de numero, esse e meu numero novo. Preciso que voce faca um pix de 800 reais urgente pra mim, depois te devolvo.']
  ])('does not locally pre-highlight a %s', async (_label, direction, text) => {
    setTestUrl('https://web.whatsapp.com/');
    document.body.innerHTML = `
      <div id="main" role="main">
        <header><span dir="auto" title="Contact">Contact</span></header>
        <div role="row" data-id="no-pre"><div class="message-${direction}"><div class="copyable-text" data-pre-plain-text="[10:00] Someone:"><span class="selectable-text"><span>${text}</span></span></div></div></div>
      </div>
    `;
    document.body.innerText = document.body.textContent;
    global.__contentRuntimeResponder = message => {
      if (message.type !== 'DETECT_PHISHING') return { success: true };
      return new Promise(resolve => setTimeout(() => resolve({
        success: true,
        analysis: { status: 'VALID', classification: 'SAFE', riskLevel: 'LOW', riskScore: 2, confidence: 90 }
      }), 1200));
    };

    await importContentScript();
    await new Promise(resolve => setTimeout(resolve, 700));

    const bubble = document.querySelector(`[data-id="no-pre"] .message-${direction}`);
    expect(bubble.classList.contains('spai-suspicious-message')).toBe(false);
    expect(bubble.classList.contains('spai-malicious-message')).toBe(false);
    await new Promise(resolve => setTimeout(resolve, 1300));
    delete global.__contentRuntimeResponder;
  });

  test('does not log WhatsApp message text while analyzing messages', async () => {
    setTestUrl('https://web.whatsapp.com/');
    document.body.innerHTML = `
      <div id="main" role="main">
        <header><span dir="auto" title="Security Team">Security Team</span></header>
        <div role="row" data-id="private"><div class="message-in"><div class="copyable-text" data-pre-plain-text="[10:00] Unknown:"><span class="selectable-text"><span>PRIVATE-MESSAGE-TEXT-ZQ claim your prize</span></span></div></div></div>
      </div>
    `;
    document.body.innerText = document.body.textContent;
    global.__contentRuntimeResponder = message => {
      if (message.type !== 'DETECT_PHISHING') return { success: true };
      return { success: true, analysis: { status: 'VALID', classification: 'SAFE', riskLevel: 'LOW', riskScore: 3, confidence: 90 } };
    };
    const logSpy = jest.spyOn(console, 'log');

    await importContentScript();
    await new Promise(resolve => setTimeout(resolve, 1200));

    const logged = logSpy.mock.calls.map(args => args.map(String).join(' ')).join('\n');
    expect(logged).not.toContain('PRIVATE-MESSAGE-TEXT-ZQ');
    logSpy.mockRestore();
    delete global.__contentRuntimeResponder;
  });

  test('uses amber outline for medium-risk WhatsApp messages without escalating to malicious red', async () => {
    setTestUrl('https://web.whatsapp.com/');
    document.body.innerHTML = `
      <div id="main" role="main">
        <header><span dir="auto" title="Security Team">Security Team</span></header>
        <div role="row" data-id="suspicious"><div class="message-in"><div class="copyable-text" data-pre-plain-text="[10:00] Unknown:"><span class="selectable-text"><span>Claim your prize now</span></span></div></div></div>
      </div>
    `;
    document.body.innerText = document.body.textContent;
    global.__contentRuntimeResponder = message => {
      if (message.type !== 'DETECT_PHISHING') return { success: true };
      return {
        success: true,
        analysis: { status: 'VALID', classification: 'SUSPICIOUS', riskLevel: 'MEDIUM', riskScore: 58, confidence: 72 }
      };
    };

    await importContentScript();
    await new Promise(resolve => setTimeout(resolve, 1200));

    const suspiciousBubble = document.querySelector('[data-id="suspicious"] .message-in');
    expect(suspiciousBubble.classList.contains('spai-suspicious-message')).toBe(true);
    expect(suspiciousBubble.classList.contains('spai-malicious-message')).toBe(false);
    delete global.__contentRuntimeResponder;
  });
});





