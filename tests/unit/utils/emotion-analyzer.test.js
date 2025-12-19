/**
 * Emotion Analyzer Tests (VAD Model)
 * RED-GREEN-REFACTOR TDD cycle
 * Testing VAD dimensional analysis, emotional state categorization, and manipulation scoring
 */

import { EmotionAnalyzer } from '../../../chrome-extension/src/utils/emotion-analyzer.js';

describe('EmotionAnalyzer', () => {
  let analyzer;

  beforeEach(() => {
    analyzer = new EmotionAnalyzer();
  });

  afterEach(() => {
    analyzer.clearCache();
  });

  describe('constructor', () => {
    test('should initialize VAD lexicon', () => {
      expect(analyzer.vadLexicon).toBeDefined();
      expect(analyzer.vadLexicon).toHaveProperty('negativeHighArousal');
      expect(analyzer.vadLexicon).toHaveProperty('positiveHighArousal');
      expect(analyzer.vadLexicon).toHaveProperty('commandLowDominance');
      expect(analyzer.vadLexicon).toHaveProperty('deceptiveNeutral');
    });

    test('should initialize empty cache', () => {
      expect(analyzer.cache).toBeDefined();
      expect(analyzer.cache.size).toBe(0);
    });

    test('should set cache max size to 100', () => {
      expect(analyzer.cacheMaxSize).toBe(100);
    });

    test('should set cache timeout to 5 minutes', () => {
      expect(analyzer.cacheTimeout).toBe(5 * 60 * 1000);
    });

    test('should have all required methods', () => {
      expect(typeof analyzer.analyze).toBe('function');
      expect(typeof analyzer.categorizeEmotionalState).toBe('function');
      expect(typeof analyzer.calculateManipulationScore).toBe('function');
      expect(typeof analyzer.identifyTriggers).toBe('function');
      expect(typeof analyzer.assessRisk).toBe('function');
      expect(typeof analyzer.calculateConfidence).toBe('function');
      expect(typeof analyzer.getVADExplanation).toBe('function');
      expect(typeof analyzer.clearCache).toBe('function');
    });
  });

  describe('initializeVADLexicon', () => {
    test('should include negative high arousal words', () => {
      const lexicon = analyzer.vadLexicon.negativeHighArousal;
      expect(lexicon).toHaveProperty('urgent');
      expect(lexicon).toHaveProperty('hacked');
      expect(lexicon).toHaveProperty('fraud');
      expect(lexicon).toHaveProperty('threat');
    });

    test('should include positive high arousal words', () => {
      const lexicon = analyzer.vadLexicon.positiveHighArousal;
      expect(lexicon).toHaveProperty('winner');
      expect(lexicon).toHaveProperty('prize');
      expect(lexicon).toHaveProperty('congratulations');
      expect(lexicon).toHaveProperty('bonus');
    });

    test('should include command low dominance words', () => {
      const lexicon = analyzer.vadLexicon.commandLowDominance;
      expect(lexicon).toHaveProperty('must');
      expect(lexicon).toHaveProperty('immediately');
      expect(lexicon).toHaveProperty('click');
      expect(lexicon).toHaveProperty('submit');
    });

    test('should include deceptive neutral words', () => {
      const lexicon = analyzer.vadLexicon.deceptiveNeutral;
      expect(lexicon).toHaveProperty('official');
      expect(lexicon).toHaveProperty('secure');
      expect(lexicon).toHaveProperty('verified');
      expect(lexicon).toHaveProperty('legitimate');
    });

    test('should have complete VAD values for each word', () => {
      const word = analyzer.vadLexicon.negativeHighArousal.urgent;
      expect(word).toHaveProperty('v'); // valence
      expect(word).toHaveProperty('a'); // arousal
      expect(word).toHaveProperty('d'); // dominance
    });

    test('should have valid VAD score ranges', () => {
      for (const category of Object.values(analyzer.vadLexicon)) {
        for (const scores of Object.values(category)) {
          expect(scores.v).toBeGreaterThanOrEqual(-1);
          expect(scores.v).toBeLessThanOrEqual(1);
          expect(scores.a).toBeGreaterThanOrEqual(0);
          expect(scores.a).toBeLessThanOrEqual(1);
          expect(scores.d).toBeGreaterThanOrEqual(0);
          expect(scores.d).toBeLessThanOrEqual(1);
        }
      }
    });
  });

  describe('analyze', () => {
    test('should return complete emotional profile', () => {
      const result = analyzer.analyze('This is a test message');

      expect(result).toHaveProperty('valence');
      expect(result).toHaveProperty('arousal');
      expect(result).toHaveProperty('dominance');
      expect(result).toHaveProperty('emotionalState');
      expect(result).toHaveProperty('manipulationScore');
      expect(result).toHaveProperty('detectedEmotions');
      expect(result).toHaveProperty('emotionalTriggers');
      expect(result).toHaveProperty('riskAssessment');
    });

    test('should normalize text to lowercase', () => {
      const result1 = analyzer.analyze('URGENT test');
      const result2 = analyzer.analyze('urgent test');
      expect(result1.arousal).toBe(result2.arousal);
    });

    test('should clamp VAD scores to valid ranges', () => {
      const result = analyzer.analyze('urgent urgent urgent urgent urgent');
      expect(result.valence).toBeGreaterThanOrEqual(-1);
      expect(result.valence).toBeLessThanOrEqual(1);
      expect(result.arousal).toBeGreaterThanOrEqual(0);
      expect(result.arousal).toBeLessThanOrEqual(1);
      expect(result.dominance).toBeGreaterThanOrEqual(0);
      expect(result.dominance).toBeLessThanOrEqual(1);
    });

    test('should detect negative high arousal words', () => {
      const result = analyzer.analyze('urgent hacked compromised');
      expect(result.detectedEmotions.negativeHighArousal.length).toBeGreaterThan(0);
      expect(result.valence).toBeLessThan(0);
      expect(result.arousal).toBeGreaterThan(0);
    });

    test('should detect positive high arousal words', () => {
      const result = analyzer.analyze('winner congratulations prize bonus');
      expect(result.detectedEmotions.positiveHighArousal.length).toBeGreaterThan(0);
      expect(result.valence).toBeGreaterThan(0);
    });

    test('should detect command low dominance words', () => {
      const result = analyzer.analyze('must click immediately submit');
      expect(result.detectedEmotions.commandLowDominance.length).toBeGreaterThan(0);
      expect(result.dominance).toBeLessThan(0.5);
    });

    test('should detect deceptive neutral words', () => {
      const result = analyzer.analyze('official secure verified legitimate');
      expect(result.detectedEmotions.deceptiveNeutral.length).toBeGreaterThan(0);
    });

    test('should calculate average VAD scores', () => {
      const result = analyzer.analyze('urgent');
      expect(typeof result.valence).toBe('number');
      expect(typeof result.arousal).toBe('number');
      expect(typeof result.dominance).toBe('number');
    });

    test('should return zero scores for text with no emotion words', () => {
      const result = analyzer.analyze('the quick brown fox jumps');
      expect(result.valence).toBe(0);
      expect(result.arousal).toBe(0);
      expect(result.dominance).toBe(0);
    });

    test('should include lexicon scores in analysis', () => {
      const lexiconScores = { fear: 0.8, urgency: 0.7 };
      const result = analyzer.analyze('test', lexiconScores);
      expect(result).toBeDefined();
    });

    test('should be case insensitive', () => {
      const resultLower = analyzer.analyze('urgent');
      const resultUpper = analyzer.analyze('URGENT');
      expect(resultLower.arousal).toBe(resultUpper.arousal);
    });

    test('should handle empty string', () => {
      const result = analyzer.analyze('');
      expect(result).toBeDefined();
      expect(result.valence).toBe(0);
    });
  });

  describe('categorizeEmotionalState', () => {
    test('should categorize fear-driven-urgency', () => {
      const state = analyzer.categorizeEmotionalState(-0.6, 0.8, 0.3);
      expect(state).toBe('fear-driven-urgency');
    });

    test('should categorize greed-driven-excitement', () => {
      const state = analyzer.categorizeEmotionalState(0.6, 0.8, 0.5);
      expect(state).toBe('greed-driven-excitement');
    });

    test('should categorize anxiety-pressure', () => {
      const state = analyzer.categorizeEmotionalState(-0.4, 0.7, 0.5);
      expect(state).toBe('anxiety-pressure');
    });

    test('should categorize powerlessness-compliance', () => {
      const state = analyzer.categorizeEmotionalState(-0.2, 0.6, 0.2);
      expect(state).toBe('powerlessness-compliance');
    });

    test('should categorize command-pressure', () => {
      const state = analyzer.categorizeEmotionalState(0, 0.7, 0.3);
      expect(state).toBe('command-pressure');
    });

    test('should categorize deceptive-neutral', () => {
      const state = analyzer.categorizeEmotionalState(0, 0.2, 0.5);
      expect(state).toBe('deceptive-neutral');
    });

    test('should default to deceptive-neutral or neutral for low arousal', () => {
      const state = analyzer.categorizeEmotionalState(0, 0.2, 0.5);
      expect(['deceptive-neutral', 'neutral']).toContain(state);
    });

    test('should handle boundary conditions', () => {
      const state1 = analyzer.categorizeEmotionalState(-0.55, 0.65, 0.35);
      expect(['fear-driven-urgency', 'anxiety-pressure', 'powerlessness-compliance', 'command-pressure']).toContain(state1);
    });
  });

  describe('calculateManipulationScore', () => {
    test('should add score for fear manipulation', () => {
      const score = analyzer.calculateManipulationScore(-0.5, 0.8, 0.5, {});
      expect(score).toBeGreaterThan(0);
    });

    test('should add score for pressure manipulation', () => {
      const score = analyzer.calculateManipulationScore(0, 0.8, 0.2, {});
      expect(score).toBeGreaterThan(0);
    });

    test('should add score for greed manipulation', () => {
      const score = analyzer.calculateManipulationScore(0.6, 0.8, 0.5, {});
      expect(score).toBeGreaterThan(0);
    });

    test('should add score for authority manipulation', () => {
      const score = analyzer.calculateManipulationScore(0, 0.5, 0.2, {});
      expect(score).toBeGreaterThan(0);
    });

    test('should combine with lexicon fear score', () => {
      const score = analyzer.calculateManipulationScore(0, 0.3, 0.5, { fear: 0.8 });
      expect(score).toBeGreaterThan(0);
    });

    test('should combine with lexicon urgency score', () => {
      const score = analyzer.calculateManipulationScore(0, 0.3, 0.5, { urgency: 0.9 });
      expect(score).toBeGreaterThan(0);
    });

    test('should cap score at 1', () => {
      const score = analyzer.calculateManipulationScore(-0.8, 0.9, 0.1, { fear: 0.9, urgency: 0.9 });
      expect(score).toBeLessThanOrEqual(1);
    });

    test('should return 0 for low risk profile', () => {
      const score = analyzer.calculateManipulationScore(0.5, 0.2, 0.8, {});
      expect(score).toBeLessThanOrEqual(0.1);
    });

    test('should handle multiple manipulation types', () => {
      const score = analyzer.calculateManipulationScore(-0.6, 0.8, 0.2, { fear: 0.8 });
      expect(score).toBeGreaterThan(0.3);
    });
  });

  describe('identifyTriggers', () => {
    test('should identify fear-driven-urgency triggers', () => {
      const triggers = analyzer.identifyTriggers('fear-driven-urgency');
      expect(Array.isArray(triggers)).toBe(true);
      expect(triggers.length).toBeGreaterThan(0);
      expect(triggers[0]).toContain('fear');
    });

    test('should identify greed-driven-excitement triggers', () => {
      const triggers = analyzer.identifyTriggers('greed-driven-excitement');
      expect(triggers.some(t => t.toLowerCase().includes('greed'))).toBe(true);
    });

    test('should identify anxiety-pressure triggers', () => {
      const triggers = analyzer.identifyTriggers('anxiety-pressure');
      expect(triggers.some(t => t.toLowerCase().includes('anxiety'))).toBe(true);
    });

    test('should identify powerlessness-compliance triggers', () => {
      const triggers = analyzer.identifyTriggers('powerlessness-compliance');
      expect(triggers.some(t => t.toLowerCase().includes('powerless'))).toBe(true);
    });

    test('should identify command-pressure triggers', () => {
      const triggers = analyzer.identifyTriggers('command-pressure');
      expect(triggers.some(t => t.toLowerCase().includes('command'))).toBe(true);
    });

    test('should identify deceptive-neutral triggers', () => {
      const triggers = analyzer.identifyTriggers('deceptive-neutral');
      expect(triggers.some(t => t.toLowerCase().includes('trust'))).toBe(true);
    });

    test('should return empty array for unknown state', () => {
      const triggers = analyzer.identifyTriggers('unknown-state');
      expect(Array.isArray(triggers)).toBe(true);
      expect(triggers).toHaveLength(0);
    });

    test('should return array of strings', () => {
      const triggers = analyzer.identifyTriggers('fear-driven-urgency');
      triggers.forEach(t => {
        expect(typeof t).toBe('string');
      });
    });
  });

  describe('assessRisk', () => {
    test('should return risk object with required properties', () => {
      const risk = analyzer.assessRisk(-0.5, 0.8, 0.3);
      expect(risk).toHaveProperty('score');
      expect(risk).toHaveProperty('level');
      expect(risk).toHaveProperty('confidence');
    });

    test('should add risk for negative valence', () => {
      const risk1 = analyzer.assessRisk(-0.7, 0.5, 0.5);
      const risk2 = analyzer.assessRisk(0, 0.5, 0.5);
      expect(risk1.score).toBeGreaterThan(risk2.score);
    });

    test('should add risk for high arousal', () => {
      const risk1 = analyzer.assessRisk(0, 0.8, 0.5);
      const risk2 = analyzer.assessRisk(0, 0.3, 0.5);
      expect(risk1.score).toBeGreaterThan(risk2.score);
    });

    test('should add risk for low dominance', () => {
      const risk1 = analyzer.assessRisk(0, 0.5, 0.2);
      const risk2 = analyzer.assessRisk(0, 0.5, 0.8);
      expect(risk1.score).toBeGreaterThan(risk2.score);
    });

    test('should add extra risk for combined indicators', () => {
      const risk = analyzer.assessRisk(-0.6, 0.8, 0.2);
      expect(risk.score).toBeGreaterThan(0.5);
    });

    test('should categorize HIGH risk for score >= 0.7', () => {
      const risk = analyzer.assessRisk(-0.8, 0.9, 0.1);
      expect(risk.level).toBe('HIGH');
    });

    test('should categorize MEDIUM risk for score 0.4-0.69', () => {
      const risk = analyzer.assessRisk(-0.65, 0.8, 0.5);
      expect(risk.level).toBe('MEDIUM');
    });

    test('should categorize LOW risk for score < 0.4', () => {
      const risk = analyzer.assessRisk(0.5, 0.3, 0.7);
      expect(risk.level).toBe('LOW');
    });

    test('should cap risk score at 1', () => {
      const risk = analyzer.assessRisk(-1, 1, 0);
      expect(risk.score).toBeLessThanOrEqual(1);
    });

    test('should calculate confidence', () => {
      const risk = analyzer.assessRisk(-0.5, 0.8, 0.3);
      expect(risk.confidence).toBeGreaterThanOrEqual(0.3);
      expect(risk.confidence).toBeLessThanOrEqual(1);
    });
  });

  describe('calculateConfidence', () => {
    test('should return number between 0.3 and 1', () => {
      const confidence = analyzer.calculateConfidence(0.5, 0.5, 0.5);
      expect(confidence).toBeGreaterThanOrEqual(0.3);
      expect(confidence).toBeLessThanOrEqual(1);
    });

    test('should increase with extreme valence', () => {
      const conf1 = analyzer.calculateConfidence(-0.9, 0.5, 0.5);
      const conf2 = analyzer.calculateConfidence(-0.1, 0.5, 0.5);
      expect(conf1).toBeGreaterThan(conf2);
    });

    test('should increase with high arousal', () => {
      const conf1 = analyzer.calculateConfidence(0, 0.9, 0.5);
      const conf2 = analyzer.calculateConfidence(0, 0.1, 0.5);
      expect(conf1).toBeGreaterThanOrEqual(conf2);
    });

    test('should increase with extreme dominance', () => {
      const conf1 = analyzer.calculateConfidence(0, 0.5, 0);
      const conf2 = analyzer.calculateConfidence(0, 0.5, 0.5);
      expect(conf1).toBeGreaterThan(conf2);
    });

    test('should handle all zero scores', () => {
      const confidence = analyzer.calculateConfidence(0, 0, 0.5);
      expect(confidence).toBe(0.3); // Minimum confidence
    });

    test('should handle maximum extreme scores', () => {
      const confidence = analyzer.calculateConfidence(-1, 1, 0);
      expect(confidence).toBeLessThanOrEqual(1);
    });
  });

  describe('getVADExplanation', () => {
    test('should return explanation object', () => {
      const explanation = analyzer.getVADExplanation();
      expect(explanation).toHaveProperty('valence');
      expect(explanation).toHaveProperty('arousal');
      expect(explanation).toHaveProperty('dominance');
    });

    test('should have string explanations', () => {
      const explanation = analyzer.getVADExplanation();
      expect(typeof explanation.valence).toBe('string');
      expect(typeof explanation.arousal).toBe('string');
      expect(typeof explanation.dominance).toBe('string');
    });

    test('should explain valence dimension', () => {
      const explanation = analyzer.getVADExplanation();
      expect(explanation.valence).toContain('Emotional tone');
    });

    test('should explain arousal dimension', () => {
      const explanation = analyzer.getVADExplanation();
      expect(explanation.arousal).toContain('Emotional intensity');
    });

    test('should explain dominance dimension', () => {
      const explanation = analyzer.getVADExplanation();
      expect(explanation.dominance).toContain('Control perception');
    });
  });

  describe('caching', () => {
    test('should cache analysis results', () => {
      const text = 'Test content for caching';
      const result1 = analyzer.analyze(text);
      const result2 = analyzer.analyze(text);

      expect(result1).toEqual(result2);
      expect(analyzer.cache.size).toBeGreaterThan(0);
    });

    test('should use cache key from first 100 characters', () => {
      const text = 'a'.repeat(150);
      analyzer.analyze(text);
      expect(analyzer.cache.size).toBe(1);
    });

    test('should clear cache', () => {
      analyzer.analyze('Test text');
      expect(analyzer.cache.size).toBeGreaterThan(0);
      analyzer.clearCache();
      expect(analyzer.cache.size).toBe(0);
    });

    test('should manage cache size to max 100', () => {
      // Add 101 items to cache
      for (let i = 0; i < 101; i++) {
        analyzer.analyze(`Text ${i}`.repeat(10)); // Make text different
      }
      expect(analyzer.cache.size).toBeLessThanOrEqual(100);
    });

    test('should handle cache expiration timeout', (done) => {
      analyzer.cacheTimeout = 100; // 100ms timeout for testing
      const text = 'Test content';
      analyzer.analyze(text);

      setTimeout(() => {
        const cachedValue = analyzer._getFromCache(text.substring(0, 100));
        expect(cachedValue).toBeNull();
        done();
      }, 150);
    });
  });

  describe('phishing detection scenarios', () => {
    test('should detect fear-based phishing', () => {
      const result = analyzer.analyze('Your account has been compromised. Click here immediately.');
      expect(result.emotionalState).toBeDefined();
      expect(result.manipulationScore).toBeGreaterThanOrEqual(0);
      expect(result.valence).toBeLessThan(0); // Fear should be negative valence
    });

    test('should detect greed-based phishing', () => {
      const result = analyzer.analyze('Congratulations! You have won a prize! Congratulations!');
      expect(result.emotionalState).toBeDefined();
      expect(result.valence).toBeGreaterThan(0); // Greed should be positive valence
    });

    test('should detect authority-based phishing', () => {
      const result = analyzer.analyze('You must verify your account immediately. This is mandatory.');
      expect(result.manipulationScore).toBeGreaterThan(0);
      expect(result.dominance).toBeLessThan(0.4); // Low dominance for command language
    });

    test('should detect urgency-based phishing', () => {
      const result = analyzer.analyze('urgent urgent urgent urgent');
      expect(result.arousal).toBeGreaterThan(0);
      expect(result.valence).toBeLessThan(0);
    });

    test('should detect mixed manipulation tactics', () => {
      const result = analyzer.analyze('urgent winner prize bonus');
      expect(result.manipulationScore).toBeGreaterThanOrEqual(0);
      expect(result).toBeDefined();
    });

    test('should handle legitimate content safely', () => {
      const result = analyzer.analyze('This is a normal message.');
      expect(result.manipulationScore).toBeLessThanOrEqual(0.2);
    });
  });

  describe('edge cases', () => {
    test('should handle empty string', () => {
      const result = analyzer.analyze('');
      expect(result).toBeDefined();
      expect(result.valence).toBe(0);
      expect(result.arousal).toBe(0);
    });

    test('should handle single word', () => {
      const result = analyzer.analyze('urgent');
      expect(result).toBeDefined();
      expect(result.valence).toBeLessThan(0);
    });

    test('should handle very long text', () => {
      const longText = 'urgent '.repeat(1000);
      const result = analyzer.analyze(longText);
      expect(result).toBeDefined();
    });

    test('should handle Unicode characters', () => {
      const result = analyzer.analyze('Test with émojis 🚨 and special chars');
      expect(result).toBeDefined();
    });

    test('should handle repeated words', () => {
      const result = analyzer.analyze('urgent urgent urgent urgent urgent');
      expect(result.arousal).toBeGreaterThan(0);
    });

    test('should handle mixed case words', () => {
      const result = analyzer.analyze('URGENT Urgent urgent');
      expect(result.arousal).toBeGreaterThan(0);
    });

    test('should handle words with punctuation', () => {
      const result = analyzer.analyze('urgent! hacked??? compromised!!!');
      expect(result.valence).toBeLessThan(0);
    });

    test('should handle empty object lexicon scores', () => {
      const result = analyzer.analyze('test', {});
      expect(result).toBeDefined();
    });

    test('should handle partial lexicon scores', () => {
      const result = analyzer.analyze('test', { fear: 0.5 });
      expect(result).toBeDefined();
    });

    test('should handle very extreme VAD values', () => {
      const result = analyzer.analyze('urgent urgent urgent urgent urgent urgent urgent');
      expect(result.valence).toBeGreaterThanOrEqual(-1);
      expect(result.valence).toBeLessThanOrEqual(1);
      expect(result.arousal).toBeGreaterThanOrEqual(0);
      expect(result.arousal).toBeLessThanOrEqual(1);
    });
  });

  describe('integration tests', () => {
    test('should provide complete emotional analysis pipeline', () => {
      const text = 'urgent compromised click immediately';
      const result = analyzer.analyze(text);

      expect(result.valence).toBeLessThan(0); // Negative
      expect(result.arousal).toBeGreaterThan(0); // Arousal
      expect(result.emotionalState).toBeDefined();
      expect(result.manipulationScore).toBeGreaterThanOrEqual(0);
      expect(result.emotionalTriggers).toBeDefined();
      expect(result.riskAssessment).toBeDefined();
    });

    test('should distinguish between phishing and legitimate content', () => {
      const phishingText = 'urgent urgent urgent urgent';
      const legitimateText = 'normal text';

      const phishingResult = analyzer.analyze(phishingText);
      const legitimateResult = analyzer.analyze(legitimateText);

      expect(phishingResult.arousal).toBeGreaterThanOrEqual(legitimateResult.arousal);
      expect(phishingResult.valence).toBeLessThanOrEqual(legitimateResult.valence);
    });

    test('should handle complex emotional content', () => {
      const complexText = 'Congratulations! Limited time winner! Must confirm immediately before deadline expires!';
      const result = analyzer.analyze(complexText);

      expect(result.detectedEmotions.positiveHighArousal.length).toBeGreaterThan(0);
      expect(result.detectedEmotions.commandLowDominance.length).toBeGreaterThan(0);
      expect(result.manipulationScore).toBeGreaterThan(0.2);
    });

    test('should consistently analyze repeated text', () => {
      const text = 'test message';
      const result1 = analyzer.analyze(text);
      const result2 = analyzer.analyze(text);
      const result3 = analyzer.analyze(text);

      expect(result1).toEqual(result2);
      expect(result2).toEqual(result3);
    });
  });

  describe('VAD score validation', () => {
    test('all detected emotion words should have valid VAD scores', () => {
      const result = analyzer.analyze('urgent hacked winner click');
      const allEmotions = [
        ...result.detectedEmotions.negativeHighArousal,
        ...result.detectedEmotions.positiveHighArousal,
        ...result.detectedEmotions.commandLowDominance,
        ...result.detectedEmotions.deceptiveNeutral
      ];

      allEmotions.forEach(emotion => {
        expect(emotion.scores).toHaveProperty('v');
        expect(emotion.scores).toHaveProperty('a');
        expect(emotion.scores).toHaveProperty('d');
        expect(emotion.scores.v).toBeGreaterThanOrEqual(-1);
        expect(emotion.scores.v).toBeLessThanOrEqual(1);
      });
    });

    test('should accurately reflect detected emotions in VAD scores', () => {
      const result = analyzer.analyze('urgent urgent urgent winner winner winner');

      // Should have mix of negative and positive detected emotions
      expect(result.detectedEmotions.negativeHighArousal.length).toBeGreaterThan(0);
      expect(result.detectedEmotions.positiveHighArousal.length).toBeGreaterThan(0);

      // Valence should be somewhat neutral due to mixed content
      expect(result.valence).toBeGreaterThanOrEqual(-1);
      expect(result.valence).toBeLessThanOrEqual(1);
    });
  });
});
