import { AIOffscreenProxy } from '../../../chrome-extension/src/utils/ai-offscreen-proxy.js';

function makeProxy() {
  const proxy = new AIOffscreenProxy();
  proxy.availability = 'available';
  proxy.availabilityChecked = true;
  proxy.aiAvailable = true;
  proxy._send = jest.fn(async (action, payload) => {
    if (action === 'capabilities') {
      return { available: true, availability: 'available' };
    }
    if (action === 'createSession') {
      return { sessionId: `session-${proxy._send.mock.calls.filter(([a]) => a === 'createSession').length}` };
    }
    if (action === 'prompt') {
      return { sessionId: payload.sessionId, text: `response:${payload.sessionId}` };
    }
    if (action === 'destroySession') {
      return true;
    }
    return {};
  });
  return proxy;
}

describe('AIOffscreenProxy session isolation', () => {
  test('getOrCreateSession creates an isolated session instead of reusing global current session', async () => {
    const proxy = makeProxy();

    const first = await proxy.createSession({ temperature: 0.3 });
    const second = await proxy.getOrCreateSession({ temperature: 0.7 });

    expect(first.sessionId).toBe('session-1');
    expect(second.sessionId).toBe('session-2');
    expect(proxy._send.mock.calls.filter(([action]) => action === 'createSession')).toHaveLength(2);
  });

  test('destroySession requires an explicit session and does not destroy another active session implicitly', async () => {
    const proxy = makeProxy();
    const first = await proxy.createSession();
    const second = await proxy.createSession();

    await proxy.destroySession();
    await proxy.destroySession(first);

    const destroyCalls = proxy._send.mock.calls
      .filter(([action]) => action === 'destroySession')
      .map(([, payload]) => payload.sessionId);

    expect(destroyCalls).toEqual([first.sessionId]);
    expect(destroyCalls).not.toContain(second.sessionId);
  });


  test('destroySession waits for the in-flight prompt before sending destroySession', async () => {
    const proxy = makeProxy();
    let resolvePrompt;
    proxy._send = jest.fn((action, payload) => {
      if (action === 'capabilities') return Promise.resolve({ available: true, availability: 'available' });
      if (action === 'createSession') return Promise.resolve({ sessionId: 'session-1' });
      if (action === 'prompt') return new Promise((resolve) => { resolvePrompt = () => resolve({ sessionId: payload.sessionId, text: 'done' }); });
      if (action === 'destroySession') return Promise.resolve(true);
      return Promise.resolve({});
    });

    const session = await proxy.createSession();
    const promptPromise = session.prompt('hello');
    await Promise.resolve();

    const destroyPromise = proxy.destroySession(session);
    await Promise.resolve();

    expect(proxy._send.mock.calls.filter(([action]) => action === 'destroySession')).toHaveLength(0);

    resolvePrompt();
    await expect(promptPromise).resolves.toBe('done');
    await destroyPromise;

    expect(proxy._send.mock.calls.map(([action]) => action)).toEqual(['capabilities', 'createSession', 'prompt', 'destroySession']);
  });
  test('session proxy destroys only its own session id', async () => {
    const proxy = makeProxy();
    const first = await proxy.createSession();
    const second = await proxy.createSession();

    await first.destroy();

    const destroyCalls = proxy._send.mock.calls
      .filter(([action]) => action === 'destroySession')
      .map(([, payload]) => payload.sessionId);

    expect(destroyCalls).toEqual([first.sessionId]);
    expect(destroyCalls).not.toContain(second.sessionId);
  });
});

