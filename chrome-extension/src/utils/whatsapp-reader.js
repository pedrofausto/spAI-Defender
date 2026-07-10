/**
 * WhatsApp Web Content Reader
 * Reads messages and content from WhatsApp Web for security analysis
 * Based on modern WhatsApp Web DOM structure (2024+)
 */

function getDocument() {
  return globalThis.document;
}

function textOrUnknown(element) {
  const text = typeof element?.textContent === 'string' ? element.textContent.trim() : '';
  return text || 'Unknown';
}

export class WhatsAppReader {
  constructor() {
    this.messageSelectors = {
      messageContainer: '[role="application"] [role="log"]',
      messageBubbles: 'div[data-id]',
      messageText: 'span.selectable-text',
      messageTime: '[data-testid="msg-meta"]',
      senderName: '[data-testid="conversation-info-header"]',
      statusIcon: 'span[data-icon]',
      messageBox: 'div[contenteditable="true"][data-testid="conversation-compose-box-input"]',
      sendButton: 'button[data-testid="send"]'
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
          platform: 'WhatsApp Web',
          extractedAt: new Date().toISOString(),
          error: 'WhatsApp message container not found'
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
          const isIncoming = element.hasAttribute('data-incoming');
          const messageId = element.getAttribute('data-id') || `msg-${index}`;
          const senderElement = element.querySelector(this.messageSelectors.senderName);
          const sender = senderElement ? textOrUnknown(senderElement) : (isIncoming ? 'Contact' : 'You');

          messages.push({ id: messageId, text, sender, timestamp, isIncoming });
        } catch (error) {
          console.warn('Error extracting individual message:', error);
        }
      });

      return {
        messages,
        count: messages.length,
        platform: 'WhatsApp Web',
        extractedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error extracting WhatsApp messages:', error);
      return { messages: [], count: 0, platform: 'WhatsApp Web', extractedAt: new Date().toISOString(), error: error.message };
    }
  }

  extractRecentMessages(count = 10) {
    const allMessages = this.extractMessages();
    const recent = allMessages.messages.slice(-count);
    return {
      messages: recent,
      count: recent.length,
      platform: 'WhatsApp Web',
      extractedAt: new Date().toISOString()
    };
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
    console.log('✅ WhatsApp monitoring started');

    return { stop: () => this.stopMonitoring() };
  }

  extractChatInfo() {
    try {
      const senderNameElement = getDocument().querySelector(this.messageSelectors.senderName);
      const senderName = textOrUnknown(senderNameElement);
      const messageCount = getDocument().querySelectorAll(this.messageSelectors.messageBubbles).length;
      return {
        senderName,
        messageCount,
        timestamp: new Date().toISOString(),
        platform: 'WhatsApp Web'
      };
    } catch (error) {
      console.error('Error extracting chat info:', error);
      return { senderName: 'Unknown', messageCount: 0, platform: 'WhatsApp Web', timestamp: new Date().toISOString(), error: error.message };
    }
  }

  extractCurrentSenderName() {
    try {
      const headerElement = getDocument().querySelector(this.messageSelectors.senderName);
      const headerText = typeof headerElement?.textContent === 'string' ? headerElement.textContent.trim() : '';
      if (headerText) return headerText;

      const altElement = getDocument().querySelector('[title]');
      const title = altElement?.getAttribute?.('title');
      return typeof title === 'string' && title.trim() ? title.trim() : 'Unknown';
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
      /account/i
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

  extractChatsList() {
    try {
      const chats = [];
      const chatList = getDocument().querySelector('[data-testid="chatlist"]');
      if (!chatList) {
        return { chats: [], count: 0, platform: 'WhatsApp Web', extractedAt: new Date().toISOString(), error: 'WhatsApp chat list not found' };
      }

      const chatItems = chatList.querySelectorAll('[role="listitem"]');
      chatItems.forEach((item, index) => {
        try {
          const nameElement = item.querySelector('[title]');
          const name = nameElement?.getAttribute('title') || `Chat ${index}`;
          const lastMessage = item.querySelector('[data-testid="conversation-info"]');
          const lastMessageText = typeof lastMessage?.textContent === 'string' ? lastMessage.textContent.trim() : '';
          const unreadBadge = item.querySelector('[data-testid="icon-unread-count"]');
          const unreadCount = unreadBadge ? parseInt(unreadBadge.textContent, 10) || 0 : 0;
          chats.push({ index, name, lastMessage: lastMessageText, unreadCount });
        } catch (error) {
          console.warn('Error extracting chat item:', error);
        }
      });

      return { chats, count: chats.length, platform: 'WhatsApp Web', extractedAt: new Date().toISOString() };
    } catch (error) {
      console.error('Error extracting chats list:', error);
      return { chats: [], count: 0, platform: 'WhatsApp Web', extractedAt: new Date().toISOString(), error: error.message };
    }
  }

  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }
}

export default WhatsAppReader;
