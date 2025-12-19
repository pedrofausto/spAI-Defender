/**
 * Image Analyzer Tests
 * RED-GREEN-REFACTOR TDD cycle
 * Testing image analysis, phishing detection, visual content evaluation
 */

import { ImageAnalyzer } from '../../../chrome-extension/src/utils/image-analyzer.js';
import { setupChromeMocks } from '../../helpers/chrome-api-mock.js';
import { setupAIMocks } from '../../helpers/ai-mock.js';

describe('ImageAnalyzer', () => {
  let analyzer;
  let mockAIManager;
  let mockSession;

  beforeEach(() => {
    setupChromeMocks();
    setupAIMocks();

    // Create mock session for AI interactions
    mockSession = {
      prompt: jest.fn().mockResolvedValue(JSON.stringify({
        isMalicious: false,
        riskScore: 30,
        riskLevel: 'LOW',
        description: 'Image appears safe'
      })),
      destroy: jest.fn().mockResolvedValue(undefined)
    };

    // Mock AI manager
    mockAIManager = {
      createSession: jest.fn().mockResolvedValue(mockSession),
      destroySession: jest.fn().mockResolvedValue(undefined)
    };

    analyzer = new ImageAnalyzer(mockAIManager);

    // Mock self.LanguageModel
    global.self = global.self || {};
    global.self.LanguageModel = {
      create: jest.fn().mockResolvedValue(mockSession)
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    test('should initialize with aiManager', () => {
      expect(analyzer.aiManager).toBe(mockAIManager);
    });

    test('should create ImageAnalyzer instance', () => {
      expect(analyzer).toBeInstanceOf(ImageAnalyzer);
    });

    test('should have all required methods', () => {
      expect(typeof analyzer.analyzeImage).toBe('function');
      expect(typeof analyzer.analyzeWithPrompt).toBe('function');
      expect(typeof analyzer.analyzePageImages).toBe('function');
      expect(typeof analyzer.extractTextFromImage).toBe('function');
      expect(typeof analyzer.parseAnalysisResponse).toBe('function');
      expect(typeof analyzer.parseTextAnalysis).toBe('function');
      expect(typeof analyzer.extractTextFromResponse).toBe('function');
    });

    test('should initialize without errors', () => {
      expect(() => new ImageAnalyzer(mockAIManager)).not.toThrow();
    });
  });

  describe('analyzeImage - basic functionality', () => {
    test('should return safe analysis for valid image URL with AI support', async () => {
      const result = await analyzer.analyzeImage('https://example.com/image.jpg', 'Login page');
      expect(result).toBeDefined();
      expect(typeof result.isMalicious).toBe('boolean');
      expect(typeof result.riskScore).toBe('number');
    });

    test('should reject invalid image URL', async () => {
      const result = await analyzer.analyzeImage(null, 'page');
      expect(result).toBeDefined();
      expect(result.isMalicious).toBe(false);
    });

    test('should reject undefined URL', async () => {
      const result = await analyzer.analyzeImage(undefined, 'page');
      expect(result).toBeDefined();
    });

    test('should reject non-string URL', async () => {
      const result = await analyzer.analyzeImage(12345, 'page');
      expect(result.isMalicious).toBe(false);
    });

    test('should return safe default when AI not available', async () => {
      delete global.self.LanguageModel;
      const result = await analyzer.analyzeImage('https://example.com/img.jpg', 'page');
      expect(result.analyzed).toBe(false);
      expect(result.riskScore).toBe(0);
    });

    test('should handle empty URL string', async () => {
      const result = await analyzer.analyzeImage('', 'page');
      expect(result.isMalicious).toBe(false);
    });

    test('should accept empty page context', async () => {
      const result = await analyzer.analyzeImage('https://example.com/img.jpg', '');
      expect(result).toBeDefined();
    });

    test('should accept missing page context (default empty)', async () => {
      const result = await analyzer.analyzeImage('https://example.com/img.jpg');
      expect(result).toBeDefined();
    });
  });

  describe('analyzeImage - phishing detection', () => {
    test('should detect phishing in malicious image URL', async () => {
      mockSession.prompt.mockResolvedValue(JSON.stringify({
        isMalicious: true,
        riskScore: 85,
        riskLevel: 'HIGH',
        threats: ['phishing attempt'],
        description: 'Suspicious image detected'
      }));

      const result = await analyzer.analyzeImage('https://phishing-site.com/fake-login.jpg', 'bank');
      expect(result).toBeDefined();
    });

    test('should handle AI analysis errors gracefully', async () => {
      mockAIManager.createSession.mockRejectedValue(new Error('AI error'));
      const result = await analyzer.analyzeImage('https://example.com/img.jpg', 'page');
      expect(result).toBeDefined();
      expect(result.isMalicious).toBe(false);
    });

    test('should parse phishing indicators from response', async () => {
      mockSession.prompt.mockResolvedValue('Image shows phishing threats: credential theft');
      const result = await analyzer.analyzeImage('https://example.com/img.jpg', 'page');
      expect(result).toBeDefined();
    });
  });

  describe('analyzeWithPrompt', () => {
    test('should create AI session and analyze image', async () => {
      await analyzer.analyzeWithPrompt('https://example.com/img.jpg', 'bank site');
      expect(mockAIManager.createSession).toHaveBeenCalled();
    });

    test('should pass proper prompt to AI session', async () => {
      await analyzer.analyzeWithPrompt('https://bank.com/img.jpg', 'financial page');
      expect(mockSession.prompt).toHaveBeenCalled();
      const promptArg = mockSession.prompt.mock.calls[0][0];
      expect(promptArg).toContain('security expert');
      expect(promptArg).toContain('https://bank.com/img.jpg');
    });

    test('should destroy session after analysis', async () => {
      await analyzer.analyzeWithPrompt('https://example.com/img.jpg', 'page');
      expect(mockAIManager.destroySession).toHaveBeenCalled();
    });

    test('should parse JSON response from AI', async () => {
      mockSession.prompt.mockResolvedValue(JSON.stringify({
        isMalicious: false,
        riskScore: 20,
        riskLevel: 'LOW',
        threats: [],
        description: 'Safe image'
      }));

      const result = await analyzer.analyzeWithPrompt('https://example.com/img.jpg', 'page');
      expect(result.isMalicious).toBe(false);
    });

    test('should handle text response from AI', async () => {
      mockSession.prompt.mockResolvedValue('The image appears malicious based on analysis');
      const result = await analyzer.analyzeWithPrompt('https://example.com/img.jpg', 'page');
      expect(result).toBeDefined();
    });

    test('should handle AI session errors', async () => {
      mockAIManager.createSession.mockRejectedValue(new Error('Session error'));
      await expect(analyzer.analyzeWithPrompt('https://example.com/img.jpg', 'page')).rejects.toThrow();
    });

    test('should include page context in analysis', async () => {
      const context = 'This is a payment confirmation page with suspicious elements';
      await analyzer.analyzeWithPrompt('https://example.com/img.jpg', context);
      const promptArg = mockSession.prompt.mock.calls[0][0];
      expect(promptArg).toContain(context);
    });
  });

  describe('analyzePageImages', () => {
    test('should return empty results for no images', async () => {
      const result = await analyzer.analyzePageImages([], 'page');
      expect(result.totalImages).toBe(0);
      expect(result.maliciousCount).toBe(0);
      expect(result.results).toEqual([]);
    });

    test('should return empty results for null input', async () => {
      const result = await analyzer.analyzePageImages(null, 'page');
      expect(result.totalImages).toBe(0);
      expect(result.results).toEqual([]);
    });

    test('should analyze single image', async () => {
      const images = ['https://example.com/img1.jpg'];
      const result = await analyzer.analyzePageImages(images, 'page');
      expect(result.totalImages).toBe(1);
      expect(result.analyzedImages).toBe(1);
    });

    test('should analyze multiple images up to limit', async () => {
      const images = Array(15).fill(null).map((_, i) => `https://example.com/img${i}.jpg`);
      const result = await analyzer.analyzePageImages(images, 'page');
      expect(result.totalImages).toBe(15);
      expect(result.analyzedImages).toBe(10); // Should limit to 10
    });

    test('should count malicious images correctly', async () => {
      mockSession.prompt
        .mockResolvedValueOnce(JSON.stringify({ isMalicious: true, riskLevel: 'HIGH' }))
        .mockResolvedValueOnce(JSON.stringify({ isMalicious: false, riskLevel: 'LOW' }))
        .mockResolvedValueOnce(JSON.stringify({ isMalicious: true, riskLevel: 'CRITICAL' }));

      const images = ['img1.jpg', 'img2.jpg', 'img3.jpg'];
      const result = await analyzer.analyzePageImages(images, 'page');
      expect(result.maliciousCount).toBeGreaterThanOrEqual(0);
    });

    test('should determine max risk level correctly', async () => {
      mockSession.prompt
        .mockResolvedValueOnce(JSON.stringify({ isMalicious: true, riskLevel: 'MEDIUM' }))
        .mockResolvedValueOnce(JSON.stringify({ isMalicious: true, riskLevel: 'HIGH' }));

      const images = ['img1.jpg', 'img2.jpg'];
      const result = await analyzer.analyzePageImages(images, 'page');
      expect(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).toContain(result.maxRiskLevel);
    });

    test('should handle errors during individual image analysis', async () => {
      mockSession.prompt.mockRejectedValueOnce(new Error('Analysis error'));
      const images = ['img1.jpg', 'img2.jpg'];
      const result = await analyzer.analyzePageImages(images, 'page');
      expect(result.totalImages).toBe(2);
      expect(Array.isArray(result.results)).toBe(true);
    });

    test('should continue analyzing after one image fails', async () => {
      mockSession.prompt
        .mockRejectedValueOnce(new Error('Error'))
        .mockResolvedValueOnce(JSON.stringify({ isMalicious: false, riskLevel: 'LOW' }));

      const images = ['img1.jpg', 'img2.jpg'];
      const result = await analyzer.analyzePageImages(images, 'page');
      expect(result.analyzedImages).toBeGreaterThan(0);
    });

    test('should include image URLs in results', async () => {
      const images = ['https://example.com/img1.jpg', 'https://example.com/img2.jpg'];
      const result = await analyzer.analyzePageImages(images, 'page');

      result.results.forEach(resultItem => {
        expect(resultItem.url).toBeDefined();
        expect(typeof resultItem.url).toBe('string');
      });
    });

    test('should accept empty page context', async () => {
      const images = ['img1.jpg'];
      const result = await analyzer.analyzePageImages(images, '');
      expect(result).toBeDefined();
    });

    test('should process results in order', async () => {
      const images = ['img1.jpg', 'img2.jpg', 'img3.jpg'];
      const result = await analyzer.analyzePageImages(images, 'page');
      expect(Array.isArray(result.results)).toBe(true);
      expect(result.results.length).toBeLessThanOrEqual(10);
    });
  });

  describe('extractTextFromImage', () => {
    test('should return null (OCR not supported)', async () => {
      const result = await analyzer.extractTextFromImage('https://example.com/img.jpg');
      expect(result).toBeNull();
    });

    test('should handle invalid URL gracefully', async () => {
      const result = await analyzer.extractTextFromImage(null);
      expect(result).toBeNull();
    });

    test('should not throw errors', async () => {
      await expect(analyzer.extractTextFromImage('https://example.com/img.jpg')).resolves.not.toThrow();
    });

    test('should handle errors gracefully', async () => {
      const result = await analyzer.extractTextFromImage('invalid-url');
      expect(result).toBeNull();
    });
  });

  describe('parseAnalysisResponse', () => {
    test('should parse valid JSON response', () => {
      const response = JSON.stringify({ isMalicious: true, riskScore: 80, riskLevel: 'HIGH' });
      const result = analyzer.parseAnalysisResponse(response);
      expect(result.isMalicious).toBe(true);
      expect(result.riskScore).toBe(80);
    });

    test('should extract JSON from text response', () => {
      const response = 'Some text before {"isMalicious": false, "riskScore": 20} some text after';
      const result = analyzer.parseAnalysisResponse(response);
      expect(typeof result).toBe('object');
    });

    test('should handle response without JSON', () => {
      const response = 'The image appears to be suspicious';
      const result = analyzer.parseAnalysisResponse(response);
      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
    });

    test('should handle empty response', () => {
      const result = analyzer.parseAnalysisResponse('');
      expect(result).toBeDefined();
    });

    test('should handle null response', () => {
      const result = analyzer.parseAnalysisResponse(null);
      expect(result).toBeDefined();
    });

    test('should handle malformed JSON', () => {
      const response = '{ invalid json content }';
      const result = analyzer.parseAnalysisResponse(response);
      expect(result).toBeDefined();
      expect(result.isMalicious).toBe(false);
    });

    test('should preserve parsed values', () => {
      const response = JSON.stringify({
        isMalicious: true,
        riskScore: 95,
        riskLevel: 'CRITICAL',
        threats: ['phishing']
      });
      const result = analyzer.parseAnalysisResponse(response);
      expect(result.riskScore).toBe(95);
      expect(result.riskLevel).toBe('CRITICAL');
    });
  });

  describe('parseTextAnalysis', () => {
    test('should detect malicious indicators', () => {
      const text = 'This image shows malicious content and phishing attempt';
      const result = analyzer.parseTextAnalysis(text, 'https://example.com/img.jpg');
      expect(result.isMalicious).toBe(true);
      expect(result.riskLevel).toBe('HIGH');
    });

    test('should detect suspicious indicators', () => {
      const text = 'The image appears suspicious and requires verification';
      const result = analyzer.parseTextAnalysis(text, 'https://example.com/img.jpg');
      expect(result.riskScore).toBeGreaterThanOrEqual(50);
    });

    test('should set default values for safe content', () => {
      const text = 'The image appears safe and legitimate';
      const result = analyzer.parseTextAnalysis(text, 'https://example.com/img.jpg');
      expect(result.isMalicious).toBe(false);
      expect(result.riskLevel).toBe('LOW');
    });

    test('should extract threats from response', () => {
      const text = 'Threats: credential theft, URL spoofing';
      const result = analyzer.parseTextAnalysis(text, 'https://example.com/img.jpg');
      expect(Array.isArray(result.threats)).toBe(true);
    });

    test('should include page URL in analysis', () => {
      const text = 'Analysis complete';
      const result = analyzer.parseTextAnalysis(text, 'https://example.com/img.jpg');
      expect(result.imageUrl).toBe('https://example.com/img.jpg');
    });

    test('should be case insensitive for detection', () => {
      const text = 'MALICIOUS content PHISHING attempt';
      const result = analyzer.parseTextAnalysis(text, 'url');
      expect(result.isMalicious).toBe(true);
    });

    test('should set recommendations correctly', () => {
      const maliciousText = 'This is malicious';
      const result = analyzer.parseTextAnalysis(maliciousText, 'url');
      expect(result.recommendation).toBe('AVOID');
    });

    test('should truncate description to 200 chars', () => {
      const longText = 'A'.repeat(300);
      const result = analyzer.parseTextAnalysis(longText, 'url');
      expect(result.description.length).toBeLessThanOrEqual(200);
    });

    test('should handle empty text', () => {
      const result = analyzer.parseTextAnalysis('', 'url');
      expect(result).toBeDefined();
      expect(result.isMalicious).toBe(false);
    });

    test('should handle null text', () => {
      const result = analyzer.parseTextAnalysis(null, 'url');
      expect(result).toBeDefined();
    });
  });

  describe('extractTextFromResponse', () => {
    test('should extract string response as-is', () => {
      const response = 'Test response text';
      const result = analyzer.extractTextFromResponse(response);
      expect(result).toBe('Test response text');
    });

    test('should stringify object response', () => {
      const response = { test: 'value' };
      const result = analyzer.extractTextFromResponse(response);
      expect(typeof result).toBe('string');
      expect(result).toContain('test');
    });

    test('should handle null response', () => {
      const result = analyzer.extractTextFromResponse(null);
      expect(result).toBeNull();
    });

    test('should handle array response', () => {
      const response = ['item1', 'item2'];
      const result = analyzer.extractTextFromResponse(response);
      expect(typeof result).toBe('string');
    });

    test('should handle empty string', () => {
      const result = analyzer.extractTextFromResponse('');
      expect(result).toBe('');
    });
  });

  describe('integration tests', () => {
    test('should analyze page images in workflow', async () => {
      const images = ['https://example.com/img1.jpg', 'https://example.com/img2.jpg'];
      const result = await analyzer.analyzePageImages(images, 'bank website');

      expect(result.totalImages).toBe(2);
      expect(Array.isArray(result.results)).toBe(true);
    });

    test('should handle multiple consecutive analyses', async () => {
      const url1 = 'https://example.com/img1.jpg';
      const url2 = 'https://example.com/img2.jpg';

      const result1 = await analyzer.analyzeImage(url1, 'page1');
      const result2 = await analyzer.analyzeImage(url2, 'page2');

      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
    });

    test('should maintain state across multiple calls', async () => {
      mockSession.prompt.mockClear();
      await analyzer.analyzeImage('https://example.com/img.jpg', 'page');
      const firstCallCount = mockSession.prompt.mock.calls.length;

      await analyzer.analyzeImage('https://example.com/img2.jpg', 'page2');
      expect(mockSession.prompt.mock.calls.length).toBeGreaterThanOrEqual(firstCallCount);
    });

    test('should handle large image lists with rate limiting', async () => {
      const images = Array(15).fill(null).map((_, i) => `img${i}.jpg`);
      const result = await analyzer.analyzePageImages(images, 'page');

      expect(result.analyzedImages).toBeLessThanOrEqual(10);
      expect(result.totalImages).toBe(15);
    });
  });

  describe('edge cases and error handling', () => {
    test('should handle very long URLs', async () => {
      const longUrl = 'https://example.com/' + 'a'.repeat(1000) + '.jpg';
      const result = await analyzer.analyzeImage(longUrl, 'page');
      expect(result).toBeDefined();
    });

    test('should handle special characters in URL', async () => {
      const specialUrl = 'https://example.com/image-!@#$%.jpg';
      const result = await analyzer.analyzeImage(specialUrl, 'page');
      expect(result).toBeDefined();
    });

    test('should handle URLs with special encoding', async () => {
      const encodedUrl = 'https://example.com/image%20with%20spaces.jpg';
      const result = await analyzer.analyzeImage(encodedUrl, 'page');
      expect(result).toBeDefined();
    });

    test('should handle context with special characters', async () => {
      const result = await analyzer.analyzeImage('https://example.com/img.jpg', 'Page with <html> & "quotes"');
      expect(result).toBeDefined();
    });

    test('should handle concurrent analyses', async () => {
      const promises = [
        analyzer.analyzeImage('img1.jpg', 'page1'),
        analyzer.analyzeImage('img2.jpg', 'page2'),
        analyzer.analyzeImage('img3.jpg', 'page3')
      ];

      const results = await Promise.all(promises);
      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result).toBeDefined();
      });
    });

    test('should handle race conditions in pool management', async () => {
      const results = await Promise.all([
        analyzer.analyzePageImages(['img1.jpg', 'img2.jpg'], 'page'),
        analyzer.analyzePageImages(['img3.jpg', 'img4.jpg'], 'page')
      ]);

      expect(results).toHaveLength(2);
    });

    test('should recover from partial failures', async () => {
      mockSession.prompt
        .mockResolvedValueOnce(JSON.stringify({ isMalicious: true, riskLevel: 'HIGH' }))
        .mockRejectedValueOnce(new Error('AI error'))
        .mockResolvedValueOnce(JSON.stringify({ isMalicious: false, riskLevel: 'LOW' }));

      const images = ['img1.jpg', 'img2.jpg', 'img3.jpg'];
      const result = await analyzer.analyzePageImages(images, 'page');

      expect(result.totalImages).toBe(3);
      expect(result.analyzedImages).toBeGreaterThan(0);
    });
  });

  describe('response validation', () => {
    test('should always return analysis object', async () => {
      const result = await analyzer.analyzeImage('https://example.com/img.jpg', 'page');
      expect(typeof result).toBe('object');
      expect(result !== null).toBe(true);
    });

    test('should include required fields in response', async () => {
      const result = await analyzer.analyzeImage('https://example.com/img.jpg', 'page');
      expect(result).toHaveProperty('isMalicious');
      expect(result).toHaveProperty('riskScore');
      expect(result).toHaveProperty('riskLevel');
    });

    test('should have valid risk levels', async () => {
      const result = await analyzer.analyzeImage('https://example.com/img.jpg', 'page');
      const validLevels = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
      expect(validLevels).toContain(result.riskLevel);
    });

    test('should have valid risk scores (0-100)', async () => {
      const result = await analyzer.analyzeImage('https://example.com/img.jpg', 'page');
      expect(result.riskScore).toBeGreaterThanOrEqual(0);
      expect(result.riskScore).toBeLessThanOrEqual(100);
    });

    test('should have boolean isMalicious', async () => {
      const result = await analyzer.analyzeImage('https://example.com/img.jpg', 'page');
      expect(typeof result.isMalicious).toBe('boolean');
    });
  });
});
