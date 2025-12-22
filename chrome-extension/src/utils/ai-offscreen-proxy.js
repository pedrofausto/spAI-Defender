/**
 * AI Offscreen Proxy
 * Runs Built-in AI calls in an offscreen document and exposes an AISessionManager-like API to the service worker.
 */

const OFFSCREEN_URL = 'src/offscreen/offscreen.html';
const REQ_TYPE = 'SPAI_OFFSCREEN_AI_REQUEST';

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export class AIOffscreenProxy {
  constructor() {
    this.availability = null;
    this.availabilityChecked = false;
    this.aiAvailable = false;
    this._currentSessionId = null;
    this._creatingOffscreen = null;
  }

  async _ensureOffscreenDocument() {
    if (this._creatingOffscreen) return this._creatingOffscreen;

    this._creatingOffscreen = (async () => {
      // Some Chrome versions need a small delay after SW wake-up
      await sleep(0);

      const has = await chrome.offscreen.hasDocument();
      if (has) return true;

      await chrome.offscreen.createDocument({
        url: OFFSCREEN_URL,
        reasons: ['DOM_SCRAPING'],
        justification: 'Run Chrome Built-in AI (LanguageModel/Summarizer) in an offscreen document context.'
      });
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
      throw new Error(res?.error || `Offscreen request failed: ${action}`);
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
      const caps = await this._send('capabilities', {}, 4000);
      const available = caps?.available || 'no';
      this.availability = available;
      this.aiAvailable = available === 'readily' || available === 'after-download';
      this.availabilityChecked = true;
      return this.availability;
    } catch (e) {
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

    const { sessionId } = await this._send('createSession', { options }, 8000);
    this._currentSessionId = sessionId;

    // Session proxy for compatibility with existing code (session.prompt(...))
    return {
      __spaiSessionProxy: true,
      sessionId,
      prompt: async (promptText) => {
        const res = await this._send('prompt', { sessionId, prompt: promptText }, 20000);
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
      return {
        __spaiSessionProxy: true,
        sessionId,
        prompt: async (promptText) => {
          const res = await this._send('prompt', { sessionId, prompt: promptText, options }, 20000);
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
}

export default AIOffscreenProxy;



