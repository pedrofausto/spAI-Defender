import { analysisMetricsConfig, getAnalysisMetrics, recordAnalysisEvent } from '../../../chrome-extension/src/utils/analysis-metrics-store.js';

describe('analysis metrics store', () => {
  let storage;

  beforeEach(() => {
    storage = {};
    global.chrome = {
      storage: {
        local: {
          get: jest.fn(async key => {
            if (Array.isArray(key)) return Object.fromEntries(key.map(item => [item, storage[item]]));
            return { [key]: storage[key] };
          }),
          set: jest.fn(async value => Object.assign(storage, value))
        }
      }
    };
  });

  test('stores metadata only and aggregates enterprise metrics', async () => {
    const now = Date.parse('2026-07-10T12:00:00.000Z');
    await recordAnalysisEvent({
      timestamp:new Date(now).toISOString(), platform:'WHATSAPP', classification:'PHISHING',
      riskLevel:'HIGH', status:'VALID', riskScore:88, confidence:82, latencyMs:1200,
      signalCount:3, evidenceCount:2, engine:'gemini_nano', content:'must not persist',
      url:'https://secret.example/path', title:'Secret'
    }, now);

    const events = storage[analysisMetricsConfig.storageKey];
    expect(events).toHaveLength(1);
    expect(events[0]).not.toHaveProperty('content');
    expect(events[0]).not.toHaveProperty('url');
    expect(events[0]).not.toHaveProperty('title');

    const metrics = await getAnalysisMetrics(now);
    expect(metrics).toMatchObject({
      available:true,
      totals:{ analyses:1, malicious:1, inconclusive:0, failed:0, highCritical:1 },
      averages:{ riskScore:88, confidence:82, latencyMs:1200 },
      byPlatform:{ WHATSAPP:1 }
    });
  });

  test('enforces seven-day retention and 250-event cap', async () => {
    const now = Date.parse('2026-07-10T12:00:00.000Z');
    storage[analysisMetricsConfig.storageKey] = Array.from({ length:270 }, (_, index) => ({
      timestamp:new Date(now - index * 1000).toISOString(), platform:'WEB', classification:'SAFE',
      riskLevel:'LOW', status:'VALID', riskScore:1, confidence:80, latencyMs:10
    }));
    storage[analysisMetricsConfig.storageKey].push({
      timestamp:new Date(now - analysisMetricsConfig.retentionMs - 1).toISOString(),
      platform:'WEB', classification:'SAFE', riskLevel:'LOW', status:'VALID'
    });

    await recordAnalysisEvent({ timestamp:new Date(now).toISOString(), platform:'WEB', classification:'SAFE', riskLevel:'LOW', status:'VALID' }, now);
    expect(storage[analysisMetricsConfig.storageKey]).toHaveLength(250);
    expect(storage[analysisMetricsConfig.storageKey].every(event => Date.parse(event.timestamp) >= now-analysisMetricsConfig.retentionMs)).toBe(true);
  });

  test('reports corrupt or unavailable storage without fabricating zero metrics', async () => {
    storage[analysisMetricsConfig.storageKey] = { invalid:true };
    await expect(getAnalysisMetrics()).resolves.toMatchObject({ available:false, error:'storage_corrupt' });
    chrome.storage.local.get.mockRejectedValueOnce(new Error('unavailable'));
    await expect(getAnalysisMetrics()).resolves.toMatchObject({ available:false, error:'storage_unavailable' });
  });
});
