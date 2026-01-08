/**
 * AI Offscreen Proxy
 * Runs Built-in AI calls in an offscreen document and exposes an AISessionManager-like API to the service worker.
 */

const OFFSCREEN_URL = 'src/offscreen/offscreen.html';
const REQ_TYPE = 'SPAI_OFFSCREEN_AI_REQUEST';

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function pickOutputLanguage() {
  const lang = (typeof navigator !== 'undefined' && navigator.language ? navigator.language : 'en').toLowerCase();
  if (lang.startsWith('es')) return 'es';
  if (lang.startsWith('ja')) return 'ja';
  return 'en';
}

function normalizeSessionOptions(inputOptions = {}) {
  const options = { ...(inputOptions || {}) };

  // Chrome Built-in AI requires either both topK and temperature, or neither.
  const hasTemp = Object.prototype.hasOwnProperty.call(options, 'temperature');
  const hasTopK = Object.prototype.hasOwnProperty.call(options, 'topK');
  if (hasTemp || hasTopK) {
    if (!hasTemp) options.temperature = 0.8;
    if (!hasTopK) options.topK = 40;
  }

  // Some Chrome builds require an explicit output language for safety attestation.
  if (!Object.prototype.hasOwnProperty.call(options, 'outputLanguage')) {
    options.outputLanguage = pickOutputLanguage(); // must be one of: en, es, ja
  }

  return options;
}

export class AIOffscreenProxy {
  constructor() {
    this.availability = null;
    this.availabilityChecked = false;
    this.aiAvailable = false;
    this._currentSessionId = null;
    this._creatingOffscreen = null;
    this._sessionOptions = new Map(); // sessionId -> normalized options (at least outputLanguage)
  }

  _envInfo() {
    return {
      context: 'service_worker',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      hasOffscreenApi: typeof chrome !== 'undefined' && !!chrome.offscreen,
      hasOffscreenCreate:
        typeof chrome !== 'undefined' && !!chrome.offscreen && typeof chrome.offscreen.createDocument === 'function',
      hasOffscreenHasDocument:
        typeof chrome !== 'undefined' && !!chrome.offscreen && typeof chrome.offscreen.hasDocument === 'function'
    };
  }

  async _waitForOffscreenReady() {
    // Offscreen createDocument can return before scripts are fully ready to receive messages.
    const maxAttempts = 10;
    for (let i = 0; i < maxAttempts; i++) {
      try {
        await chrome.runtime.sendMessage({ type: REQ_TYPE, action: 'ping', payload: {} });
        return true;
      } catch (_) {
        await sleep(50 + i * 25);
      }
    }
    return false;
  }

  async _ensureOffscreenDocument() {
    if (this._creatingOffscreen) return this._creatingOffscreen;

    this._creatingOffscreen = (async () => {
      // Some Chrome versions need a small delay after SW wake-up
      await sleep(0);

      const env = this._envInfo();
      if (!env.hasOffscreenApi || !env.hasOffscreenCreate || !env.hasOffscreenHasDocument) {
        throw new Error('OFFSCREEN_UNAVAILABLE: chrome.offscreen API is not available in this context');
      }

      const has = await chrome.offscreen.hasDocument();
      if (has) return true;

      console.log('[spai][ai-proxy] creating offscreen document…', { url: OFFSCREEN_URL });
      try {
        await chrome.offscreen.createDocument({
          url: OFFSCREEN_URL,
          reasons: ['DOM_SCRAPING'],
          justification: 'Run Chrome Built-in AI (LanguageModel/Summarizer) in an offscreen document context.'
        });
        const ready = await this._waitForOffscreenReady();
        if (!ready) {
          console.warn('[spai][ai-proxy] offscreen ping not ready yet (continuing)');
        }
      } catch (e) {
        console.error('[spai][ai-proxy] offscreen creation failed', e);
        throw new Error(`OFFSCREEN_CREATE_FAILED: ${e?.message || String(e)}`);
      }
      return true;
    })();

    try {
      return await this._creatingOffscreen;
    } finally {
      this._creatingOffscreen = null;
    }
  }

