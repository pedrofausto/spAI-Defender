/*
 * Offscreen AI Runtime
 * Runs Chrome Built-in AI (LanguageModel / Summarizer) in an offscreen document context.
 */

import { AVAILABILITY, normalizeAvailability, isAvailabilityReady } from '../utils/ai-availability.js';

import {
  SUPPORTED_AI_LANGUAGES,
  pickOutputLanguage,
  normalizeLanguageModelExpectations
} from '../utils/ai-language-options.js';

const REQ_TYPE = 'SPAI_OFFSCREEN_AI_REQUEST';
const PROMPT_TIMEOUT_MS = 90000;
const DESTROYED_SESSION_ERROR_FRAGMENT = 'session has been destroyed';
let sessionSeq = 0;
const sessions = new Map(); // sessionId -> { session, activePrompts, destroyRequested }
const MAX_LIVE_SESSIONS = 4; // Oldest sessions are evicted beyond this cap to bound native memory
let promptQueue = Promise.resolve();

function enqueuePrompt(operation) {
  const queued = promptQueue.then(operation, operation);
  promptQueue = queued.catch(() => undefined);
  return queued;
}

function nextSessionId() {
  sessionSeq += 1;
  return `lm_${Date.now()}_${sessionSeq}`;
}



function normalizeSummarizerOptions(inputOptions = {}) {
  const options = { ...(inputOptions || {}) };
  options.outputLanguage = SUPPORTED_AI_LANGUAGES.has(options.outputLanguage)
    ? options.outputLanguage
    : pickOutputLanguage(typeof navigator !== 'undefined' ? navigator.language : undefined);
  return options;
}

function normalizeSessionOptions(inputOptions = {}) {
  const options = { ...(inputOptions || {}) };

  const hasTemp = Object.prototype.hasOwnProperty.call(options, 'temperature');
  const hasTopK = Object.prototype.hasOwnProperty.call(options, 'topK');
  if (hasTemp || hasTopK) {
    if (!hasTemp) options.temperature = 0.8;
    if (!hasTopK) options.topK = 40;
  }

  return normalizeLanguageModelExpectations(options);
}

function normalizeLanguageModelParams(params = {}) {
  const safeParams = params && typeof params === 'object' ? params : {};
  return {
    defaultTemperature: typeof safeParams.defaultTemperature === 'number' ? safeParams.defaultTemperature : 0.8,
    defaultTopK: typeof safeParams.defaultTopK === 'number' ? safeParams.defaultTopK : 40,
    maxTopK: typeof safeParams.maxTopK === 'number' ? safeParams.maxTopK : 40
  };
}

async function getLanguageModelAvailability(options = {}) {
  if (typeof self === 'undefined' || !self.LanguageModel || typeof self.LanguageModel.availability !== 'function') {
    return AVAILABILITY.UNAVAILABLE;
  }
  const normalized = normalizeSessionOptions(options);
  return normalizeAvailability(await self.LanguageModel.availability(normalized));
}

async function getLanguageModelParams(options = {}) {
  if (typeof self === 'undefined' || !self.LanguageModel) {
    return normalizeLanguageModelParams();
  }
  const normalized = normalizeSessionOptions(options);
  if (typeof self.LanguageModel.params === 'function') {
    return normalizeLanguageModelParams(await self.LanguageModel.params(normalized));
  }
  if (typeof self.LanguageModel.capabilities === 'function') {
    return normalizeLanguageModelParams(await self.LanguageModel.capabilities(normalized));
  }
  return normalizeLanguageModelParams();
}

async function getLanguageModelCapabilities(options = {}) {
  const normalized = normalizeSessionOptions(options);
  const availability = await getLanguageModelAvailability(normalized);
  const params = await getLanguageModelParams(normalized);
  return {
    available: isAvailabilityReady(availability),
    availability,
    ...params
  };
}

async function getSummarizerAvailability(options = {}) {
  if (typeof self === 'undefined' || !self.Summarizer || typeof self.Summarizer.availability !== 'function') {
    return AVAILABILITY.UNAVAILABLE;
  }
  const normalized = normalizeSummarizerOptions(options);
  return normalizeAvailability(await self.Summarizer.availability(normalized));
}

async function ensureSession(sessionId, options = {}) {
  if (sessionId && sessions.has(sessionId)) {
    const existing = sessions.get(sessionId);
    if (existing?.destroyRequested) {
      throw new Error('AI_SESSION_DESTROYING: Session is being destroyed');
    }
    return { session: existing.session, sessionId };
  }
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
  sessions.set(id, { session, activePrompts: 0, destroyRequested: false });
  await enforceSessionCap(id);
  return { session, sessionId: id };
}

function countLiveSessions() {
  let count = 0;
  for (const entry of sessions.values()) {
    if (!entry.destroyRequested) count += 1;
  }
  return count;
}

