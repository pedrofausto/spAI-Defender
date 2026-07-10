/**
 * Telegram Web Content Reader
 * Reads messages and content from Telegram Web for security analysis
 * Based on modern Telegram Web DOM structure (2024+)
 */

function getDocument() {
  return globalThis.document;
}

function textOrUnknown(element) {
  const text = typeof element?.textContent === 'string' ? element.textContent.trim() : '';
  return text || 'Unknown';
}

export class TelegramReader {
  constructor() {
    this.messageSelectors = {
      messageContainer: '.im-page_chat-content',
      messageBubbles: '.im-message',
      messageText: '.im-message_text',
      messageTime: '.im-message-date',
      senderName: '.im-page_chat-header',
      statusIcon: '.icon',
      messageBox: '.im-send-form_textarea .im-send-form',
      sendButton: '.btn-send'
    };

    this.messageCache = new Map();
    this.lastMessageCount = 0;
  }

  extractMessages() {
    try {
      const messages = [];
      const messageContainer = getDocument().querySelector(this.messageSelectors.messageContainer);
      if (!messageContainer) {
        return {
          messages: [],
          count: 0,
          platform: 'Telegram Web',
          extractedAt: new Date().toISOString(),
          error: 'Telegram message container not found'
        };
      }

      const messageElements = messageContainer.querySelectorAll(this.messageSelectors.messageBubbles);
      messageElements.forEach((element, index) => {
        try {
          const textElement = element.querySelector(this.messageSelectors.messageText);
          const text = typeof textElement?.textContent === 'string' ? textElement.textContent.trim() : '';
          if (!text) return;

          const timeElement = element.querySelector(this.messageSelectors.messageTime);
          const timestamp = timeElement ? this.extractTimestamp(timeElement) : new Date().toISOString();
          const isIncoming = element.classList.contains('im-message-in') || !element.classList.contains('im-message-out');
          const messageId = element.getAttribute('data-mid') || `msg-${index}`;
          const senderElement = element.querySelector('.im-message_author');
          const sender = senderElement ? textOrUnknown(senderElement) : (isIncoming ? 'Contact' : 'You');
          const isVerified = element.querySelector('.tgico-verified') !== null;

          messages.push({ id: messageId, text, sender, timestamp, isIncoming, isVerified });
        } catch (error) {
          console.warn('Error extracting individual message:', error);
        }
      });

      return { messages, count: messages.length, platform: 'Telegram Web', extractedAt: new Date().toISOString() };
    } catch (error) {
      console.error('Error extracting Telegram messages:', error);
      return { messages: [], count: 0, platform: 'Telegram Web', extractedAt: new Date().toISOString(), error: error.message };
    }
  }

  extractRecentMessages(count = 10) {
    const allMessages = this.extractMessages();
    const recent = allMessages.messages.slice(-count);
    return { messages: recent, count: recent.length, platform: 'Telegram Web', extractedAt: new Date().toISOString() };
  }

  startMonitoring(onNewMessage) {
    let lastCount = this.lastMessageCount;

    const checkForNewMessages = () => {
      const currentMessages = this.extractMessages();
      const currentCount = currentMessages.count;
      if (currentCount > lastCount) {
        const newMessages = currentMessages.messages.slice(lastCount);
        lastCount = currentCount;
        if (onNewMessage && typeof onNewMessage === 'function') {
          onNewMessage(newMessages);
        }
      }
    };

    this.monitoringInterval = setInterval(checkForNewMessages, 2000);
    console.log('✅ Telegram monitoring started');
    return { stop: () => this.stopMonitoring() };
  }

  extractChatInfo() {
    try {
      const headerElement = getDocument().querySelector(this.messageSelectors.senderName);
      const senderName = textOrUnknown(headerElement);
      const messageCount = getDocument().querySelectorAll(this.messageSelectors.messageBubbles).length;
      const isChannel = getDocument().querySelector('.im-page_chat-header-channel') !== null;
      const isGroup = !isChannel && getDocument().querySelector('.im-page_chat-header-group') !== null;

      return {
        senderName,
        messageCount,
        isGroup,
        isChannel,
        timestamp: new Date().toISOString(),
        platform: 'Telegram Web'
      };
    } catch (error) {
      console.error('Error extracting chat info:', error);
      return {
        senderName: 'Unknown',
        messageCount: 0,
        isGroup: false,
        isChannel: false,
        platform: 'Telegram Web',
        timestamp: new Date().toISOString(),
        error: error.message
      };
    }
  }

