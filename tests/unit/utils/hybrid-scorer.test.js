/**
 * Hybrid Scorer Tests
 * RED-GREEN-REFACTOR TDD cycle
 * Testing multi-factor scoring, weight calculations, and risk assessment
 */

import { HybridScorer } from '../../../chrome-extension/src/utils/hybrid-scorer.js';

describe('HybridScorer', () => {
  let scorer;

  beforeEach(() => {
    scorer = new HybridScorer();
  });

  describe('constructor', () => {
    test('should initialize with default weights', () => {
      expect(scorer.weights.sentiment).toBe(0.30);
      expect(scorer.weights.phishing).toBe(0.50);
      expect(scorer.weights.image).toBe(0.0);
      expect(scorer.weights.linguistic).toBe(0.20);
    });

    test('should initialize with default thresholds', () => {
      expect(scorer.thresholds.low).toBe(30);
      expect(scorer.thresholds.medium).toBe(50);
      expect(scorer.thresholds.high).toBe(75);
      expect(scorer.thresholds.critical).toBe(90);
    });

    test('should accept custom weights', () => {
      const customScorer = new HybridScorer({
        sentimentWeight: 0.25,
        phishingWeight: 0.50,
        linguisticWeight: 0.25
      });

      expect(customScorer.weights.sentiment).toBe(0.25);
      expect(customScorer.weights.linguistic).toBe(0.25);
    });

    test('should accept custom thresholds', () => {
      const customScorer = new HybridScorer({
        lowThreshold: 20,
        mediumThreshold: 40,
        highThreshold: 70,
        criticalThreshold: 95
      });

      expect(customScorer.thresholds.low).toBe(20);
      expect(customScorer.thresholds.critical).toBe(95);
    });

    test('should create HybridScorer instance', () => {
      expect(scorer).toBeInstanceOf(HybridScorer);
    });

    test('should have all required methods', () => {
      expect(typeof scorer.calculateHybridScore).toBe('function');
      expect(typeof scorer.normalizeScore).toBe('function');
      expect(typeof scorer.determineRiskLevel).toBe('function');
      expect(typeof scorer.calculateConfidence).toBe('function');
      expect(typeof scorer.identifyDominantFactors).toBe('function');
      expect(typeof scorer.generateRecommendation).toBe('function');
      expect(typeof scorer.getScoreExplanation).toBe('function');
      expect(typeof scorer.updateWeights).toBe('function');
      expect(typeof scorer.exportConfig).toBe('function');
    });
  });

  describe('calculateHybridScore - basic calculation', () => {
    test('should return score object with required fields', () => {
      const components = {
        sentimentAnalysis: { manipulationScore: 0.5, confidence: 0.8 },
        phishingAnalysis: { riskScore: 60, confidence: 0.9 },
        linguisticFeatures: { overall: { score: 0.4, anomalyScore: 0.3 } }
      };

      const result = scorer.calculateHybridScore(components);

      expect(result).toHaveProperty('finalRiskScore');
      expect(result).toHaveProperty('riskLevel');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('breakdown');
      expect(result).toHaveProperty('dominantFactors');
      expect(result).toHaveProperty('recommendation');
    });

    test('should calculate low risk score', () => {
      const components = {
        sentimentAnalysis: { manipulationScore: 0.1, confidence: 0.8 },
        phishingAnalysis: { riskScore: 10, confidence: 0.9 },
        linguisticFeatures: { overall: { score: 0.1, anomalyScore: 0.1 } }
      };

      const result = scorer.calculateHybridScore(components);

      expect(result.finalRiskScore).toBeLessThan(30);
      expect(result.riskLevel).toBe('LOW');
    });

    test('should calculate medium risk score', () => {
      const components = {
        sentimentAnalysis: { manipulationScore: 0.4, confidence: 0.8 },
        phishingAnalysis: { riskScore: 50, confidence: 0.8 },
        linguisticFeatures: { overall: { score: 0.3, anomalyScore: 0.3 } }
      };

      const result = scorer.calculateHybridScore(components);

      expect(result.finalRiskScore).toBeGreaterThanOrEqual(30);
      expect(result.finalRiskScore).toBeLessThan(75);
    });

    test('should calculate high risk score', () => {
      const components = {
        sentimentAnalysis: { manipulationScore: 0.8, confidence: 0.9 },
        phishingAnalysis: { riskScore: 85, confidence: 0.95 },
        linguisticFeatures: { overall: { score: 0.7, anomalyScore: 0.7 } }
      };

      const result = scorer.calculateHybridScore(components);

      expect(result.finalRiskScore).toBeGreaterThanOrEqual(75);
      expect(result.riskLevel).toBe('HIGH');
    });

    test('should calculate critical risk score', () => {
      const components = {
        sentimentAnalysis: { manipulationScore: 0.95, confidence: 1.0 },
        phishingAnalysis: { riskScore: 99, confidence: 1.0 },
        linguisticFeatures: { overall: { score: 0.95, anomalyScore: 0.95 } }
      };

      const result = scorer.calculateHybridScore(components);

      expect(result.finalRiskScore).toBeGreaterThanOrEqual(90);
      expect(result.riskLevel).toBe('CRITICAL');
    });

    test('should return finite risk score', () => {
      const components = {};
      const result = scorer.calculateHybridScore(components);

      expect(isFinite(result.finalRiskScore)).toBe(true);
    });

    test('should round risk score to integer', () => {
      const components = {
        sentimentAnalysis: { manipulationScore: 0.33, confidence: 0.77 },
        phishingAnalysis: { riskScore: 45, confidence: 0.85 }
      };

      const result = scorer.calculateHybridScore(components);

      expect(Number.isInteger(result.finalRiskScore)).toBe(true);
    });
  });

  describe('normalizeScore', () => {
    test('should normalize 100-based score to 0-1', () => {
      const normalized = scorer.normalizeScore(80);
      expect(normalized).toBe(0.8);
    });

    test('should keep 0-1 score as-is', () => {
      const normalized = scorer.normalizeScore(0.6);
      expect(normalized).toBe(0.6);
    });

    test('should apply confidence multiplier', () => {
      const normalized = scorer.normalizeScore(100, 0.5);
      expect(normalized).toBe(0.5); // 1.0 * 0.5
    });

    test('should clamp to 0-1 range', () => {
      const result = scorer.normalizeScore(150, 1.0);
      expect(result).toBeLessThanOrEqual(1);
      expect(result).toBeGreaterThanOrEqual(0);
    });

    test('should return 0 for null score', () => {
      expect(scorer.normalizeScore(null)).toBe(0);
    });

    test('should return 0 for undefined score', () => {
      expect(scorer.normalizeScore(undefined)).toBe(0);
    });

    test('should return 0 for NaN score', () => {
      expect(scorer.normalizeScore(NaN)).toBe(0);
    });

    test('should handle zero score', () => {
      const result = scorer.normalizeScore(0);
      expect(result).toBe(0);
    });

    test('should handle negative scores', () => {
      const result = scorer.normalizeScore(-50);
      expect(result).toBe(0); // Clamped to minimum
    });

    test('should handle confidence null', () => {
      const result = scorer.normalizeScore(50, null);
      expect(result).toBe(0.5);
    });
  });

  describe('determineRiskLevel', () => {
    test('should return LOW for score below 30', () => {
      expect(scorer.determineRiskLevel(25)).toBe('LOW');
    });

    test('should return MEDIUM for score 30-49', () => {
      expect(scorer.determineRiskLevel(40)).toBe('MEDIUM');
    });

    test('should return MEDIUM_HIGH for score 50-74', () => {
      expect(scorer.determineRiskLevel(60)).toBe('MEDIUM_HIGH');
    });

    test('should return HIGH for score 75-89', () => {
      expect(scorer.determineRiskLevel(80)).toBe('HIGH');
    });

    test('should return CRITICAL for score 90+', () => {
      expect(scorer.determineRiskLevel(95)).toBe('CRITICAL');
    });

    test('should handle boundary at 30', () => {
      expect(scorer.determineRiskLevel(30)).toBe('MEDIUM');
    });

    test('should handle boundary at 50', () => {
      expect(scorer.determineRiskLevel(50)).toBe('MEDIUM_HIGH');
    });

    test('should handle boundary at 75', () => {
      expect(scorer.determineRiskLevel(75)).toBe('HIGH');
    });

    test('should handle boundary at 90', () => {
      expect(scorer.determineRiskLevel(90)).toBe('CRITICAL');
    });

    test('should handle zero score', () => {
      expect(scorer.determineRiskLevel(0)).toBe('LOW');
    });

    test('should handle 100 score', () => {
      expect(scorer.determineRiskLevel(100)).toBe('CRITICAL');
    });
  });

  describe('calculateConfidence', () => {
    test('should calculate average of confidences', () => {
      const result = scorer.calculateConfidence(
        { confidence: 0.8 },
        { confidence: 0.9 },
        {},
        {}
      );

      expect(result).toBeGreaterThan(0.8);
      expect(result).toBeLessThanOrEqual(1);
    });

    test('should add bonus for multiple components', () => {
      const result = scorer.calculateConfidence(
        { confidence: 0.5 },
        { confidence: 0.5 },
        { confidence: 0.5 },
        { confidence: 0.5 }
      );

      expect(result).toBeGreaterThan(0.5);
    });

    test('should handle missing confidences', () => {
      const result = scorer.calculateConfidence({}, {}, {}, {});
      expect(result).toBe(0.5); // Default
    });

    test('should clamp result to 1.0', () => {
      const result = scorer.calculateConfidence(
        { confidence: 1.0 },
        { confidence: 1.0 },
        { confidence: 1.0 },
        { confidence: 1.0 }
      );

      expect(result).toBeLessThanOrEqual(1);
    });

    test('should handle confidence from risk levels', () => {
      const result = scorer.calculateConfidence(
        {},
        {},
        {},
        { overall: { riskLevel: 'HIGH' } }
      );

      expect(result).toBeGreaterThan(0);
    });

    test('should return 0 minimum for low confidence', () => {
      const result = scorer.calculateConfidence({}, {}, {}, {});
      expect(result).toBeGreaterThanOrEqual(0);
    });
  });

  describe('identifyDominantFactors', () => {
    test('should return top 2 factors', () => {
      const factors = scorer.identifyDominantFactors(0.1, 0.9, 0.2, 0.3);
      expect(factors).toHaveLength(2);
    });

    test('should prioritize phishing patterns', () => {
      const factors = scorer.identifyDominantFactors(0.1, 0.9, 0.1, 0.1);
      expect(factors[0]).toBe('phishing-patterns');
    });

    test('should include sentiment manipulation when high', () => {
      const factors = scorer.identifyDominantFactors(0.9, 0.1, 0.1, 0.1);
      expect(factors[0]).toBe('sentiment-manipulation');
    });

    test('should return factor names correctly', () => {
      const factors = scorer.identifyDominantFactors(0.8, 0.7, 0.6, 0.5);
      expect(factors[0]).toBe('sentiment-manipulation');
      expect(factors[1]).toBe('phishing-patterns');
    });

    test('should handle all equal scores', () => {
      const factors = scorer.identifyDominantFactors(0.5, 0.5, 0.5, 0.5);
      expect(Array.isArray(factors)).toBe(true);
      expect(factors.length).toBeLessThanOrEqual(2);
    });

    test('should handle zero scores', () => {
      const factors = scorer.identifyDominantFactors(0, 0, 0, 0);
      expect(Array.isArray(factors)).toBe(true);
    });
  });

  describe('generateRecommendation', () => {
    test('should recommend AVOID for critical score', () => {
      const recommendation = scorer.generateRecommendation(95, ['phishing-patterns']);
      expect(recommendation.action).toBe('AVOID');
      expect(recommendation.priority).toBe('CRITICAL');
    });

    test('should recommend WARNING for high score', () => {
      const recommendation = scorer.generateRecommendation(80, ['phishing-patterns']);
      expect(recommendation.action).toBe('WARNING');
      expect(recommendation.priority).toBe('HIGH');
    });

    test('should recommend CAUTION for medium score', () => {
      const recommendation = scorer.generateRecommendation(60, ['phishing-patterns']);
      expect(recommendation.action).toBe('CAUTION');
      expect(recommendation.priority).toBe('MEDIUM');
    });

    test('should recommend MONITOR for low-medium score', () => {
      const recommendation = scorer.generateRecommendation(35, ['phishing-patterns']);
      expect(recommendation.action).toBe('MONITOR');
      expect(recommendation.priority).toBe('LOW');
    });

    test('should recommend SAFE for very low score', () => {
      const recommendation = scorer.generateRecommendation(10, []);
      expect(recommendation.action).toBe('SAFE');
      expect(recommendation.priority).toBe('NONE');
    });

    test('should include message in recommendation', () => {
      const recommendation = scorer.generateRecommendation(80, ['phishing-patterns']);
      expect(recommendation.message).toBeDefined();
      expect(typeof recommendation.message).toBe('string');
    });

    test('should include reasons in recommendation', () => {
      const recommendation = scorer.generateRecommendation(80, ['phishing-patterns']);
      expect(recommendation.reasons).toBeDefined();
      expect(Array.isArray(recommendation.reasons)).toBe(true);
    });

    test('should handle boundary scores', () => {
      const rec90 = scorer.generateRecommendation(90, []);
      expect(['AVOID', 'WARNING']).toContain(rec90.action);

      const rec75 = scorer.generateRecommendation(75, []);
      expect(['WARNING', 'CAUTION']).toContain(rec75.action);

      const rec50 = scorer.generateRecommendation(50, []);
      expect(['CAUTION', 'MONITOR']).toContain(rec50.action);
    });
  });

  describe('getScoreExplanation', () => {
    test('should return explanation object', () => {
      const hybridScore = {
        finalRiskScore: 65,
        riskLevel: 'MEDIUM_HIGH',
        confidence: 0.85,
        breakdown: { sentiment: 50, phishing: 70, image: 0, linguistic: 40 },
        dominantFactors: ['phishing-patterns']
      };

      const explanation = scorer.getScoreExplanation(hybridScore);

      expect(explanation).toHaveProperty('score');
      expect(explanation).toHaveProperty('level');
      expect(explanation).toHaveProperty('confidence');
      expect(explanation).toHaveProperty('breakdown');
      expect(explanation).toHaveProperty('recommendation');
      expect(explanation).toHaveProperty('factors');
    });

    test('should include score in explanation', () => {
      const hybridScore = { finalRiskScore: 75, riskLevel: 'HIGH', confidence: 0.9, breakdown: {}, dominantFactors: [] };
      const explanation = scorer.getScoreExplanation(hybridScore);
      expect(explanation.score).toContain('75');
    });

    test('should include risk level in explanation', () => {
      const hybridScore = { finalRiskScore: 50, riskLevel: 'MEDIUM_HIGH', confidence: 0.8, breakdown: {}, dominantFactors: [] };
      const explanation = scorer.getScoreExplanation(hybridScore);
      expect(explanation.level).toContain('MEDIUM_HIGH');
    });

    test('should include confidence percentage', () => {
      const hybridScore = { finalRiskScore: 50, riskLevel: 'MEDIUM_HIGH', confidence: 0.75, breakdown: {}, dominantFactors: [] };
      const explanation = scorer.getScoreExplanation(hybridScore);
      expect(explanation.confidence).toContain('75');
    });
  });

  describe('formatBreakdown', () => {
    test('should format all components', () => {
      const breakdown = { sentiment: 40, phishing: 70, image: 0, linguistic: 30 };
      const formatted = scorer.formatBreakdown(breakdown);

      expect(formatted).toContain('Sentiment');
      expect(formatted).toContain('Phishing');
      expect(formatted).toContain('Image');
      expect(formatted).toContain('Linguistic');
    });

    test('should include component values', () => {
      const breakdown = { sentiment: 50, phishing: 75, image: 0, linguistic: 40 };
      const formatted = scorer.formatBreakdown(breakdown);

      expect(formatted).toContain('50');
      expect(formatted).toContain('75');
      expect(formatted).toContain('40');
    });

    test('should be human-readable', () => {
      const breakdown = { sentiment: 50, phishing: 70, image: 0, linguistic: 40 };
      const formatted = scorer.formatBreakdown(breakdown);

      expect(typeof formatted).toBe('string');
      expect(formatted.length).toBeGreaterThan(0);
    });
  });

  describe('formatFactors', () => {
    test('should convert factor names to readable format', () => {
      const factors = ['phishing-patterns', 'sentiment-manipulation'];
      const formatted = scorer.formatFactors(factors);

      expect(formatted).toContain('Phishing Indicators');
      expect(formatted).toContain('Emotional Manipulation');
    });

    test('should handle unknown factors', () => {
      const factors = ['unknown-factor'];
      const formatted = scorer.formatFactors(factors);

      expect(Array.isArray(formatted)).toBe(true);
    });

    test('should return array', () => {
      const factors = ['phishing-patterns'];
      const formatted = scorer.formatFactors(factors);

      expect(Array.isArray(formatted)).toBe(true);
    });
  });

  describe('updateWeights', () => {
    test('should update weights', () => {
      scorer.updateWeights({ sentiment: 0.4, phishing: 0.4, linguistic: 0.2 });

      expect(scorer.weights.sentiment).toBe(0.4);
      expect(scorer.weights.phishing).toBe(0.4);
    });

    test('should normalize weights to sum to 1.0', () => {
      scorer.updateWeights({ sentiment: 0.5, phishing: 0.5, image: 0.0, linguistic: 0.5 });

      const sum = Object.values(scorer.weights).reduce((a, b) => a + b, 0);
      expect(Math.abs(sum - 1.0)).toBeLessThan(0.0001);
    });

    test('should preserve other weights', () => {
      const originalImage = scorer.weights.image;
      scorer.updateWeights({ sentiment: 0.4 });

      expect(scorer.weights.image).toBe(originalImage);
    });

    test('should handle partial weight updates', () => {
      scorer.updateWeights({ phishing: 0.6 });
      expect(scorer.weights.phishing).toBeGreaterThan(0.5);
    });

    test('should handle empty update', () => {
      const originalWeights = { ...scorer.weights };
      scorer.updateWeights({});

      expect(scorer.weights).toEqual(originalWeights);
    });
  });

  describe('exportConfig', () => {
    test('should export current configuration', () => {
      const config = scorer.exportConfig();

      expect(config).toHaveProperty('weights');
      expect(config).toHaveProperty('thresholds');
    });

    test('should include all weights', () => {
      const config = scorer.exportConfig();

      expect(config.weights).toHaveProperty('sentiment');
      expect(config.weights).toHaveProperty('phishing');
      expect(config.weights).toHaveProperty('image');
      expect(config.weights).toHaveProperty('linguistic');
    });

    test('should include all thresholds', () => {
      const config = scorer.exportConfig();

      expect(config.thresholds).toHaveProperty('low');
      expect(config.thresholds).toHaveProperty('medium');
      expect(config.thresholds).toHaveProperty('high');
      expect(config.thresholds).toHaveProperty('critical');
    });

    test('should not affect original weights when modifying exported config', () => {
      const originalSentimentWeight = scorer.weights.sentiment;
      const config = scorer.exportConfig();

      config.weights.sentiment = 0.99;

      expect(scorer.weights.sentiment).toBe(originalSentimentWeight);
    });
  });

  describe('phishing detection override logic', () => {
    test('should override low hybrid score with strong phishing signals', () => {
      const components = {
        sentimentAnalysis: { manipulationScore: 0.1, confidence: 0.8 },
        phishingAnalysis: { riskScore: 60, confidence: 0.95 },
        linguisticFeatures: { overall: { score: 0.1, anomalyScore: 0.1 } }
      };

      const result = scorer.calculateHybridScore(components);

      expect(result.finalRiskScore).toBeGreaterThanOrEqual(65);
    });

    test('should boost score when multiple indicators present', () => {
      const components = {
        sentimentAnalysis: { manipulationScore: 0.35, confidence: 0.7 },
        phishingAnalysis: { riskScore: 55, confidence: 0.7 },
        linguisticFeatures: { overall: { score: 0.45, anomalyScore: 0.4 } }
      };

      const result = scorer.calculateHybridScore(components);

      expect(result.finalRiskScore).toBeGreaterThanOrEqual(60);
    });

    test('should not over-boost when indicators are weak', () => {
      const components = {
        sentimentAnalysis: { manipulationScore: 0.1, confidence: 0.8 },
        phishingAnalysis: { riskScore: 20, confidence: 0.8 },
        linguisticFeatures: { overall: { score: 0.1, anomalyScore: 0.1 } }
      };

      const result = scorer.calculateHybridScore(components);

      expect(result.finalRiskScore).toBeLessThan(50);
    });
  });

  describe('integration tests', () => {
    test('should handle complete analysis workflow', () => {
      const components = {
        sentimentAnalysis: {
          manipulationScore: 0.6,
          emotionalState: 'FEAR',
          valence: -0.7,
          arousal: 0.8,
          dominance: 0.3,
          confidence: 0.85
        },
        phishingAnalysis: {
          isPhishing: true,
          redFlags: ['urgent action', 'verify account'],
          indicators: ['phishing URLs', 'spoofed domains'],
          riskScore: 80,
          confidence: 0.92
        },
        imageAnalysis: {
          maliciousCount: 0,
          maxRiskLevel: 'LOW'
        },
        linguisticFeatures: {
          overall: {
            score: 0.5,
            anomalies: ['unusual word patterns'],
            riskLevel: 'MEDIUM',
            anomalyScore: 0.55
          }
        }
      };

      const result = scorer.calculateHybridScore(components);

      expect(result.finalRiskScore).toBeGreaterThan(70);
      expect(result.riskLevel).toBe('HIGH');
      expect(result.dominantFactors).toContain('phishing-patterns');
      expect(result.recommendation.action).toBe('WARNING');
    });

    test('should provide complete score explanation', () => {
      const components = {
        sentimentAnalysis: { manipulationScore: 0.5, confidence: 0.8 },
        phishingAnalysis: { riskScore: 60, confidence: 0.9 },
        linguisticFeatures: { overall: { score: 0.4, anomalyScore: 0.3 } }
      };

      const score = scorer.calculateHybridScore(components);
      const explanation = scorer.getScoreExplanation(score);

      expect(explanation.score).toBeDefined();
      expect(explanation.level).toBeDefined();
      expect(explanation.confidence).toBeDefined();
      expect(explanation.breakdown).toBeDefined();
      expect(explanation.recommendation).toBeDefined();
      expect(explanation.factors).toBeDefined();
    });

    test('should handle multiple sequential scores correctly', () => {
      const components1 = {
        sentimentAnalysis: { manipulationScore: 0.2, confidence: 0.8 },
        phishingAnalysis: { riskScore: 30, confidence: 0.7 }
      };

      const components2 = {
        sentimentAnalysis: { manipulationScore: 0.8, confidence: 0.95 },
        phishingAnalysis: { riskScore: 90, confidence: 0.98 }
      };

      const result1 = scorer.calculateHybridScore(components1);
      const result2 = scorer.calculateHybridScore(components2);

      expect(result1.finalRiskScore).toBeLessThan(result2.finalRiskScore);
    });
  });

  describe('breakdown details', () => {
    test('should include detailed breakdown in result', () => {
      const components = {
        sentimentAnalysis: { manipulationScore: 0.5, confidence: 0.8 },
        phishingAnalysis: { riskScore: 60, confidence: 0.9 },
        linguisticFeatures: { overall: { score: 0.4, anomalyScore: 0.3 } }
      };

      const result = scorer.calculateHybridScore(components);

      expect(result.breakdown).toHaveProperty('sentiment');
      expect(result.breakdown).toHaveProperty('phishing');
      expect(result.breakdown).toHaveProperty('image');
      expect(result.breakdown).toHaveProperty('linguistic');
    });

    test('should include full details in result', () => {
      const components = {
        sentimentAnalysis: { manipulationScore: 0.5, confidence: 0.8, emotionalState: 'ANGER' },
        phishingAnalysis: { riskScore: 60, confidence: 0.9, isPhishing: true, redFlags: ['urgent'] },
        linguisticFeatures: { overall: { score: 0.4, anomalyScore: 0.3, riskLevel: 'MEDIUM' } }
      };

      const result = scorer.calculateHybridScore(components);

      expect(result.details).toBeDefined();
      expect(result.details.sentiment).toBeDefined();
      expect(result.details.phishing).toBeDefined();
      expect(result.details.linguistic).toBeDefined();
    });
  });
});
