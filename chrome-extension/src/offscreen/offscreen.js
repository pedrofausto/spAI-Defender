/*
 * Offscreen AI Runtime
 * Runs Chrome Built-in AI (LanguageModel / Summarizer) in an offscreen document context.
 */

const REQ_TYPE = 'SPAI_OFFSCREEN_AI_REQUEST';

let sessionSeq = 0;
const sessions = new Map(); // sessionId -> LanguageModel session

function nextSessionId() {
  sessionSeq += 1;
  return `lm_${Date.now()}_${sessionSeq}`;
}

function pickOutputLanguage() {
  const lang = (typeof navigator !== 'undefined' && navigator.language ? navigator.language : 'en').toLowerCase();
  if (lang.startsWith('es')) return 'es';
  if (lang.startsWith('ja')) return 'ja';
  return 'en';
}

function normalizeSessionOptions(inputOptions = {}) {
  const options = { ...(inputOptions || {}) };

  const hasTemp = Object.prototype.hasOwnProperty.call(options, 'temperature');
  const hasTopK = Object.prototype.hasOwnProperty.call(options, 'topK');
  if (hasTemp || hasTopK) {
    if (!hasTemp) options.temperature = 0.8;
    if (!hasTopK) options.topK = 40;
  }

  if (!Object.prototype.hasOwnProperty.call(options, 'outputLanguage')) {
    options.outputLanguage = pickOutputLanguage(); // supported: en, es, ja
  }

  return options;
}

function normalizeLanguageModelParams(params = {}) {
  return {
    defaultTemperature: typeof params.defaultTemperature === 'number' ? params.defaultTemperature : 0.8,
    defaultTopK: typeof params.defaultTopK === 'number' ? params.defaultTopK : 40,
    maxTopK: typeof params.maxTopK === 'number' ? params.maxTopK : 40
  };
}

function isAvailableStatus(availability) {
  return availability === 'readily' || availability === 'after-download';
}

async function getLanguageModelAvailability(options = {}) {
  if (typeof self === 'undefined' || !self.LanguageModel) {
    return 'no';
  }
  if (typeof self.LanguageModel.availability === 'function') {
    return await self.LanguageModel.availability(options);
  }
  if (typeof self.LanguageModel.capabilities === 'function') {
    const capabilities = await self.LanguageModel.capabilities(options);
    return capabilities?.available || capabilities?.availability || 'no';
  }
  return typeof self.LanguageModel.create === 'function' ? 'readily' : 'no';
}

async function getLanguageModelParams() {
  if (typeof self === 'undefined' || !self.LanguageModel) {
    return normalizeLanguageModelParams();
  }
  if (typeof self.LanguageModel.params === 'function') {
    return normalizeLanguageModelParams(await self.LanguageModel.params());
  }
  if (typeof self.LanguageModel.capabilities === 'function') {
    return normalizeLanguageModelParams(await self.LanguageModel.capabilities());
  }
  return normalizeLanguageModelParams();
}

async function getLanguageModelCapabilities(options = {}) {
  const availability = await getLanguageModelAvailability(options);
  const params = await getLanguageModelParams();
  return {
    available: isAvailableStatus(availability),
    availability,
    ...params
  };
}

async function getSummarizerAvailability(options = {}) {
  if (typeof self === 'undefined' || !self.Summarizer) {
    return 'no';
  }
  if (typeof self.Summarizer.availability === 'function') {
    return await self.Summarizer.availability(options);
  }
  return typeof self.Summarizer.create === 'function' ? 'readily' : 'no';
}

async function ensureSession(sessionId, options = {}) {
  if (sessionId && sessions.has(sessionId)) return sessions.get(sessionId);
  if (typeof self === 'undefined' || !self.LanguageModel) {
    throw new Error('AI_UNAVAILABLE: Chrome Built-in AI is not available');
  }
  const normalized = normalizeSessionOptions(options);
  let session;
  try {
    session = await self.LanguageModel.create(normalized);
  } catch (e) {
    const name = e?.name || 'Error';
    const msg = e?.message || String(e);
    console.error('[spai][offscreen] LanguageModel.create failed', { name, msg, normalized });
    throw new Error(`AI_SESSION_FAILED: ${name}: ${msg}`);
  }
  const id = sessionId || nextSessionId();
  sessions.set(id, session);
  return { session, sessionId: id };
}

async function destroySession(sessionId) {
  if (!sessionId) return true;
  const s = sessions.get(sessionId);
  if (s) {
    try {
      await s.destroy?.();
    } catch (_) {
      // ignore
    }
    sessions.delete(sessionId);
  }
  return true;
}

