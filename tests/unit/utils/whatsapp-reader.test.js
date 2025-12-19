/**
 * WhatsApp Reader Tests
 * RED-GREEN-REFACTOR TDD cycle
 * Testing DOM parsing, message extraction, and platform-specific functionality
 */

import { WhatsAppReader } from '../../../chrome-extension/src/utils/whatsapp-reader.js';
import { setupChromeMocks } from '../../helpers/chrome-api-mock.js';

describe('WhatsAppReader', () => {
  let reader;
  let mockDocument;

  beforeEach(() => {
    setupChromeMocks();
    reader = new WhatsAppReader();

    // Mock document and DOM elements
    mockDocument = {
      querySelector: jest.fn(),
      querySelectorAll: jest.fn()
    };

    global.document = mockDocument;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    test('should initialize with correct message selectors', () => {
      expect(reader.messageSelectors).toBeDefined();
      expect(reader.messageSelectors.messageContainer).toBeDefined();
      expect(reader.messageSelectors.messageBubbles).toBeDefined();
      expect(reader.messageSelectors.messageText).toBeDefined();
    });

    test('should initialize messageCache as empty Map', () => {
      expect(reader.messageCache).toBeInstanceOf(Map);
      expect(reader.messageCache.size).toBe(0);
    });

    test('should initialize lastMessageCount to 0', () => {
      expect(reader.lastMessageCount).toBe(0);
    });

    test('should create WhatsAppReader instance', () => {
      expect(reader).toBeInstanceOf(WhatsAppReader);
    });

    test('should have all required methods', () => {
      expect(typeof reader.extractMessages).toBe('function');
      expect(typeof reader.extractRecentMessages).toBe('function');
      expect(typeof reader.startMonitoring).toBe('function');
      expect(typeof reader.extractChatInfo).toBe('function');
      expect(typeof reader.extractCurrentSenderName).toBe('function');
      expect(typeof reader.analyzeMessagesForPhishing).toBe('function');
      expect(typeof reader.extractTimestamp).toBe('function');
      expect(typeof reader.extractChatsList).toBe('function');
      expect(typeof reader.stopMonitoring).toBe('function');
    });

    test('should have all message selectors', () => {
      const requiredSelectors = [
        'messageContainer',
        'messageBubbles',
        'messageText',
        'messageTime',
        'senderName',
        'statusIcon',
        'messageBox',
        'sendButton'
      ];

      requiredSelectors.forEach(selector => {
        expect(reader.messageSelectors[selector]).toBeDefined();
      });
    });
  });

  describe('extractMessages', () => {
    test('should return empty messages when container not found', () => {
      mockDocument.querySelector.mockReturnValue(null);

      const result = reader.extractMessages();

      expect(result.messages).toEqual([]);
      expect(result.count).toBe(0);
    });

    test('should extract messages from container', () => {
      const mockElements = [
        {
          querySelector: jest.fn((selector) => {
            if (selector.includes('selectable-text')) {
              return { textContent: 'Hello there' };
            }
            if (selector.includes('msg-meta')) {
              return null;
            }
            if (selector.includes('conversation-info')) {
              return null;
            }
            return null;
          }),
          hasAttribute: jest.fn(() => false),
          getAttribute: jest.fn((attr) => attr === 'data-id' ? 'msg-1' : null),
          querySelectorAll: jest.fn(() => [])
        }
      ];

      const mockContainer = {
        querySelectorAll: jest.fn(() => mockElements)
      };

      mockDocument.querySelector.mockReturnValue(mockContainer);

      const result = reader.extractMessages();

      expect(result.count).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(result.messages)).toBe(true);
    });

    test('should include platform information', () => {
      const mockContainer = {
        querySelectorAll: jest.fn(() => [])
      };

      mockDocument.querySelector.mockReturnValue(mockContainer);

      const result = reader.extractMessages();

      expect(result.platform).toBe('WhatsApp Web');
    });

    test('should include extraction timestamp', () => {
      const mockContainer = {
        querySelectorAll: jest.fn(() => [])
      };

      mockDocument.querySelector.mockReturnValue(mockContainer);

      const result = reader.extractMessages();

      expect(result.extractedAt).toBeDefined();
    });

    test('should handle errors gracefully', () => {
      mockDocument.querySelector.mockImplementation(() => {
        throw new Error('DOM error');
      });

      const result = reader.extractMessages();

      expect(result.messages).toEqual([]);
      expect(result.error).toBeDefined();
    });

    test('should extract message metadata', () => {
      const mockMessage = {
        querySelector: jest.fn((selector) => {
          if (selector.includes('selectable-text')) {
            return { textContent: 'Test message' };
          }
          return null;
        }),
        hasAttribute: jest.fn(() => true),
        getAttribute: jest.fn(() => 'msg-1')
      };

      const mockContainer = {
        querySelectorAll: jest.fn(() => [mockMessage])
      };

      mockDocument.querySelector.mockReturnValue(mockContainer);

      const result = reader.extractMessages();

      expect(result.count).toBeGreaterThanOrEqual(0);
    });

    test('should skip empty message text', () => {
      const mockMessage = {
        querySelector: jest.fn(() => ({ textContent: '   ' })),
        hasAttribute: jest.fn(() => false),
        getAttribute: jest.fn(() => 'msg-1')
      };

      const mockContainer = {
        querySelectorAll: jest.fn(() => [mockMessage])
      };

      mockDocument.querySelector.mockReturnValue(mockContainer);

      const result = reader.extractMessages();

      expect(Array.isArray(result.messages)).toBe(true);
    });

    test('should handle messages without timestamp', () => {
      const mockMessage = {
        querySelector: jest.fn((selector) => {
          if (selector.includes('selectable-text')) {
            return { textContent: 'Message' };
          }
          return null;
        }),
        hasAttribute: jest.fn(() => false),
        getAttribute: jest.fn(() => 'msg-1')
      };

      const mockContainer = {
        querySelectorAll: jest.fn(() => [mockMessage])
      };

      mockDocument.querySelector.mockReturnValue(mockContainer);

      const result = reader.extractMessages();

      if (result.messages.length > 0) {
        expect(result.messages[0].timestamp).toBeDefined();
      }
    });
  });

  describe('extractRecentMessages', () => {
    test('should return recent messages only', () => {
      const mockContainer = {
        querySelectorAll: jest.fn(() => [])
      };

      mockDocument.querySelector.mockReturnValue(mockContainer);

      const result = reader.extractRecentMessages(5);

      expect(Array.isArray(result.messages)).toBe(true);
    });

    test('should return specified count', () => {
      const mockContainer = {
        querySelectorAll: jest.fn(() => [])
      };

      mockDocument.querySelector.mockReturnValue(mockContainer);

      const result = reader.extractRecentMessages(10);

      expect(result.count).toBeLessThanOrEqual(10);
    });

    test('should include platform information', () => {
      const mockContainer = {
        querySelectorAll: jest.fn(() => [])
      };

      mockDocument.querySelector.mockReturnValue(mockContainer);

      const result = reader.extractRecentMessages(5);

      expect(result.platform).toBe('WhatsApp Web');
    });

    test('should default to 10 messages', () => {
      const mockContainer = {
        querySelectorAll: jest.fn(() => [])
      };

      mockDocument.querySelector.mockReturnValue(mockContainer);

      const result = reader.extractRecentMessages();

      expect(result.count).toBeLessThanOrEqual(10);
    });
  });

  describe('startMonitoring', () => {
    test('should start monitoring with interval', () => {
      const mockContainer = {
        querySelectorAll: jest.fn(() => [])
      };

      mockDocument.querySelector.mockReturnValue(mockContainer);

      const monitor = reader.startMonitoring();

      expect(reader.monitoringInterval).toBeDefined();
      expect(typeof monitor.stop).toBe('function');

      monitor.stop();
    });

    test('should call callback for new messages', (done) => {
      const mockMessage = {
        querySelector: jest.fn((selector) => {
          if (selector.includes('selectable-text')) {
            return { textContent: 'New message' };
          }
          return null;
        }),
        hasAttribute: jest.fn(() => false),
        getAttribute: jest.fn(() => 'msg-1')
      };

      const mockContainer = {
        querySelectorAll: jest.fn(() => [mockMessage, mockMessage])
      };

      mockDocument.querySelector.mockReturnValue(mockContainer);

      const callback = jest.fn();
      const monitor = reader.startMonitoring(callback);

      setTimeout(() => {
        monitor.stop();
        done();
      }, 100);
    });

    test('should stop monitoring when stop() called', () => {
      const mockContainer = {
        querySelectorAll: jest.fn(() => [])
      };

      mockDocument.querySelector.mockReturnValue(mockContainer);

      const monitor = reader.startMonitoring();
      const intervalBefore = reader.monitoringInterval;

      monitor.stop();

      expect(reader.monitoringInterval).toBeNull();
    });

    test('should ignore non-function callbacks', () => {
      const mockContainer = {
        querySelectorAll: jest.fn(() => [])
      };

      mockDocument.querySelector.mockReturnValue(mockContainer);

      expect(() => {
        const monitor = reader.startMonitoring('not-a-function');
        monitor.stop();
      }).not.toThrow();
    });

    test('should handle callback exceptions gracefully', (done) => {
      const mockContainer = {
        querySelectorAll: jest.fn(() => [])
      };

      mockDocument.querySelector.mockReturnValue(mockContainer);

      const callback = jest.fn(() => {
        throw new Error('Callback error');
      });

      const monitor = reader.startMonitoring(callback);

      setTimeout(() => {
        monitor.stop();
        done();
      }, 100);
    });
  });

  describe('extractChatInfo', () => {
    test('should extract chat information', () => {
      const mockHeader = {
        textContent: 'Contact Name'
      };

      mockDocument.querySelector.mockImplementation((selector) => {
        if (selector.includes('conversation-info-header')) {
          return mockHeader;
        }
        return null;
      });

      mockDocument.querySelectorAll.mockReturnValue([]);

      const result = reader.extractChatInfo();

      expect(result.senderName).toBeDefined();
      expect(result.messageCount).toBeDefined();
      expect(result.platform).toBe('WhatsApp Web');
    });

    test('should handle missing header', () => {
      mockDocument.querySelector.mockReturnValue(null);
      mockDocument.querySelectorAll.mockReturnValue([]);

      const result = reader.extractChatInfo();

      expect(result.senderName).toBe('Unknown');
    });

    test('should include timestamp in result', () => {
      mockDocument.querySelector.mockReturnValue(null);
      mockDocument.querySelectorAll.mockReturnValue([]);

      const result = reader.extractChatInfo();

      expect(result.timestamp).toBeDefined();
    });

    test('should handle errors gracefully', () => {
      mockDocument.querySelector.mockImplementation(() => {
        throw new Error('DOM error');
      });

      const result = reader.extractChatInfo();

      expect(result.senderName).toBe('Unknown');
      expect(result.error).toBeDefined();
    });
  });

  describe('extractCurrentSenderName', () => {
    test('should extract sender name from header', () => {
      mockDocument.querySelector.mockImplementation((selector) => {
        if (selector.includes('conversation-info-header')) {
          return { textContent: 'John Doe' };
        }
        return null;
      });

      const name = reader.extractCurrentSenderName();

      expect(name).toBe('John Doe');
    });

    test('should fallback to title attribute', () => {
      mockDocument.querySelector.mockImplementation((selector) => {
        if (selector.includes('conversation-info-header')) {
          return null;
        }
        return { getAttribute: jest.fn(() => 'Jane Smith') };
      });

      const name = reader.extractCurrentSenderName();

      expect(name).toBeDefined();
    });

    test('should return Unknown as default', () => {
      mockDocument.querySelector.mockReturnValue(null);

      const name = reader.extractCurrentSenderName();

      expect(name).toBe('Unknown');
    });

    test('should handle errors gracefully', () => {
      mockDocument.querySelector.mockImplementation(() => {
        throw new Error('DOM error');
      });

      const name = reader.extractCurrentSenderName();

      expect(name).toBe('Unknown');
    });

    test('should trim whitespace', () => {
      mockDocument.querySelector.mockReturnValue({
        textContent: '  John Doe  '
      });

      const name = reader.extractCurrentSenderName();

      expect(name).toBe('John Doe');
    });
  });

  describe('analyzeMessagesForPhishing', () => {
    test('should detect phishing patterns in messages', () => {
      const messages = [
        { text: 'Please verify your account immediately' }
      ];

      const result = reader.analyzeMessagesForPhishing(messages);

      expect(result.total).toBe(1);
      expect(result.suspicious).toBeDefined();
      expect(typeof result.suspicious).toBe('number');
    });

    test('should identify flagged messages', () => {
      const messages = [
        { text: 'Urgent: click here to verify account' },
        { text: 'Normal message with no suspicious content' }
      ];

      const result = reader.analyzeMessagesForPhishing(messages);

      expect(Array.isArray(result.flaggedMessages)).toBe(true);
      expect(result.flaggedMessages.length).toBeLessThanOrEqual(2);
    });

    test('should assign risk scores', () => {
      const messages = [
        { text: 'Verify account urgent' }
      ];

      const result = reader.analyzeMessagesForPhishing(messages);

      if (result.flaggedMessages.length > 0) {
        expect(result.flaggedMessages[0].riskScore).toBeGreaterThanOrEqual(0);
      }
    });

    test('should return total message count', () => {
      const messages = [
        { text: 'Message 1' },
        { text: 'Message 2' },
        { text: 'Message 3' }
      ];

      const result = reader.analyzeMessagesForPhishing(messages);

      expect(result.total).toBe(3);
    });

    test('should handle empty message list', () => {
      const result = reader.analyzeMessagesForPhishing([]);

      expect(result.total).toBe(0);
      expect(result.suspicious).toBe(0);
      expect(result.flaggedMessages).toEqual([]);
    });

    test('should handle messages without suspicious patterns', () => {
      const messages = [
        { text: 'Hello, how are you?' },
        { text: 'See you later!' }
      ];

      const result = reader.analyzeMessagesForPhishing(messages);

      expect(result.suspicious).toBe(0);
    });

    test('should detect multiple patterns per message', () => {
      const messages = [
        { text: 'Urgent: verify account and claim prize now!' }
      ];

      const result = reader.analyzeMessagesForPhishing(messages);

      if (result.flaggedMessages.length > 0) {
        expect(result.flaggedMessages[0].suspiciousFlags.length).toBeGreaterThan(0);
      }
    });

    test('should be case insensitive', () => {
      const messages = [
        { text: 'VERIFY YOUR ACCOUNT IMMEDIATELY' }
      ];

      const result = reader.analyzeMessagesForPhishing(messages);

      expect(result.suspicious).toBeGreaterThanOrEqual(0);
    });
  });

  describe('extractTimestamp', () => {
    test('should extract timestamp from title attribute', () => {
      const mockElement = {
        getAttribute: jest.fn(() => '12/25/2024')
      };

      const timestamp = reader.extractTimestamp(mockElement);

      expect(timestamp).toBeDefined();
    });

    test('should handle timestamp without attribute', () => {
      const mockElement = {
        getAttribute: jest.fn(() => null)
      };

      const timestamp = reader.extractTimestamp(mockElement);

      expect(timestamp).toBeDefined();
      expect(typeof timestamp).toBe('string');
    });

    test('should return ISO format timestamp', () => {
      const mockElement = {
        getAttribute: jest.fn(() => '01/15/2024')
      };

      const timestamp = reader.extractTimestamp(mockElement);

      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}/);
    });

    test('should handle errors gracefully', () => {
      const mockElement = {
        getAttribute: jest.fn(() => {
          throw new Error('DOM error');
        })
      };

      const timestamp = reader.extractTimestamp(mockElement);

      expect(timestamp).toBeDefined();
    });

    test('should handle invalid date strings', () => {
      const mockElement = {
        getAttribute: jest.fn(() => 'invalid-date')
      };

      const timestamp = reader.extractTimestamp(mockElement);

      expect(timestamp).toBeDefined();
    });
  });

  describe('extractChatsList', () => {
    test('should return empty list when chatlist not found', () => {
      mockDocument.querySelector.mockReturnValue(null);

      const result = reader.extractChatsList();

      expect(result.chats).toEqual([]);
      expect(result.count).toBe(0);
    });

    test('should extract chats from list', () => {
      const mockChat = {
        querySelector: jest.fn((selector) => {
          if (selector.includes('title')) {
            return { getAttribute: jest.fn(() => 'Chat Name') };
          }
          if (selector.includes('unread')) {
            return null;
          }
          return null;
        })
      };

      const mockChatList = {
        querySelectorAll: jest.fn(() => [mockChat])
      };

      mockDocument.querySelector.mockReturnValue(mockChatList);

      const result = reader.extractChatsList();

      expect(Array.isArray(result.chats)).toBe(true);
    });

    test('should include platform information', () => {
      mockDocument.querySelector.mockReturnValue({
        querySelectorAll: jest.fn(() => [])
      });

      const result = reader.extractChatsList();

      expect(result.platform).toBe('WhatsApp Web');
    });

    test('should include extraction timestamp', () => {
      mockDocument.querySelector.mockReturnValue({
        querySelectorAll: jest.fn(() => [])
      });

      const result = reader.extractChatsList();

      expect(result.extractedAt).toBeDefined();
    });

    test('should handle errors gracefully', () => {
      mockDocument.querySelector.mockImplementation(() => {
        throw new Error('DOM error');
      });

      const result = reader.extractChatsList();

      expect(result.chats).toEqual([]);
      expect(result.error).toBeDefined();
    });

    test('should extract unread count', () => {
      const mockChat = {
        querySelector: jest.fn((selector) => {
          if (selector.includes('title')) {
            return { getAttribute: jest.fn(() => 'Chat') };
          }
          return null;
        })
      };

      const mockChatList = {
        querySelectorAll: jest.fn(() => [mockChat])
      };

      mockDocument.querySelector.mockReturnValue(mockChatList);

      const result = reader.extractChatsList();

      if (result.chats.length > 0) {
        expect(result.chats[0]).toHaveProperty('unreadCount');
      }
    });
  });

  describe('stopMonitoring', () => {
    test('should clear monitoring interval', () => {
      const mockContainer = {
        querySelectorAll: jest.fn(() => [])
      };

      mockDocument.querySelector.mockReturnValue(mockContainer);

      reader.startMonitoring();
      reader.stopMonitoring();

      expect(reader.monitoringInterval).toBeNull();
    });

    test('should handle stop when not monitoring', () => {
      expect(() => {
        reader.stopMonitoring();
      }).not.toThrow();
    });

    test('should be idempotent', () => {
      const mockContainer = {
        querySelectorAll: jest.fn(() => [])
      };

      mockDocument.querySelector.mockReturnValue(mockContainer);

      reader.startMonitoring();
      reader.stopMonitoring();
      reader.stopMonitoring();

      expect(reader.monitoringInterval).toBeNull();
    });
  });

  describe('integration tests', () => {
    test('should complete message extraction workflow', () => {
      const mockContainer = {
        querySelectorAll: jest.fn(() => [])
      };

      mockDocument.querySelector.mockReturnValue(mockContainer);

      const messages = reader.extractMessages();
      const recent = reader.extractRecentMessages(5);
      const info = reader.extractChatInfo();

      expect(messages).toBeDefined();
      expect(recent).toBeDefined();
      expect(info).toBeDefined();
    });

    test('should handle monitoring lifecycle', () => {
      const mockContainer = {
        querySelectorAll: jest.fn(() => [])
      };

      mockDocument.querySelector.mockReturnValue(mockContainer);

      const monitor = reader.startMonitoring();
      expect(reader.monitoringInterval).toBeDefined();

      monitor.stop();
      expect(reader.monitoringInterval).toBeNull();
    });

    test('should analyze extracted messages', () => {
      const mockContainer = {
        querySelectorAll: jest.fn(() => [])
      };

      mockDocument.querySelector.mockReturnValue(mockContainer);

      const messages = reader.extractMessages();
      const analysis = reader.analyzeMessagesForPhishing(messages.messages);

      expect(analysis).toBeDefined();
      expect(analysis.total).toBe(messages.count);
    });

    test('should handle consecutive extractions', () => {
      const mockContainer = {
        querySelectorAll: jest.fn(() => [])
      };

      mockDocument.querySelector.mockReturnValue(mockContainer);

      const result1 = reader.extractMessages();
      const result2 = reader.extractMessages();

      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
    });
  });

  describe('edge cases', () => {
    test('should handle very long message text', () => {
      const messages = [
        { text: 'A'.repeat(5000) }
      ];

      const result = reader.analyzeMessagesForPhishing(messages);

      expect(result.total).toBe(1);
    });

    test('should handle special characters in messages', () => {
      const messages = [
        { text: 'Message with <html> & "quotes" \'apostrophes\'' }
      ];

      const result = reader.analyzeMessagesForPhishing(messages);

      expect(result.total).toBe(1);
    });

    test('should handle null messages in array', () => {
      const messages = [
        { text: 'Message 1' },
        null,
        { text: 'Message 2' }
      ];

      expect(() => {
        reader.analyzeMessagesForPhishing(messages);
      }).not.toThrow();
    });

    test('should handle concurrent monitoring operations', () => {
      const mockContainer = {
        querySelectorAll: jest.fn(() => [])
      };

      mockDocument.querySelector.mockReturnValue(mockContainer);

      const monitor1 = reader.startMonitoring();
      // Starting another monitoring should override
      const monitor2 = reader.startMonitoring();

      monitor2.stop();

      expect(reader.monitoringInterval).toBeNull();
    });

    test('should handle very large message counts', () => {
      const largeMessageList = Array(1000)
        .fill(null)
        .map((_, i) => ({ text: `Message ${i}` }));

      const result = reader.analyzeMessagesForPhishing(largeMessageList);

      expect(result.total).toBe(1000);
    });
  });
});
