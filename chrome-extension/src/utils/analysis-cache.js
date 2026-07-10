const DEFAULT_TTL_MS = 5 * 60 * 1000;
const DEFAULT_MAX_ENTRIES = 50;
const DEFAULT_ALGORITHM_VERSION = 'analysis-cache-v1';

export function stableStringify(value) {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
    .join(',')}}`;
}

function getSourceScope(url = '', origin = '') {
  const raw = url || origin || 'unknown';
  try {
    const parsed = new URL(raw);
    return parsed.href || parsed.origin || raw;
  } catch (_) {
    return String(raw);
  }
}

function fallbackHash(input) {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a32:${(hash >>> 0).toString(16).padStart(8, '0')}:${input.length}`;
}

async function sha256(input) {
  const cryptoApi = globalThis.crypto || globalThis.msCrypto;
  if (!cryptoApi?.subtle || typeof TextEncoder === 'undefined') {
    return fallbackHash(input);
  }
  const bytes = new TextEncoder().encode(input);
  const digest = await cryptoApi.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export class AnalysisCache {
  constructor({
    maxEntries = DEFAULT_MAX_ENTRIES,
    ttlMs = DEFAULT_TTL_MS,
    algorithmVersion = DEFAULT_ALGORITHM_VERSION,
    now = () => Date.now(),
    hashFunction = sha256
  } = {}) {
    this.maxEntries = maxEntries;
    this.ttlMs = ttlMs;
    this.algorithmVersion = algorithmVersion;
    this.now = now;
    this.hashFunction = hashFunction;
    this.entries = new Map();
  }

  async buildKey({
    analysisType,
    url = '',
    origin = '',
    content = '',
    algorithmVersion = this.algorithmVersion,
    options = {}
  }) {
    const contentText = typeof content === 'string' ? content : stableStringify(content);
    const keyMaterial = {
      analysisType: String(analysisType || 'unknown'),
      source: getSourceScope(url, origin),
      contentHash: await this.hashFunction(contentText),
      algorithmVersion: String(algorithmVersion || this.algorithmVersion),
      optionsHash: await this.hashFunction(stableStringify(options || {}))
    };
    return stableStringify(keyMaterial);
  }

  get(key) {
    const entry = this.entries.get(key);
    if (!entry) return null;
    if (this.now() - entry.timestamp > this.ttlMs) {
      this.entries.delete(key);
      return null;
    }
    this.entries.delete(key);
    this.entries.set(key, entry);
    return entry.value;
  }

  set(key, value) {
    if (this.entries.has(key)) {
      this.entries.delete(key);
    }
    this.entries.set(key, {
      timestamp: this.now(),
      value
    });
    this.evictExpired();
    while (this.entries.size > this.maxEntries) {
      const oldestKey = this.entries.keys().next().value;
      this.entries.delete(oldestKey);
    }
  }

  evictExpired() {
    for (const [key, entry] of this.entries.entries()) {
      if (this.now() - entry.timestamp > this.ttlMs) {
        this.entries.delete(key);
      }
    }
  }

  size() {
    this.evictExpired();
    return this.entries.size;
  }
}

export default AnalysisCache;
