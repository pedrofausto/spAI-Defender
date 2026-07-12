/*
 * Offscreen AI runtime regression tests.
 */

describe('offscreen AI runtime', () => {
  let listener;
  let mockSession;

  async function loadOffscreen() {
    jest.resetModules();
    listener = null;

    global.chrome = {
      runtime: {
        onMessage: {
          addListener: jest.fn((fn) => {
            listener = fn;
          })
        }
      }
    };

    Object.defineProperty(global.navigator, 'language', {
      value: 'pt-BR',
      configurable: true
    });

    mockSession = {
      prompt: jest.fn().mockResolvedValue('ok'),
      destroy: jest.fn().mockResolvedValue(undefined)
    };

    global.window.LanguageModel = {
      availability: jest.fn().mockResolvedValue('readily'),
      params: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue(mockSession)
    };
    global.window.Summarizer = null;

    await import('../../../chrome-extension/src/offscreen/offscreen.js');
  }

  function sendMessage(request) {
    return new Promise((resolve) => {
      const keepAlive = listener(request, {}, resolve);
      expect(keepAlive).toBe(true);
    });
  }

  beforeEach(async () => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    await loadOffscreen();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('normalizes capabilities requests with an outputLanguage and null params', async () => {
    const response = await sendMessage({
      type: 'SPAI_OFFSCREEN_AI_REQUEST',
      action: 'capabilities',
      payload: {}
    });

    expect(response).toEqual({
      ok: true,
      result: {
        available: true,
        availability: 'readily',
        defaultTemperature: 0.8,
        defaultTopK: 40,
        maxTopK: 40
      }
    });
    expect(global.window.LanguageModel.availability).toHaveBeenCalledWith(
      expect.objectContaining({
        outputLanguage: 'en',
        expectedInputs: [{ type: 'text', languages: ['en'] }],
        expectedOutputs: [{ type: 'text', languages: ['en'] }]
      })
    );
    expect(global.window.LanguageModel.params).toHaveBeenCalledWith(
      expect.objectContaining({
        outputLanguage: 'en',
        expectedOutputs: [{ type: 'text', languages: ['en'] }]
      })
    );
  });

  test('never calls LanguageModel prompt without an explicit output language', async () => {
    const createResponse = await sendMessage({
      type: 'SPAI_OFFSCREEN_AI_REQUEST',
      action: 'createSession',
      payload: { options: {} }
    });

    const promptResponse = await sendMessage({
      type: 'SPAI_OFFSCREEN_AI_REQUEST',
      action: 'prompt',
      payload: {
        sessionId: createResponse.result.sessionId,
        prompt: 'Analyze this message',
        options: {}
      }
    });

    expect(promptResponse.ok).toBe(true);
    expect(global.window.LanguageModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        outputLanguage: 'en',
        expectedOutputs: [{ type: 'text', languages: ['en'] }]
      })
    );
    expect(mockSession.prompt).toHaveBeenCalledWith(
      'Analyze this message',
      expect.objectContaining({ outputLanguage: 'en' })
    );
    expect(mockSession.prompt).not.toHaveBeenCalledWith('Analyze this message');
  });


  test('passes an explicit supported outputLanguage to every Summarizer request', async () => {
    const summarizer = {
      summarize: jest.fn().mockResolvedValue('summary'),
      destroy: jest.fn().mockResolvedValue(undefined)
    };
    global.window.Summarizer = {
      availability: jest.fn().mockResolvedValue('readily'),
      create: jest.fn().mockResolvedValue(summarizer)
    };

    const response = await sendMessage({
      type: 'SPAI_OFFSCREEN_AI_REQUEST',
      action: 'summarize',
      payload: { text: 'Mensagem em portugues', options: {} }
    });

    expect(response).toEqual({ ok: true, result: { summary: 'summary' } });
    expect(global.window.Summarizer.availability).toHaveBeenCalledWith(
      expect.objectContaining({ outputLanguage: 'en' })
    );
    expect(global.window.Summarizer.create).toHaveBeenCalledWith(
      expect.objectContaining({ outputLanguage: 'en' })
    );
    expect(summarizer.destroy).toHaveBeenCalled();
  });


  test('does not retry a failed prompt on the same destroyed native session', async () => {
    const invalidStateError = new Error('The model execution session has been destroyed.');
    invalidStateError.name = 'InvalidStateError';
    mockSession.prompt.mockRejectedValueOnce(invalidStateError);

    const createResponse = await sendMessage({
      type: 'SPAI_OFFSCREEN_AI_REQUEST',
      action: 'createSession',
      payload: { options: {} }
    });
    const response = await sendMessage({
      type: 'SPAI_OFFSCREEN_AI_REQUEST',
      action: 'prompt',
      payload: {
        sessionId: createResponse.result.sessionId,
        prompt: 'Analyze this message',
        options: { outputLanguage: 'en' }
      }
    });

    expect(response.ok).toBe(false);
    expect(response.error).toContain('AI_SESSION_DESTROYED');
    expect(mockSession.prompt).toHaveBeenCalledTimes(1);
  });



  test('defers session destruction until the active prompt completes', async () => {
    let resolvePrompt;
    mockSession.prompt.mockReset().mockImplementationOnce(() => new Promise((resolve) => { resolvePrompt = resolve; }));

    const created = await sendMessage({
      type: 'SPAI_OFFSCREEN_AI_REQUEST',
      action: 'createSession',
      payload: { options: {} }
    });

    const promptPromise = sendMessage({
      type: 'SPAI_OFFSCREEN_AI_REQUEST',
      action: 'prompt',
      payload: {
        sessionId: created.result.sessionId,
        prompt: 'Analyze later',
        options: { outputLanguage: 'en' }
      }
    });

    await Promise.resolve();
    await Promise.resolve();

    await expect(sendMessage({
      type: 'SPAI_OFFSCREEN_AI_REQUEST',
      action: 'destroySession',
      payload: { sessionId: created.result.sessionId }
    })).resolves.toEqual({ ok: true, result: true });

    expect(mockSession.destroy).not.toHaveBeenCalled();

    resolvePrompt('done');
    await expect(promptPromise).resolves.toEqual(expect.objectContaining({ ok: true }));
    expect(mockSession.destroy).toHaveBeenCalledTimes(1);
  });
  test('serializes concurrent native prompts and forwards the response constraint', async () => {
    let resolveFirst;
    mockSession.prompt
      .mockReset()
      .mockImplementationOnce(() => new Promise(resolve => { resolveFirst = resolve; }))
      .mockResolvedValueOnce('second');

    const firstSession = await sendMessage({ type: 'SPAI_OFFSCREEN_AI_REQUEST', action: 'createSession', payload: { options: {} } });
    const secondSession = await sendMessage({ type: 'SPAI_OFFSCREEN_AI_REQUEST', action: 'createSession', payload: { options: {} } });
    const schema = { type: 'object', additionalProperties: false };

    const firstPrompt = sendMessage({
      type: 'SPAI_OFFSCREEN_AI_REQUEST', action: 'prompt',
      payload: { sessionId: firstSession.result.sessionId, prompt: 'first', options: { responseConstraint: schema, omitResponseConstraintInput: true } }
    });
    const secondPrompt = sendMessage({
      type: 'SPAI_OFFSCREEN_AI_REQUEST', action: 'prompt',
      payload: { sessionId: secondSession.result.sessionId, prompt: 'second', options: {} }
    });

    await Promise.resolve();
    await Promise.resolve();
    expect(mockSession.prompt).toHaveBeenCalledTimes(1);
    expect(mockSession.prompt.mock.calls[0][1]).toEqual(expect.objectContaining({
      responseConstraint: schema,
      omitResponseConstraintInput: true
    }));

    resolveFirst('first');
    await expect(firstPrompt).resolves.toEqual(expect.objectContaining({ ok: true }));
    await expect(secondPrompt).resolves.toEqual(expect.objectContaining({ ok: true }));
    expect(mockSession.prompt).toHaveBeenCalledTimes(2);
  });
});


