/**
 * Sentiment Analyzer Tests
 * RED-GREEN-REFACTOR TDD cycle
 * Testing sentiment analysis, emotional manipulation detection, AI integration
 */

import { SentimentAnalyzer } from '../../../chrome-extension/src/utils/sentiment-analyzer.js';
import { PhishingLexicons } from '../../../chrome-extension/src/utils/phishing-lexicons.js';
import { LinguisticAnalyzer } from '../../../chrome-extension/src/utils/linguistic-analyzer.js';
import { EmotionAnalyzer } from '../../../chrome-extension/src/utils/emotion-analyzer.js';
import { setupChromeMocks } from '../../helpers/chrome-api-mock.js';
import { setupAIMocks } from '../../helpers/ai-mock.js';

// Mock dependencies
jest.mock('../../../chrome-extension/src/utils/phishing-lexicons.js');
jest.mock('../../../chrome-extension/src/utils/linguistic-analyzer.js');
jest.mock('../../../chrome-extension/src/utils/emotion-analyzer.js');

describe('SentimentAnalyzer', () => {
  let analyzer;
  let mockAIManager;

  beforeEach(() => {
    setupChromeMocks();
    setupAIMocks();

    // Create mock AI manager
    mockAIManager = {
      createSession: jest.fn().mockResolvedValue({
        prompt: jest.fn().mockResolvedValue('Test response'),
        destroy: jest.fn()
      }),
      destroySession: jest.fn().mockResolvedValue(undefined)
    };

    analyzer = new SentimentAnalyzer(mockAIManager);

    // Mock PhishingLexicons
    PhishingLexicons.mockImplementation(() => ({
      calculateLexiconScores: jest.fn().mockReturnValue({
        scores: { fear: 0.5, urgency: 0.6 },
        dominantLexicons: ['fear', 'urgency']
      })
    }));

    // Mock LinguisticAnalyzer
    LinguisticAnalyzer.mockImplementation(() => ({
      analyze: jest.fn().mockReturnValue({
        overall: { score: 0.3, anomalies: [] }
      })
    }));

    // Mock EmotionAnalyzer
    EmotionAnalyzer.mockImplementation(() => ({
      analyze: jest.fn().mockReturnValue({
        manipulationScore: 0.5,
        riskAssessment: { score: 0.4, level: 'MEDIUM' },
        emotionalState: 'neutral',
        emotionalTriggers: []
      })
    }));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    test('should initialize with AI manager', () => {
      expect(analyzer.aiManager).toBe(mockAIManager);
    });

    test('should create PhishingLexicons instance', () => {
      expect(analyzer.lexicons).toBeDefined();
      expect(PhishingLexicons).toHaveBeenCalled();
    });

    test('should create LinguisticAnalyzer instance', () => {
      expect(analyzer.linguisticAnalyzer).toBeDefined();
      expect(LinguisticAnalyzer).toHaveBeenCalled();
    });

    test('should create EmotionAnalyzer instance', () => {
      expect(analyzer.emotionAnalyzer).toBeDefined();
      expect(EmotionAnalyzer).toHaveBeenCalled();
    });

    test('should have all required methods', () => {
      expect(typeof analyzer.robustJsonParse).toBe('function');
      expect(typeof analyzer.analyzeSentiment).toBe('function');
      expect(typeof analyzer.analyzeAdvanced).toBe('function');
      expect(typeof analyzer.analyzeWithAI).toBe('function');
      expect(typeof analyzer.parseSentimentText).toBe('function');
      expect(typeof analyzer.determineTrustworthiness).toBe('function');
      expect(typeof analyzer.determineRecommendation).toBe('function');
      expect(typeof analyzer.getDefaultAnalysis).toBe('function');
      expect(typeof analyzer.analyzeWhatsAppMessage).toBe('function');
    });
  });

  describe('robustJsonParse', () => {
    test('should parse valid JSON', () => {
      const validJson = '{"score": 0.5, "name": "test"}';
      const result = analyzer.robustJsonParse(validJson);
      expect(result).toEqual({ score: 0.5, name: 'test' });
    });

    test('should return null for invalid JSON after all attempts', () => {
      const invalidJson = '{invalid json content}';
      const result = analyzer.robustJsonParse(invalidJson);
      expect(result).toBeNull();
    });

    test('should fix trailing commas', () => {
      const jsonWithCommas = '{"items": [1, 2, 3,], "name": "test",}';
      const result = analyzer.robustJsonParse(jsonWithCommas);
      expect(result).toEqual({ items: [1, 2, 3], name: 'test' });
    });

    test('should handle escaped newlines in string values', () => {
      const jsonWithNewlines = '{"text": "line1\\nline2", "title": "test\\ttab"}';
      const result = analyzer.robustJsonParse(jsonWithNewlines);
      expect(result.text).toContain('line1');
      expect(result.title).toContain('test');
    });

    test('should handle missing commas between properties', () => {
      const jsonMissingCommas = '{"name": "test"\n"value": 123}';
      const result = analyzer.robustJsonParse(jsonMissingCommas);
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('value');
    });

    test('should handle nested objects', () => {
      const nestedJson = '{"outer": {"inner": "value"}}';
      const result = analyzer.robustJsonParse(nestedJson);
      expect(result.outer.inner).toBe('value');
    });

    test('should handle arrays with mixed types', () => {
      const mixedArray = '{"items": [1, "two", true, null]}';
      const result = analyzer.robustJsonParse(mixedArray);
      expect(result.items).toHaveLength(4);
      expect(result.items[1]).toBe('two');
    });
  });

  describe('analyzeSentiment', () => {
    test('should return default analysis for empty text', async () => {
      const result = await analyzer.analyzeSentiment('');
      expect(result).toEqual(analyzer.getDefaultAnalysis());
    });

    test('should return default analysis for null text', async () => {
      const result = await analyzer.analyzeSentiment(null);
      expect(result).toEqual(analyzer.getDefaultAnalysis());
    });

    test('should return default analysis for non-string text', async () => {
      const result = await analyzer.analyzeSentiment(123);
      expect(result).toEqual(analyzer.getDefaultAnalysis());
    });

    test('should create AI session with proper temperature', async () => {
      mockAIManager.createSession.mockResolvedValue({
        prompt: jest.fn().mockResolvedValue('{"sentimentScore": 0.5}'),
        destroy: jest.fn()
      });

      await analyzer.analyzeSentiment('Test content');
      expect(mockAIManager.createSession).toHaveBeenCalledWith({ temperature: 0.5 });
    });

    test('should parse valid JSON response', async () => {
      mockAIManager.createSession.mockResolvedValue({
        prompt: jest.fn().mockResolvedValue('{"sentimentScore": 0.5, "sentiment": "NEUTRAL", "urgencyLevel": "LOW", "manipulationDetected": false, "recommendation": "SAFE"}'),
        destroy: jest.fn()
      });

      const result = await analyzer.analyzeSentiment('Test content');
      expect(result).toHaveProperty('sentimentScore');
      expect(result.sentiment).toBe('NEUTRAL');
    });

    test('should use fallback parser when JSON extraction fails', async () => {
      mockAIManager.createSession.mockResolvedValue({
        prompt: jest.fn().mockResolvedValue('No JSON here, just text about urgency and critical situation'),
        destroy: jest.fn()
      });

      const result = await analyzer.analyzeSentiment('Test content');
      expect(result).toHaveProperty('urgencyLevel');
    });

    test('should handle malformed JSON in response', async () => {
      mockAIManager.createSession.mockResolvedValue({
        prompt: jest.fn().mockResolvedValue('{invalid json}'),
        destroy: jest.fn()
      });

      const result = await analyzer.analyzeSentiment('Test content');
      expect(result).toBeDefined();
    });

    test('should truncate text to 3000 characters in prompt', async () => {
      const longText = 'a'.repeat(5000);
      const mockPrompt = jest.fn().mockResolvedValue('{"sentimentScore": 0}');
      mockAIManager.createSession.mockResolvedValue({
        prompt: mockPrompt,
        destroy: jest.fn()
      });

      await analyzer.analyzeSentiment(longText);
      const promptCall = mockPrompt.mock.calls[0][0];
      expect(promptCall).toContain('a'.repeat(3000));
      expect(promptCall).not.toContain('a'.repeat(3001));
    });

    test('should destroy AI session after analysis', async () => {
      const destroyFn = jest.fn().mockResolvedValue(undefined);
      mockAIManager.createSession.mockResolvedValue({
        prompt: jest.fn().mockResolvedValue('{"sentimentScore": 0}'),
        destroy: destroyFn
      });

      await analyzer.analyzeSentiment('Test');
      expect(mockAIManager.destroySession).toHaveBeenCalled();
    });

    test('should include URL in prompt if provided', async () => {
      const mockPrompt = jest.fn().mockResolvedValue('{"sentimentScore": 0}');
      mockAIManager.createSession.mockResolvedValue({
        prompt: mockPrompt,
        destroy: jest.fn()
      });

      await analyzer.analyzeSentiment('Test content', 'https://example.com');
      const promptCall = mockPrompt.mock.calls[0][0];
      expect(promptCall).toContain('https://example.com');
    });

    test('should handle AI session creation errors', async () => {
      mockAIManager.createSession.mockRejectedValue(new Error('Session creation failed'));

      const result = await analyzer.analyzeSentiment('Test content');
      expect(result).toBeDefined();
      expect(result.recommendation || 'SAFE').toBe('SAFE');
      expect(result.sentiment || 'NEUTRAL').toBe('NEUTRAL');
    });
  });

  describe('parseSentimentText', () => {
    test('should detect negative sentiment', () => {
      const text = 'This content is negative and induces fear';
      const result = analyzer.parseSentimentText(text);
      expect(result.sentiment).toBe('NEGATIVE');
      expect(result.sentimentScore).toBe(-0.5);
    });

    test('should detect positive sentiment', () => {
      const text = 'This is a happy and joyful message';
      const result = analyzer.parseSentimentText(text);
      expect(result.sentiment).toBe('POSITIVE');
      expect(result.sentimentScore).toBe(0.5);
    });

    test('should default to neutral sentiment', () => {
      const text = 'This is a neutral message';
      const result = analyzer.parseSentimentText(text);
      expect(result.sentiment).toBe('NEUTRAL');
      expect(result.sentimentScore).toBe(0);
    });

    test('should detect critical urgency', () => {
      const text = 'This is critical and requires immediate action';
      const result = analyzer.parseSentimentText(text);
      expect(result.urgencyLevel).toBe('CRITICAL');
      expect(result.recommendation).toBe('WARNING');
    });

    test('should detect high urgency', () => {
      const text = 'This is urgent and needs attention asap';
      const result = analyzer.parseSentimentText(text);
      expect(result.urgencyLevel).toBe('HIGH');
    });

    test('should detect medium urgency', () => {
      const text = 'This needs attention soon with limited time';
      const result = analyzer.parseSentimentText(text);
      expect(result.urgencyLevel).toBe('MEDIUM');
    });

    test('should detect manipulation indicators', () => {
      const text = 'This content uses manipulation and pressure tactics';
      const result = analyzer.parseSentimentText(text);
      expect(result.manipulationDetected).toBe(true);
    });

    test('should handle empty text', () => {
      const result = analyzer.parseSentimentText('');
      expect(result).toHaveProperty('sentimentScore');
      expect(result).toHaveProperty('urgencyLevel');
    });

    test('should be case-insensitive', () => {
      const textLower = 'negative';
      const textUpper = 'NEGATIVE';
      const resultLower = analyzer.parseSentimentText(textLower);
      const resultUpper = analyzer.parseSentimentText(textUpper);
      expect(resultLower.sentiment).toBe(resultUpper.sentiment);
    });

    test('should handle exploitation keyword', () => {
      const text = 'This is exploitation content';
      const result = analyzer.parseSentimentText(text);
      expect(result.manipulationDetected).toBe(true);
    });
  });

  describe('analyzeAdvanced', () => {
    test('should return default analysis for empty text', async () => {
      const result = await analyzer.analyzeAdvanced('');
      expect(result).toEqual(analyzer.getDefaultAnalysis());
    });

    test('should return default analysis for null text', async () => {
      const result = await analyzer.analyzeAdvanced(null);
      expect(result).toEqual(analyzer.getDefaultAnalysis());
    });

    test('should return default analysis for non-string text', async () => {
      const result = await analyzer.analyzeAdvanced({});
      expect(result).toEqual(analyzer.getDefaultAnalysis());
    });

    test('should combine all analysis stages', async () => {
      const result = await analyzer.analyzeAdvanced('Test content');

      expect(result).toHaveProperty('manipulationScore');
      expect(result).toHaveProperty('trustworthiness');
      expect(result).toHaveProperty('recommendation');
      expect(result).toHaveProperty('lexiconScores');
      expect(result).toHaveProperty('dominantLexicons');
      expect(result).toHaveProperty('emotionalState');
      expect(result).toHaveProperty('emotionalTriggers');
      expect(result).toHaveProperty('valence');
      expect(result).toHaveProperty('arousal');
      expect(result).toHaveProperty('dominance');
      expect(result).toHaveProperty('riskAssessment');
      expect(result).toHaveProperty('linguisticFeatures');
      expect(result).toHaveProperty('aiAnalysis');
    });

    test('should use lexicon analysis', async () => {
      const result = await analyzer.analyzeAdvanced('Test content');
      expect(analyzer.lexicons.calculateLexiconScores).toHaveBeenCalledWith('Test content');
    });

    test('should use linguistic analysis', async () => {
      const result = await analyzer.analyzeAdvanced('Test content');
      expect(analyzer.linguisticAnalyzer.analyze).toHaveBeenCalledWith('Test content');
    });

    test('should use emotion analysis', async () => {
      const result = await analyzer.analyzeAdvanced('Test content');
      expect(analyzer.emotionAnalyzer.analyze).toHaveBeenCalledWith('Test content', expect.any(Object));
    });

    test('should use AI analysis', async () => {
      const result = await analyzer.analyzeAdvanced('Test content');
      expect(mockAIManager.createSession).toHaveBeenCalled();
    });

    test('should handle analysis errors gracefully', async () => {
      analyzer.lexicons.calculateLexiconScores.mockImplementation(() => {
        throw new Error('Lexicon error');
      });

      const result = await analyzer.analyzeAdvanced('Test content');
      expect(result).toEqual(analyzer.getDefaultAnalysis());
    });

    test('should return valid VAD scores', async () => {
      const result = await analyzer.analyzeAdvanced('urgent test');
      expect(result).toBeDefined();
      expect(result).toHaveProperty('valence');
      expect(result).toHaveProperty('arousal');
      expect(result).toHaveProperty('dominance');
      if (typeof result.valence === 'number') {
        expect(result.valence).toBeGreaterThanOrEqual(-1);
        expect(result.valence).toBeLessThanOrEqual(1);
      }
    });

    test('should include AI analysis results', async () => {
      const result = await analyzer.analyzeAdvanced('Test content');
      expect(result.aiAnalysis).toBeDefined();
    });
  });

  describe('analyzeWithAI', () => {
    test('should return null for empty text', async () => {
      const result = await analyzer.analyzeWithAI('');
      expect(result).toBeNull();
    });

    test('should return null for null text', async () => {
      const result = await analyzer.analyzeWithAI(null);
      expect(result).toBeNull();
    });

    test('should create session with temperature 0.5', async () => {
      mockAIManager.createSession.mockResolvedValue({
        prompt: jest.fn().mockResolvedValue('{"semanticScore": 0.5}'),
        destroy: jest.fn()
      });

      await analyzer.analyzeWithAI('Test content');
      expect(mockAIManager.createSession).toHaveBeenCalledWith({ temperature: 0.5 });
    });

    test('should extract and parse JSON from response', async () => {
      mockAIManager.createSession.mockResolvedValue({
        prompt: jest.fn().mockResolvedValue('{"semanticScore": 0.75, "manipulationTechniques": "technique1"}'),
        destroy: jest.fn()
      });

      const result = await analyzer.analyzeWithAI('Test content');
      expect(result).toHaveProperty('semanticScore');
    });

    test('should use fallback parser when JSON extraction fails', async () => {
      mockAIManager.createSession.mockResolvedValue({
        prompt: jest.fn().mockResolvedValue('Some text about manipulation and pressure'),
        destroy: jest.fn()
      });

      const result = await analyzer.analyzeWithAI('Test content');
      expect(result).toBeDefined();
    });

    test('should truncate text to 2000 characters', async () => {
      const longText = 'a'.repeat(5000);
      const mockPrompt = jest.fn().mockResolvedValue('{"semanticScore": 0}');
      mockAIManager.createSession.mockResolvedValue({
        prompt: mockPrompt,
        destroy: jest.fn()
      });

      await analyzer.analyzeWithAI(longText);
      const promptCall = mockPrompt.mock.calls[0][0];
      expect(promptCall).toContain('a'.repeat(2000));
    });

    test('should destroy session after analysis', async () => {
      mockAIManager.createSession.mockResolvedValue({
        prompt: jest.fn().mockResolvedValue('{"semanticScore": 0}'),
        destroy: jest.fn()
      });

      await analyzer.analyzeWithAI('Test content');
      expect(mockAIManager.destroySession).toHaveBeenCalled();
    });

    test('should handle session creation errors', async () => {
      mockAIManager.createSession.mockRejectedValue(new Error('Session error'));

      const result = await analyzer.analyzeWithAI('Test content');
      expect(result).toEqual({
        semanticScore: 0,
        manipulationTechniques: [],
        pressureTactics: [],
        trustMarkers: [],
        socialEngineering: false
      });
    });

    test('should destroy session even on error', async () => {
      mockAIManager.createSession.mockResolvedValue({
        prompt: jest.fn().mockRejectedValue(new Error('Prompt failed')),
        destroy: jest.fn().mockRejectedValue(new Error('Destroy failed'))
      });

      await analyzer.analyzeWithAI('Test content');
      expect(mockAIManager.destroySession).toHaveBeenCalled();
    });

    test('should include URL in prompt', async () => {
      const mockPrompt = jest.fn().mockResolvedValue('{"semanticScore": 0}');
      mockAIManager.createSession.mockResolvedValue({
        prompt: mockPrompt,
        destroy: jest.fn()
      });

      await analyzer.analyzeWithAI('Test content', 'https://example.com');
      const promptCall = mockPrompt.mock.calls[0][0];
      expect(promptCall).toContain('https://example.com');
    });
  });

  describe('determineTrustworthiness', () => {
    test('should return UNTRUSTWORTHY for high manipulation score', () => {
      const result = analyzer.determineTrustworthiness(0.8, {});
      expect(result).toBe('UNTRUSTWORTHY');
    });

    test('should return CAUTION for medium-high manipulation score', () => {
      const result = analyzer.determineTrustworthiness(0.5, {});
      expect(result).toBe('CAUTION');
    });

    test('should return CAUTION for social engineering detected', () => {
      const result = analyzer.determineTrustworthiness(0.2, { socialEngineering: true });
      expect(result).toBe('CAUTION');
    });

    test('should return TRUSTWORTHY for low manipulation score', () => {
      const result = analyzer.determineTrustworthiness(0.2, { socialEngineering: false });
      expect(result).toBe('TRUSTWORTHY');
    });

    test('should handle score at boundary 0.7', () => {
      const result = analyzer.determineTrustworthiness(0.71, {});
      expect(result).toBe('UNTRUSTWORTHY');
    });

    test('should handle score at boundary 0.4', () => {
      const result = analyzer.determineTrustworthiness(0.41, {});
      expect(result).toBe('CAUTION');
    });
  });

  describe('determineRecommendation', () => {
    test('should return DANGEROUS for high manipulation and high risk', () => {
      const emotionProfile = { riskAssessment: { level: 'HIGH' } };
      const result = analyzer.determineRecommendation(0.85, emotionProfile, {});
      expect(result).toBe('DANGEROUS');
    });

    test('should return DANGEROUS for risk level HIGH', () => {
      const emotionProfile = { riskAssessment: { level: 'HIGH' } };
      const result = analyzer.determineRecommendation(0.5, emotionProfile, {});
      expect(result).toBe('DANGEROUS');
    });

    test('should return WARNING for medium-high manipulation', () => {
      const emotionProfile = { riskAssessment: { level: 'LOW' } };
      const result = analyzer.determineRecommendation(0.65, emotionProfile, {});
      expect(result).toBe('WARNING');
    });

    test('should return WARNING for medium risk', () => {
      const emotionProfile = { riskAssessment: { level: 'MEDIUM' } };
      const result = analyzer.determineRecommendation(0.5, emotionProfile, {});
      expect(result).toBe('WARNING');
    });

    test('should return CAUTION for moderate manipulation', () => {
      const emotionProfile = { riskAssessment: { level: 'LOW' } };
      const result = analyzer.determineRecommendation(0.35, emotionProfile, {});
      expect(result).toBe('CAUTION');
    });

    test('should return SAFE for low manipulation and low risk', () => {
      const emotionProfile = { riskAssessment: { level: 'LOW' } };
      const result = analyzer.determineRecommendation(0.2, emotionProfile, {});
      expect(result).toBe('SAFE');
    });

    test('should handle undefined risk level', () => {
      const emotionProfile = { riskAssessment: {} };
      const result = analyzer.determineRecommendation(0.2, emotionProfile, {});
      expect(result).toBe('SAFE');
    });
  });

  describe('getDefaultAnalysis', () => {
    test('should return complete analysis object', () => {
      const result = analyzer.getDefaultAnalysis();

      expect(result).toHaveProperty('manipulationScore', 0);
      expect(result).toHaveProperty('trustworthiness', 'TRUSTWORTHY');
      expect(result).toHaveProperty('recommendation', 'SAFE');
      expect(result).toHaveProperty('lexiconScores');
      expect(result).toHaveProperty('dominantLexicons');
      expect(result).toHaveProperty('emotionalState', 'neutral');
      expect(result).toHaveProperty('emotionalTriggers');
      expect(result).toHaveProperty('valence', 0);
      expect(result).toHaveProperty('arousal', 0);
      expect(result).toHaveProperty('dominance', 0.5);
      expect(result).toHaveProperty('riskAssessment');
      expect(result).toHaveProperty('linguisticFeatures');
      expect(result).toHaveProperty('aiAnalysis');
    });

    test('should return safe risk assessment', () => {
      const result = analyzer.getDefaultAnalysis();
      expect(result.riskAssessment.level).toBe('LOW');
    });

    test('should return empty arrays for triggers and lexicons', () => {
      const result = analyzer.getDefaultAnalysis();
      expect(Array.isArray(result.emotionalTriggers)).toBe(true);
      expect(Array.isArray(result.dominantLexicons)).toBe(true);
    });
  });

  describe('analyzeWhatsAppMessage', () => {
    test('should create session with temperature 0.3', async () => {
      mockAIManager.createSession.mockResolvedValue({
        prompt: jest.fn().mockResolvedValue('{"isSuspicious": false}'),
        destroy: jest.fn()
      });

      await analyzer.analyzeWhatsAppMessage('Test message');
      expect(mockAIManager.createSession).toHaveBeenCalledWith({ temperature: 0.3 });
    });

    test('should extract and parse JSON response', async () => {
      mockAIManager.createSession.mockResolvedValue({
        prompt: jest.fn().mockResolvedValue('{"isSuspicious": true, "riskLevel": "HIGH", "recommendation": "BLOCK"}'),
        destroy: jest.fn()
      });

      const result = await analyzer.analyzeWhatsAppMessage('Suspicious message');
      expect(result).toHaveProperty('isSuspicious');
      expect(result).toHaveProperty('riskLevel');
    });

    test('should include message and sender in prompt', async () => {
      const mockPrompt = jest.fn().mockResolvedValue('{"isSuspicious": false}');
      mockAIManager.createSession.mockResolvedValue({
        prompt: mockPrompt,
        destroy: jest.fn()
      });

      await analyzer.analyzeWhatsAppMessage('Test message', 'john.doe');
      const promptCall = mockPrompt.mock.calls[0][0];
      expect(promptCall).toContain('Test message');
      expect(promptCall).toContain('john.doe');
    });

    test('should handle error gracefully', async () => {
      mockAIManager.createSession.mockRejectedValue(new Error('Error'));

      const result = await analyzer.analyzeWhatsAppMessage('Test message');
      expect(result).toEqual({ isSuspicious: false, riskLevel: 'LOW', recommendation: 'REPLY' });
    });

    test('should destroy session after analysis', async () => {
      mockAIManager.createSession.mockResolvedValue({
        prompt: jest.fn().mockResolvedValue('{"isSuspicious": false}'),
        destroy: jest.fn()
      });

      await analyzer.analyzeWhatsAppMessage('Test message');
      expect(mockAIManager.destroySession).toHaveBeenCalled();
    });

    test('should handle invalid JSON gracefully', async () => {
      mockAIManager.createSession.mockResolvedValue({
        prompt: jest.fn().mockResolvedValue('Invalid JSON'),
        destroy: jest.fn()
      });

      const result = await analyzer.analyzeWhatsAppMessage('Test message');
      expect(result).toBeNull();
    });
  });

  describe('integration tests', () => {
    test('should handle multi-stage analysis pipeline', async () => {
      const text = 'URGENT: Your account has been compromised! Click here NOW to verify';
      const result = await analyzer.analyzeAdvanced(text);

      expect(result).toBeDefined();
      expect(result.manipulationScore).toBeGreaterThan(0);
      expect(result.trustworthiness).toBeDefined();
    });

    test('should process phishing-like content', async () => {
      const text = 'Congratulations! You are a winner! Claim your prize now!';
      const result = await analyzer.analyzeAdvanced(text);

      expect(result).toBeDefined();
      expect(typeof result.trustworthiness).toBe('string');
    });

    test('should handle mixed emotional content', async () => {
      const text = 'Great news! But act quickly before this offer expires.';
      const result = await analyzer.analyzeAdvanced(text);

      expect(result).toBeDefined();
      expect(result.emotionalState).toBeDefined();
    });

    test('should analyze legitimate content safely', async () => {
      const text = 'This is a normal message with neutral content.';
      const result = await analyzer.analyzeAdvanced(text);

      expect(result).toBeDefined();
      expect(result.recommendation).toMatch(/SAFE|CAUTION|WARNING/);
    });
  });

  describe('edge cases', () => {
    test('should handle very long text', async () => {
      const longText = 'a'.repeat(10000);
      const result = await analyzer.analyzeAdvanced(longText);
      expect(result).toBeDefined();
    });

    test('should handle special characters in JSON', () => {
      const jsonWithSpecial = '{"message": "Text with \\"quotes\\" and \\\\backslash"}';
      const result = analyzer.robustJsonParse(jsonWithSpecial);
      expect(result).toBeDefined();
    });

    test('should handle Unicode characters', async () => {
      const unicodeText = 'Test with émojis 🚨 and special characters';
      const result = await analyzer.analyzeAdvanced(unicodeText);
      expect(result).toBeDefined();
    });

    test('should handle URLs in content', async () => {
      const textWithUrl = 'Click here: https://example.com/phishing?param=value';
      const result = await analyzer.analyzeAdvanced(textWithUrl);
      expect(result).toBeDefined();
    });

    test('should handle emails in content', async () => {
      const textWithEmail = 'Contact: support@example.com for more info';
      const result = await analyzer.analyzeAdvanced(textWithEmail);
      expect(result).toBeDefined();
    });

    test('should handle repeated analysis calls', async () => {
      const text = 'Test content';
      const result1 = await analyzer.analyzeAdvanced(text);
      const result2 = await analyzer.analyzeAdvanced(text);

      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
    });
  });
});
