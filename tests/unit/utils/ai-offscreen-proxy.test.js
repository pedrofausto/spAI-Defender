import { AIOffscreenProxy } from '../../../chrome-extension/src/utils/ai-offscreen-proxy.js';

function makeProxy() {
  const proxy = new AIOffscreenProxy();
  proxy.availability = 'readily';
  proxy.availabilityChecked = true;
  proxy.aiAvailable = true;
  proxy._send = jest.fn(async (action, payload) => {
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
});
