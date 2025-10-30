/**
 * Hybrid Scoring System
 * Unified risk assessment combining multiple analysis dimensions
 */

export class HybridScorer {
  constructor(config = {}) {
    this.weights = {
      sentiment: config.sentimentWeight || 0.30,    // 30%
      phishing: config.phishingWeight || 0.50,      // 50% (increased from 40%, removed image weight)
      image: config.imageWeight || 0.0,             // 0% (disabled - as requested)
      linguistic: config.linguisticWeight || 0.20   // 20% (increased from 10% to compensate)
    };

    this.thresholds = {
      low: config.lowThreshold || 30,
      medium: config.mediumThreshold || 50,
      high: config.highThreshold || 75,
      critical: config.criticalThreshold || 90
    };
  }

  /**
   * Calculate final hybrid risk score
   * @param {Object} analysisComponents - All analysis results
   * @returns {Object} Comprehensive risk assessment
   */
  calculateHybridScore(analysisComponents) {
    const {
      sentimentAnalysis = {},
      phishingAnalysis = {},
      imageAnalysis = {},
      linguisticFeatures = {}
    } = analysisComponents;

    // Extract component scores
    const sentimentScore = this.normalizeScore(sentimentAnalysis.manipulationScore, sentimentAnalysis.riskAssessment?.score);
    const phishingScore = this.normalizeScore(phishingAnalysis.riskScore, phishingAnalysis.confidence);
    const imageScore = this.normalizeScore(imageAnalysis.riskScore, imageAnalysis.maliciousCount);
    const linguisticScore = this.normalizeScore(linguisticFeatures.overall?.score, linguisticFeatures.overall?.anomalyScore);

    // Calculate weighted final score
    let finalRiskScore = (
      sentimentScore * this.weights.sentiment +
      phishingScore * this.weights.phishing +
      imageScore * this.weights.image +
      linguisticScore * this.weights.linguistic
    ) * 100;

    // OPTIMIZED: Auto-detect clear phishing cases and elevate score
    // If phishing score is high, override low hybrid scores
    if (phishingScore > 0.5 && finalRiskScore < 65) {
      console.warn('⚠️ OVERRIDE: Strong phishing signals detected (phishing score > 50%), elevating risk score');
      finalRiskScore = Math.max(finalRiskScore, 65);
    }
    
    // Boost score if multiple indicators present
    const indicatorCount = [
      sentimentScore > 0.3,
      phishingScore > 0.5,
      linguisticScore > 0.4
    ].filter(Boolean).length;
    
    if (indicatorCount >= 2 && finalRiskScore < 60) {
      console.log(`📊 Multiple indicators detected (${indicatorCount}), elevating score`);
      finalRiskScore = Math.max(finalRiskScore, 60);
    }

    // Determine risk level
    const riskLevel = this.determineRiskLevel(finalRiskScore);

    // Calculate overall confidence
    const confidence = this.calculateConfidence(sentimentAnalysis, phishingAnalysis, imageAnalysis, linguisticFeatures);

    // Identify dominant contributing factors
    const dominantFactors = this.identifyDominantFactors(sentimentScore, phishingScore, imageScore, linguisticScore);

    // Generate recommendations
    const recommendation = this.generateRecommendation(finalRiskScore, dominantFactors);

    // Calculate breakdown for explainability
    const breakdown = {
      sentiment: Math.round(sentimentScore * 100),
      phishing: Math.round(phishingScore * 100),
      image: Math.round(imageScore * 100),
      linguistic: Math.round(linguisticScore * 100)
    };

    return {
      finalRiskScore: Math.round(finalRiskScore),
      riskLevel,
      confidence,
      breakdown,
      dominantFactors,
      recommendation,
      details: {
        sentiment: {
          score: Math.round(sentimentScore * 100),
          manipulationScore: sentimentAnalysis.manipulationScore,
          emotionalState: sentimentAnalysis.emotionalState,
          valence: sentimentAnalysis.valence,
          arousal: sentimentAnalysis.arousal,
          dominance: sentimentAnalysis.dominance
        },
        phishing: {
          score: Math.round(phishingScore * 100),
          isPhishing: phishingAnalysis.isPhishing,
          redFlags: phishingAnalysis.redFlags,
          indicators: phishingAnalysis.indicators
        },
        image: {
          score: Math.round(imageScore * 100),
          maliciousCount: imageAnalysis.maliciousCount,
          maxRisk: imageAnalysis.maxRiskLevel
        },
        linguistic: {
          score: Math.round(linguisticScore * 100),
          anomalies: linguisticFeatures.overall?.anomalies,
          riskLevel: linguisticFeatures.overall?.riskLevel
        }
      }
    };
  }

  /**
   * Normalize score from different sources to 0-1 range
   */
  normalizeScore(score, confidence = null) {
    if (score === undefined || score === null) return 0;
    
    let normalized = score;
    
    // If score is already 0-1, use it
    if (score > 1) {
      normalized = score / 100;
    }

    // Apply confidence if provided
    if (confidence !== null && confidence !== undefined) {
      normalized = normalized * confidence;
    }

    return Math.max(0, Math.min(1, normalized));
  }

