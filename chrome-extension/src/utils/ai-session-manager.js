/**
 * AI Session Manager
 * Manages Chrome Built-in AI Prompt API sessions
 */

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
   * Actually checks the Chrome Built-in AI LanguageModel API
   * @returns {Promise<string>} Availability status: 'readily', 'after-download', or 'no'
   */
  async checkAvailability() {
    // Return cached result if already checked
    if (this.availabilityChecked && this.availability) {
      return this.availability;
    }

    try {
      // Check if LanguageModel API exists
      if (typeof self === 'undefined' || !self.LanguageModel) {
        console.warn('🤖 Chrome Built-in AI: NOT AVAILABLE (LanguageModel API not found)');
        this.availability = 'no';
        this.aiAvailable = false;
        this.availabilityChecked = true;
        return 'no';
      }

      // Check actual capabilities with timeout
      const TIMEOUT_MS = 2000;
      const capabilitiesPromise = self.LanguageModel.capabilities();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Capabilities check timeout')), TIMEOUT_MS)
      );

      const capabilities = await Promise.race([capabilitiesPromise, timeoutPromise]);
      this.availability = capabilities?.available || 'no';
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
   * Actually calls the Chrome Built-in AI API
   * @returns {Promise<Object>} Model capabilities
   */
  async getCapabilities() {
    try {
      // First check availability
      const availability = await this.checkAvailability();

      if (availability === 'no' || !self.LanguageModel) {
        return {
          available: false,
          availability: 'no',
          defaultTemperature: 0.8,
          defaultTopK: 40,
          maxTopK: 40,
          error: 'Chrome Built-in AI not available'
        };
      }

      // Get real capabilities from the API
      const capabilities = await self.LanguageModel.capabilities();
      return {
        available: true,
        availability: capabilities?.available || 'no',
        defaultTemperature: capabilities?.defaultTemperature || 0.8,
        defaultTopK: capabilities?.defaultTopK || 40,
        maxTopK: capabilities?.maxTopK || 40
      };

    } catch (error) {
      console.error('🤖 Error getting AI capabilities:', error);
      return {
        available: false,
        availability: 'no',
        defaultTemperature: 0.8,
        defaultTopK: 40,
        maxTopK: 40,
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
      const sessionOptions = {
        temperature: options.temperature || 0.8,
        topK: options.topK || 40,
        ...options
      };

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
      const response = await activeSession.prompt(prompt);
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
    try {
      // PRIMARY: Use Summarization API first
      console.log('📝 Using Summarization API');

      // Create summarizer with options
      const summarizerOptions = {
        type: options.type || 'key-points',
        format: options.format || 'markdown',
        length: options.length || 'medium',
        sharedContext: options.context || ''
      };

      const summarizer = await self.Summarizer.create(summarizerOptions);
      const summary = await summarizer.summarize(text, {
        context: options.context || ''
      });
      await summarizer.destroy();
      return summary;
    } catch (error) {
      console.warn('Summarization API failed, using fallback:', error);
      // FALLBACK: Use Prompt API
      console.log('📝 Using FALLBACK: Prompt API');
      return await this.promptSumm(text, options);
    }
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

      const summary = await session.prompt(prompt);
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
      // Assume summarization is available (NEW API on self.Summarizer)
      return true;
    } catch (error) {
      console.error('Error getting summarization capabilities:', error);
      // Return true anyway to keep extension functional
      return true;
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
    try {
      // NEW API: Check if Summarizer exists (directly on self)
      if (typeof self.Summarizer !== 'undefined') {
        console.log('📝 Using STREAMING: Summarization API (NEW API)');

        const summarizerOptions = {
          type: options.type || 'key-points',
          format: options.format || 'markdown',
          length: options.length || 'medium',
          sharedContext: options.context || ''
        };

        // NEW API: await self.Summarizer.create()
        const summarizer = await self.Summarizer.create(summarizerOptions);

        // Use streaming summarization
        let fullSummary = '';
        const stream = summarizer.summarizeStreaming(text, {
          context: options.context || ''
        });

        for await (const chunk of stream) {
          fullSummary = chunk;
          if (onChunk && typeof onChunk === 'function') {
            onChunk(chunk);
          }
        }

        await summarizer.destroy();
        return fullSummary;
      }
    } catch (error) {
      console.warn('Streaming summarization failed, using fallback:', error);
    }

    // Fallback to batch summarization
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
      const stream = await activeSession.promptStreaming(prompt);
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
