/**
 * Platform Detector Tests
 * RED-GREEN-REFACTOR TDD cycle
 * Testing all public methods of PlatformDetector class
 */

import { PlatformDetector } from '../../../chrome-extension/src/utils/platform-detector.js';
import { setupChromeMocks } from '../../helpers/chrome-api-mock.js';

describe('PlatformDetector', () => {
  let detector;

  beforeEach(() => {
    setupChromeMocks();
    detector = new PlatformDetector();
  });

  describe('constructor', () => {
    test('should initialize with all platform definitions', () => {
      expect(detector.platforms).toBeDefined();
      expect(detector.platforms.WHATSAPP).toBeDefined();
      expect(detector.platforms.TELEGRAM).toBeDefined();
      expect(detector.platforms.GMAIL).toBeDefined();
      expect(detector.platforms.OUTLOOK).toBeDefined();
      expect(detector.platforms.GENERIC).toBeDefined();
    });

    test('should have correct platform names', () => {
      expect(detector.platforms.WHATSAPP.name).toBe('WhatsApp Web');
      expect(detector.platforms.TELEGRAM.name).toBe('Telegram Web');
      expect(detector.platforms.GMAIL.name).toBe('Gmail');
      expect(detector.platforms.OUTLOOK.name).toBe('Outlook');
      expect(detector.platforms.GENERIC.name).toBe('Web Browser');
    });

    test('should have URL patterns for each platform', () => {
      expect(detector.platforms.WHATSAPP.urlPatterns.length).toBeGreaterThan(0);
      expect(detector.platforms.WHATSAPP.urlPatterns).toContain('web.whatsapp.com');
      expect(detector.platforms.TELEGRAM.urlPatterns).toContain('web.telegram.org');
      expect(detector.platforms.GMAIL.urlPatterns).toContain('mail.google.com');
    });
  });

  describe('detectPlatform', () => {
    test('should detect WhatsApp Web from URL', () => {
      const result = detector.detectPlatform('https://web.whatsapp.com/');
      expect(result).toBe('WHATSAPP');
    });

    test('should detect Telegram from URL', () => {
      const result = detector.detectPlatform('https://web.telegram.org/');
      expect(result).toBe('TELEGRAM');
    });

    test('should detect Gmail from URL', () => {
      const result = detector.detectPlatform('https://mail.google.com/');
      expect(result).toBe('GMAIL');
    });

    test('should detect Outlook from URL', () => {
      const result = detector.detectPlatform('https://outlook.live.com/');
      expect(result).toBe('OUTLOOK');
    });

    test('should return GENERIC for unknown URL', () => {
      const result = detector.detectPlatform('https://example.com/');
      expect(result).toBe('GENERIC');
    });

    test('should return GENERIC for null URL', () => {
      const result = detector.detectPlatform(null);
      expect(result).toBe('GENERIC');
    });

    test('should return GENERIC for undefined URL', () => {
      const result = detector.detectPlatform(undefined);
      expect(result).toBe('GENERIC');
    });

    test('should return GENERIC for empty string URL', () => {
      const result = detector.detectPlatform('');
      expect(result).toBe('GENERIC');
    });

    test('should detect platform with complex URLs', () => {
      const result = detector.detectPlatform(
        'https://web.whatsapp.com/send?phone=1234567890&text=Hello'
      );
      expect(result).toBe('WHATSAPP');
    });

    test('should detect alternative WhatsApp URL pattern', () => {
      const result = detector.detectPlatform('https://whatsapp.com/web/');
      expect(result).toBe('WHATSAPP');
    });

    test('should be case-sensitive in URL matching', () => {
      const result = detector.detectPlatform('https://WEB.WHATSAPP.COM/');
      expect(result).not.toBe('WHATSAPP');
    });
  });

  describe('getPlatformInfo', () => {
    test('should return platform info for WHATSAPP', () => {
      const info = detector.getPlatformInfo('WHATSAPP');
      expect(info.name).toBe('WhatsApp Web');
      expect(info.icon).toBe('💬');
      expect(info.color).toBe('#25D366');
    });

    test('should return platform info for TELEGRAM', () => {
      const info = detector.getPlatformInfo('TELEGRAM');
      expect(info.name).toBe('Telegram Web');
      expect(info.icon).toBe('✈️');
      expect(info.color).toBe('#0088cc');
    });

    test('should return platform info for GMAIL', () => {
      const info = detector.getPlatformInfo('GMAIL');
      expect(info.name).toBe('Gmail');
      expect(info.icon).toBe('📧');
      expect(info.color).toBe('#EA4335');
    });

    test('should return GENERIC info for unknown platform', () => {
      const info = detector.getPlatformInfo('UNKNOWN');
      expect(info.name).toBe('Web Browser');
      expect(info.icon).toBe('🌐');
    });

    test('should return correct color codes', () => {
      const whatsappInfo = detector.getPlatformInfo('WHATSAPP');
      expect(whatsappInfo.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
  });

  describe('getPlatformActions', () => {
    test('should return WhatsApp specific actions', () => {
      const actions = detector.getPlatformActions('WHATSAPP');
      expect(actions).toBeInstanceOf(Array);
      expect(actions.length).toBeGreaterThan(0);
      const actionIds = actions.map((a) => a.id);
      expect(actionIds).toContain('scanChats');
      expect(actionIds).toContain('analyzeLast');
      expect(actionIds).toContain('senderCheck');
    });

    test('should return Telegram specific actions', () => {
      const actions = detector.getPlatformActions('TELEGRAM');
      const actionIds = actions.map((a) => a.id);
      expect(actionIds).toContain('verifyChannel');
      expect(actionIds).toContain('analyzeBot');
      expect(actionIds).toContain('checkGroup');
    });

    test('should return Gmail specific actions', () => {
      const actions = detector.getPlatformActions('GMAIL');
      const actionIds = actions.map((a) => a.id);
      expect(actionIds).toContain('scanInbox');
      expect(actionIds).toContain('checkSender');
      expect(actionIds).toContain('linksCheck');
    });

    test('should return GENERIC actions for unknown platform', () => {
      const actions = detector.getPlatformActions('UNKNOWN');
      const actionIds = actions.map((a) => a.id);
      expect(actionIds).toContain('fullScan');
      expect(actionIds).toContain('quickCheck');
      expect(actionIds).toContain('deepAnalysis');
    });

    test('each action should have required properties', () => {
      const actions = detector.getPlatformActions('WHATSAPP');
      actions.forEach((action) => {
        expect(action.id).toBeDefined();
        expect(action.icon).toBeDefined();
        expect(action.label).toBeDefined();
        expect(action.description).toBeDefined();
      });
    });
  });

  describe('getContentSelectors', () => {
    test('should return WhatsApp content selectors', () => {
      const selectors = detector.getContentSelectors('WHATSAPP');
      expect(selectors.messages).toBeDefined();
      expect(selectors.chatContainer).toBeDefined();
      expect(selectors.messageBubbles).toBeDefined();
      expect(selectors.senders).toBeDefined();
    });

    test('should return Telegram content selectors', () => {
      const selectors = detector.getContentSelectors('TELEGRAM');
      expect(selectors.messages).toBeDefined();
      expect(selectors.chatContainer).toBeDefined();
      expect(selectors.messageBubbles).toBeDefined();
    });

    test('should return Gmail content selectors', () => {
      const selectors = detector.getContentSelectors('GMAIL');
      expect(selectors.messages).toBeDefined();
      expect(selectors.chatContainer).toBeDefined();
      expect(selectors.messageBubbles).toBeDefined();
    });

    test('should return GENERIC selectors for unknown platform', () => {
      const selectors = detector.getContentSelectors('UNKNOWN');
      expect(selectors.content).toBe('body');
      expect(selectors.text).toBeDefined();
    });

    test('should contain valid CSS selectors', () => {
      const selectors = detector.getContentSelectors('WHATSAPP');
      Object.values(selectors).forEach((selector) => {
        expect(typeof selector).toBe('string');
        expect(selector.length).toBeGreaterThan(0);
      });
    });
  });

  describe('extractPlatformContent', () => {
    test('should handle non-existent DOM gracefully', () => {
      const result = detector.extractPlatformContent('WHATSAPP');
      // Should not throw and should return null or empty result
      expect(() => detector.extractPlatformContent('WHATSAPP')).not.toThrow();
    });

    test('should handle errors gracefully', () => {
      // Temporarily mock document.querySelectorAll to throw
      const originalQuerySelector = document.querySelectorAll;
      document.querySelectorAll = jest.fn().mockImplementation(() => {
        throw new Error('DOM error');
      });

      const result = detector.extractPlatformContent('WHATSAPP');
      expect(result).toBeNull();

      document.querySelectorAll = originalQuerySelector;
    });

    test('should work for different platforms', () => {
      const platforms = ['WHATSAPP', 'TELEGRAM', 'GMAIL', 'OUTLOOK', 'GENERIC'];
      platforms.forEach((platform) => {
        expect(() => detector.extractPlatformContent(platform)).not.toThrow();
      });
    });
  });

  describe('extractSenderName', () => {
    test('should handle null element gracefully', () => {
      const result = detector.extractSenderName(null);
      expect(result).toBe('Unknown');
    });

    test('should return Unknown for elements without parent', () => {
      const mockElement = { closest: jest.fn().mockReturnValue(null) };
      const result = detector.extractSenderName(mockElement);
      expect(result).toBe('Unknown');
    });

    test('should extract name when element has title attribute', () => {
      const mockElement = {
        closest: jest.fn().mockReturnValue({
          querySelector: jest.fn().mockReturnValue({
            getAttribute: jest.fn().mockReturnValue('John Doe')
          })
        })
      };
      const result = detector.extractSenderName(mockElement);
      expect(result).toBe('John Doe');
    });

    test('should return Unknown when title attribute is missing', () => {
      const mockElement = {
        closest: jest.fn().mockReturnValue({
          querySelector: jest.fn().mockReturnValue(null)
        })
      };
      const result = detector.extractSenderName(mockElement);
      expect(result).toBe('Unknown');
    });

    test('should handle errors gracefully', () => {
      const mockElement = {
        closest: jest.fn().mockImplementation(() => {
          throw new Error('DOM error');
        })
      };
      const result = detector.extractSenderName(mockElement);
      expect(result).toBe('Unknown');
    });
  });

  describe('integration tests', () => {
    test('should detect platform and return consistent info', () => {
      const url = 'https://web.whatsapp.com/';
      const platform = detector.detectPlatform(url);
      const info = detector.getPlatformInfo(platform);
      expect(platform).toBe('WHATSAPP');
      expect(info.name).toBe('WhatsApp Web');
    });

    test('should provide actions for detected platform', () => {
      const url = 'https://mail.google.com/';
      const platform = detector.detectPlatform(url);
      const actions = detector.getPlatformActions(platform);
      expect(actions.length).toBeGreaterThan(0);
      expect(actions[0].id).toBeDefined();
    });

    test('should provide selectors for detected platform', () => {
      const url = 'https://web.telegram.org/';
      const platform = detector.detectPlatform(url);
      const selectors = detector.getContentSelectors(platform);
      expect(selectors.messages).toBeDefined();
    });

    test('multiple instances should work independently', () => {
      const detector2 = new PlatformDetector();
      expect(detector.detectPlatform('https://web.whatsapp.com')).toBe('WHATSAPP');
      expect(detector2.detectPlatform('https://mail.google.com')).toBe('GMAIL');
      expect(detector.detectPlatform('https://web.telegram.org')).toBe('TELEGRAM');
    });
  });

  describe('edge cases', () => {
    test('should handle URL with port numbers', () => {
      const result = detector.detectPlatform('https://web.whatsapp.com:443/');
      expect(result).toBe('WHATSAPP');
    });

    test('should handle URL with query parameters', () => {
      const result = detector.detectPlatform(
        'https://web.whatsapp.com/?test=1&other=2'
      );
      expect(result).toBe('WHATSAPP');
    });

    test('should handle URL with fragments', () => {
      const result = detector.detectPlatform(
        'https://web.whatsapp.com/#page/chat/123'
      );
      expect(result).toBe('WHATSAPP');
    });

    test('should handle partial URL matches', () => {
      const result = detector.detectPlatform('whatsapp.com/web');
      expect(result).toBe('WHATSAPP');
    });

    test('should not match partial platform names', () => {
      const result = detector.detectPlatform('https://nowhatsapp.com/');
      expect(result).toBe('GENERIC');
    });
  });
});
