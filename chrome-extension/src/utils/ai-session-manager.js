/**
 * AI Session Manager
 * Manages Chrome Built-in AI Prompt API sessions
 */

export class AISessionManager {
  constructor() {
    this.session = null;
    this.availability = null;
  }

  /**
   * Check if the AI model is available
   * @returns {Promise<string>} Availability status
   */
  async checkAvailability() {
    try {
      // Check if the API exists (use self in service worker context)
      if (!self.ai || !self.ai.languageModel) {
        console.warn('Built-in AI API not available');
        return 'unavailable';
      }

      this.availability = await self.ai.languageModel.availability();
      return this.availability;
    } catch (error) {
      console.error('Error checking AI availability:', error);
      return 'unavailable';
    }
  }

  /**
   * Get AI model capabilities
   * @returns {Promise<Object>} Model capabilities
   */
  async getCapabilities() {
    try {
      if (!self.ai || !self.ai.languageModel) {
        return null;
      }

      const capabilities = await self.ai.languageModel.capabilities();
      return {
        available: capabilities.available,
        defaultTemperature: capabilities.defaultTemperature,
        defaultTopK: capabilities.defaultTopK,
        maxTopK: capabilities.maxTopK
      };
    } catch (error) {
      console.error('Error getting AI capabilities:', error);
      return null;
    }
  }

  /**
   * Create a new AI session
   * @param {Object} options - Session options
   * @returns {Promise<Object>} AI session
   */
  async createSession(options = {}) {
    try {
      // Check availability first
      const availability = await this.checkAvailability();

      if (availability === 'unavailable') {
        throw new Error('AI model is not available on this device');
      }

      if (availability === 'after-download') {
        console.log('AI model needs to be downloaded');
        // Note: User interaction required for download
        throw new Error('AI model download required. Please allow the download when prompted.');
      }

      // Default session options
      const sessionOptions = {
        temperature: options.temperature || 0.8,
        topK: options.topK || 40,
        ...options
      };

      // Create session
      this.session = await self.ai.languageModel.create(sessionOptions);

      console.log('AI session created successfully');
      return this.session;

    } catch (error) {
      console.error('Error creating AI session:', error);
      throw error;
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
    return await this.createSession(options);
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
      if (self.ai && self.ai.summarize) {
        const summaryOptions = {
          text,
          maxItems: options.maxItems || 5,
          question: options.question,
          metadata: options.metadata,
          ...options
        };

        console.log('📝 Using PRIMARY: Summarization API');
        const summary = await self.ai.summarize(summaryOptions);
        return summary;
      }
    } catch (error) {
      console.warn('Summarization API failed, using fallback:', error);
    }

    // FALLBACK: Use Prompt API only if Summarization fails
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
      if (!self.ai || !self.ai.summarize || !self.ai.capabilities) {
        return null;
      }

      return await self.ai.capabilities('summarization');
    } catch (error) {
      console.error('Error getting summarization capabilities:', error);
      return null;
    }
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
