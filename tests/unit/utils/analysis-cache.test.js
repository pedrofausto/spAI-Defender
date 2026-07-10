import { AnalysisCache, stableStringify } from '../../../chrome-extension/src/utils/analysis-cache.js';

describe('AnalysisCache', () => {
  let now;
  let cache;

  beforeEach(() => {
    now = 1_000;
    cache = new AnalysisCache({
      maxEntries: 2,
      ttlMs: 1_000,
      algorithmVersion: 'risk-v1',
      now: () => now,
      hashFunction: async (value) => `hash:${value.length}:${value.slice(-8)}`
    });
  });

  test('isolates cached results by analysis type', async () => {
    const base = {
      url: 'https://example.com/login',
      content: 'same page content',
      options: { locale: 'en' }
    };
    const phishingKey = await cache.buildKey({ ...base, analysisType: 'phishing' });
    const sentimentKey = await cache.buildKey({ ...base, analysisType: 'sentiment' });

    cache.set(phishingKey, { analysis: { riskLevel: 'HIGH' } });
    cache.set(sentimentKey, { analysis: { sentiment: 'NEUTRAL' } });

    expect(cache.get(phishingKey).analysis.riskLevel).toBe('HIGH');
    expect(cache.get(sentimentKey).analysis.sentiment).toBe('NEUTRAL');
  });

  test('uses the full content hash instead of a prefix-only key', async () => {
    const prefix = 'A'.repeat(120);
    const keyA = await cache.buildKey({
      analysisType: 'phishing',
      url: 'https://example.com',
      content: `${prefix} safe ending`
    });
    const keyB = await cache.buildKey({
      analysisType: 'phishing',
      url: 'https://example.com',
      content: `${prefix} malicious ending`
    });

    expect(keyA).not.toBe(keyB);
  });

  test('isolates cached results by normalized options', async () => {
    const base = {
      analysisType: 'sentiment',
      url: 'https://example.com',
      content: 'content'
    };
    const keyA = await cache.buildKey({ ...base, options: { locale: 'en', depth: 'quick' } });
    const keyB = await cache.buildKey({ ...base, options: { depth: 'full', locale: 'en' } });

    expect(keyA).not.toBe(keyB);
  });

  test('expires stale entries', async () => {
    const key = await cache.buildKey({
      analysisType: 'phishing',
      url: 'https://example.com',
      content: 'content'
    });
    cache.set(key, { value: 1 });

    now += 1_001;

    expect(cache.get(key)).toBeNull();
    expect(cache.size()).toBe(0);
  });

  test('evicts least recently used entries when max size is exceeded', async () => {
    const keyA = await cache.buildKey({ analysisType: 'a', url: 'https://a.test', content: 'a' });
    const keyB = await cache.buildKey({ analysisType: 'b', url: 'https://b.test', content: 'b' });
    const keyC = await cache.buildKey({ analysisType: 'c', url: 'https://c.test', content: 'c' });

    cache.set(keyA, 'a');
    cache.set(keyB, 'b');
    expect(cache.get(keyA)).toBe('a');
    cache.set(keyC, 'c');

    expect(cache.get(keyA)).toBe('a');
    expect(cache.get(keyB)).toBeNull();
    expect(cache.get(keyC)).toBe('c');
  });
});

describe('stableStringify', () => {
  test('orders object keys deterministically', () => {
    expect(stableStringify({ b: 2, a: 1 })).toBe(stableStringify({ a: 1, b: 2 }));
  });
});
