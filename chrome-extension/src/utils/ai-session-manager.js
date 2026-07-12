/**
 * AI Session Manager
 * Manages Chrome Built-in AI Prompt API sessions
 */

const SUPPORTED_OUTPUT_LANGUAGES = new Set(['de', 'en', 'es', 'fr', 'ja']);

function pickOutputLanguage() {
  const raw = (typeof navigator !== 'undefined' && navigator.language ? navigator.language : 'en').toLowerCase();
  const lang = raw.split('-')[0];
  return SUPPORTED_OUTPUT_LANGUAGES.has(lang) ? lang : 'en';
}


function normalizeSummarizerOptions(inputOptions = {}) {
  const options = { ...(inputOptions || {}) };
  options.outputLanguage = SUPPORTED_OUTPUT_LANGUAGES.has(options.outputLanguage)
    ? options.outputLanguage
    : pickOutputLanguage();
  return options;
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
  if (typeof self === 'undefined' || !self.LanguageModel) return 'no';
  const normalized = normalizeSessionOptions(options);
  if (typeof self.LanguageModel.availability === 'function') {
    return await self.LanguageModel.availability(normalized);
  }
  if (typeof self.LanguageModel.capabilities === 'function') {
    const capabilities = await self.LanguageModel.capabilities(normalized);
    return capabilities?.available || capabilities?.availability || 'no';
  }
  return typeof self.LanguageModel.create === 'function' ? 'readily' : 'no';
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

async function getSummarizerAvailability(options = {}) {
  if (typeof self === 'undefined' || !self.Summarizer) return 'no';
  const normalized = normalizeSummarizerOptions(options);
  if (typeof self.Summarizer.availability === 'function') {
    return await self.Summarizer.availability(normalized);
  }
  return typeof self.Summarizer.create === 'function' ? 'readily' : 'no';
}
export class AISessionManager {
  constructor() {
    this.session = null;
    this.availability = null;
    this.availabilityChecked = false; // Cache availability check result
    this.aiAvailable = false; // Track if AI is actually available
    this.sessionPool = []; // Pool of reusable sessions
    this.sessionInUse = new Set(); // Track which sessions are currently in use
    this.MAX_POOL_SIZE = 3; // Maximum cached sessions
    this.sessionTimeout = null; // Timeout for releasing hung sessions
  }

  /**
   * Check if the AI model is available
   * @returns {Promise<string>} Availability status: 'readily', 'after-download', or 'no'
   */
  async checkAvailability(options = {}) {
    if (this.availabilityChecked && this.availability) {
      return this.availability;
    }

    try {
      if (typeof self === 'undefined' || !self.LanguageModel) {
        console.warn('🤖 Chrome Built-in AI: NOT AVAILABLE (LanguageModel API not found)');
        this.availability = 'no';
        this.aiAvailable = false;
        this.availabilityChecked = true;
        return 'no';
      }

      const TIMEOUT_MS = 2000;
      const availabilityPromise = getLanguageModelAvailability(options);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Availability check timeout')), TIMEOUT_MS)
      );

      this.availability = await Promise.race([availabilityPromise, timeoutPromise]);
      this.aiAvailable = this.availability === 'readily' || this.availability === 'after-download';
      this.availabilityChecked = true;

      console.log(`🤖 Chrome Built-in AI: ${this.availability.toUpperCase()}`);
      return this.availability;

    } catch (error) {
      console.warn('🤖 Chrome Built-in AI: NOT AVAILABLE -', error.message);
      this.availability = 'no';
      this.aiAvailable = false;
      this.availabilityChecked = true;
      return 'no';
    }
  }

  /**
   * Check if AI is available (sync getter after async check)
   * @returns {boolean} Whether AI is available
   */
  isAIAvailable() {
    return this.aiAvailable;
  }

  /**
   * Get AI model capabilities
   * @returns {Promise<Object>} Model capabilities
   */
  async getCapabilities() {
    try {
      const options = normalizeSessionOptions();
      const availability = await this.checkAvailability(options);
      const params = await getLanguageModelParams(options);

      return {
        available: availability === 'readily' || availability === 'after-download',
        availability,
        ...params,
        error: availability === 'no' ? 'Chrome Built-in AI not available' : undefined
      };

    } catch (error) {
      console.error('🤖 Error getting AI capabilities:', error);
      return {
        available: false,
        availability: 'no',
        ...normalizeLanguageModelParams(),
        error: error.message
      };
    }
  }

  /**
   * Create a new AI session
   * Throws error if AI is not available (no mock fallback)
   * @param {Object} options - Session options
   * @returns {Promise<Object>} AI session
   * @throws {Error} If AI is not available
   */
  async createSession(options = {}) {
    // First check availability - this prevents wasting time on unavailable AI
    const availability = await this.checkAvailability();

    if (availability === 'no') {
      const error = new Error('AI_UNAVAILABLE: Chrome Built-in AI is not available');
      error.code = 'AI_UNAVAILABLE';
      console.warn('🤖 Cannot create AI session:', error.message);
      throw error;
    }

    try {
      // Default session options
      const sessionOptions = normalizeSessionOptions({
        temperature: options.temperature || 0.8,
        topK: options.topK || 40,
        ...options
      });

      // Create session with timeout (3 seconds for faster feedback)
      const TIMEOUT_MS = 3000;

      const createSessionPromise = self.LanguageModel.create(sessionOptions);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('AI session creation timeout (3s)')), TIMEOUT_MS)
      );

      this.session = await Promise.race([createSessionPromise, timeoutPromise]);
      console.log('🤖 AI session created successfully');
      return this.session;

    } catch (error) {
      // Mark AI as unavailable on any creation error
      this.aiAvailable = false;
      this.availability = 'no';

      // Create a descriptive error
      const wrappedError = new Error(`AI_SESSION_FAILED: ${error.message}`);
      wrappedError.code = 'AI_SESSION_FAILED';
      wrappedError.originalError = error;

      console.error('🤖 AI session creation failed:', error.message);
      throw wrappedError; // Throw instead of returning mock - let callers handle it
    }
  }

  /**
   * Get current session or create a new one
   * @param {Object} options - Session options
   * @returns {Promise<Object>} AI session
   */
  async getOrCreateSession(options = {}) {
    if (this.session) {
      return this.session;
    }

    // Try to get a session from the pool
    if (this.sessionPool.length > 0) {
      const pooledSession = this.sessionPool.pop();
      console.log(`♻️ Reusing session from pool (${this.sessionPool.length} remaining)`);
      return pooledSession;
    }

    return await this.createSession(options);
  }

  /**
   * Get a session from pool without creating new one
   * @returns {Object|null} Pooled session or null
   */
  getPooledSession() {
    if (this.sessionPool.length > 0) {
      const session = this.sessionPool.pop();
      console.log(`♻️ Retrieved pooled session (${this.sessionPool.length} remaining)`);
      return session;
    }
    return null;
  }

  /**
   * Return a session to the pool for reuse
   * @param {Object} session - Session to return to pool
   */
  returnSessionToPool(session) {
    if (!session) return;

    if (this.sessionPool.length < this.MAX_POOL_SIZE) {
      this.sessionPool.push(session);
      console.log(`📦 Session returned to pool (${this.sessionPool.length}/${this.MAX_POOL_SIZE})`);
    } else {
      // Pool is full, destroy the session
      session.destroy?.();
      console.log('🗑️ Session destroyed (pool full)');
    }
  }

  /**
   * Clone existing session (preserves context with less resource usage)
   * @returns {Promise<Object>} Cloned session
   */
  async cloneSession() {
    if (!this.session) {
      throw new Error('No active session to clone');
    }

    try {
      const clonedSession = await this.session.clone();
      return clonedSession;
    } catch (error) {
      console.error('Error cloning session:', error);
      throw error;
    }
  }

  /**
   * Send prompt to AI model
   * @param {string} prompt - The prompt text
   * @param {Object} session - Optional specific session to use
   * @returns {Promise<string>} AI response
   */
  async prompt(prompt, session = null) {
    const activeSession = session || this.session;

    if (!activeSession) {
      throw new Error('No active AI session. Create a session first.');
    }

    try {
      const response = await activeSession.prompt(prompt, { outputLanguage: pickOutputLanguage() });
      return response;
    } catch (error) {
      console.error('Error sending prompt:', error);
      throw error;
    }
  }

  /**
   * Summarize text using the Summarization API (PRIMARY)
   * @param {string} text - Text to summarize
   * @param {Object} options - Summary options
   * @returns {Promise<string>} Summary
   */
  async summarize(text, options = {}) {
    const summarizerOptions = normalizeSummarizerOptions({
      type: options.type || 'key-points',
      format: options.format || 'markdown',
      length: options.length || 'medium',
      sharedContext: options.context || '',
      outputLanguage: options.outputLanguage
    });

    const availability = await getSummarizerAvailability(summarizerOptions);
    if (availability === 'readily' || availability === 'after-download') {
      let summarizer = null;
      try {
        console.log('📝 Using Summarization API');
        summarizer = await self.Summarizer.create(summarizerOptions);
        return await summarizer.summarize(text, { context: options.context || '' });
      } catch (error) {
        console.warn('Summarization API failed, using fallback:', error);
      } finally {
        await summarizer?.destroy?.();
      }
    }

    console.log('📝 Using FALLBACK: Prompt API');
    return await this.promptSumm(text, options);
  }
  /**
   * Fallback: Summarize using prompt (when API not available)
   * @param {string} text - Text to summarize
   * @param {Object} options - Summary options
   * @returns {Promise<string>} Summary
   */
  async promptSumm(text, options = {}) {
    try {
      const session = await this.getOrCreateSession({ temperature: 0.7, topK: 40 });
      
      const maxLength = options.maxLength || 150;
      const question = options.question || '';
      
      let prompt = `Summarize the following content in no more than ${maxLength} words:\n\n${text}`;
      
      if (question) {
        prompt = `Answer this question about the content: "${question}"\n\nContent:\n${text}\n\nProvide a concise answer (max ${maxLength} words):`;
      }

      const summary = await session.prompt(prompt, { outputLanguage: pickOutputLanguage() });
      return summary;

    } catch (error) {
      console.error('Error in prompt-based summarization:', error);
      throw error;
    }
  }

  /**
   * Get summarization capabilities
   * @returns {Promise<Object>} Capabilities
   */
  async getSummarizationCapabilities() {
    try {
      const availability = await getSummarizerAvailability();
      return {
        available: availability === 'readily' || availability === 'after-download',
        availability
      };
    } catch (error) {
      console.error('Error getting summarization capabilities:', error);
      return {
        available: false,
        availability: 'no',
        error: error.message
      };
    }
  }
  /**
   * Summarize with streaming for real-time results
   * @param {string} text - Text to summarize
   * @param {Object} options - Summary options
   * @param {Function} onChunk - Callback for each chunk
   * @returns {Promise<string>} Complete summary
   */
  async summarizeStreaming(text, options = {}, onChunk) {
    const summarizerOptions = normalizeSummarizerOptions({
      type: options.type || 'key-points',
      format: options.format || 'markdown',
      length: options.length || 'medium',
      sharedContext: options.context || '',
      outputLanguage: options.outputLanguage
    });

    try {
      const availability = await getSummarizerAvailability(summarizerOptions);
      if (availability === 'readily' || availability === 'after-download') {
        console.log('📝 Using STREAMING: Summarization API');
        let summarizer = null;
        try {
          summarizer = await self.Summarizer.create(summarizerOptions);
          let fullSummary = '';
          const stream = summarizer.summarizeStreaming(text, { context: options.context || '' });

          for await (const chunk of stream) {
            fullSummary = chunk;
            if (onChunk && typeof onChunk === 'function') {
              onChunk(chunk);
            }
          }

          return fullSummary;
        } finally {
          await summarizer?.destroy?.();
        }
      }
    } catch (error) {
      console.warn('Streaming summarization failed, using fallback:', error);
    }

    return await this.summarize(text, options);
  }
  /**
   * Send prompt with streaming response
   * @param {string} prompt - The prompt text
   * @param {Function} onChunk - Callback for each response chunk
   * @param {Object} session - Optional specific session to use
   * @returns {Promise<void>}
   */
  async promptStreaming(prompt, onChunk, session = null) {
    const activeSession = session || this.session;

    if (!activeSession) {
      throw new Error('No active AI session. Create a session first.');
    }

    try {
      const stream = await activeSession.promptStreaming(prompt, { outputLanguage: pickOutputLanguage() });
      const reader = stream.getReader();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        if (onChunk && typeof onChunk === 'function') {
          onChunk(value);
        }
      }
    } catch (error) {
      console.error('Error in streaming prompt:', error);
      throw error;
    }
  }

  /**
   * Get session usage statistics
   * @param {Object} session - Optional specific session
   * @returns {Object} Usage stats
   */
  getSessionStats(session = null) {
    const activeSession = session || this.session;

    if (!activeSession) {
      return null;
    }

    return {
      inputUsage: activeSession.inputUsage,
      inputQuota: activeSession.inputQuota,
      usagePercentage: (activeSession.inputUsage / activeSession.inputQuota) * 100
    };
  }

  /**
   * Destroy the current session
   * @param {Object} session - Optional specific session to destroy
   */
  async destroySession(session = null) {
    const activeSession = session || this.session;

    if (!activeSession) {
      return;
    }

    try {
      await activeSession.destroy();
      if (activeSession === this.session) {
        this.session = null;
      }
      console.log('AI session destroyed');
    } catch (error) {
      console.error('Error destroying session:', error);
    }
  }

  /**
   * Reset the manager
   */
  async reset() {
    await this.destroySession();
    this.availability = null;
  }
}

export default AISessionManager;
