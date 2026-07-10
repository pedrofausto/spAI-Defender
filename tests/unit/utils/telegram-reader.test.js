/**
 * Telegram Reader Tests
 * Tests Telegram-specific DOM parsing, message extraction, and channel handling
 */

import { TelegramReader } from '../../../chrome-extension/src/utils/telegram-reader.js';
import { setupChromeMocks } from '../../helpers/chrome-api-mock.js';
import {
  renderTelegramChatFixture,
  renderTelegramChatListFixture,
  renderTelegramChannelsFixture
} from '../../helpers/platform-dom-fixtures.js';

describe('TelegramReader', () => {
  let reader;

  beforeEach(() => {
    setupChromeMocks();
    reader = new TelegramReader();
    global.document = window.document;
    document.body.innerHTML = '';
  });

  afterEach(() => {
    reader.stopMonitoring();
    jest.clearAllMocks();
    jest.useRealTimers();
    document.body.innerHTML = '';
  });

  describe('constructor', () => {
    test('initializes selectors and state', () => {
      expect(reader.messageSelectors.messageContainer).toBe('.im-page_chat-content');
      expect(reader.messageSelectors.messageBubbles).toBe('.im-message');
      expect(reader.messageSelectors.messageText).toBe('.im-message_text');
      expect(reader.messageCache).toBeInstanceOf(Map);
      expect(reader.lastMessageCount).toBe(0);
      expect(typeof reader.extractChannelsList).toBe('function');
      expect(typeof reader.extractChatsList).toBe('function');
    });
  });

  describe('extractMessages', () => {
    test('returns structured empty result when container is missing', () => {
      const result = reader.extractMessages();

      expect(result).toMatchObject({
        messages: [],
        count: 0,
        platform: 'Telegram Web',
        error: 'Telegram message container not found'
      });
      expect(result.extractedAt).toBeDefined();
    });

    test('extracts serializable messages from a Telegram DOM fixture', () => {
      renderTelegramChatFixture();

      const result = reader.extractMessages();

      expect(result.count).toBe(2);
      expect(result.platform).toBe('Telegram Web');
      expect(result.messages[0]).toMatchObject({
        id: 'tg-msg-1',
        text: 'Verified message',
        sender: 'John Doe',
        isIncoming: true,
        isVerified: true
      });
      expect(result.messages[1]).toMatchObject({
        id: 'tg-msg-2',
        text: 'Outgoing Telegram message',
        sender: 'You',
        isIncoming: false,
        isVerified: false
      });
      expect(result.messages[0]).not.toHaveProperty('rawElement');
    });

    test('skips empty message text from real DOM nodes', () => {
      document.body.innerHTML = `
        <section class="im-page_chat-content">
          <div class="im-message"><span class="im-message_text">   </span></div>
        </section>
      `;

      const result = reader.extractMessages();

      expect(result.messages).toEqual([]);
      expect(result.count).toBe(0);
    });

    test('handles DOM errors gracefully', () => {
      const spy = jest.spyOn(document, 'querySelector').mockImplementation(() => {
        throw new Error('DOM error');
      });

      const result = reader.extractMessages();

      expect(result.messages).toEqual([]);
      expect(result.error).toBe('DOM error');
      spy.mockRestore();
    });
  });

  describe('extractRecentMessages', () => {
    test('returns only the requested recent messages', () => {
      renderTelegramChatFixture();

      const result = reader.extractRecentMessages(1);

      expect(result.count).toBe(1);
      expect(result.messages[0].id).toBe('tg-msg-2');
      expect(result.platform).toBe('Telegram Web');
    });
  });

  describe('startMonitoring', () => {
    test('starts and stops monitoring without retaining stale intervals', () => {
      renderTelegramChatFixture();

      const monitor = reader.startMonitoring();
      expect(reader.monitoringInterval).toBeDefined();

      monitor.stop();
      expect(reader.monitoringInterval).toBeNull();
    });

    test('emits newly observed messages from DOM changes', () => {
      jest.useFakeTimers();
      document.body.innerHTML = '<section class="im-page_chat-content"></section>';
      const callback = jest.fn();

      const monitor = reader.startMonitoring(callback);
      document.querySelector('.im-page_chat-content').innerHTML = `
        <div class="im-message im-message-in" data-mid="new-1"><span class="im-message_text">New Telegram message</span></div>
      `;
      jest.advanceTimersByTime(2000);

      expect(callback).toHaveBeenCalledWith([expect.objectContaining({ id: 'new-1', text: 'New Telegram message' })]);
      monitor.stop();
    });

    test('ignores non-function callbacks', () => {
      renderTelegramChatFixture();

      expect(() => reader.startMonitoring('not-a-function').stop()).not.toThrow();
    });
  });

  describe('extractChatInfo', () => {
    test('extracts group metadata from DOM fixture', () => {
      renderTelegramChatFixture({ group: true });

      const result = reader.extractChatInfo();

      expect(result.senderName).toBe('Group Name');
      expect(result.messageCount).toBe(2);
      expect(result.isGroup).toBe(true);
      expect(result.isChannel).toBe(false);
      expect(result.platform).toBe('Telegram Web');
    });

    test('detects channel separately from group', () => {
      renderTelegramChatFixture({ channel: true });

      const result = reader.extractChatInfo();

      expect(result.senderName).toBe('Channel Name');
      expect(result.isChannel).toBe(true);
      expect(result.isGroup).toBe(false);
    });

    test('handles missing header and DOM errors', () => {
      document.body.innerHTML = '<section class="im-page_chat-content"></section>';
      expect(reader.extractChatInfo().senderName).toBe('Unknown');

      const spy = jest.spyOn(document, 'querySelector').mockImplementation(() => {
        throw new Error('DOM error');
      });
      const errored = reader.extractChatInfo();
      expect(errored.senderName).toBe('Unknown');
      expect(errored.error).toBe('DOM error');
      spy.mockRestore();
    });
  });

  describe('extractCurrentSenderName', () => {
    test('extracts sender from header, fallback title, and default', () => {
      renderTelegramChatFixture();
      expect(reader.extractCurrentSenderName()).toBe('John Doe');

      document.body.innerHTML = '<span class="im-page_chat-header-title">Jane Smith</span>';
      expect(reader.extractCurrentSenderName()).toBe('Jane Smith');

      document.body.innerHTML = '';
      expect(reader.extractCurrentSenderName()).toBe('Unknown');
    });

    test('handles DOM errors gracefully', () => {
      const spy = jest.spyOn(document, 'querySelector').mockImplementation(() => {
        throw new Error('DOM error');
      });

      expect(reader.extractCurrentSenderName()).toBe('Unknown');
      spy.mockRestore();
    });
  });

  describe('analyzeMessagesForPhishing', () => {
    test('flags suspicious messages without failing on benign, null, or large input', () => {
      const result = reader.analyzeMessagesForPhishing([
        { text: 'Urgent: verify account, claim free crypto prize!' },
        { text: 'Normal Telegram message' },
        null,
        { text: 'A'.repeat(5000) }
      ]);

      expect(result.total).toBe(4);
      expect(result.suspicious).toBe(1);
      expect(result.flaggedMessages[0].suspiciousFlags.length).toBeGreaterThan(1);
      expect(result.flaggedMessages[0].riskScore).toBeGreaterThan(0);
    });
  });

  describe('extractTimestamp', () => {
    test('returns ISO timestamp from valid, invalid, missing, and failing title attributes', () => {
      expect(reader.extractTimestamp({ getAttribute: () => '2026-07-10 10:00' })).toMatch(/^\d{4}-\d{2}-\d{2}/);
      expect(reader.extractTimestamp({ getAttribute: () => 'invalid-date' })).toEqual(expect.any(String));
      expect(reader.extractTimestamp({ getAttribute: () => null })).toEqual(expect.any(String));
      expect(reader.extractTimestamp({ getAttribute: () => { throw new Error('DOM error'); } })).toEqual(expect.any(String));
    });
  });

  describe('extractChatsList', () => {
    test('returns structured empty result when chat list is missing', () => {
      const result = reader.extractChatsList();

      expect(result.chats).toEqual([]);
      expect(result.count).toBe(0);
      expect(result.error).toBe('Telegram chat list not found');
    });

    test('extracts serializable chat list entries from DOM fixture', () => {
      renderTelegramChatListFixture();

      const result = reader.extractChatsList();

      expect(result.count).toBe(2);
      expect(result.chats[0]).toMatchObject({
        index: 0,
        name: 'Secure Chat',
        lastMessage: 'Latest Telegram message',
        unreadCount: 1,
        isVerified: true
      });
      expect(result.chats[1]).toMatchObject({
        index: 1,
        name: 'Second Chat',
        lastMessage: 'Another Telegram message',
        unreadCount: 0,
        isVerified: false
      });
      expect(result.chats[0]).not.toHaveProperty('element');
    });

    test('handles chat list DOM errors gracefully', () => {
      const spy = jest.spyOn(document, 'querySelector').mockImplementation(() => {
        throw new Error('DOM error');
      });

      const result = reader.extractChatsList();

      expect(result.chats).toEqual([]);
      expect(result.error).toBe('DOM error');
      spy.mockRestore();
    });
  });

  describe('extractChannelsList', () => {
    test('returns empty list when no channels exist', () => {
      const result = reader.extractChannelsList();

      expect(result.channels).toEqual([]);
      expect(result.count).toBe(0);
      expect(result.platform).toBe('Telegram Web');
    });

    test('extracts channels with verification status and member count', () => {
      renderTelegramChannelsFixture();

      const result = reader.extractChannelsList();

      expect(result.channels).toHaveLength(1);
      expect(result.channels[0]).toMatchObject({
        name: 'Channel Name',
        verified: true,
        memberCount: '1000'
      });
      expect(result.extractedAt).toBeDefined();
    });

    test('handles channel DOM errors gracefully', () => {
      const spy = jest.spyOn(document, 'querySelectorAll').mockImplementation(() => {
        throw new Error('DOM error');
      });

      const result = reader.extractChannelsList();

      expect(result.channels).toEqual([]);
      expect(result.error).toBe('DOM error');
      spy.mockRestore();
    });
  });

  describe('integration and edge cases', () => {
    test('completes extraction, chat list, channel list, and analysis workflow against DOM fixtures', () => {
      renderTelegramChatFixture();
      const messages = reader.extractMessages();
      const recent = reader.extractRecentMessages(5);
      const info = reader.extractChatInfo();
      const analysis = reader.analyzeMessagesForPhishing(messages.messages);

      expect(messages.count).toBe(2);
      expect(recent.count).toBe(2);
      expect(info.senderName).toBe('John Doe');
      expect(analysis.total).toBe(2);

      renderTelegramChatListFixture();
      expect(reader.extractChatsList().count).toBe(2);

      renderTelegramChannelsFixture();
      expect(reader.extractChannelsList().count).toBe(1);
    });
  });
});