  async _send(action, payload = {}, timeoutMs = 8000) {
    await this._ensureOffscreenDocument();

    const msg = { type: REQ_TYPE, action, payload };

    const sendPromise = chrome.runtime.sendMessage(msg);
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Offscreen request timeout (${timeoutMs}ms): ${action}`)), timeoutMs)
    );

    const res = await Promise.race([sendPromise, timeoutPromise]);
    if (!res || res.ok !== true) {
      const errStr =
        typeof res?.error === 'string'
          ? res.error
          : res?.error
            ? JSON.stringify(res.error)
            : null;
      console.error('[spai][ai-proxy] offscreen request failed', { action, response: res });
      throw new Error(errStr || `Offscreen request failed: ${action}`);
    }
    return res.result;
  }

  /**
   * Mirrors AISessionManager.checkAvailability()
   * @returns {Promise<string>} 'readily' | 'after-download' | 'no'
   */
  async checkAvailability() {
    if (this.availabilityChecked && this.availability) return this.availability;

    try {
      const env = this._envInfo();
      console.log('[spai][ai-proxy] checkAvailability()', env);
      const caps = await this._send('capabilities', {}, 4000);
      const available = caps?.available || 'no';
      this.availability = available;
      this.aiAvailable = available === 'readily' || available === 'after-download';
      this.availabilityChecked = true;
      console.log('[spai][ai-proxy] availability:', this.availability);
      return this.availability;
    } catch (e) {
      console.warn('[spai][ai-proxy] availability check failed:', e?.message || e);
      this.availability = 'no';
      this.aiAvailable = false;
      this.availabilityChecked = true;
      return 'no';
    }
  }

  isAIAvailable() {
    return this.aiAvailable;
  }

  async getCapabilities() {
    const availability = await this.checkAvailability();
    if (availability === 'no') {
      return {
        available: false,
        availability: 'no',
        defaultTemperature: 0.8,
        defaultTopK: 40,
        maxTopK: 40,
        error: 'Chrome Built-in AI not available'
      };
    }

    const caps = await this._send('capabilities', {}, 4000);
    return {
      available: true,
      availability: caps?.available || 'no',
      defaultTemperature: caps?.defaultTemperature || 0.8,
      defaultTopK: caps?.defaultTopK || 40,
      maxTopK: caps?.maxTopK || 40
    };
  }

  async hasSummarizationAPI() {
    try {
      const res = await this._send('summarizerAvailable', {}, 4000);
      return !!res?.available;
    } catch (e) {
      console.warn('[spai][ai-proxy] summarizerAvailable check failed:', e?.message || e);
      return false;
    }
  }

  async getOffscreenDiagnostics() {
    return await this._send('diagnostics', {}, 5000);
  }

  /**
   * Returns a session proxy object with .prompt(), matching existing callers.
   */
  async createSession(options = {}) {
    const availability = await this.checkAvailability();
    if (availability === 'no') {
      const error = new Error('AI_UNAVAILABLE: Chrome Built-in AI is not available');
      error.code = 'AI_UNAVAILABLE';
      throw error;
    }

    const normalized = normalizeSessionOptions(options);
    const { sessionId } = await this._send('createSession', { options: normalized }, 8000);
    this._currentSessionId = sessionId;
    this._sessionOptions.set(sessionId, normalized);

    // Session proxy for compatibility with existing code (session.prompt(...))
    return {
      __spaiSessionProxy: true,
      sessionId,
      prompt: async (promptText) => {
        const opts = this._sessionOptions.get(sessionId) || normalized;
        const res = await this._send('prompt', { sessionId, prompt: promptText, options: { outputLanguage: opts.outputLanguage } }, 60000);
        return res.text;
      },
      destroy: async () => {
        await this._send('destroySession', { sessionId }, 8000);
      }
    };
  }

  async getOrCreateSession(options = {}) {
    if (this._currentSessionId) {
      const sessionId = this._currentSessionId;
      const normalized = normalizeSessionOptions(options);
      // update stored options (keep latest outputLanguage)
      this._sessionOptions.set(sessionId, { ...(this._sessionOptions.get(sessionId) || {}), ...normalized });
      return {
        __spaiSessionProxy: true,
        sessionId,
        prompt: async (promptText) => {
          const opts = this._sessionOptions.get(sessionId) || normalized;
          const res = await this._send('prompt', { sessionId, prompt: promptText, options: { outputLanguage: opts.outputLanguage } }, 60000);
          return res.text;
        },
        destroy: async () => {
          await this._send('destroySession', { sessionId }, 8000);
        }
      };
    }
    return await this.createSession(options);
  }

  async destroySession(session = null) {
    const sessionId = session?.sessionId || this._currentSessionId;
    if (!sessionId) return;
    await this._send('destroySession', { sessionId }, 8000);
    if (sessionId === this._currentSessionId) this._currentSessionId = null;
    this._sessionOptions.delete(sessionId);
  }

  async reset() {
    await this.destroySession().catch(() => {});
    this.availability = null;
    this.availabilityChecked = false;
    this.aiAvailable = false;
  }

  /**
   * Mirrors AISessionManager.summarize() behavior.
   */
  async summarize(text, options = {}) {
    const { summary } = await this._send('summarize', { text, options }, 20000);
    return summary;
  }

  /**
   * Compatibility with AISessionManager pooling API.
   * Offscreen sessions are lightweight proxies; pooling is handled internally by the offscreen map.
   */
  getPooledSession() {
    return null;
  }

  returnSessionToPool(_session) {
    // no-op
  }

  async cloneSession() {
    throw new Error('cloneSession is not supported by AIOffscreenProxy');
  }
}

export default AIOffscreenProxy;



