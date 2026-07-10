/**
 * WhatsApp Reader Tests
 * Tests DOM parsing, message extraction, and platform-specific functionality
 */

import { WhatsAppReader } from '../../../chrome-extension/src/utils/whatsapp-reader.js';
import { setupChromeMocks } from '../../helpers/chrome-api-mock.js';
import {
  renderWhatsAppChatFixture,
  renderWhatsAppChatListFixture
} from '../../helpers/platform-dom-fixtures.js';

describe('WhatsAppReader', () => {
  let reader;

  beforeEach(() => {
    setupChromeMocks();
    reader = new WhatsAppReader();
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
      expect(reader.messageSelectors.messageContainer).toBe('[role="application"] [role="log"]');
      expect(reader.messageSelectors.messageBubbles).toBe('div[data-id]');
      expect(reader.messageSelectors.messageText).toBe('span.selectable-text');
      expect(reader.messageCache).toBeInstanceOf(Map);
      expect(reader.lastMessageCount).toBe(0);
      expect(typeof reader.extractMessages).toBe('function');
      expect(typeof reader.extractChatsList).toBe('function');
    });
  });

  describe('extractMessages', () => {
    test('returns structured empty result when container is missing', () => {
      const result = reader.extractMessages();

      expect(result).toMatchObject({
        messages: [],
        count: 0,
        platform: 'WhatsApp Web',
        error: 'WhatsApp message container not found'
      });
      expect(result.extractedAt).toBeDefined();
    });

    test('extracts serializable messages from a WhatsApp DOM fixture', () => {
      renderWhatsAppChatFixture();

      const result = reader.extractMessages();

      expect(result.count).toBe(2);
      expect(result.platform).toBe('WhatsApp Web');
      expect(result.messages[0]).toMatchObject({
        id: 'wa-msg-1',
        text: 'Hello from WhatsApp',
        sender: 'Contact',
        isIncoming: true
      });
      expect(result.messages[1]).toMatchObject({
        id: 'wa-msg-2',
        text: 'Second WhatsApp message',
        sender: 'You',
        isIncoming: false
      });
      expect(result.messages[0]).not.toHaveProperty('rawElement');
    });

    test('skips empty message text from real DOM nodes', () => {
      document.body.innerHTML = `
        <main role="application"><section role="log">
          <div data-id="empty"><span class="selectable-text">   </span></div>
        </section></main>
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
      renderWhatsAppChatFixture();

      const result = reader.extractRecentMessages(1);

      expect(result.count).toBe(1);
      expect(result.messages[0].id).toBe('wa-msg-2');
      expect(result.platform).toBe('WhatsApp Web');
    });
  });

  describe('startMonitoring', () => {
    test('starts and stops monitoring without retaining stale intervals', () => {
      renderWhatsAppChatFixture();

      const monitor = reader.startMonitoring();
      expect(reader.monitoringInterval).toBeDefined();

      monitor.stop();
      expect(reader.monitoringInterval).toBeNull();
    });

    test('emits newly observed messages from DOM changes', () => {
      jest.useFakeTimers();
      document.body.innerHTML = '<main role="application"><section role="log"></section></main>';
      const callback = jest.fn();

      const monitor = reader.startMonitoring(callback);
      document.querySelector('[role="log"]').innerHTML = `
        <div data-id="new-1" data-incoming="true"><span class="selectable-text">New message</span></div>
      `;
      jest.advanceTimersByTime(2000);

      expect(callback).toHaveBeenCalledWith([expect.objectContaining({ id: 'new-1', text: 'New message' })]);
      monitor.stop();
    });

    test('ignores non-function callbacks', () => {
      renderWhatsAppChatFixture();

      expect(() => reader.startMonitoring('not-a-function').stop()).not.toThrow();
    });
  });

  describe('extractChatInfo', () => {
    test('extracts chat metadata from DOM fixture', () => {
      renderWhatsAppChatFixture();

      const result = reader.extractChatInfo();

      expect(result.senderName).toBe('John Doe');
      expect(result.messageCount).toBe(2);
      expect(result.platform).toBe('WhatsApp Web');
      expect(result.timestamp).toBeDefined();
    });

    test('handles missing header and DOM errors', () => {
      document.body.innerHTML = '<main role="application"><section role="log"></section></main>';
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
      renderWhatsAppChatFixture();
      expect(reader.extractCurrentSenderName()).toBe('John Doe');

      document.body.innerHTML = '<span title="Jane Smith">Fallback</span>';
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
        { text: 'Urgent: click here to verify account and claim prize now!' },
        { text: 'Hello, how are you?' },
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
      expect(result.error).toBe('WhatsApp chat list not found');
    });

    test('extracts serializable chat list entries from DOM fixture', () => {
      renderWhatsAppChatListFixture();

      const result = reader.extractChatsList();

      expect(result.count).toBe(2);
      expect(result.chats[0]).toMatchObject({
        index: 0,
        name: 'Jane Smith',
        lastMessage: 'Latest safe message',
        unreadCount: 2
      });
      expect(result.chats[0]).not.toHaveProperty('element');
      expect(result.platform).toBe('WhatsApp Web');
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

  describe('integration and edge cases', () => {
    test('completes extraction and analysis workflow against a DOM fixture', () => {
      renderWhatsAppChatFixture();

      const messages = reader.extractMessages();
      const recent = reader.extractRecentMessages(5);
      const info = reader.extractChatInfo();
      const analysis = reader.analyzeMessagesForPhishing(messages.messages);

      expect(messages.count).toBe(2);
      expect(recent.count).toBe(2);
      expect(info.senderName).toBe('John Doe');
      expect(analysis.total).toBe(2);
    });
  });
});
