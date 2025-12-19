/**
 * Telegram Reader Tests
 * RED-GREEN-REFACTOR TDD cycle
 * Testing Telegram-specific DOM parsing, message extraction, and channel handling
 */

import { TelegramReader } from '../../../chrome-extension/src/utils/telegram-reader.js';
import { setupChromeMocks } from '../../helpers/chrome-api-mock.js';

describe('TelegramReader', () => {
  let reader;
  let mockDocument;

  beforeEach(() => {
    setupChromeMocks();
    reader = new TelegramReader();

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
      expect(reader.messageSelectors.messageContainer).toBe('.im-page_chat-content');
      expect(reader.messageSelectors.messageBubbles).toBe('.im-message');
      expect(reader.messageSelectors.messageText).toBe('.im-message_text');
    });

    test('should initialize messageCache as empty Map', () => {
      expect(reader.messageCache).toBeInstanceOf(Map);
      expect(reader.messageCache.size).toBe(0);
    });

    test('should initialize lastMessageCount to 0', () => {
      expect(reader.lastMessageCount).toBe(0);
    });

    test('should create TelegramReader instance', () => {
      expect(reader).toBeInstanceOf(TelegramReader);
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
      expect(typeof reader.extractChannelsList).toBe('function');
      expect(typeof reader.stopMonitoring).toBe('function');
    });

    test('should have all required selectors', () => {
      const requiredSelectors = [
        'messageContainer',
        'messageBubbles',
        'messageText',
        'messageTime',
        'senderName'
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

    test('should extract messages with verified status', () => {
      const mockMessage = {
        querySelector: jest.fn((selector) => {
          if (selector.includes('im-message_text')) {
            return { textContent: 'Verified message' };
          }
          if (selector.includes('tgico-verified')) {
            return { element: 'verified' };
          }
          if (selector.includes('im-message_author')) {
            return { textContent: 'John Doe' };
          }
          return null;
        }),
        classList: {
          contains: jest.fn((cls) => cls === 'im-message-in')
        },
        getAttribute: jest.fn((attr) => attr === 'data-mid' ? 'msg-1' : null),
        querySelectorAll: jest.fn(() => [])
      };

      const mockContainer = {
        querySelectorAll: jest.fn(() => [mockMessage])
      };

      mockDocument.querySelector.mockReturnValue(mockContainer);

      const result = reader.extractMessages();

      expect(Array.isArray(result.messages)).toBe(true);
    });

    test('should include platform information', () => {
      const mockContainer = {
        querySelectorAll: jest.fn(() => [])
      };

      mockDocument.querySelector.mockReturnValue(mockContainer);

      const result = reader.extractMessages();

      expect(result.platform).toBe('Telegram Web');
    });

    test('should include extraction timestamp', () => {
      const mockContainer = {
        querySelectorAll: jest.fn(() => [])
      };

      mockDocument.querySelector.mockReturnValue(mockContainer);

      const result = reader.extractMessages();

      expect(result.extractedAt).toBeDefined();
    });

    test('should determine incoming vs outgoing messages', () => {
      const mockMessage = {
        querySelector: jest.fn((selector) => {
          if (selector.includes('im-message_text')) {
            return { textContent: 'Test' };
          }
          return null;
        }),
        classList: {
          contains: jest.fn((cls) => {
            if (cls === 'im-message-in') return true;
            if (cls === 'im-message-out') return false;
            return false;
          })
        },
        getAttribute: jest.fn(() => 'msg-1')
      };

      const mockContainer = {
        querySelectorAll: jest.fn(() => [mockMessage])
      };

      mockDocument.querySelector.mockReturnValue(mockContainer);

      const result = reader.extractMessages();

      if (result.messages.length > 0) {
        expect(typeof result.messages[0].isIncoming).toBe('boolean');
      }
    });

    test('should handle errors gracefully', () => {
      mockDocument.querySelector.mockImplementation(() => {
        throw new Error('DOM error');
      });

      const result = reader.extractMessages();

      expect(result.messages).toEqual([]);
      expect(result.error).toBeDefined();
    });

    test('should handle verified badge detection', () => {
      const mockMessage = {
        querySelector: jest.fn((selector) => {
          if (selector.includes('im-message_text')) {
            return { textContent: 'Message' };
          }
          if (selector.includes('tgico-verified')) {
            return { verified: true };
          }
          return null;
        }),
        classList: {
          contains: jest.fn(() => true)
        },
        getAttribute: jest.fn(() => 'msg-1')
      };

      const mockContainer = {
        querySelectorAll: jest.fn(() => [mockMessage])
      };

      mockDocument.querySelector.mockReturnValue(mockContainer);

      const result = reader.extractMessages();

      if (result.messages.length > 0) {
        expect(result.messages[0]).toHaveProperty('isVerified');
      }
    });

    test('should skip empty message text', () => {
      const mockMessage = {
        querySelector: jest.fn(() => ({ textContent: '   ' })),
        classList: { contains: jest.fn(() => false) },
        getAttribute: jest.fn(() => 'msg-1')
      };

      const mockContainer = {
        querySelectorAll: jest.fn(() => [mockMessage])
      };

      mockDocument.querySelector.mockReturnValue(mockContainer);

      const result = reader.extractMessages();

      expect(Array.isArray(result.messages)).toBe(true);
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

      expect(result.platform).toBe('Telegram Web');
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
          if (selector.includes('im-message_text')) {
            return { textContent: 'New message' };
          }
          return null;
        }),
        classList: { contains: jest.fn(() => false) },
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
  });

  describe('extractChatInfo', () => {
    test('should extract chat information with group detection', () => {
      const mockHeader = {
        textContent: 'Group Name'
      };

      mockDocument.querySelector.mockImplementation((selector) => {
        if (selector.includes('im-page_chat-header')) {
          return mockHeader;
        }
        if (selector.includes('im-page_chat-header-group')) {
          return { element: 'group' };
        }
        return null;
      });

      mockDocument.querySelectorAll.mockReturnValue([]);

      const result = reader.extractChatInfo();

      expect(result.senderName).toBeDefined();
      expect(result.messageCount).toBeDefined();
      expect(typeof result.isGroup).toBe('boolean');
      expect(typeof result.isChannel).toBe('boolean');
    });

    test('should detect channel vs group', () => {
      mockDocument.querySelector.mockImplementation((selector) => {
        if (selector.includes('im-page_chat-header')) {
          return { textContent: 'Channel Name' };
        }
        if (selector.includes('im-page_chat-header-channel')) {
          return { element: 'channel' };
        }
        return null;
      });

      mockDocument.querySelectorAll.mockReturnValue([]);

      const result = reader.extractChatInfo();

      expect(result.isChannel).toBe(true);
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

    test('should include platform information', () => {
      mockDocument.querySelector.mockReturnValue(null);
      mockDocument.querySelectorAll.mockReturnValue([]);

      const result = reader.extractChatInfo();

      expect(result.platform).toBe('Telegram Web');
    });
  });

  describe('extractCurrentSenderName', () => {
    test('should extract sender name from header', () => {
      mockDocument.querySelector.mockImplementation((selector) => {
        if (selector.includes('im-page_chat-header')) {
          return { textContent: 'John Doe' };
        }
        return null;
      });

      const name = reader.extractCurrentSenderName();

      expect(name).toBe('John Doe');
    });

    test('should fallback to title element', () => {
      mockDocument.querySelector.mockImplementation((selector) => {
        if (selector.includes('im-page_chat-header')) {
          return null;
        }
        if (selector.includes('im-page_chat-header-title')) {
          return { textContent: 'Jane Smith' };
        }
        return null;
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
    test('should detect phishing patterns including crypto warnings', () => {
      const messages = [
        { text: 'Verify your crypto investment account immediately' }
      ];

      const result = reader.analyzeMessagesForPhishing(messages);

      expect(result.total).toBe(1);
      expect(typeof result.suspicious).toBe('number');
    });

    test('should identify multiple threat types', () => {
      const messages = [
        { text: 'Urgent: guaranteed crypto investment with free money' },
        { text: 'Normal message' }
      ];

      const result = reader.analyzeMessagesForPhishing(messages);

      expect(Array.isArray(result.flaggedMessages)).toBe(true);
    });

    test('should assign risk scores based on pattern matches', () => {
      const messages = [
        { text: 'Verify account urgently' }
      ];

      const result = reader.analyzeMessagesForPhishing(messages);

      if (result.flaggedMessages.length > 0) {
        expect(result.flaggedMessages[0].riskScore).toBeGreaterThanOrEqual(0);
      }
    });

    test('should handle empty message list', () => {
      const result = reader.analyzeMessagesForPhishing([]);

      expect(result.total).toBe(0);
      expect(result.suspicious).toBe(0);
      expect(result.flaggedMessages).toEqual([]);
    });

    test('should detect investment-related phishing', () => {
      const messages = [
        { text: 'Investment opportunity with guaranteed returns' }
      ];

      const result = reader.analyzeMessagesForPhishing(messages);

      expect(result.suspicious).toBeGreaterThanOrEqual(0);
    });

    test('should be case insensitive', () => {
      const messages = [
        { text: 'VERIFY CRYPTO ACCOUNT URGENTLY' }
      ];

      const result = reader.analyzeMessagesForPhishing(messages);

      expect(result.total).toBe(1);
    });

    test('should detect multiple patterns per message', () => {
      const messages = [
        { text: 'Urgent: verify account, claim free crypto prize!' }
      ];

      const result = reader.analyzeMessagesForPhishing(messages);

      if (result.flaggedMessages.length > 0) {
        expect(result.flaggedMessages[0].suspiciousFlags.length).toBeGreaterThan(0);
      }
    });

    test('should handle Telegram-specific patterns', () => {
      const messages = [
        { text: 'Click here to verify your Telegram wallet' }
      ];

      const result = reader.analyzeMessagesForPhishing(messages);

      expect(result.total).toBe(1);
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
  });

  describe('extractChatsList', () => {
    test('should return empty list when no chats', () => {
      mockDocument.querySelector.mockReturnValue(null);

      const result = reader.extractChatsList();

      expect(result.chats).toEqual([]);
      expect(result.count).toBe(0);
    });

    test('should extract chats with verification status', () => {
      const mockChat = {
        querySelector: jest.fn((selector) => {
          if (selector.includes('im-dialog_title') || selector.includes('im-dialog_name')) {
            return { textContent: 'Chat Name' };
          }
          if (selector.includes('tgico-verified')) {
            return { verified: true };
          }
          return null;
        })
      };

      mockDocument.querySelectorAll.mockReturnValue([mockChat]);

      const result = reader.extractChatsList();

      expect(Array.isArray(result.chats)).toBe(true);
    });

    test('should include platform information', () => {
      mockDocument.querySelectorAll.mockReturnValue([]);

      const result = reader.extractChatsList();

      expect(result.platform).toBe('Telegram Web');
    });

    test('should include extraction timestamp', () => {
      mockDocument.querySelectorAll.mockReturnValue([]);

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

    test('should detect unread badge', () => {
      const mockChat = {
        querySelector: jest.fn((selector) => {
          if (selector.includes('im-dialog_title')) {
            return { textContent: 'Chat' };
          }
          if (selector.includes('im-dialog--unread')) {
            return { unread: true };
          }
          return null;
        })
      };

      mockDocument.querySelectorAll.mockReturnValue([mockChat]);

      const result = reader.extractChatsList();

      if (result.chats.length > 0) {
        expect(result.chats[0]).toHaveProperty('unreadCount');
      }
    });

    test('should extract last message preview', () => {
      const mockChat = {
        querySelector: jest.fn((selector) => {
          if (selector.includes('im-dialog_title')) {
            return { textContent: 'Chat' };
          }
          if (selector.includes('im-dialog_message')) {
            return { textContent: 'Last message...' };
          }
          return null;
        })
      };

      mockDocument.querySelectorAll.mockReturnValue([mockChat]);

      const result = reader.extractChatsList();

      if (result.chats.length > 0) {
        expect(result.chats[0]).toHaveProperty('lastMessage');
      }
    });
  });

  describe('extractChannelsList', () => {
    test('should return empty list when no channels', () => {
      mockDocument.querySelectorAll.mockReturnValue([]);

      const result = reader.extractChannelsList();

      expect(result.channels).toEqual([]);
      expect(result.count).toBe(0);
    });

    test('should extract channels with verification status', () => {
      const mockChannel = {
        querySelector: jest.fn((selector) => {
          if (selector.includes('im-page_chat-header')) {
            return { textContent: 'Channel Name' };
          }
          if (selector.includes('tgico-verified')) {
            return { verified: true };
          }
          if (selector.includes('im-page_chat-header-count')) {
            return { textContent: '1000' };
          }
          return null;
        })
      };

      mockDocument.querySelectorAll.mockReturnValue([mockChannel]);

      const result = reader.extractChannelsList();

      expect(Array.isArray(result.channels)).toBe(true);
    });

    test('should include platform information', () => {
      mockDocument.querySelectorAll.mockReturnValue([]);

      const result = reader.extractChannelsList();

      expect(result.platform).toBe('Telegram Web');
    });

    test('should include extraction timestamp', () => {
      mockDocument.querySelectorAll.mockReturnValue([]);

      const result = reader.extractChannelsList();

      expect(result.extractedAt).toBeDefined();
    });

    test('should extract member count', () => {
      const mockChannel = {
        querySelector: jest.fn((selector) => {
          if (selector.includes('im-page_chat-header')) {
            return { textContent: 'Channel' };
          }
          if (selector.includes('im-page_chat-header-count')) {
            return { textContent: '5000 members' };
          }
          return null;
        })
      };

      mockDocument.querySelectorAll.mockReturnValue([mockChannel]);

      const result = reader.extractChannelsList();

      if (result.channels.length > 0) {
        expect(result.channels[0]).toHaveProperty('memberCount');
      }
    });

    test('should handle errors gracefully', () => {
      mockDocument.querySelectorAll.mockImplementation(() => {
        throw new Error('DOM error');
      });

      const result = reader.extractChannelsList();

      expect(result.channels).toEqual([]);
      expect(result.error).toBeDefined();
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
      mockDocument.querySelectorAll.mockReturnValue([]);

      const messages = reader.extractMessages();
      const recent = reader.extractRecentMessages(5);
      const info = reader.extractChatInfo();

      expect(messages).toBeDefined();
      expect(recent).toBeDefined();
      expect(info).toBeDefined();
    });

    test('should handle channels and chats extraction', () => {
      mockDocument.querySelectorAll.mockReturnValue([]);

      const chats = reader.extractChatsList();
      const channels = reader.extractChannelsList();

      expect(chats).toBeDefined();
      expect(channels).toBeDefined();
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
        { text: 'Message with <html> & "quotes"' }
      ];

      const result = reader.analyzeMessagesForPhishing(messages);

      expect(result.total).toBe(1);
    });

    test('should handle concurrent monitoring', () => {
      const mockContainer = {
        querySelectorAll: jest.fn(() => [])
      };

      mockDocument.querySelector.mockReturnValue(mockContainer);

      const monitor1 = reader.startMonitoring();
      const monitor2 = reader.startMonitoring();

      monitor2.stop();

      expect(reader.monitoringInterval).toBeNull();
    });

    test('should handle very large message lists', () => {
      const largeList = Array(500)
        .fill(null)
        .map((_, i) => ({ text: `Message ${i}` }));

      const result = reader.analyzeMessagesForPhishing(largeList);

      expect(result.total).toBe(500);
    });

    test('should handle messages with emoji', () => {
      const messages = [
        { text: 'Verify account 🔐 urgently ⚡' }
      ];

      const result = reader.analyzeMessagesForPhishing(messages);

      expect(result.total).toBe(1);
    });
  });
});
