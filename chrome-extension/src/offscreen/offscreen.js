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

async function getLanguageModelCapabilities() {
  if (typeof self === 'undefined' || !self.LanguageModel) {
    return { available: 'no' };
  }
  if (typeof self.LanguageModel.capabilities === 'function') {
    return await self.LanguageModel.capabilities();
  }
  // Fallback: availability() exists in some versions
  if (typeof self.LanguageModel.availability === 'function') {
    const available = await self.LanguageModel.availability();
    return { available };
  }
  return { available: 'no' };
}

async function ensureSession(sessionId, options = {}) {
  if (sessionId && sessions.has(sessionId)) return sessions.get(sessionId);
  if (typeof self === 'undefined' || !self.LanguageModel) {
    throw new Error('AI_UNAVAILABLE: Chrome Built-in AI is not available');
  }
  const session = await self.LanguageModel.create(options);
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
    // Keep parity with previous behavior: throw to let caller handle fallback
    throw new Error('AI_UNAVAILABLE: Chrome Built-in AI Summarizer is not available');
  }

  const summarizerOptions = {
    type: options.type || 'key-points',
    format: options.format || 'markdown',
    length: options.length || 'medium',
    sharedContext: options.context || ''
  };

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
      case 'capabilities': {
        const caps = await getLanguageModelCapabilities();
        return { ok: true, result: caps };
      }

      case 'createSession': {
        const { options } = payload || {};
        const created = await ensureSession(null, options || {});
        // ensureSession can return { session } or { session, sessionId } depending on path
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
        const text = await session.prompt(prompt);
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
      sendResponse({ ok: false, error: err?.message || String(err) });
    });

  return true; // async
});

console.log('spAI-Defender: offscreen AI runtime ready');