describe('AIOffscreenProxy Built-in AI availability contract', () => {
  test('checkAvailability reads normalized availability status from offscreen capabilities', async () => {
    const proxy = new AIOffscreenProxy();
    proxy._send = jest.fn().mockResolvedValue({
      available: true,
      availability: 'downloadable',
      defaultTemperature: 0.7,
      defaultTopK: 32,
      maxTopK: 64
    });

    await expect(proxy.checkAvailability()).resolves.toBe('downloadable');
    expect(proxy.aiAvailable).toBe(false);
  });

  test('getCapabilities preserves boolean availability and model params', async () => {
    const proxy = new AIOffscreenProxy();
    proxy._send = jest.fn().mockResolvedValue({
      available: true,
      availability: 'available',
      defaultTemperature: 0.6,
      defaultTopK: 24,
      maxTopK: 48
    });

    await expect(proxy.getCapabilities()).resolves.toEqual({
      available: true,
      availability: 'available',
      defaultTemperature: 0.6,
      defaultTopK: 24,
      maxTopK: 48
    });
  });

  test('hasSummarizationAPI is true only when the summarizer is available', async () => {
    const proxy = new AIOffscreenProxy();
    proxy._send = jest.fn().mockResolvedValue({ available: false, availability: 'downloadable' });

    await expect(proxy.hasSummarizationAPI()).resolves.toBe(false);
  });

  test('checkAvailability maps legacy availability strings to unavailable', async () => {
    const proxy = new AIOffscreenProxy();
    proxy._send = jest.fn().mockResolvedValue({ availability: 'readily' });

    await expect(proxy.checkAvailability()).resolves.toBe('unavailable');
    expect(proxy.aiAvailable).toBe(false);
  });

  test('does not cache transient downloading availability', async () => {
    const proxy = new AIOffscreenProxy();
    proxy._send = jest.fn()
      .mockResolvedValueOnce({ available: true, availability: 'downloading' })
      .mockResolvedValueOnce({ available: true, availability: 'available' });

    await expect(proxy.checkAvailability()).resolves.toBe('downloading');
    expect(proxy.aiAvailable).toBe(false);
    expect(proxy.availabilityChecked).toBe(false);

    await expect(proxy.checkAvailability()).resolves.toBe('available');
    expect(proxy._send).toHaveBeenCalledTimes(2);
    expect(proxy.availabilityChecked).toBe(true);
  });

  test.each(['downloadable', 'downloading'])('createSession refuses to run while availability is %s', async (state) => {
    const proxy = new AIOffscreenProxy();
    proxy._send = jest.fn(async (action) => {
      if (action === 'capabilities') return { available: false, availability: state };
      return {};
    });

    await expect(proxy.createSession()).rejects.toMatchObject({ code: 'AI_MODEL_NOT_READY', availability: state });
    expect(proxy._send.mock.calls.map(([action]) => action)).toEqual(['capabilities']);
  });

  test('createSession rejects with AI_UNAVAILABLE when the model is unavailable', async () => {
    const proxy = new AIOffscreenProxy();
    proxy._send = jest.fn(async () => ({ available: false, availability: 'unavailable' }));

    await expect(proxy.createSession()).rejects.toMatchObject({ code: 'AI_UNAVAILABLE' });
  });

  test('createSession does not overwrite the freshly checked availability', async () => {
    const proxy = new AIOffscreenProxy();
    proxy._send = jest.fn(async (action) => {
      if (action === 'capabilities') return { available: true, availability: 'available' };
      if (action === 'createSession') return { sessionId: 'session-ready' };
      return {};
    });

    const session = await proxy.createSession();

    expect(session.sessionId).toBe('session-ready');
    expect(proxy._send.mock.calls.map(([action]) => action)).toEqual(['capabilities', 'createSession']);
    expect(proxy.availability).toBe('available');
  });

  test('creates the offscreen document with a reason that matches the documented list', async () => {
    const proxy = new AIOffscreenProxy();
    global.chrome = {
      runtime: { sendMessage: jest.fn().mockResolvedValue({ ok: true, result: {} }) },
      offscreen: { hasDocument: jest.fn().mockResolvedValue(false), createDocument: jest.fn().mockResolvedValue(undefined) }
    };
    await proxy._ensureOffscreenDocument();
    const args = global.chrome.offscreen.createDocument.mock.calls[0][0];
    // Documented list: https://developer.chrome.com/docs/extensions/reference/api/offscreen (Reason enum).
    const documented = ['TESTING','AUDIO_PLAYBACK','IFRAME_SCRIPTING','DOM_SCRAPING','BLOBS','DOM_PARSER','USER_MEDIA',
      'DISPLAY_MEDIA','WEB_RTC','CLIPBOARD','LOCAL_STORAGE','WORKERS','BATTERY_STATUS','MATCH_MEDIA','GEOLOCATION'];
    expect(args.reasons.length).toBeGreaterThan(0);
    args.reasons.forEach((reason) => expect(documented).toContain(reason));
    // No listed reason names local model inference, so the justification must say what the document really does.
    expect(args.justification).toMatch(/Prompt API|LanguageModel/);
    expect(args.justification).toMatch(/no listed reason|none of the listed reasons/i);
  });
});

describe('AIOffscreenProxy pooling contract', () => {
  test('returnSessionToPool destroys the offscreen session because proxy sessions are never pooled', async () => {
    const proxy = makeProxy();
    const session = await proxy.createSession();

    await proxy.returnSessionToPool(session);

    const destroyCalls = proxy._send.mock.calls
      .filter(([action]) => action === 'destroySession')
      .map(([, payload]) => payload.sessionId);
    expect(destroyCalls).toEqual([session.sessionId]);
    expect(proxy.getPooledSession()).toBeNull();
  });
});

