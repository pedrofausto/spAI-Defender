/**
 * Telegram Web Content Reader
 * Reads messages and content from Telegram Web for security analysis
 * Based on modern Telegram Web DOM structure (2024+)
 */

export class TelegramReader {
  constructor() {
    this.messageSelectors = {
      // Telegram Web selectors
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

  /**
   * Extract all messages from current chat
   */
  extractMessages() {
    try {
      const messages = [];
      
      // Find message container
      const messageContainer = document.querySelector(this.messageSelectors.messageContainer);
      if (!messageContainer) {
        console.warn('Telegram message container not found');
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
          const isIncoming = element.classList.contains('im-message-in') || 
                           !element.classList.contains('im-message-out');
          
          const messageId = element.getAttribute('data-mid') || `msg-${index}`;

          // Extract sender info
          const senderElement = element.querySelector('.im-message_author');
          const sender = senderElement ? senderElement.textContent.trim() : 
                       (isIncoming ? 'Contact' : 'You');

          // Check for verified badge
          const verifiedBadge = element.querySelector('.tgico-verified');
          const isVerified = !!verifiedBadge;

          messages.push({
            id: messageId,
            text,
            sender,
            timestamp,
            isIncoming,
            isVerified,
            rawElement: element
          });

        } catch (error) {
          console.warn('Error extracting individual message:', error);
        }
      });

      return {
        messages,
        count: messages.length,
        platform: 'Telegram Web',
        extractedAt: new Date().toISOString()
      };

    } catch (error) {
      console.error('Error extracting Telegram messages:', error);
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
      platform: 'Telegram Web',
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
    console.log('✅ Telegram monitoring started');

    return {
      stop: () => {
        if (this.monitoringInterval) {
          clearInterval(this.monitoringInterval);
          console.log('✅ Telegram monitoring stopped');
        }
      }
    };
  }

  /**
   * Extract current chat info
   */
  extractChatInfo() {
    try {
      const headerElement = document.querySelector(this.messageSelectors.senderName);
      const senderName = headerElement ? headerElement.textContent.trim() : 'Unknown';

      const messageCount = document.querySelectorAll(this.messageSelectors.messageBubbles).length;

      // Check if it's a group or channel
      const isGroup = document.querySelector('.im-page_chat-header-group') !== null;
      const isChannel = document.querySelector('.im-page_chat-header-channel') !== null;

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
        error: error.message 
      };
    }
  }

  /**
   * Extract sender name from current chat
   */
  extractCurrentSenderName() {
    try {
      const headerElement = document.querySelector(this.messageSelectors.senderName);
      if (headerElement) {
        return headerElement.textContent.trim();
      }

      // Fallback for group/channel names
      const altElement = document.querySelector('.im-page_chat-header-title');
      return altElement ? altElement.textContent.trim() : 'Unknown';

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
      /account/i,
      /crypto/i,
      /investment/i,
      /guaranteed/i,
      /free money/i
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
   * Get all chats/channels list
   */
  extractChatsList() {
    try {
      const chats = [];
      const chatList = document.querySelector('[data-peer-id]');
      
      if (!chatList) {
        return { chats: [], count: 0 };
      }

      const chatItems = document.querySelectorAll('.im-dialog');
      
      chatItems.forEach((item, index) => {
        try {
          const nameElement = item.querySelector('.im-dialog_title, .im-dialog_name');
          const name = nameElement ? nameElement.textContent.trim() : `Chat ${index}`;
          
          const lastMessage = item.querySelector('.im-dialog_message');
          const lastMessageText = lastMessage ? lastMessage.textContent.trim() : '';

          const unreadBadge = item.querySelector('.im-dialog--unread');
          const unreadCount = unreadBadge ? 1 : 0;

          const isVerified = item.querySelector('.tgico-verified') !== null;

          chats.push({
            index,
            name,
            lastMessage: lastMessageText,
            unreadCount,
            isVerified,
            element: item
          });

        } catch (error) {
          console.warn('Error extracting chat item:', error);
        }
      });

      return {
        chats,
        count: chats.length,
        platform: 'Telegram Web',
        extractedAt: new Date().toISOString()
      };

    } catch (error) {
      console.error('Error extracting chats list:', error);
      return { chats: [], count: 0, error: error.message };
    }
  }

  /**
   * Extract channels list
   */
  extractChannelsList() {
    try {
      const channels = document.querySelectorAll('.im-page_chat-channel');
      
      const channelsList = Array.from(channels).map((channel, index) => {
        const name = channel.querySelector('.im-page_chat-header')?.textContent.trim() || 
                    `Channel ${index}`;
        const verified = channel.querySelector('.tgico-verified') !== null;
        const memberCount = channel.querySelector('.im-page_chat-header-count')?.textContent.trim() || '0';

        return { name, verified, memberCount };
      });

      return {
        channels: channelsList,
        count: channelsList.length,
        platform: 'Telegram Web',
        extractedAt: new Date().toISOString()
      };

    } catch (error) {
      console.error('Error extracting channels:', error);
      return { channels: [], count: 0, error: error.message };
    }
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
   * Stop monitoring
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }
}

export default TelegramReader;

