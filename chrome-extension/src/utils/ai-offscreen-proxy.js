/**
 * AI Offscreen Proxy
 * Runs Built-in AI calls in an offscreen document and exposes an AISessionManager-like API to the service worker.
 */

const OFFSCREEN_URL = 'src/offscreen/offscreen.html';
const REQ_TYPE = 'SPAI_OFFSCREEN_AI_REQUEST';
const SUPPORTED_OUTPUT_LANGUAGES = new Set(['de', 'en', 'es', 'fr', 'ja']);
const PROMPT_REQUEST_TIMEOUT_MS = 190000;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function pickOutputLanguage() {
  const raw = (typeof navigator !== 'undefined' && navigator.language ? navigator.language : 'en').toLowerCase();
  const lang = raw.split('-')[0];
  return SUPPORTED_OUTPUT_LANGUAGES.has(lang) ? lang : 'en';
}

function normalizeLanguageModelExpectations(options) {
  const outputLanguage = SUPPORTED_OUTPUT_LANGUAGES.has(options.outputLanguage) ? options.outputLanguage : pickOutputLanguage();

  options.outputLanguage = outputLanguage;

  if (!Array.isArray(options.expectedInputs) || options.expectedInputs.length === 0) {
    options.expectedInputs = [{ type: 'text', languages: Array.from(new Set(['en', outputLanguage])) }];
  }

  if (!Array.isArray(options.expectedOutputs) || options.expectedOutputs.length === 0) {
    options.expectedOutputs = [{ type: 'text', languages: [outputLanguage] }];
  }

  return options;
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
  return normalizeLanguageModelExpectations(options);
}

function isReadyAvailability(availability) {
  return availability === 'readily' || availability === 'available';
}

function isTransientAvailability(availability) {
  return availability === 'after-download' || availability === 'downloadable' || availability === 'downloading';
}

function isUnavailableStatus(availability) {
  return availability === 'no' || availability === 'unavailable';
}

function canAttemptLanguageModelSession(availability) {
  return isReadyAvailability(availability) || isTransientAvailability(availability);
}

function shouldCacheAvailability(availability) {
  return isReadyAvailability(availability) || isUnavailableStatus(availability);
}

export class AIOffscreenProxy {
  constructor() {
    this.availability = null;
    this.availabilityChecked = false;
    this.aiAvailable = false;
    this._creatingOffscreen = null;
    this._sessionOptions = new Map(); // sessionId -> normalized options (at least outputLanguage)
    this._sessionInflightPrompts = new Map(); // sessionId -> Promise
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
    let timeoutId = null;

    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error(`Offscreen request timeout (${timeoutMs}ms): ${action}`)), timeoutMs);
    });

    try {
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
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }

  /**
   * Mirrors AISessionManager.checkAvailability(). Transient Chrome Built-in AI
   * states must be rechecked because downloads and model warm-up finish outside
   * the extension process.
   * @param {{ force?: boolean }} options
   * @returns {Promise<string>} Chrome availability status.
   */
  async checkAvailability(options = {}) {
    const forceRefresh = options?.force === true;
    if (!forceRefresh && this.availabilityChecked && this.availability) return this.availability;

    try {
      const env = this._envInfo();
      console.log('[spai][ai-proxy] checkAvailability()', env);
      const caps = await this._send('capabilities', {}, 4000);
      const availability = caps?.availability || (typeof caps?.available === 'string' ? caps.available : 'no');
      this.availability = availability;
      this.aiAvailable = canAttemptLanguageModelSession(availability);
      this.availabilityChecked = shouldCacheAvailability(availability);
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
    const availability = await this.checkAvailability({ force: true });
    if (isUnavailableStatus(availability)) {
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
      availability: caps?.availability || (typeof caps?.available === 'string' ? caps.available : availability),
      defaultTemperature: caps?.defaultTemperature || 0.8,
      defaultTopK: caps?.defaultTopK || 40,
      maxTopK: caps?.maxTopK || 40
    };
  }

  async hasSummarizationAPI() {
    try {
      const res = await this._send('summarizerAvailable', {}, 4000);
      return res?.available === true || canAttemptLanguageModelSession(res?.availability);
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
    const availability = await this.checkAvailability({ force: true });
    if (isUnavailableStatus(availability)) {
      const error = new Error('AI_UNAVAILABLE: Chrome Built-in AI is not available');
      error.code = 'AI_UNAVAILABLE';
      throw error;
    }

    const normalized = normalizeSessionOptions(options);
    const { sessionId } = await this._send('createSession', { options: normalized }, 8000);
    this.availability = 'readily';
    this.aiAvailable = true;
    this.availabilityChecked = true;
    this._sessionOptions.set(sessionId, normalized);
    return this._createSessionProxy(sessionId, normalized);
  }

  _createSessionProxy(sessionId, normalized) {
    return {
      __spaiSessionProxy: true,
      sessionId,
      prompt: async (promptText, promptOptions = {}) => {
        const opts = this._sessionOptions.get(sessionId) || normalized;
        const requestOptions = {
          outputLanguage: opts.outputLanguage,
          responseConstraint: promptOptions.responseConstraint,
          omitResponseConstraintInput: promptOptions.omitResponseConstraintInput === true
        };
        const inflightPrompt = this._send(
          'prompt',
          { sessionId, prompt: promptText, options: requestOptions },
          PROMPT_REQUEST_TIMEOUT_MS
        ).finally(() => {
          if (this._sessionInflightPrompts.get(sessionId) === inflightPrompt) {
            this._sessionInflightPrompts.delete(sessionId);
          }
        });
        this._sessionInflightPrompts.set(sessionId, inflightPrompt);
        const res = await inflightPrompt;
        return res.text;
      },
      destroy: async () => {
        await this.destroySession({ sessionId });
      }
    };
  }

  async getOrCreateSession(options = {}) {
    return await this.createSession(options);
  }

  async destroySession(session = null) {
    const sessionId = session?.sessionId;
    if (!sessionId) return;
    const inflightPrompt = this._sessionInflightPrompts.get(sessionId);
    if (inflightPrompt) {
      await inflightPrompt.catch(() => {});
    }
    await this._send('destroySession', { sessionId }, 8000);
    this._sessionInflightPrompts.delete(sessionId);
    this._sessionOptions.delete(sessionId);
  }

  async reset() {
    const sessionIds = Array.from(this._sessionOptions.keys());
    await Promise.all(sessionIds.map((sessionId) => this.destroySession({ sessionId }).catch(() => {})));
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
   * Offscreen sessions are lightweight proxies; they are not pooled in the service worker.
   */
  getPooledSession() {
    return null;
  }

  async returnSessionToPool(session) {
    // Proxy sessions are never pooled, so returning one destroys it to release the offscreen session.
    await this.destroySession(session).catch(() => {});
  }

  async cloneSession() {
    throw new Error('cloneSession is not supported by AIOffscreenProxy');
  }
}

export default AIOffscreenProxy;
