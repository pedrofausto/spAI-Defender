/**
 * Privacy-preserving local analysis metrics.
 * Stores metadata only; never stores page/message content, titles, or full URLs.
 */

const STORAGE_KEY = 'analysisEventsV1';
const RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_EVENTS = 250;
const VALID_LEVELS = new Set(['LOW', 'MEDIUM', 'MEDIUM_HIGH', 'HIGH', 'CRITICAL', 'UNKNOWN']);
const VALID_STATUS = new Set(['VALID', 'INCONCLUSIVE', 'FAILED']);
const VALID_CLASSIFICATIONS = new Set([
  'SAFE', 'SUSPICIOUS', 'PHISHING', 'SCAM', 'SOCIAL_ENGINEERING', 'INCONCLUSIVE', 'UNKNOWN'
]);
const MALICIOUS_CLASSIFICATIONS = new Set(['PHISHING', 'SCAM', 'SOCIAL_ENGINEERING']);

function boundedNumber(value, min = 0, max = Number.MAX_SAFE_INTEGER) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : 0;
}

function normalizePlatform(platform) {
  const normalized = String(platform || 'UNKNOWN').toUpperCase();
  return ['WEB', 'WHATSAPP', 'TELEGRAM', 'GMAIL', 'OUTLOOK'].includes(normalized) ? normalized : 'UNKNOWN';
}

function normalizeEvent(event, now = Date.now()) {
  const timestamp = new Date(event?.timestamp || now);
  if (Number.isNaN(timestamp.getTime())) return null;

  const classification = VALID_CLASSIFICATIONS.has(event?.classification) ? event.classification : 'UNKNOWN';
  const riskLevel = VALID_LEVELS.has(event?.riskLevel) ? event.riskLevel : 'UNKNOWN';
  const status = VALID_STATUS.has(event?.status) ? event.status : 'INCONCLUSIVE';

  return {
    timestamp: timestamp.toISOString(),
    platform: normalizePlatform(event?.platform),
    classification,
    riskLevel,
    status,
    riskScore: Math.round(boundedNumber(event?.riskScore, 0, 100)),
    confidence: Math.round(boundedNumber(event?.confidence, 0, 100)),
    latencyMs: Math.round(boundedNumber(event?.latencyMs, 0, 10 * 60 * 1000)),
    signalCount: Math.round(boundedNumber(event?.signalCount, 0, 100)),
    evidenceCount: Math.round(boundedNumber(event?.evidenceCount, 0, 100)),
    engine: event?.engine === 'gemini_nano' ? 'gemini_nano' : 'unknown'
  };
}

function pruneEvents(events, now = Date.now()) {
  const cutoff = now - RETENTION_MS;
  return events
    .map(event => normalizeEvent(event, now))
    .filter(event => event && Date.parse(event.timestamp) >= cutoff)
    .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp))
    .slice(-MAX_EVENTS);
}

function increment(map, key) {
  map[key] = (map[key] || 0) + 1;
}

export async function recordAnalysisEvent(event, now = Date.now()) {
  const normalized = normalizeEvent(event, now);
  if (!normalized) throw new Error('Invalid analysis event');

  const stored = await chrome.storage.local.get(STORAGE_KEY);
  const current = Array.isArray(stored?.[STORAGE_KEY]) ? stored[STORAGE_KEY] : [];
  const events = pruneEvents([...current, normalized], now);
  await chrome.storage.local.set({ [STORAGE_KEY]: events });
  return normalized;
}

export async function getAnalysisMetrics(now = Date.now()) {
  let stored;
  try {
    stored = await chrome.storage.local.get(STORAGE_KEY);
  } catch (error) {
    return { available: false, error: 'storage_unavailable', period: { days: 7, maxEvents: MAX_EVENTS } };
  }

  const raw = stored?.[STORAGE_KEY];
  if (raw !== undefined && !Array.isArray(raw)) {
    return { available: false, error: 'storage_corrupt', period: { days: 7, maxEvents: MAX_EVENTS } };
  }

  const events = pruneEvents(raw || [], now);
  const byRiskLevel = {};
  const byPlatform = {};
  let malicious = 0;
  let inconclusive = 0;
  let failed = 0;
  let highCritical = 0;
  let riskTotal = 0;
  let confidenceTotal = 0;
  let latencyTotal = 0;
  let last24h = 0;
  let previous24h = 0;

  for (const event of events) {
    increment(byRiskLevel, event.riskLevel);
    increment(byPlatform, event.platform);
    if (MALICIOUS_CLASSIFICATIONS.has(event.classification) && event.status === 'VALID') malicious += 1;
    if (event.status === 'INCONCLUSIVE') inconclusive += 1;
    if (event.status === 'FAILED') failed += 1;
    if (event.riskLevel === 'HIGH' || event.riskLevel === 'CRITICAL') highCritical += 1;
    riskTotal += event.riskScore;
    confidenceTotal += event.confidence;
    latencyTotal += event.latencyMs;

    const age = now - Date.parse(event.timestamp);
    if (age <= 24 * 60 * 60 * 1000) last24h += 1;
    else if (age <= 48 * 60 * 60 * 1000) previous24h += 1;
  }

  const count = events.length;
  return {
    available: true,
    period: {
      days: 7,
      maxEvents: MAX_EVENTS,
      start: new Date(now - RETENTION_MS).toISOString()
    },
    totals: { analyses: count, malicious, inconclusive, failed, highCritical },
    averages: {
      riskScore: count ? Math.round(riskTotal / count) : 0,
      confidence: count ? Math.round(confidenceTotal / count) : 0,
      latencyMs: count ? Math.round(latencyTotal / count) : 0
    },
    byRiskLevel,
    byPlatform,
    trend: { last24h, previous24h, delta: last24h - previous24h },
    recent: events.slice(-10).reverse()
  };
}

export const analysisMetricsConfig = Object.freeze({
  storageKey: STORAGE_KEY,
  retentionMs: RETENTION_MS,
  maxEvents: MAX_EVENTS
});