  /**
   * Determine overall risk level
   */
  determineRiskLevel(score) {
    if (score >= this.thresholds.critical) return 'CRITICAL';
    if (score >= this.thresholds.high) return 'HIGH';
    if (score >= this.thresholds.medium) return 'MEDIUM_HIGH';
    if (score >= this.thresholds.low) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Calculate overall confidence
   */
  calculateConfidence(sentiment, phishing, image, linguistic) {
    const confidences = [];

    if (sentiment?.confidence !== undefined) confidences.push(sentiment.confidence);
    if (phishing?.confidence !== undefined) confidences.push(phishing.confidence);
    if (image?.confidence !== undefined) confidences.push(image.confidence);
    if (linguistic?.overall?.riskLevel) {
      const riskToConfidence = { 'HIGH': 0.9, 'MEDIUM': 0.6, 'LOW': 0.4, 'VERY_LOW': 0.2 };
      confidences.push(riskToConfidence[linguistic.overall.riskLevel] || 0.5);
    }

    if (confidences.length === 0) return 0.5;

    // Weighted average of confidences
    const avgConfidence = confidences.reduce((a, b) => a + b, 0) / confidences.length;
    
    // Adjust based on number of components (more components = more reliable)
    const componentBonus = confidences.length * 0.1;
    
    return Math.min(1, avgConfidence + componentBonus);
  }

  /**
   * Identify dominant contributing factors
   */
  identifyDominantFactors(sentiment, phishing, image, linguistic) {
    const factors = [];
    const scores = [
      { name: 'sentiment-manipulation', score: sentiment },
      { name: 'phishing-patterns', score: phishing },
      { name: 'image-threats', score: image },
      { name: 'linguistic-anomalies', score: linguistic }
    ];

    scores.sort((a, b) => b.score - a.score);

    // Return top 2 contributors
    return scores.slice(0, 2).map(f => f.name);
  }

  /**
   * Generate recommendation based on risk
   */
  generateRecommendation(score, dominantFactors) {
    if (score >= 90) {
      return {
        action: 'AVOID',
        priority: 'CRITICAL',
        message: 'Immediate threat detected. Do not interact with this content.',
        reasons: dominantFactors
      };
    }

    if (score >= 75) {
      return {
        action: 'WARNING',
        priority: 'HIGH',
        message: 'High risk of phishing. Exercise extreme caution.',
        reasons: dominantFactors
      };
    }

    if (score >= 50) {
      return {
        action: 'CAUTION',
        priority: 'MEDIUM',
        message: 'Some suspicious indicators detected. Verify before proceeding.',
        reasons: dominantFactors
      };
    }

    if (score >= 30) {
      return {
        action: 'MONITOR',
        priority: 'LOW',
        message: 'Minor suspicious patterns. Proceed with awareness.',
        reasons: dominantFactors
      };
    }

    return {
      action: 'SAFE',
      priority: 'NONE',
      message: 'Content appears legitimate.',
      reasons: []
    };
  }

  /**
   * Get explanation for UI
   */
  getScoreExplanation(hybridScore) {
    return {
      score: `Overall risk score: ${hybridScore.finalRiskScore}/100`,
      level: `Risk level: ${hybridScore.riskLevel}`,
      confidence: `Confidence: ${(hybridScore.confidence * 100).toFixed(0)}%`,
      breakdown: this.formatBreakdown(hybridScore.breakdown),
      recommendation: hybridScore.recommendation,
      factors: this.formatFactors(hybridScore.dominantFactors)
    };
  }

  /**
   * Format breakdown for display
   */
  formatBreakdown(breakdown) {
    return `Sentiment: ${breakdown.sentiment} | ` +
           `Phishing: ${breakdown.phishing} | ` +
           `Image: ${breakdown.image} | ` +
           `Linguistic: ${breakdown.linguistic}`;
  }

  /**
   * Format factors for display
   */
  formatFactors(factors) {
    const factorNames = {
      'sentiment-manipulation': 'Emotional Manipulation',
      'phishing-patterns': 'Phishing Indicators',
      'image-threats': 'Malicious Images',
      'linguistic-anomalies': 'Language Anomalies'
    };

    return factors.map(f => factorNames[f] || f);
  }

  /**
   * Update weights
   */
  updateWeights(newWeights) {
    this.weights = { ...this.weights, ...newWeights };
    
    // Ensure weights sum to 1.0
    const total = Object.values(this.weights).reduce((a, b) => a + b, 0);
    if (total !== 1.0) {
      console.warn('Weights do not sum to 1.0, normalizing...');
      for (const key in this.weights) {
        this.weights[key] = this.weights[key] / total;
      }
    }
  }

  /**
   * Export configuration
   */
  exportConfig() {
    return {
      weights: { ...this.weights },
      thresholds: { ...this.thresholds }
    };
  }
}

export default HybridScorer;