async function summarizeText(text, options = {}) {
  if (typeof self === 'undefined' || !self.Summarizer) {
    throw new Error('AI_UNAVAILABLE: Chrome Built-in AI Summarizer is not available');
  }

  const summarizerOptions = {
    type: options.type || 'key-points',
    format: options.format || 'markdown',
    length: options.length || 'medium',
    sharedContext: options.context || ''
  };

  const availability = await getSummarizerAvailability(summarizerOptions);
  if (!isAvailableStatus(availability)) {
    throw new Error(`AI_UNAVAILABLE: Chrome Built-in AI Summarizer is not available (${availability})`);
  }

  const summarizer = await self.Summarizer.create(summarizerOptions);
  try {
    return await summarizer.summarize(text, { context: options.context || '' });
  } finally {
    await summarizer.destroy?.();
  }
}

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (!request || request.type !== REQ_TYPE) return;

  (async () => {
    const { action, payload } = request;

    switch (action) {
      case 'ping': {
        return {
          ok: true,
          result: {
            ready: true,
            context: 'offscreen',
            languageModelPresent: typeof self !== 'undefined' && !!self.LanguageModel,
            summarizerPresent: typeof self !== 'undefined' && !!self.Summarizer
          }
        };
      }

      case 'capabilities': {
        const caps = await getLanguageModelCapabilities();
        return { ok: true, result: caps };
      }

      case 'summarizerAvailable': {
        const availability = await getSummarizerAvailability();
        return { ok: true, result: { available: isAvailableStatus(availability), availability } };
      }

      case 'diagnostics': {
        const languageModelPresent = typeof self !== 'undefined' && !!self.LanguageModel;
        const summarizerPresent = typeof self !== 'undefined' && !!self.Summarizer;
        let summarizerAvailability = 'no';
        let caps = null;
        let capsError = null;
        try {
          caps = await getLanguageModelCapabilities();
          summarizerAvailability = await getSummarizerAvailability();
        } catch (e) {
          capsError = e?.message || String(e);
        }
        return {
          ok: true,
          result: {
            context: 'offscreen',
            userAgent: navigator.userAgent,
            languageModelPresent,
            summarizerPresent,
            summarizerAvailability,
            capabilities: caps,
            capabilitiesError: capsError
          }
        };
      }

      case 'createSession': {
        const { options } = payload || {};
        const created = await ensureSession(null, options || {});
        const sessionId = created.sessionId || nextSessionId();
        if (!created.sessionId) {
          sessions.set(sessionId, created.session);
        }
        return { ok: true, result: { sessionId } };
      }

      case 'destroySession': {
        const { sessionId } = payload || {};
        await destroySession(sessionId);
        return { ok: true, result: true };
      }

      case 'prompt': {
        const { sessionId, prompt, options } = payload || {};
        const ensured = await ensureSession(sessionId, options || {});
        const session = ensured.session || ensured;
        const actualSessionId = ensured.sessionId || sessionId;
        const outLang =
          (options && typeof options === 'object' && options.outputLanguage) ? options.outputLanguage : pickOutputLanguage();

        let text;
        try {
          text = await session.prompt(prompt, { outputLanguage: outLang });
        } catch (e1) {
          try {
            text = await session.prompt(prompt, { language: outLang });
          } catch (e2) {
            try {
              text = await session.prompt(prompt);
            } catch (e3) {
              const name = e3?.name || e2?.name || e1?.name || 'Error';
              const msg = e3?.message || e2?.message || e1?.message || String(e3 || e2 || e1);
              console.error('[spai][offscreen] prompt failed', { name, msg, outLang });
              throw new Error(`AI_PROMPT_FAILED: ${name}: ${msg}`);
            }
          }
        }
        return { ok: true, result: { sessionId: actualSessionId, text } };
      }

      case 'summarize': {
        const { text, options } = payload || {};
        const summary = await summarizeText(text, options || {});
        return { ok: true, result: { summary } };
      }

      default:
        return { ok: false, error: `Unknown action: ${action}` };
    }
  })()
    .then((res) => sendResponse(res))
    .catch((err) => {
      console.error('[spai][offscreen] request failed:', request?.action, err);
      sendResponse({ ok: false, error: err?.message || String(err) });
    });

  return true; // async
});

console.log('[spai][offscreen] AI runtime ready', {
  languageModelPresent: typeof self !== 'undefined' && !!self.LanguageModel,
  summarizerPresent: typeof self !== 'undefined' && !!self.Summarizer
});
