/**
 * WhatsApp Web Content Reader
 * Reads messages and content from WhatsApp Web for security analysis
 * Based on modern WhatsApp Web DOM structure (2024+)
 */

export class WhatsAppReader {
  constructor() {
    this.messageSelectors = {
      // Modern WhatsApp Web selectors
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

  /**
   * Extract all messages from current chat
   */
  extractMessages() {
    try {
      const messages = [];
      
      // Find message container
      const messageContainer = document.querySelector(this.messageSelectors.messageContainer);
      if (!messageContainer) {
        console.warn('WhatsApp message container not found');
        return { messages: [], count: 0 };
      }

      // Find all message bubbles
      const messageElements = messageContainer.querySelectorAll(this.messageSelectors.messageBubbles);
      
      messageElements.forEach((element, index) => {
        try {
          // Extract text content
          const textElement = element.querySelector(this.messageSelectors.messageText);
          const text = textElement ? textElement.textContent.trim() : '';
          
          if (!text) return;

          // Extract timestamp
          const timeElement = element.querySelector(this.messageSelectors.messageTime);
          const timestamp = timeElement ? this.extractTimestamp(timeElement) : new Date().toISOString();

          // Determine if message is incoming or outgoing
          const isIncoming = element.hasAttribute('data-incoming');
          const messageId = element.getAttribute('data-id') || `msg-${index}`;

          // Extract sender info if available
          const senderElement = element.querySelector('[data-testid="conversation-info-header"]');
          const sender = senderElement ? senderElement.textContent.trim() : (isIncoming ? 'Contact' : 'You');

          messages.push({
            id: messageId,
            text,
            sender,
            timestamp,
            isIncoming,
            rawElement: element
          });

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
      return { messages: [], count: 0, error: error.message };
    }
  }

  /**
   * Extract recent messages (last N messages)
   */
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

  /**
   * Monitor for new messages
   */
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

    // Check every 2 seconds
    this.monitoringInterval = setInterval(checkForNewMessages, 2000);
    console.log('✅ WhatsApp monitoring started');

    return {
      stop: () => {
        if (this.monitoringInterval) {
          clearInterval(this.monitoringInterval);
          console.log('✅ WhatsApp monitoring stopped');
        }
      }
    };
  }

  /**
   * Extract current chat info
   */
  extractChatInfo() {
    try {
      const senderNameElement = document.querySelector(this.messageSelectors.senderName);
      const senderName = senderNameElement ? senderNameElement.textContent.trim() : 'Unknown';

      const messageCount = document.querySelectorAll(this.messageSelectors.messageBubbles).length;

      return {
        senderName,
        messageCount,
        timestamp: new Date().toISOString(),
        platform: 'WhatsApp Web'
      };

    } catch (error) {
      console.error('Error extracting chat info:', error);
      return { senderName: 'Unknown', messageCount: 0, error: error.message };
    }
  }

  /**
   * Extract sender name from current chat
   */
  extractCurrentSenderName() {
    try {
      const headerElement = document.querySelector('[data-testid="conversation-info-header"]');
      if (headerElement) {
        return headerElement.textContent.trim();
      }

      // Fallback: try to find in different locations
      const altElement = document.querySelector('[title]');
      return altElement ? altElement.getAttribute('title') : 'Unknown';

    } catch {
      return 'Unknown';
    }
  }

  /**
   * Check for suspicious patterns in messages
   */
  analyzeMessagesForPhishing(messages) {
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

    messages.forEach(message => {
      const flags = [];
      
      suspiciousPatterns.forEach(pattern => {
        if (pattern.test(message.text)) {
          flags.push(pattern.source.replace(/[\/i]/g, '').replace(/\^|\$/g, ''));
        }
      });

      if (flags.length > 0) {
        flaggedMessages.push({
          ...message,
          suspiciousFlags: flags,
          riskScore: flags.length * 10
        });
      }
    });

    return {
      total: messages.length,
      suspicious: flaggedMessages.length,
      flaggedMessages
    };
  }

  /**
   * Helper: Extract timestamp from element
   */
  extractTimestamp(element) {
    try {
      const title = element.getAttribute('title');
      if (title) {
        // Try to parse the title attribute
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

  /**
   * Get all chats list
   */
  extractChatsList() {
    try {
      const chats = [];
      const chatList = document.querySelector('[data-testid="chatlist"]');
      
      if (!chatList) {
        return { chats: [], count: 0 };
      }

      const chatItems = chatList.querySelectorAll('[role="listitem"]');
      
      chatItems.forEach((item, index) => {
        try {
          const nameElement = item.querySelector('[title]');
          const name = nameElement ? nameElement.getAttribute('title') : `Chat ${index}`;
          
          const lastMessage = item.querySelector('[data-testid="conversation-info"]');
          const lastMessageText = lastMessage ? lastMessage.textContent.trim() : '';

          const unreadBadge = item.querySelector('[data-testid="icon-unread-count"]');
          const unreadCount = unreadBadge ? parseInt(unreadBadge.textContent) || 0 : 0;

          chats.push({
            index,
            name,
            lastMessage: lastMessageText,
            unreadCount,
            element: item
          });

        } catch (error) {
          console.warn('Error extracting chat item:', error);
        }
      });

      return {
        chats,
        count: chats.length,
        platform: 'WhatsApp Web',
        extractedAt: new Date().toISOString()
      };

    } catch (error) {
      console.error('Error extracting chats list:', error);
      return { chats: [], count: 0, error: error.message };
    }
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }
}

export default WhatsAppReader;