  extractCurrentSenderName() {
    try {
      const headerElement = getDocument().querySelector(this.messageSelectors.senderName);
      const headerText = typeof headerElement?.textContent === 'string' ? headerElement.textContent.trim() : '';
      if (headerText) return headerText;

      const altElement = getDocument().querySelector('.im-page_chat-header-title');
      const altText = typeof altElement?.textContent === 'string' ? altElement.textContent.trim() : '';
      return altText || 'Unknown';
    } catch {
      return 'Unknown';
    }
  }

  analyzeMessagesForPhishing(messages = []) {
    const suspiciousPatterns = [
      /verify/i,
      /urgent/i,
      /suspended/i,
      /click here/i,
      /limited time/i,
      /winners?/i,
      /claim/i,
      /prize/i,
      /password/i,
      /account/i,
      /crypto/i,
      /investment/i,
      /guaranteed/i,
      /free money/i
    ];

    const flaggedMessages = [];
    const list = Array.isArray(messages) ? messages : [];
    list.filter((message) => message && typeof message.text === 'string').forEach(message => {
      const flags = [];
      suspiciousPatterns.forEach(pattern => {
        if (pattern.test(message.text)) {
          flags.push(pattern.source.replace(/[\/i]/g, '').replace(/\^|\$/g, ''));
        }
      });
      if (flags.length > 0) {
        flaggedMessages.push({ ...message, suspiciousFlags: flags, riskScore: flags.length * 10 });
      }
    });

    return { total: list.length, suspicious: flaggedMessages.length, flaggedMessages };
  }

  extractChatsList() {
    try {
      const chats = [];
      const chatList = getDocument().querySelector('[data-peer-id]');
      if (!chatList) {
        return { chats: [], count: 0, platform: 'Telegram Web', extractedAt: new Date().toISOString(), error: 'Telegram chat list not found' };
      }

      const chatItems = getDocument().querySelectorAll('.im-dialog');
      chatItems.forEach((item, index) => {
        try {
          const nameElement = item.querySelector('.im-dialog_title, .im-dialog_name');
          const name = typeof nameElement?.textContent === 'string' && nameElement.textContent.trim()
            ? nameElement.textContent.trim()
            : `Chat ${index}`;
          const lastMessage = item.querySelector('.im-dialog_message');
          const lastMessageText = typeof lastMessage?.textContent === 'string' ? lastMessage.textContent.trim() : '';
          const unreadCount = item.querySelector('.im-dialog--unread') ? 1 : 0;
          const isVerified = item.querySelector('.tgico-verified') !== null;
          chats.push({ index, name, lastMessage: lastMessageText, unreadCount, isVerified });
        } catch (error) {
          console.warn('Error extracting chat item:', error);
        }
      });

      return { chats, count: chats.length, platform: 'Telegram Web', extractedAt: new Date().toISOString() };
    } catch (error) {
      console.error('Error extracting chats list:', error);
      return { chats: [], count: 0, platform: 'Telegram Web', extractedAt: new Date().toISOString(), error: error.message };
    }
  }

  extractChannelsList() {
    try {
      const channels = getDocument().querySelectorAll('.im-page_chat-channel');
      const channelsList = Array.from(channels).map((channel, index) => {
        const nameElement = channel.querySelector('.im-page_chat-header');
        const name = typeof nameElement?.textContent === 'string' && nameElement.textContent.trim()
          ? nameElement.textContent.trim()
          : `Channel ${index}`;
        const verified = channel.querySelector('.tgico-verified') !== null;
        const memberCount = channel.querySelector('.im-page_chat-header-count')?.textContent.trim() || '0';
        return { name, verified, memberCount };
      });

      return { channels: channelsList, count: channelsList.length, platform: 'Telegram Web', extractedAt: new Date().toISOString() };
    } catch (error) {
      console.error('Error extracting channels:', error);
      return { channels: [], count: 0, platform: 'Telegram Web', extractedAt: new Date().toISOString(), error: error.message };
    }
  }

  extractTimestamp(element) {
    try {
      const title = element.getAttribute('title');
      if (title) {
        const dateMatch = title.match(/\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2}/);
        if (dateMatch) {
          return new Date(dateMatch[0]).toISOString();
        }
      }
    } catch (error) {
      console.warn('Error parsing timestamp:', error);
    }
    return new Date().toISOString();
  }

  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }
}

export default TelegramReader;