describe('AIOffscreenProxy offscreen document detection', () => {
  const OFFSCREEN_FULL_URL = 'chrome-extension://ext-id/src/offscreen/offscreen.html';
  const SINGLE_DOCUMENT_ERROR = 'Only a single offscreen document may be created.';

  function installChrome({ runtime = {}, offscreen = {} } = {}) {
    global.chrome = {
      runtime: {
        sendMessage: jest.fn().mockResolvedValue({ ok: true, result: {} }),
        getURL: jest.fn((path) => `chrome-extension://ext-id/${path}`),
        ...runtime
      },
      offscreen: {
        createDocument: jest.fn().mockResolvedValue(undefined),
        ...offscreen
      }
    };
    return global.chrome;
  }

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete global.chrome;
  });

  test('prefers runtime.getContexts with the offscreen type and full document URL', async () => {
    const hasDocument = jest.fn().mockResolvedValue(false);
    const chromeMock = installChrome({
      runtime: { getContexts: jest.fn().mockResolvedValue([{ contextType: 'OFFSCREEN_DOCUMENT' }]) },
      offscreen: { hasDocument }
    });

    await new AIOffscreenProxy()._ensureOffscreenDocument();

    expect(chromeMock.runtime.getContexts).toHaveBeenCalledWith({
      contextTypes: ['OFFSCREEN_DOCUMENT'],
      documentUrls: [OFFSCREEN_FULL_URL]
    });
    expect(hasDocument).not.toHaveBeenCalled();
    expect(chromeMock.offscreen.createDocument).not.toHaveBeenCalled();
  });

  test('creates the document when runtime.getContexts reports no offscreen context', async () => {
    const chromeMock = installChrome({
      runtime: { getContexts: jest.fn().mockResolvedValue([]) }
    });

    await new AIOffscreenProxy()._ensureOffscreenDocument();

    expect(chromeMock.offscreen.createDocument).toHaveBeenCalledTimes(1);
    expect(chromeMock.offscreen.createDocument.mock.calls[0][0].url).toBe('src/offscreen/offscreen.html');
  });

  test('falls back to offscreen.hasDocument when runtime.getContexts throws', async () => {
    const chromeMock = installChrome({
      runtime: { getContexts: jest.fn().mockRejectedValue(new Error('getContexts unsupported')) },
      offscreen: { hasDocument: jest.fn().mockResolvedValue(true) }
    });

    await new AIOffscreenProxy()._ensureOffscreenDocument();

    expect(chromeMock.offscreen.hasDocument).toHaveBeenCalledTimes(1);
    expect(chromeMock.offscreen.createDocument).not.toHaveBeenCalled();
  });

  test('uses offscreen.hasDocument alone when runtime.getContexts is absent', async () => {
    const chromeMock = installChrome({
      offscreen: { hasDocument: jest.fn().mockResolvedValue(false) }
    });

    await new AIOffscreenProxy()._ensureOffscreenDocument();

    expect(chromeMock.offscreen.hasDocument).toHaveBeenCalledTimes(1);
    expect(chromeMock.offscreen.createDocument).toHaveBeenCalledTimes(1);
  });

  test('falls back to in-memory tracking when neither detection API exists', async () => {
    const chromeMock = installChrome();
    const proxy = new AIOffscreenProxy();

    await proxy._ensureOffscreenDocument();
    await proxy._ensureOffscreenDocument();

    expect(chromeMock.offscreen.createDocument).toHaveBeenCalledTimes(1);
  });

  test('falls back to in-memory tracking when hasDocument throws', async () => {
    const chromeMock = installChrome({
      offscreen: { hasDocument: jest.fn().mockRejectedValue(new Error('boom')) }
    });

    await new AIOffscreenProxy()._ensureOffscreenDocument();

    expect(chromeMock.offscreen.createDocument).toHaveBeenCalledTimes(1);
  });

  test('treats the single-document error as an existing document instead of failing', async () => {
    const chromeMock = installChrome({
      offscreen: { createDocument: jest.fn().mockRejectedValue(new Error(SINGLE_DOCUMENT_ERROR)) }
    });
    const proxy = new AIOffscreenProxy();

    await expect(proxy._ensureOffscreenDocument()).resolves.toBe(true);
    await proxy._ensureOffscreenDocument();

    expect(chromeMock.offscreen.createDocument).toHaveBeenCalledTimes(1);
    expect(chromeMock.runtime.sendMessage).toHaveBeenCalledWith(expect.objectContaining({ action: 'ping' }));
  });

  test('rethrows other creation errors and keeps the document marked as missing', async () => {
    const chromeMock = installChrome({
      offscreen: { createDocument: jest.fn().mockRejectedValue(new Error('disk full')) }
    });
    const proxy = new AIOffscreenProxy();

    await expect(proxy._ensureOffscreenDocument()).rejects.toThrow('OFFSCREEN_CREATE_FAILED: disk full');
    await expect(proxy._ensureOffscreenDocument()).rejects.toThrow('OFFSCREEN_CREATE_FAILED');
    expect(chromeMock.offscreen.createDocument).toHaveBeenCalledTimes(2);
  });

  test('reports OFFSCREEN_UNAVAILABLE when chrome.offscreen.createDocument is missing', async () => {
    installChrome();
    global.chrome.offscreen = undefined;

    await expect(new AIOffscreenProxy()._ensureOffscreenDocument()).rejects.toThrow('OFFSCREEN_UNAVAILABLE');
  });

  test('re-creates the document after a failed transport call in in-memory mode', async () => {
    const chromeMock = installChrome();
    const proxy = new AIOffscreenProxy();
    await proxy._ensureOffscreenDocument();

    chromeMock.runtime.sendMessage.mockRejectedValueOnce(new Error('Receiving end does not exist'));
    await expect(proxy._send('summarize', {}, 1000)).rejects.toThrow('Receiving end does not exist');
    await proxy._ensureOffscreenDocument();

    expect(chromeMock.offscreen.createDocument).toHaveBeenCalledTimes(2);
  });
});
