/**
 * Phishing-Specific Lexicons
 * Domain-specific word lists with weighted scores based on phishing research
 */

export class PhishingLexicons {
  constructor() {
    this.lexicons = this.initializeLexicons();
    this.cache = new Map();
    this.cacheMaxSize = 100;
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Initialize all domain-specific lexicons
   */
  initializeLexicons() {
    return {
      // Temporal pressure and urgency indicators
      urgency: {
        'immediately': 0.95,
        'urgent': 0.90,
        'act now': 0.95,
        'asap': 0.90,
        'right away': 0.85,
        'hurry': 0.80,
        'limited time': 0.85,
        'expires soon': 0.85,
        'last chance': 0.90,
        'only today': 0.80,
        'today only': 0.80,
        'within 24 hours': 0.90,
        'deadline': 0.75,
        'urgently': 0.88,
        'promptly': 0.70,
        'quickly': 0.65,
        'fast': 0.60,
        'instant': 0.85,
        'now': 0.65,
        'today': 0.55,
        'immediate': 0.88
      },

      // Authority impersonation patterns
      authority: {
        'verify': 0.92,
        'confirm': 0.90,
        'update': 0.88,
        'security alert': 0.95,
        'account suspended': 0.98,
        'account locked': 0.95,
        'violation detected': 0.98,
        'fraud detected': 0.96,
        'unauthorized access': 0.94,
        'suspicious activity': 0.93,
        'administrator': 0.85,
        'admin': 0.80,
        'support team': 0.75,
        'security team': 0.80,
        'compliance': 0.70,
        'required action': 0.85,
        'mandatory': 0.90,
        'must': 0.80,
        'should': 0.60,
        'need to': 0.70,
        'required': 0.85,
        'fail to': 0.88
      },

      // Fear-based and threat language
      fear: {
        'suspended': 0.95,
        'locked': 0.93,
        'terminated': 0.96,
        'discontinued': 0.94,
        'canceled': 0.92,
        'deleted': 0.94,
        'lost': 0.88,
        'compromised': 0.95,
        'stolen': 0.96,
        'hacked': 0.95,
        'breach': 0.94,
        'attack': 0.92,
        'fraud': 0.93,
        'unauthorized': 0.91,
        'blocked': 0.90,
        'restricted': 0.89,
        'overdue': 0.87,
        'penalty': 0.88,
        'fine': 0.85,
        'charge': 0.80,
        'threat': 0.92,
        'legal action': 0.90,
        'account will be': 0.86,
        'will lose': 0.87
      },

      // Reward and financial gain language
      reward: {
        'prize': 0.92,
        'winner': 0.95,
        'congratulations': 0.93,
        'you have won': 0.96,
        'claim now': 0.94,
        'free': 0.70,
        'bonus': 0.80,
        'special offer': 0.75,
        'exclusive': 0.78,
        'lucky': 0.85,
        'selected': 0.82,
        'limited edition': 0.80,
        'gift': 0.75,
        'cash': 0.85,
        'refund': 0.88,
        'compensation': 0.83,
        'reward': 0.79,
        'earn': 0.72,
        'savings': 0.65,
        'discount': 0.70,
        'money': 0.75,
        'payment': 0.68,
        'withdrawal': 0.80
      },

      // Action and command verbs
      action: {
        'click': 0.92,
        'click here': 0.96,
        'download': 0.85,
        'download now': 0.94,
        'install': 0.80,
        'update': 0.78,
        'upgrade': 0.75,
        'activate': 0.82,
        'verify': 0.90,
        'login': 0.88,
        'sign in': 0.86,
        'enter': 0.74,
        'submit': 0.83,
        'confirm': 0.89,
        'accept': 0.80,
        'approve': 0.78,
        'enable': 0.76,
        'open': 0.73,
        'get': 0.65,
        'receive': 0.70,
        'send': 0.75,
        'reply': 0.72,
        'forward': 0.70,
        'call': 0.85
      },

      // Credential and sensitive information requests
      credential: {
        'password': 0.94,
        'username': 0.88,
        'login credentials': 0.97,
        'account number': 0.95,
        'social security': 0.98,
        'ssn': 0.97,
        'credit card': 0.96,
        'cvv': 0.95,
        'pin': 0.94,
        'bank account': 0.96,
        'routing number': 0.97,
        'date of birth': 0.92,
        'mother maiden name': 0.95,
        'security question': 0.93,
        'secret answer': 0.94,
        'personal information': 0.90,
        'verify identity': 0.91,
        'confirm details': 0.89,
        'update information': 0.86,
        'billing information': 0.87,
        'payment method': 0.84
      },

      // Trust and legitimacy markers
      trust: {
        'official': 0.45,
        'secure': 0.35,
        'verified': 0.38,
        'certified': 0.40,
        'guaranteed': 0.42,
        'insured': 0.37,
        'protected': 0.36,
        'encrypted': 0.32,
        'safe': 0.30,
        'trusted': 0.33,
        'certificate': 0.38,
        'authentic': 0.35,
        'legitimate': 0.32,
        'genuine': 0.33,
        'authorized': 0.36
      }
    };
  }

  /**
   * Calculate lexicon scores for text
   * @param {string} text - Input text to analyze
   * @returns {Object} Lexicon scores with detailed breakdown
   */
  calculateLexiconScores(text) {
    const cacheKey = text.substring(0, 100);
    const cached = this._getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    const normalizedText = text.toLowerCase();
    const scores = {
      urgency: 0,
      authority: 0,
      fear: 0,
      reward: 0,
      action: 0,
      credential: 0,
      trust: 0
    };

    const matches = {
      urgency: [],
      authority: [],
      fear: [],
      reward: [],
      action: [],
      credential: [],
      trust: []
    };

    // Calculate scores for each lexicon
    for (const [lexiconName, lexicon] of Object.entries(this.lexicons)) {
      if (lexiconName === 'trust') continue; // Trust handled separately

      let maxScore = 0;
      for (const [term, weight] of Object.entries(lexicon)) {
        const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        const found = regex.test(normalizedText);

        if (found) {
          maxScore = Math.max(maxScore, weight);
          matches[lexiconName].push({ term, weight });
        }
      }

      scores[lexiconName] = maxScore;
    }

    // Calculate trust manipulation (high trust words in suspicious context)
    const trustScore = scores.credential > 0 || scores.action > 0
      ? this.calculateTrustManipulation(normalizedText)
      : 0;

    scores.trust = trustScore;

    // Calculate overall phishing score from lexicon
    const phishingScore = (
      scores.urgency * 0.20 +
      scores.authority * 0.25 +
      scores.fear * 0.25 +
      scores.action * 0.15 +
      scores.credential * 0.15
    ) * 100;

    const result = {
      scores,
      matches,
      phishingScore,
      dominantLexicons: this.getDominantLexicons(scores)
    };

    this._manageCache(cacheKey, result);
    return result;
  }

  /**
   * Calculate trust manipulation score
   * High trust words in phishing context create false legitimacy
   */
  calculateTrustManipulation(text) {
    const trustTerms = this.lexicons.trust;
    let trustScore = 0;

    for (const [term, weight] of Object.entries(trustTerms)) {
      if (text.includes(term)) {
        trustScore += weight;
      }
    }

    // In phishing context, trust words become suspicious
    return trustScore > 0.3 ? 0.85 : 0;
  }

  /**
   * Get dominant lexicon categories
   */
  getDominantLexicons(scores) {
    const threshold = 0.6;
    const dominant = [];

    for (const [name, score] of Object.entries(scores)) {
      if (score >= threshold) {
        dominant.push(name);
      }
    }

    return dominant;
  }

  /**
   * Get lexicon explanation for UI
   */
  getLexiconExplanation(lexiconName) {
    const explanations = {
      urgency: 'Uses time pressure to rush decisions',
      authority: 'Claims to be from trusted organization',
      fear: 'Creates fear through threats or consequences',
      reward: 'Offers prizes or financial gain',
      action: 'Commands immediate action',
      credential: 'Requests sensitive personal information',
      trust: 'Uses trust markers to appear legitimate'
    };

    return explanations[lexiconName] || lexiconName;
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Manage cache size
   * @private
   */
  _manageCache(key, value) {
    if (this.cache.size >= this.cacheMaxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, {
      value,
      timestamp: Date.now()
    });
  }

  /**
   * Get from cache with expiration
   * @private
   */
  _getFromCache(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;
    if (Date.now() - cached.timestamp > this.cacheTimeout) {
      this.cache.delete(key);
      return null;
    }
    return cached.value;
  }
}

export default PhishingLexicons;

