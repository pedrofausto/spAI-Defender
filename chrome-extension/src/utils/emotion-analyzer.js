/**
 * Emotion Analyzer (VAD Model)
 * Multi-dimensional emotional analysis using Valence-Arousal-Dominance model
 */

export class EmotionAnalyzer {
  constructor() {
    this.vadLexicon = this.initializeVADLexicon();
    this.cache = new Map();
    this.cacheMaxSize = 100;
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Initialize VAD lexicon with emotional word mappings
   * Based on research on emotional manipulation in phishing
   */
  initializeVADLexicon() {
    return {
      // Negative valence emotions (fear, anxiety, worry)
      negativeHighArousal: {
        'urgent': { v: -0.7, a: 0.8, d: 0.3 },
        'suspended': { v: -0.9, a: 0.85, d: 0.2 },
        'locked': { v: -0.8, a: 0.7, d: 0.25 },
        'compromised': { v: -0.95, a: 0.9, d: 0.1 },
        'hacked': { v: -0.9, a: 0.85, d: 0.1 },
        'breach': { v: -0.85, a: 0.8, d: 0.15 },
        'fraud': { v: -0.9, a: 0.85, d: 0.2 },
        'attacked': { v: -0.85, a: 0.8, d: 0.15 },
        'stolen': { v: -0.95, a: 0.9, d: 0.1 },
        'terminated': { v: -0.9, a: 0.8, d: 0.1 },
        'lost': { v: -0.8, a: 0.7, d: 0.2 },
        'blocked': { v: -0.7, a: 0.6, d: 0.3 },
        'threat': { v: -0.85, a: 0.85, d: 0.2 },
        'danger': { v: -0.9, a: 0.9, d: 0.1 },
        'critical': { v: -0.8, a: 0.9, d: 0.2 }
      },

      // Positive valence high arousal (excitement, greed)
      positiveHighArousal: {
        'winner': { v: 0.9, a: 0.9, d: 0.6 },
        'congratulations': { v: 0.85, a: 0.8, d: 0.5 },
        'prize': { v: 0.8, a: 0.7, d: 0.5 },
        'bonus': { v: 0.75, a: 0.65, d: 0.4 },
        'reward': { v: 0.7, a: 0.6, d: 0.4 },
        'free': { v: 0.6, a: 0.5, d: 0.5 },
        'special': { v: 0.65, a: 0.55, d: 0.5 },
        'exclusive': { v: 0.7, a: 0.6, d: 0.5 },
        'lucky': { v: 0.75, a: 0.7, d: 0.45 },
        'selected': { v: 0.7, a: 0.65, d: 0.5 },
        'offer': { v: 0.65, a: 0.6, d: 0.45 },
        'deal': { v: 0.7, a: 0.65, d: 0.5 }
      },

      // Command language (low dominance for victim)
      commandLowDominance: {
        'must': { v: -0.3, a: 0.5, d: 0.25 },
        'need to': { v: -0.2, a: 0.4, d: 0.2 },
        'should': { v: -0.1, a: 0.3, d: 0.3 },
        'required': { v: -0.3, a: 0.45, d: 0.25 },
        'mandatory': { v: -0.35, a: 0.5, d: 0.2 },
        'immediately': { v: -0.4, a: 0.85, d: 0.15 },
        'asap': { v: -0.3, a: 0.8, d: 0.2 },
        'now': { v: -0.1, a: 0.6, d: 0.3 },
        'right away': { v: -0.3, a: 0.75, d: 0.2 },
        'verify': { v: -0.2, a: 0.5, d: 0.3 },
        'confirm': { v: -0.15, a: 0.45, d: 0.35 },
        'click': { v: -0.1, a: 0.4, d: 0.4 },
        'download': { v: -0.2, a: 0.5, d: 0.3 },
        'submit': { v: -0.25, a: 0.5, d: 0.25 }
      },

      // Neutral trust language (appears safe but is suspicious in phishing context)
      deceptiveNeutral: {
        'official': { v: 0.3, a: 0.2, d: 0.6 },
        'secure': { v: 0.35, a: 0.15, d: 0.65 },
        'verified': { v: 0.4, a: 0.2, d: 0.7 },
        'certified': { v: 0.3, a: 0.15, d: 0.65 },
        'protected': { v: 0.3, a: 0.2, d: 0.6 },
        'insured': { v: 0.25, a: 0.15, d: 0.6 },
        'authentic': { v: 0.35, a: 0.15, d: 0.7 },
        'genuine': { v: 0.35, a: 0.15, d: 0.65 },
        'legitimate': { v: 0.3, a: 0.1, d: 0.65 },
        'guaranteed': { v: 0.35, a: 0.25, d: 0.6 }
      }
    };
  }

  /**
   * Analyze emotions using VAD model
   * @param {string} text - Input text
   * @param {Object} lexiconScores - Scores from phishing lexicons
   * @returns {Object} VAD emotional profile
   */
  analyze(text, lexiconScores = {}) {
    const cacheKey = text.substring(0, 100);
    const cached = this._getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    const normalizedText = text.toLowerCase();

    let valenceSum = 0;
    let arousalSum = 0;
    let dominanceSum = 0;
    let count = 0;

    const detectedEmotions = {
      negativeHighArousal: [],
      positiveHighArousal: [],
      commandLowDominance: [],
      deceptiveNeutral: []
    };

    // Calculate VAD scores from lexicon
    for (const [category, words] of Object.entries(this.vadLexicon)) {
      for (const [word, scores] of Object.entries(words)) {
        if (normalizedText.includes(word)) {
          valenceSum += scores.v;
          arousalSum += scores.a;
          dominanceSum += scores.d;
          count++;
          detectedEmotions[category].push({ word, scores });
        }
      }
    }

    // Average VAD scores
    const valence = count > 0 ? valenceSum / count : 0;
    const arousal = count > 0 ? arousalSum / count : 0;
    const dominance = count > 0 ? dominanceSum / count : 0;

    // Determine emotional state
    const emotionalState = this.categorizeEmotionalState(valence, arousal, dominance);

    // Calculate emotional manipulation indicators
    const manipulationScore = this.calculateManipulationScore(valence, arousal, dominance, lexiconScores);

    const result = {
      valence: Math.max(-1, Math.min(1, valence)),
      arousal: Math.max(0, Math.min(1, arousal)),
      dominance: Math.max(0, Math.min(1, dominance)),
      emotionalState,
      manipulationScore,
      detectedEmotions,
      emotionalTriggers: this.identifyTriggers(emotionalState),
      riskAssessment: this.assessRisk(valence, arousal, dominance)
    };

    this._manageCache(cacheKey, result);
    return result;
  }

  /**
   * Categorize emotional state based on VAD dimensions
   */
  categorizeEmotionalState(v, a, d) {
    // Phishing typically combines negative valence with high arousal and low dominance
    if (v < -0.5 && a > 0.6 && d < 0.4) {
      return 'fear-driven-urgency';
    }

    // Positive high arousal (greed/excitement)
    if (v > 0.5 && a > 0.7) {
      return 'greed-driven-excitement';
    }

    // Medium negative with high arousal (anxiety)
    if (v < -0.3 && a > 0.6) {
      return 'anxiety-pressure';
    }

    // Low dominance (powerlessness)
    if (d < 0.3 && a > 0.5) {
      return 'powerlessness-compliance';
    }

    // Command pressure
    if (a > 0.6 && d < 0.4) {
      return 'command-pressure';
    }

    // Neutral deception
    if (Math.abs(v) < 0.3 && a < 0.4) {
      return 'deceptive-neutral';
    }

    return 'neutral';
  }

  /**
   * Calculate manipulation score
   */
  calculateManipulationScore(v, a, d, lexiconScores) {
    let score = 0;

    // Fear manipulation: negative valence + high arousal
    if (v < -0.4 && a > 0.7) {
      score += 0.4;
    }

    // Pressure manipulation: high arousal + low dominance
    if (a > 0.7 && d < 0.4) {
      score += 0.3;
    }

    // Greed manipulation: positive valence + high arousal
    if (v > 0.5 && a > 0.7) {
      score += 0.2;
    }

    // Authority manipulation: low dominance
    if (d < 0.3) {
      score += 0.15;
    }

    // Combine with lexicon scores
    if (lexiconScores.fear && lexiconScores.fear > 0.7) {
      score += 0.2;
    }

    if (lexiconScores.urgency && lexiconScores.urgency > 0.8) {
      score += 0.15;
    }

    return Math.min(1, score);
  }

  /**
   * Identify emotional triggers
   */
  identifyTriggers(emotionalState) {
    const triggers = {
      'fear-driven-urgency': [
        'Creates fear through threats',
        'Uses time pressure',
        'Reduces user control perception'
      ],
      'greed-driven-excitement': [
        'Appeals to greed',
        'Creates excitement',
        'Offers unrealistic rewards'
      ],
      'anxiety-pressure': [
        'Induces anxiety',
        'Creates urgency',
        'Suggests negative consequences'
      ],
      'powerlessness-compliance': [
        'Makes user feel powerless',
        'Demands compliance',
        'Reduces autonomy'
      ],
      'command-pressure': [
        'Uses command language',
        'Creates urgency',
        'Limits decision time'
      ],
      'deceptive-neutral': [
        'Appears trustworthy',
        'Uses security language',
        'Masks malicious intent'
      ]
    };

    return triggers[emotionalState] || [];
  }

  /**
   * Assess risk based on emotional profile
   */
  assessRisk(v, a, d) {
    let risk = 0;

    // High negative valence indicates danger
    if (v < -0.6) risk += 0.35;

    // High arousal indicates urgency/pressure
    if (a > 0.7) risk += 0.30;

    // Low dominance indicates powerlessness
    if (d < 0.4) risk += 0.25;

    // Combined indicators (most dangerous)
    if (v < -0.5 && a > 0.7 && d < 0.4) risk += 0.40;

    risk = Math.min(1, risk);

    return {
      score: risk,
      level: risk >= 0.7 ? 'HIGH' : risk >= 0.4 ? 'MEDIUM' : 'LOW',
      confidence: this.calculateConfidence(v, a, d)
    };
  }

  /**
   * Calculate confidence in emotional assessment
   */
  calculateConfidence(v, a, d) {
    // Higher confidence when VAD scores are more extreme
    const vExtreme = Math.abs(v);
    const aExtreme = a;
    const dExtreme = Math.abs(d - 0.5);

    const confidence = (vExtreme + aExtreme + dExtreme) / 3;
    return Math.max(0.3, Math.min(1, confidence));
  }

  /**
   * Get VAD explanation for UI
   */
  getVADExplanation() {
    return {
      valence: 'Emotional tone: negative (fear/anxiety) vs positive (excitement/reward)',
      arousal: 'Emotional intensity: low (calm) vs high (urgent/pressured)',
      dominance: 'Control perception: low (powerless) vs high (empowered)'
    };
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

export default EmotionAnalyzer;