/**
 * Destroy the oldest live sessions until the cap holds. The session that was just created
 * (keepSessionId) is never evicted. Sessions with in-flight prompts are finalized after the prompt.
 */
async function enforceSessionCap(keepSessionId) {
  while (countLiveSessions() > MAX_LIVE_SESSIONS) {
    const victim = Array.from(sessions.entries())
      .find(([id, entry]) => id !== keepSessionId && !entry.destroyRequested);
    if (!victim) break;
    await destroySession(victim[0]);
  }
}

async function finalizeSessionDestroy(sessionId, entry) {
  if (!entry) return true;
  try {
    await entry.session?.destroy?.();
  } catch (_) {
    // ignore
  } finally {
    sessions.delete(sessionId);
  }
  return true;
}

async function destroySession(sessionId) {
  if (!sessionId) return true;
  const entry = sessions.get(sessionId);
  if (entry) {
    if (entry.activePrompts > 0) {
      entry.destroyRequested = true;
      sessions.set(sessionId, entry);
      return true;
    }
    await finalizeSessionDestroy(sessionId, entry);
  }
  return true;
}

async function summarizeText(text, options = {}) {
  if (typeof self === 'undefined' || !self.Summarizer) {
    throw new Error('AI_UNAVAILABLE: Chrome Built-in AI Summarizer is not available');
  }

  const summarizerOptions = normalizeSummarizerOptions({
    type: options.type || 'key-points',
    format: options.format || 'markdown',
    length: options.length || 'medium',
    sharedContext: options.context || '',
    outputLanguage: options.outputLanguage
  });

  const availability = await getSummarizerAvailability(summarizerOptions);
  if (!isAvailabilityReady(availability)) {
    throw new Error(`AI_UNAVAILABLE: Chrome Built-in AI Summarizer is not available (${availability})`);
  }

  const summarizer = await self.Summarizer.create(summarizerOptions);
  try {
    return await summarizer.summarize(text, { context: options.context || '' });
  } finally {
    await summarizer.destroy?.();
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (!request || request.type !== REQ_TYPE) return;

  // Only the extension service worker may drive the offscreen AI runtime. Tab contexts are rejected.
  if (sender?.tab) {
    sendResponse({ ok: false, error: 'Unauthorized sender' });
    return false;
  }

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
        const caps = await getLanguageModelCapabilities(payload?.options || {});
        return { ok: true, result: caps };
      }

      case 'summarizerAvailable': {
        const availability = await getSummarizerAvailability();
        return { ok: true, result: { available: isAvailabilityReady(availability), availability } };
      }

      case 'diagnostics': {
        const languageModelPresent = typeof self !== 'undefined' && !!self.LanguageModel;
        const summarizerPresent = typeof self !== 'undefined' && !!self.Summarizer;
        let summarizerAvailability = AVAILABILITY.UNAVAILABLE;
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
        const entry = sessions.get(ensured.sessionId || sessionId);
        const session = ensured.session || ensured;
        const actualSessionId = ensured.sessionId || sessionId;
        const outLang =
          (options && typeof options === 'object' && options.outputLanguage) ? options.outputLanguage : pickOutputLanguage(typeof navigator !== 'undefined' ? navigator.language : undefined);

        if (!entry) {
          throw new Error('AI_SESSION_MISSING: Session not found');
        }

        const text = await enqueuePrompt(async () => {
          const abortController = new AbortController();
          const timeoutId = setTimeout(() => abortController.abort('Gemini Nano prompt timeout'), PROMPT_TIMEOUT_MS);
          entry.activePrompts += 1;
          try {
            const promptOptions = {
              outputLanguage: outLang,
              signal: abortController.signal
            };
            if (options?.responseConstraint && typeof options.responseConstraint === 'object') {
              promptOptions.responseConstraint = options.responseConstraint;
              promptOptions.omitResponseConstraintInput = options.omitResponseConstraintInput === true;
            }
            return await session.prompt(prompt, promptOptions);
          } catch (error) {
            const name = error?.name || 'Error';
            const msg = error?.message || String(error);
            if (name === 'InvalidStateError' && String(msg).toLowerCase().includes(DESTROYED_SESSION_ERROR_FRAGMENT)) {
              throw new Error(`AI_SESSION_DESTROYED: ${msg}`);
            }
            console.error(`[spai][offscreen] prompt failed: ${name}: ${msg} (outputLanguage=${outLang})`);
            throw new Error(`AI_PROMPT_FAILED: ${name}: ${msg}`);
          } finally {
            entry.activePrompts = Math.max(0, entry.activePrompts - 1);
            if (entry.destroyRequested && entry.activePrompts === 0) {
              await finalizeSessionDestroy(actualSessionId, entry);
            } else {
              sessions.set(actualSessionId, entry);
            }
            clearTimeout(timeoutId);
          }
        });
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
