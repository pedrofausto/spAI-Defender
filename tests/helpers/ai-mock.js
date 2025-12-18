/**
 * Chrome Built-in AI API Mock Helper
 * Provides deterministic mocking for the window.ai API
 */

/**
 * Setup AI API mocks
 * Mocks window.ai.languageModel, window.ai.summarizer, etc.
 */
export function setupAIMocks() {
  global.window = global.window || {};

  // Language Model mock
  global.window.ai = global.window.ai || {};
  global.window.ai.languageModel = global.window.ai.languageModel || {
    canCreateTextSession: jest.fn().mockResolvedValue(true),
    create: jest.fn().mockResolvedValue({
      prompt: jest.fn().mockResolvedValue('Mock AI response text'),
      promptStreaming: jest
        .fn()
        .mockImplementation(function* () {
          yield 'Mock ';
          yield 'AI ';
          yield 'response';
        }),
      destroy: jest.fn()
    })
  };

  // Summarizer API mock
  global.window.ai.summarizer = global.window.ai.summarizer || {
    canCreateSummarizationSession: jest.fn().mockResolvedValue(true),
    create: jest.fn().mockResolvedValue({
      summarize: jest.fn().mockResolvedValue('This is a summary of the content.'),
      destroy: jest.fn()
    })
  };

  // Rewriter API mock
  global.window.ai.rewriter = global.window.ai.rewriter || {
    canCreateRewriteSession: jest.fn().mockResolvedValue(false)
  };

  // Detector API mock
  global.window.ai.detector = global.window.ai.detector || {
    canDetectAvailability: jest.fn().mockResolvedValue(false)
  };

  // Mock fetch for external APIs
  if (!global.fetch) {
    global.fetch = jest.fn();
  }

  return global.window.ai;
}

/**
 * Reset all AI mock calls
 */
export function resetAIMocks() {
  if (global.window && global.window.ai) {
    const resetMock = (obj) => {
      Object.keys(obj).forEach((key) => {
        if (obj[key] && typeof obj[key].mockClear === 'function') {
          obj[key].mockClear();
        } else if (obj[key] && typeof obj[key] === 'object') {
          resetMock(obj[key]);
        }
      });
    };
    resetMock(global.window.ai);
  }
}

/**
 * Setup language model to return specific response
 */
export function setLanguageModelResponse(response) {
  if (global.window && global.window.ai && global.window.ai.languageModel) {
    global.window.ai.languageModel.create = jest.fn().mockResolvedValue({
      prompt: jest.fn().mockResolvedValue(response),
      promptStreaming: jest
        .fn()
        .mockImplementation(function* () {
          yield response;
        }),
      destroy: jest.fn()
    });
  }
}

/**
 * Setup summarizer to return specific response
 */
export function setSummarizerResponse(response) {
  if (global.window && global.window.ai && global.window.ai.summarizer) {
    global.window.ai.summarizer.create = jest.fn().mockResolvedValue({
      summarize: jest.fn().mockResolvedValue(response),
      destroy: jest.fn()
    });
  }
}

/**
 * Setup fetch mock with response
 */
export function setupFetchMock(url, response, status = 200) {
  global.fetch = jest.fn((requestUrl) => {
    if (requestUrl.includes(url)) {
      return Promise.resolve({
        ok: status >= 200 && status < 300,
        status: status,
        json: () => Promise.resolve(response),
        text: () => Promise.resolve(JSON.stringify(response))
      });
    }
    return Promise.reject(new Error(`Unexpected URL: ${requestUrl}`));
  });
}

/**
 * Get fetch call history
 */
export function getFetchCallHistory() {
  return global.fetch.mock.calls || [];
}

/**
 * Setup streaming response for language model
 */
export function setLanguageModelStreamingResponse(chunks) {
  if (global.window && global.window.ai && global.window.ai.languageModel) {
    global.window.ai.languageModel.create = jest.fn().mockResolvedValue({
      prompt: jest.fn().mockResolvedValue(chunks.join('')),
      promptStreaming: jest
        .fn()
        .mockImplementation(function* () {
          for (const chunk of chunks) {
            yield chunk;
          }
        }),
      destroy: jest.fn()
    });
  }
}

export default {
  setupAIMocks,
  resetAIMocks,
  setLanguageModelResponse,
  setSummarizerResponse,
  setupFetchMock,
  getFetchCallHistory,
  setLanguageModelStreamingResponse
};
