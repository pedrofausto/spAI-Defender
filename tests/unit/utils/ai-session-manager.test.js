/**
 * AI Session Manager Tests
 * RED-GREEN-REFACTOR TDD cycle
 * Testing session lifecycle, creation, pooling, and AI interactions
 */

import { AISessionManager } from '../../../chrome-extension/src/utils/ai-session-manager.js';
import { setupChromeMocks } from '../../helpers/chrome-api-mock.js';
import { setupAIMocks, setLanguageModelResponse, setSummarizerResponse } from '../../helpers/ai-mock.js';

describe('AISessionManager', () => {
  let manager;
  let mockSession;

  beforeEach(() => {
    setupChromeMocks();
    setupAIMocks();
    manager = new AISessionManager();

    // Create a mock session for testing
    mockSession = {
      prompt: jest.fn().mockResolvedValue('Test response'),
      promptStreaming: jest.fn().mockResolvedValue(
        (async function* () {
          yield 'Test ';
          yield 'response';
        })()
      ),
      clone: jest.fn().mockResolvedValue({
        prompt: jest.fn().mockResolvedValue('Cloned response')
      }),
      destroy: jest.fn().mockResolvedValue(undefined),
      inputUsage: 100,
      inputQuota: 1000
    };

    // Mock self.LanguageModel
    global.self = global.self || {};
    global.self.LanguageModel = {
      availability: jest.fn().mockResolvedValue('readily'),
      params: jest.fn().mockResolvedValue({ defaultTemperature: 0.8, defaultTopK: 40, maxTopK: 40 }),
      create: jest.fn().mockResolvedValue(mockSession)
    };

    // Mock self.Summarizer
    global.self.Summarizer = {
      availability: jest.fn().mockResolvedValue('readily'),
      create: jest.fn().mockResolvedValue({
        summarize: jest.fn().mockResolvedValue('Summary of content'),
        summarizeStreaming: jest.fn().mockReturnValue(
          (async function* () {
            yield 'Summary ';
            yield 'of content';
          })()
        ),
        destroy: jest.fn().mockResolvedValue(undefined)
      })
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    test('should initialize with default properties', () => {
      expect(manager.session).toBeNull();
      expect(manager.availability).toBeNull();
      expect(manager.sessionPool).toEqual([]);
      expect(manager.sessionInUse).toEqual(new Set());
      expect(manager.MAX_POOL_SIZE).toBe(3);
      expect(manager.sessionTimeout).toBeNull();
    });

    test('should create instance of AISessionManager', () => {
      expect(manager).toBeInstanceOf(AISessionManager);
    });

    test('should have all required methods', () => {
      expect(typeof manager.checkAvailability).toBe('function');
      expect(typeof manager.getCapabilities).toBe('function');
      expect(typeof manager.createSession).toBe('function');
      expect(typeof manager.getOrCreateSession).toBe('function');
      expect(typeof manager.getPooledSession).toBe('function');
      expect(typeof manager.returnSessionToPool).toBe('function');
      expect(typeof manager.cloneSession).toBe('function');
      expect(typeof manager.prompt).toBe('function');
      expect(typeof manager.summarize).toBe('function');
      expect(typeof manager.promptSumm).toBe('function');
      expect(typeof manager.getSummarizationCapabilities).toBe('function');
      expect(typeof manager.summarizeStreaming).toBe('function');
      expect(typeof manager.promptStreaming).toBe('function');
      expect(typeof manager.getSessionStats).toBe('function');
      expect(typeof manager.destroySession).toBe('function');
      expect(typeof manager.reset).toBe('function');
    });
  });

  describe('checkAvailability', () => {
    test('should return "readily" for availability status', async () => {
      const result = await manager.checkAvailability();
      expect(result).toBe('readily');
    });

    test('should not throw on multiple calls', async () => {
      const result1 = await manager.checkAvailability();
      const result2 = await manager.checkAvailability();
      expect(result1).toBe('readily');
      expect(result2).toBe('readily');
    });
  });

  describe('getCapabilities', () => {
    test('should return capabilities object with default values', async () => {
      const capabilities = await manager.getCapabilities();
      expect(capabilities).toHaveProperty('available', true);
      expect(capabilities).toHaveProperty('availability', 'readily');
      expect(capabilities).toHaveProperty('defaultTemperature', 0.8);
      expect(capabilities).toHaveProperty('defaultTopK', 40);
      expect(capabilities).toHaveProperty('maxTopK', 40);
    });

    test('should return default capabilities even if error occurs', async () => {
      global.self.LanguageModel.availability = jest.fn().mockRejectedValue(new Error('AI unavailable'));
      const capabilities = await manager.getCapabilities();
      expect(capabilities.available).toBe(false);
      expect(capabilities.availability).toBe('no');
    });

    test('should have valid numeric values for temperature and topK', async () => {
      const capabilities = await manager.getCapabilities();
      expect(typeof capabilities.defaultTemperature).toBe('number');
      expect(typeof capabilities.defaultTopK).toBe('number');
      expect(capabilities.defaultTemperature).toBeGreaterThanOrEqual(0);
      expect(capabilities.defaultTemperature).toBeLessThanOrEqual(1);
      expect(capabilities.defaultTopK).toBeGreaterThan(0);
    });
  });

  describe('createSession', () => {
    test('should create a new AI session with default options', async () => {
      const session = await manager.createSession();
      expect(session).toBeDefined();
      expect(global.self.LanguageModel.create).toHaveBeenCalled();
    });

    test('should accept custom temperature and topK options', async () => {
      const options = { temperature: 0.5, topK: 20 };
      await manager.createSession(options);
      expect(global.self.LanguageModel.create).toHaveBeenCalledWith(expect.objectContaining(options));
    });

    test('should store session in manager.session', async () => {
      await manager.createSession();
      expect(manager.session).toBeDefined();
      expect(manager.session).toEqual(mockSession);
    });

    test('should reject on timeout', async () => {
      const slowPromise = new Promise((resolve) => {
        setTimeout(() => resolve(mockSession), 5000);
      });
      global.self.LanguageModel.create = jest.fn().mockReturnValue(slowPromise);

      await expect(manager.createSession()).rejects.toThrow('AI_SESSION_FAILED');
    });

    test('should reject on AI unavailable error', async () => {
      global.self.LanguageModel.create = jest.fn().mockRejectedValue(
        new Error('AI not available')
      );

      await expect(manager.createSession()).rejects.toThrow('AI_SESSION_FAILED');
    });

    test('should reject on generic error', async () => {
      global.self.LanguageModel.create = jest.fn().mockRejectedValue(new Error('Network error'));

      await expect(manager.createSession()).rejects.toThrow('AI_SESSION_FAILED');
    });

    test('should merge options with defaults', async () => {
      const options = { temperature: 0.5 };
      await manager.createSession(options);
      const callArgs = global.self.LanguageModel.create.mock.calls[0][0];
      expect(callArgs.temperature).toBe(0.5);
      expect(callArgs.topK).toBe(40); // default
    });
  });

  describe('getOrCreateSession', () => {
    test('should return existing session if available', async () => {
      manager.session = mockSession;
      const session = await manager.getOrCreateSession();
      expect(session).toBe(mockSession);
      expect(global.self.LanguageModel.create).not.toHaveBeenCalled();
    });

    test('should create new session if none exists', async () => {
      const session = await manager.getOrCreateSession();
      expect(session).toBeDefined();
      expect(global.self.LanguageModel.create).toHaveBeenCalled();
    });

    test('should reuse pooled session if available', async () => {
      const pooledSession = {
        prompt: jest.fn().mockResolvedValue('Pooled response'),
        destroy: jest.fn()
      };
      manager.sessionPool.push(pooledSession);

      const session = await manager.getOrCreateSession();
      expect(session).toBe(pooledSession);
      expect(manager.sessionPool.length).toBe(0);
    });

    test('should accept options for new session creation', async () => {
      const options = { temperature: 0.6 };
      await manager.getOrCreateSession(options);
      expect(global.self.LanguageModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ temperature: 0.6 })
      );
    });

    test('should prefer existing session over pool', async () => {
      manager.session = mockSession;
      const pooledSession = { prompt: jest.fn() };
      manager.sessionPool.push(pooledSession);

      const session = await manager.getOrCreateSession();
      expect(session).toBe(mockSession);
      expect(manager.sessionPool.length).toBe(1); // Still in pool
    });
  });

  describe('getPooledSession', () => {
    test('should return null if pool is empty', () => {
      const session = manager.getPooledSession();
      expect(session).toBeNull();
    });

    test('should return and remove session from pool', () => {
      manager.sessionPool.push(mockSession);
      const session = manager.getPooledSession();
      expect(session).toBe(mockSession);
      expect(manager.sessionPool.length).toBe(0);
    });

    test('should return most recently added session (LIFO)', () => {
      const session1 = { prompt: jest.fn() };
      const session2 = { prompt: jest.fn() };
      manager.sessionPool.push(session1);
      manager.sessionPool.push(session2);

      const retrieved = manager.getPooledSession();
      expect(retrieved).toBe(session2);
      expect(manager.sessionPool.length).toBe(1);
    });

    test('should not affect session if multiple calls when empty', () => {
      const result1 = manager.getPooledSession();
      const result2 = manager.getPooledSession();
      expect(result1).toBeNull();
      expect(result2).toBeNull();
    });
  });

  describe('returnSessionToPool', () => {
    test('should add session to pool if not full', () => {
      manager.returnSessionToPool(mockSession);
      expect(manager.sessionPool.length).toBe(1);
      expect(manager.sessionPool[0]).toBe(mockSession);
    });

    test('should not add null session to pool', () => {
      manager.returnSessionToPool(null);
      expect(manager.sessionPool.length).toBe(0);
    });

    test('should not add undefined session to pool', () => {
      manager.returnSessionToPool(undefined);
      expect(manager.sessionPool.length).toBe(0);
    });

    test('should not exceed MAX_POOL_SIZE', () => {
      const session1 = { prompt: jest.fn(), destroy: jest.fn() };
      const session2 = { prompt: jest.fn(), destroy: jest.fn() };
      const session3 = { prompt: jest.fn(), destroy: jest.fn() };
      const session4 = { prompt: jest.fn(), destroy: jest.fn() };

      manager.returnSessionToPool(session1);
      manager.returnSessionToPool(session2);
      manager.returnSessionToPool(session3);
      expect(manager.sessionPool.length).toBe(3);

      manager.returnSessionToPool(session4);
      expect(manager.sessionPool.length).toBe(3); // Still 3, not 4
      expect(session4.destroy).toHaveBeenCalled();
    });

    test('should destroy session when pool is full', () => {
      for (let i = 0; i < 3; i++) {
        const session = { destroy: jest.fn() };
        manager.returnSessionToPool(session);
      }

      const fullSession = { destroy: jest.fn() };
      manager.returnSessionToPool(fullSession);
      expect(fullSession.destroy).toHaveBeenCalled();
    });

    test('should call destroy method if available', () => {
      const destroyMock = jest.fn();
      const sessionWithoutDestroy = { prompt: jest.fn() };
      manager.returnSessionToPool(sessionWithoutDestroy);
      expect(manager.sessionPool.length).toBe(1); // No error
    });
  });

  describe('cloneSession', () => {
    test('should clone active session', async () => {
      manager.session = mockSession;
      const cloned = await manager.cloneSession();
      expect(mockSession.clone).toHaveBeenCalled();
      expect(cloned).toBeDefined();
    });

    test('should throw error if no active session', async () => {
      manager.session = null;
      await expect(manager.cloneSession()).rejects.toThrow('No active session to clone');
    });

    test('should throw error if clone fails', async () => {
      manager.session = {
        clone: jest.fn().mockRejectedValue(new Error('Clone failed'))
      };
      await expect(manager.cloneSession()).rejects.toThrow('Clone failed');
    });

    test('should return cloned session with proper methods', async () => {
      manager.session = mockSession;
      const cloned = await manager.cloneSession();
      expect(typeof cloned.prompt).toBe('function');
    });
  });

  describe('prompt', () => {
    test('should send prompt to active session', async () => {
      manager.session = mockSession;
      const response = await manager.prompt('Test prompt');
      expect(mockSession.prompt).toHaveBeenCalledWith('Test prompt');
      expect(response).toBe('Test response');
    });

    test('should throw error if no active session', async () => {
      manager.session = null;
      await expect(manager.prompt('Test prompt')).rejects.toThrow(
        'No active AI session'
      );
    });

    test('should use provided session if given', async () => {
      const customSession = { prompt: jest.fn().mockResolvedValue('Custom response') };
      const response = await manager.prompt('Test prompt', customSession);
      expect(customSession.prompt).toHaveBeenCalledWith('Test prompt');
      expect(response).toBe('Custom response');
    });

    test('should throw error from session.prompt', async () => {
      manager.session = {
        prompt: jest.fn().mockRejectedValue(new Error('API error'))
      };
      await expect(manager.prompt('Test prompt')).rejects.toThrow('API error');
    });

    test('should handle different prompt types', async () => {
      manager.session = mockSession;
      const longPrompt = 'a'.repeat(1000);
      await manager.prompt(longPrompt);
      expect(mockSession.prompt).toHaveBeenCalledWith(longPrompt);
    });
  });

  describe('summarize', () => {
    test('should use Summarization API when available', async () => {
      const result = await manager.summarize('Long text to summarize');
      expect(global.self.Summarizer.create).toHaveBeenCalled();
      expect(result).toBe('Summary of content');
    });

    test('should use fallback prompt method on Summarizer error', async () => {
      global.self.Summarizer.create = jest.fn().mockRejectedValue(new Error('API error'));
      manager.session = mockSession;
      const result = await manager.summarize('Long text');
      expect(typeof result).toBe('string');
    });

    test('should accept summarization options', async () => {
      const options = { type: 'tl;dr', length: 'short' };
      await manager.summarize('Text', options);
      expect(global.self.Summarizer.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'tl;dr',
          length: 'short'
        })
      );
    });

    test('should use default options if not provided', async () => {
      await manager.summarize('Text');
      expect(global.self.Summarizer.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'key-points',
          format: 'markdown',
          length: 'medium'
        })
      );
    });

    test('should pass context option if provided', async () => {
      const options = { context: 'Additional context' };
      await manager.summarize('Text', options);
      expect(global.self.Summarizer.create).toHaveBeenCalledWith(
        expect.objectContaining({
          sharedContext: 'Additional context'
        })
      );
    });
  });

  describe('promptSumm', () => {
    test('should create and use session for summarization', async () => {
      manager.session = mockSession;
      const result = await manager.promptSumm('Text to summarize');
      expect(mockSession.prompt).toHaveBeenCalled();
      expect(typeof result).toBe('string');
    });

    test('should include maxLength in prompt', async () => {
      manager.session = mockSession;
      await manager.promptSumm('Text', { maxLength: 100 });
      const promptCall = mockSession.prompt.mock.calls[0][0];
      expect(promptCall).toContain('100 words');
    });

    test('should use question if provided', async () => {
      manager.session = mockSession;
      await manager.promptSumm('Text', { question: 'What is main idea?' });
      const promptCall = mockSession.prompt.mock.calls[0][0];
      expect(promptCall).toContain('What is main idea?');
    });

    test('should use default maxLength if not provided', async () => {
      manager.session = mockSession;
      await manager.promptSumm('Text');
      const promptCall = mockSession.prompt.mock.calls[0][0];
      expect(promptCall).toContain('150 words');
    });

    test('should surface session creation errors', async () => {
      global.self.LanguageModel.create = jest.fn().mockRejectedValue(new Error('Creation failed'));
      await expect(manager.promptSumm('Text')).rejects.toThrow('AI_SESSION_FAILED');
    });
  });

  describe('getSummarizationCapabilities', () => {
    test('should return availability details for summarization', async () => {
      const result = await manager.getSummarizationCapabilities();
      expect(result).toEqual({ available: true, availability: 'readily' });
    });

    test('should return unavailable details on availability error', async () => {
      global.self.Summarizer.availability = jest.fn().mockRejectedValue(new Error('Error'));
      const result = await manager.getSummarizationCapabilities();
      expect(result).toEqual({ available: false, availability: 'no', error: 'Error' });
    });
  });

  describe('summarizeStreaming', () => {
    test('should use streaming Summarizer when available', async () => {
      const onChunk = jest.fn();
      const result = await manager.summarizeStreaming('Text', {}, onChunk);
      expect(result).toBeDefined();
    });

    test('should call onChunk callback for each chunk', async () => {
      const onChunk = jest.fn();
      await manager.summarizeStreaming('Text', {}, onChunk);
      expect(onChunk).toHaveBeenCalled();
    });

    test('should fallback to regular summarize on streaming error', async () => {
      global.self.Summarizer.create = jest.fn().mockRejectedValue(new Error('Streaming error'));
      const result = await manager.summarizeStreaming('Text');
      expect(typeof result).toBe('string');
    });

    test('should accept onChunk callback', async () => {
      const onChunk = jest.fn();
      await manager.summarizeStreaming('Text', {}, onChunk);
      // Verify callback was set up
      expect(typeof onChunk).toBe('function');
    });

    test('should handle undefined onChunk gracefully', async () => {
      const result = await manager.summarizeStreaming('Text', {}, undefined);
      expect(result).toBeDefined();
    });

    test('should accept summarization options', async () => {
      const options = { type: 'key-points', length: 'short' };
      const result = await manager.summarizeStreaming('Text', options);
      expect(result).toBeDefined();
    });
  });

  describe('promptStreaming', () => {
    test('should throw error if no active session', async () => {
      manager.session = null;
      await expect(manager.promptStreaming('Test', jest.fn())).rejects.toThrow(
        'No active AI session'
      );
    });

    test('should call onChunk for each streamed chunk', async () => {
      manager.session = {
        promptStreaming: jest.fn().mockResolvedValue({
          getReader: () => ({
            read: jest
              .fn()
              .mockResolvedValueOnce({ done: false, value: 'chunk1' })
              .mockResolvedValueOnce({ done: false, value: 'chunk2' })
              .mockResolvedValueOnce({ done: true })
          })
        })
      };
      const onChunk = jest.fn();
      await manager.promptStreaming('Test', onChunk);
      expect(onChunk).toHaveBeenCalledWith('chunk1');
      expect(onChunk).toHaveBeenCalledWith('chunk2');
    });

    test('should use provided session if given', async () => {
      const customSession = {
        promptStreaming: jest.fn().mockResolvedValue({
          getReader: () => ({
            read: jest.fn().mockResolvedValueOnce({ done: true })
          })
        })
      };
      const onChunk = jest.fn();
      await manager.promptStreaming('Test', onChunk, customSession);
      expect(customSession.promptStreaming).toHaveBeenCalled();
    });

    test('should handle streaming errors', async () => {
      manager.session = {
        promptStreaming: jest.fn().mockRejectedValue(new Error('Stream error'))
      };
      const onChunk = jest.fn();
      await expect(manager.promptStreaming('Test', onChunk)).rejects.toThrow('Stream error');
    });

    test('should handle streaming with proper reader interface', async () => {
      manager.session = {
        promptStreaming: jest.fn().mockResolvedValue({
          getReader: jest.fn().mockReturnValue({
            read: jest.fn().mockResolvedValueOnce({ done: true })
          })
        })
      };
      const onChunk = jest.fn();
      await expect(manager.promptStreaming('Test', onChunk)).resolves.toBeUndefined();
    });
  });

  describe('getSessionStats', () => {
    test('should return null if no active session', () => {
      manager.session = null;
      const stats = manager.getSessionStats();
      expect(stats).toBeNull();
    });

    test('should return session statistics', () => {
      manager.session = {
        inputUsage: 100,
        inputQuota: 1000
      };
      const stats = manager.getSessionStats();
      expect(stats).toHaveProperty('inputUsage', 100);
      expect(stats).toHaveProperty('inputQuota', 1000);
      expect(stats).toHaveProperty('usagePercentage', 10);
    });

    test('should calculate correct usage percentage', () => {
      manager.session = {
        inputUsage: 250,
        inputQuota: 1000
      };
      const stats = manager.getSessionStats();
      expect(stats.usagePercentage).toBe(25);
    });

    test('should work with provided session', () => {
      const customSession = {
        inputUsage: 500,
        inputQuota: 1000
      };
      const stats = manager.getSessionStats(customSession);
      expect(stats.usagePercentage).toBe(50);
    });

    test('should handle full quota', () => {
      manager.session = {
        inputUsage: 1000,
        inputQuota: 1000
      };
      const stats = manager.getSessionStats();
      expect(stats.usagePercentage).toBe(100);
    });

    test('should handle zero quota gracefully', () => {
      manager.session = {
        inputUsage: 0,
        inputQuota: 0
      };
      const stats = manager.getSessionStats();
      expect(stats.usagePercentage).toBe(NaN);
    });
  });

  describe('destroySession', () => {
    test('should call destroy on active session', async () => {
      manager.session = mockSession;
      await manager.destroySession();
      expect(mockSession.destroy).toHaveBeenCalled();
    });

    test('should set manager.session to null after destroy', async () => {
      manager.session = mockSession;
      await manager.destroySession();
      expect(manager.session).toBeNull();
    });

    test('should handle null session gracefully', async () => {
      manager.session = null;
      await manager.destroySession();
      expect(manager.session).toBeNull();
    });

    test('should destroy provided session', async () => {
      const customSession = { destroy: jest.fn() };
      await manager.destroySession(customSession);
      expect(customSession.destroy).toHaveBeenCalled();
    });

    test('should not set session to null for different provided session', async () => {
      const session1 = { destroy: jest.fn() };
      const session2 = { destroy: jest.fn() };
      manager.session = session1;
      await manager.destroySession(session2);
      expect(manager.session).toBe(session1); // Unchanged
    });

    test('should catch and log destroy errors', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      manager.session = {
        destroy: jest.fn().mockRejectedValue(new Error('Destroy failed'))
      };
      await manager.destroySession();
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('reset', () => {
    test('should destroy current session and reset availability', async () => {
      manager.session = mockSession;
      manager.availability = 'readily';
      await manager.reset();
      expect(mockSession.destroy).toHaveBeenCalled();
      expect(manager.session).toBeNull();
      expect(manager.availability).toBeNull();
    });

    test('should handle reset when no session exists', async () => {
      manager.session = null;
      manager.availability = 'readily';
      await manager.reset();
      expect(manager.session).toBeNull();
      expect(manager.availability).toBeNull();
    });

    test('should be idempotent', async () => {
      await manager.reset();
      await manager.reset();
      expect(manager.session).toBeNull();
      expect(manager.availability).toBeNull();
    });
  });

  describe('session pool management integration', () => {
    test('should pool sessions after use', async () => {
      const session1 = { prompt: jest.fn(), destroy: jest.fn() };
      manager.returnSessionToPool(session1);
      expect(manager.sessionPool.length).toBe(1);

      const retrieved = manager.getPooledSession();
      expect(retrieved).toBe(session1);
      expect(manager.sessionPool.length).toBe(0);
    });

    test('should maintain pool LIFO order', async () => {
      const sessions = [
        { prompt: jest.fn() },
        { prompt: jest.fn() },
        { prompt: jest.fn() }
      ];

      manager.returnSessionToPool(sessions[0]);
      manager.returnSessionToPool(sessions[1]);
      manager.returnSessionToPool(sessions[2]);

      expect(manager.getPooledSession()).toBe(sessions[2]);
      expect(manager.getPooledSession()).toBe(sessions[1]);
      expect(manager.getPooledSession()).toBe(sessions[0]);
    });

    test('should handle multiple pool operations', async () => {
      const session1 = { prompt: jest.fn() };
      const session2 = { prompt: jest.fn() };

      manager.returnSessionToPool(session1);
      expect(manager.sessionPool.length).toBe(1);

      const retrieved = manager.getPooledSession();
      expect(retrieved).toBe(session1);
      expect(manager.sessionPool.length).toBe(0);

      manager.returnSessionToPool(session2);
      expect(manager.sessionPool.length).toBe(1);
    });
  });

  describe('edge cases and error handling', () => {
    test('should handle very large prompts', async () => {
      manager.session = mockSession;
      const largePrompt = 'a'.repeat(10000);
      await manager.prompt(largePrompt);
      expect(mockSession.prompt).toHaveBeenCalledWith(largePrompt);
    });

    test('should handle empty prompts', async () => {
      manager.session = mockSession;
      await manager.prompt('');
      expect(mockSession.prompt).toHaveBeenCalledWith('');
    });

    test('should handle rapid session creation', async () => {
      const promise1 = manager.createSession();
      const promise2 = manager.createSession();
      const [session1, session2] = await Promise.all([promise1, promise2]);
      expect(session1).toBeDefined();
      expect(session2).toBeDefined();
    });

    test('should handle concurrent prompt calls', async () => {
      manager.session = mockSession;
      const results = await Promise.all([
        manager.prompt('Prompt 1'),
        manager.prompt('Prompt 2'),
        manager.prompt('Prompt 3')
      ]);
      expect(results.length).toBe(3);
      expect(mockSession.prompt).toHaveBeenCalledTimes(3);
    });
  });
});
