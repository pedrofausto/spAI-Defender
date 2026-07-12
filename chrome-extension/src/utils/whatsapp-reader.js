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

function inferWhatsAppMessageDirection(element, bubbleElement, viewportElement = null) {
  const directIncoming =
    element?.hasAttribute?.('data-incoming') ||
    bubbleElement?.hasAttribute?.('data-incoming') ||
    element?.querySelector?.('[data-incoming]') ||
    bubbleElement?.querySelector?.('[data-incoming]');
  if (directIncoming) return 'in';

  const directOutgoing =
    element?.hasAttribute?.('data-outgoing') ||
    bubbleElement?.hasAttribute?.('data-outgoing') ||
    element?.querySelector?.('[data-outgoing]') ||
    bubbleElement?.querySelector?.('[data-outgoing]');
  if (directOutgoing) return 'out';

  const semanticIncoming = element?.querySelector?.('.message-in') || bubbleElement?.querySelector?.('.message-in');
  if (semanticIncoming || element?.classList?.contains('message-in') || bubbleElement?.classList?.contains('message-in')) {
    return 'in';
  }

  const semanticOutgoing = element?.querySelector?.('.message-out') || bubbleElement?.querySelector?.('.message-out');
  if (semanticOutgoing || element?.classList?.contains('message-out') || bubbleElement?.classList?.contains('message-out')) {
    return 'out';
  }

  const alignmentTarget = bubbleElement?.parentElement || element?.parentElement || bubbleElement || element;
  const win = getDocument().defaultView || globalThis;
  if (alignmentTarget && typeof win.getComputedStyle === 'function') {
    const style = win.getComputedStyle(alignmentTarget);
    if (style.alignItems === 'flex-end' || style.alignSelf === 'flex-end' || style.justifyContent === 'flex-end') {
      return 'out';
    }
    if (style.alignItems === 'flex-start' || style.alignSelf === 'flex-start' || style.justifyContent === 'flex-start') {
      return 'in';
    }
  }

  const bubbleRect = bubbleElement?.getBoundingClientRect?.() || element?.getBoundingClientRect?.();
  const viewportRect = viewportElement?.getBoundingClientRect?.();
  if (bubbleRect) {
    const midpoint = viewportRect
      ? ((viewportRect.left + viewportRect.right) / 2)
      : (win.innerWidth / 2);
    const center = (bubbleRect.left + bubbleRect.right) / 2;
    return center >= midpoint ? 'out' : 'in';
  }

  return 'unknown';
}

function isElementVisibleInViewport(element, viewportElement = null) {
  if (!element || typeof element.getBoundingClientRect !== 'function') return false;

  const rect = element.getBoundingClientRect();
  const hasLayout = rect.width > 0 || rect.height > 0 || rect.top !== 0 || rect.bottom !== 0;
  if (!hasLayout) return true;

  const viewportRect = viewportElement && typeof viewportElement.getBoundingClientRect === 'function'
    ? viewportElement.getBoundingClientRect()
    : null;
  const hasViewportLayout = viewportRect &&
    (viewportRect.width > 0 || viewportRect.height > 0 || viewportRect.top !== 0 || viewportRect.bottom !== 0);

  const win = getDocument().defaultView || globalThis;
  const top = hasViewportLayout ? viewportRect.top : 0;
  const bottom = hasViewportLayout ? viewportRect.bottom : win.innerHeight;
  const left = hasViewportLayout ? viewportRect.left : 0;
  const right = hasViewportLayout ? viewportRect.right : win.innerWidth;

  return rect.bottom > top && rect.top < bottom && rect.right > left && rect.left < right;
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
          if (!isElementVisibleInViewport(element, messageContainer)) return;

          const textElement = element.querySelector(this.messageSelectors.messageText);
          const text = typeof textElement?.textContent === 'string' ? textElement.textContent.trim() : '';
          if (!text) return;

          const timeElement = element.querySelector(this.messageSelectors.messageTime);
          const timestamp = timeElement ? this.extractTimestamp(timeElement) : new Date().toISOString();
          const bubbleElement = element.querySelector('[data-testid="msg-container"]') || element;
          const direction = inferWhatsAppMessageDirection(element, bubbleElement, messageContainer);
          const isIncoming = direction === 'in';
          const messageId = element.getAttribute('data-id') || bubbleElement.getAttribute?.('data-id') || `msg-${index}`;
          const senderElement = element.querySelector(this.messageSelectors.senderName);
          const sender = senderElement
            ? textOrUnknown(senderElement)
            : direction === 'out'
              ? 'You'
              : direction === 'in'
                ? 'Contact'
                : 'Unknown';

          messages.push({ id: messageId, text, sender, timestamp, isIncoming, direction });
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


