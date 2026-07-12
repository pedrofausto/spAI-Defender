import { AIOffscreenProxy } from '../../../chrome-extension/src/utils/ai-offscreen-proxy.js';

function makeProxy() {
  const proxy = new AIOffscreenProxy();
  proxy.availability = 'readily';
  proxy.availabilityChecked = true;
  proxy.aiAvailable = true;
  proxy._send = jest.fn(async (action, payload) => {
    if (action === 'capabilities') {
      return { available: true, availability: 'readily' };
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
      if (action === 'capabilities') return Promise.resolve({ available: true, availability: 'readily' });
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
      availability: 'after-download',
      defaultTemperature: 0.7,
      defaultTopK: 32,
      maxTopK: 64
    });

    await expect(proxy.checkAvailability()).resolves.toBe('after-download');
    expect(proxy.aiAvailable).toBe(true);
  });

  test('getCapabilities preserves boolean availability and model params', async () => {
    const proxy = new AIOffscreenProxy();
    proxy._send = jest.fn().mockResolvedValue({
      available: true,
      availability: 'readily',
      defaultTemperature: 0.6,
      defaultTopK: 24,
      maxTopK: 48
    });

    await expect(proxy.getCapabilities()).resolves.toEqual({
      available: true,
      availability: 'readily',
      defaultTemperature: 0.6,
      defaultTopK: 24,
      maxTopK: 48
    });
  });

  test('hasSummarizationAPI accepts normalized summarizer availability', async () => {
    const proxy = new AIOffscreenProxy();
    proxy._send = jest.fn().mockResolvedValue({ available: false, availability: 'after-download' });

    await expect(proxy.hasSummarizationAPI()).resolves.toBe(true);
  });

  test('checkAvailability still supports legacy capabilities available string', async () => {
    const proxy = new AIOffscreenProxy();
    proxy._send = jest.fn().mockResolvedValue({ available: 'readily' });

    await expect(proxy.checkAvailability()).resolves.toBe('readily');
    expect(proxy.aiAvailable).toBe(true);
  });

  test('does not cache transient downloading availability', async () => {
    const proxy = new AIOffscreenProxy();
    proxy._send = jest.fn()
      .mockResolvedValueOnce({ available: true, availability: 'downloading' })
      .mockResolvedValueOnce({ available: true, availability: 'readily' });

    await expect(proxy.checkAvailability()).resolves.toBe('downloading');
    expect(proxy.aiAvailable).toBe(true);
    expect(proxy.availabilityChecked).toBe(false);

    await expect(proxy.checkAvailability()).resolves.toBe('readily');
    expect(proxy._send).toHaveBeenCalledTimes(2);
    expect(proxy.availabilityChecked).toBe(true);
  });

  test('createSession force-refreshes availability and accepts downloadable states', async () => {
    const proxy = new AIOffscreenProxy();
    proxy.availability = 'no';
    proxy.availabilityChecked = true;
    proxy._send = jest.fn(async (action) => {
      if (action === 'capabilities') return { available: true, availability: 'downloadable' };
      if (action === 'createSession') return { sessionId: 'session-downloadable' };
      return {};
    });

    const session = await proxy.createSession();

    expect(session.sessionId).toBe('session-downloadable');
    expect(proxy._send.mock.calls.map(([action]) => action)).toEqual(['capabilities', 'createSession']);
    expect(proxy.availability).toBe('readily');
  });
});
