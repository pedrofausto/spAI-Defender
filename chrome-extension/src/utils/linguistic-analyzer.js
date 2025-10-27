/**
 * Linguistic Feature Analyzer
 * Extracts linguistic features proven effective in phishing detection
 */

export class LinguisticAnalyzer {
  constructor() {
    this.cache = new Map();
  }

  /**
   * Extract all linguistic features from text
   * @param {string} text - Input text
   * @returns {Object} Comprehensive linguistic features
   */
  analyze(text) {
    const cacheKey = text.substring(0, 100);
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const tokens = this.tokenize(text);
    const sentences = this.splitIntoSentences(text);

    const features = {
      lexical: this.extractLexicalFeatures(tokens, sentences),
      syntactic: this.extractSyntacticFeatures(text, tokens, sentences),
      readability: this.calculateReadability(text, sentences),
      structural: this.extractStructuralFeatures(text, tokens),
      temporal: this.extractTemporalFeatures(text),
      overall: {}
    };

    // Calculate overall linguistic anomaly score
    features.overall = this.calculateAnomalyScore(features);

    this.cache.set(cacheKey, features);
    return features;
  }

  /**
   * Tokenize text into words
   */
  tokenize(text) {
    return text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 0);
  }

  /**
   * Split into sentences
   */
  splitIntoSentences(text) {
    return text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  }

  /**
   * Extract lexical features
   */
  extractLexicalFeatures(tokens, sentences) {
    const uniqueTokens = new Set(tokens);
    const totalWords = tokens.length;
    const totalSentences = sentences.length;

    return {
      // Type-token ratio (vocabulary diversity)
      typeTokenRatio: totalWords > 0 ? uniqueTokens.size / totalWords : 0,
      
      // Lexical diversity (unique words ratio)
      lexicalDiversity: uniqueTokens.size / Math.max(totalWords, 1),
      
      // Average word length
      avgWordLength: tokens.reduce((sum, word) => sum + word.length, 0) / Math.max(totalWords, 1),
      
      // Long word ratio (words > 10 chars)
      longWordRatio: tokens.filter(w => w.length > 10).length / Math.max(totalWords, 1),
      
      // Avg sentence length
      avgSentenceLength: totalSentences > 0 ? totalWords / totalSentences : 0,
      
      // Unique token count
      uniqueTokens: uniqueTokens.size,
      
      // Total tokens
      totalTokens: totalWords
    };
  }

  /**
   * Extract syntactic features
   */
  extractSyntacticFeatures(text, tokens, sentences) {
    const uppercaseChars = (text.match(/[A-Z]/g) || []).length;
    const specialChars = (text.match(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/g) || []).length;
    const numericChars = (text.match(/\d/g) || []).length;
    const totalChars = text.length;

    return {
      // Uppercase ratio
      uppercaseRatio: totalChars > 0 ? uppercaseChars / totalChars : 0,
      
      // Special character density
      specialCharDensity: totalChars > 0 ? specialChars / totalChars : 0,
      
      // Numeric character density
      numericDensity: totalChars > 0 ? numericChars / totalChars : 0,
      
      // Exclamation density
      exclamationDensity: (text.match(/!/g) || []).length / Math.max(sentences.length, 1),
      
      // Question mark density
      questionDensity: (text.match(/\?/g) || []).length / Math.max(sentences.length, 1),
      
      // Exclamation/question ratio (phishing often uses these)
      urgencyPunctRatio: (text.match(/[!?]/g) || []).length / Math.max(sentences.length, 1),
      
      // Capitalization pattern (ALL CAPS words)
      allCapsWords: text.split(/\s+/).filter(w => w === w.toUpperCase() && w.length > 1).length,
      
      // Sentence complexity (avg punctuation per sentence)
      punctuationPerSentence: specialChars / Math.max(sentences.length, 1)
    };
  }

  /**
   * Calculate readability scores
   */
  calculateReadability(text, sentences) {
    const words = this.tokenize(text);
    const syllables = this.countSyllables(text);
    const avgSentenceLength = sentences.length > 0 ? words.length / sentences.length : 0;
    const avgSyllablesPerWord = words.length > 0 ? syllables / words.length : 0;

    // Flesch Reading Ease Score
    // 206.835 - (1.015 × ASL) - (84.6 × ASW)
    // Higher score = easier to read, lower = harder
    const fleschScore = 206.835 - (1.015 * avgSentenceLength) - (84.6 * avgSyllablesPerWord);

    // Automated Readability Index
    // 4.71 × (characters ÷ words) + 0.5 × (words ÷ sentences) - 21.43
    const characters = text.replace(/\s/g, '').length;
    const ariScore = 4.71 * (characters / Math.max(words.length, 1)) + 
                     0.5 * (words.length / Math.max(sentences.length, 1)) - 21.43;

    return {
      fleschScore: Math.max(0, Math.min(100, fleschScore)),
      ariScore: Math.max(0, ariScore),
      avgSyllablesPerWord,
      avgSentenceLength,
      // Simplified difficulty
      difficulty: this.categorizeDifficulty(fleschScore)
    };
  }

  /**
   * Count syllables in text
   */
  countSyllables(text) {
    const words = text.toLowerCase().match(/\b[a-z]+\b/g) || [];
    let syllables = 0;

    for (const word of words) {
      let wordSyllables = 0;
      const vowels = 'aeiouy';
      let wasVowel = false;

      for (const char of word) {
        const isVowel = vowels.includes(char);
        if (isVowel && !wasVowel) {
          wordSyllables++;
        }
        wasVowel = isVowel;
      }

      // Every word has at least one syllable
      if (wordSyllables === 0) {
        wordSyllables = 1;
      }

      // E at the end usually silent
      if (word.endsWith('e')) {
        wordSyllables--;
      }

      syllables += Math.max(1, wordSyllables);
    }

    return syllables;
  }

  /**
   * Categorize reading difficulty
   */
  categorizeDifficulty(fleschScore) {
    if (fleschScore >= 90) return 'very-easy';
    if (fleschScore >= 80) return 'easy';
    if (fleschScore >= 70) return 'fairly-easy';
    if (fleschScore >= 60) return 'standard';
    if (fleschScore >= 50) return 'fairly-difficult';
    if (fleschScore >= 30) return 'difficult';
    return 'very-difficult';
  }

  /**
   * Extract structural features
   */
  extractStructuralFeatures(text, tokens) {
    const urls = text.match(/https?:\/\/[^\s]+/g) || [];
    const emailPatterns = text.match(/[\w\.-]+@[\w\.-]+\.\w+/g) || [];
    const phonePatterns = text.match(/[\d\-\(\)\s]{10,}/g) || [];

    return {
      // URL count
      urlCount: urls.length,
      
      // URL character density
      urlCharRatio: urls.join('').length / Math.max(text.length, 1),
      
      // Email count
      emailCount: emailPatterns.length,
      
      // Phone pattern count
      phoneCount: phonePatterns.length,
      
      // Hyperlink density (phishing often has many links)
      hyperlinkDensity: text.split(/\[.*?\]\(.*?\)/g).length - 1,
      
      // Form-related keywords
      formKeywords: this.countKeywords(tokens, ['form', 'submit', 'enter', 'input', 'field']),
      
      // Button/keyword count
      actionKeywords: this.countKeywords(tokens, ['button', 'click', 'submit', 'confirm', 'proceed'])
    };
  }

  /**
   * Extract temporal features
   */
  extractTemporalFeatures(text) {
    const timePatterns = text.match(/\d{1,2}\s*(hour|hours|hr|hrs|minute|minutes|min|mins|day|days|week|weeks|month|months)/gi) || [];
    const deadlineKeywords = ['deadline', 'expires', 'expire', 'expiry', 'end', 'closes', 'closing', 'limit'];
    const deadlineCount = deadlineKeywords.reduce((count, keyword) => {
      const regex = new RegExp(keyword, 'gi');
      return count + (text.match(regex) || []).length;
    }, 0);

    return {
      timePressureCount: timePatterns.length + deadlineCount,
      hasTimeLimit: timePatterns.length > 0 || deadlineCount > 0,
      urgencyMarkers: timePatterns.length
    };
  }

  /**
   * Count keyword occurrences
   */
  countKeywords(tokens, keywords) {
    const lowerTokens = new Set(tokens);
    return keywords.filter(keyword => lowerTokens.has(keyword.toLowerCase())).length;
  }

  /**
   * Calculate overall linguistic anomaly score
   */
  calculateAnomalyScore(features) {
    let anomalyScore = 0;
    const anomalies = [];

    // High urgency punctuation
    if (features.syntactic.urgencyPunctRatio > 0.5) {
      anomalyScore += 0.15;
      anomalies.push('excessive-urgency-punctuation');
    }

    // Very simple language (Flesch > 90) in context of credentials
    if (features.readability.fleschScore > 90 && features.lexical.avgWordLength < 4) {
      anomalyScore += 0.10;
      anomalies.push('oversimplified-language');
    }

    // All caps words (screaming)
    if (features.syntactic.allCapsWords > 2) {
      anomalyScore += 0.12;
      anomalies.push('excessive-capitalization');
    }

    // Special character overload
    if (features.syntactic.specialCharDensity > 0.15) {
      anomalyScore += 0.10;
      anomalies.push('excessive-special-chars');
    }

    // Many URLs in short text
    if (features.structural.urlCount > 3) {
      anomalyScore += 0.15;
      anomalies.push('excessive-urls');
    }

    // Very short sentences (phishing often brief)
    if (features.lexical.avgSentenceLength < 8) {
      anomalyScore += 0.08;
      anomalies.push('very-short-sentences');
    }

    // High exclamation density
    if (features.syntactic.exclamationDensity > 1.5) {
      anomalyScore += 0.12;
      anomalies.push('excessive-exclamations');
    }

    // Time pressure indicators
    if (features.temporal.hasTimeLimit) {
      anomalyScore += 0.08;
      anomalies.push('time-pressure-detected');
    }

    return {
      score: Math.min(1, anomalyScore),
      anomalies,
      riskLevel: this.categorizeAnomalyRisk(anomalyScore)
    };
  }

  /**
   * Categorize anomaly risk level
   */
  categorizeAnomalyRisk(score) {
    if (score >= 0.7) return 'HIGH';
    if (score >= 0.4) return 'MEDIUM';
    if (score >= 0.2) return 'LOW';
    return 'VERY_LOW';
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }
}

export default LinguisticAnalyzer;

