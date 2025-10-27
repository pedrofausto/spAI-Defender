/**
 * Platform Detector
 * Detecta e adapta a extensão para diferentes plataformas
 */

export class PlatformDetector {
  constructor() {
    this.platforms = {
      WHATSAPP: {
        urlPatterns: ['web.whatsapp.com', 'whatsapp.com/web'],
        name: 'WhatsApp Web',
        icon: '💬',
        color: '#25D366'
      },
      TELEGRAM: {
        urlPatterns: ['web.telegram.org', 'telegram.org'],
        name: 'Telegram Web',
        icon: '✈️',
        color: '#0088cc'
      },
      GMAIL: {
        urlPatterns: ['mail.google.com', 'gmail.com'],
        name: 'Gmail',
        icon: '📧',
        color: '#EA4335'
      },
      OUTLOOK: {
        urlPatterns: ['outlook.live.com', 'outlook.office.com'],
        name: 'Outlook',
        icon: '📬',
        color: '#0078D4'
      },
      GENERIC: {
        urlPatterns: [],
        name: 'Web Browser',
        icon: '🌐',
        color: '#4285F4'
      }
    };
  }

  /**
   * Detecta a plataforma baseada na URL
   */
  detectPlatform(url) {
    if (!url) return 'GENERIC';

    for (const [key, platform] of Object.entries(this.platforms)) {
      if (key === 'GENERIC') continue;
      
      for (const pattern of platform.urlPatterns) {
        if (url.includes(pattern)) {
          return key;
        }
      }
    }

    return 'GENERIC';
  }

  /**
   * Obtém informações da plataforma
   */
  getPlatformInfo(platform) {
    return this.platforms[platform] || this.platforms.GENERIC;
  }

  /**
   * Obtém ações específicas da plataforma
   */
  getPlatformActions(platform) {
    const actionMap = {
      WHATSAPP: [
        { id: 'scanChats', icon: '🔍', label: 'Scan Chats', description: 'Scan for suspicious messages' },
        { id: 'analyzeLast', icon: '📊', label: 'Analyze Last Messages', description: 'Check recent conversation' },
        { id: 'senderCheck', icon: '👤', label: 'Sender Verification', description: 'Verify contact identity' }
      ],
      TELEGRAM: [
        { id: 'verifyChannel', icon: '✅', label: 'Verify Channel', description: 'Check channel legitimacy' },
        { id: 'analyzeBot', icon: '🤖', label: 'Bot Analysis', description: 'Analyze bot behavior' },
        { id: 'checkGroup', icon: '👥', label: 'Group Security', description: 'Group security check' }
      ],
      GMAIL: [
        { id: 'scanInbox', icon: '📥', label: 'Scan Inbox', description: 'Check for phishing emails' },
        { id: 'checkSender', icon: '👤', label: 'Sender Analysis', description: 'Verify email sender' },
        { id: 'linksCheck', icon: '🔗', label: 'Check Links', description: 'Verify link safety' }
      ],
      GENERIC: [
        { id: 'fullScan', icon: '🔍', label: 'Full Security Scan', description: 'Complete page analysis' },
        { id: 'quickCheck', icon: '⚡', label: 'Quick Check', description: 'Fast security check' },
        { id: 'deepAnalysis', icon: '🔬', label: 'Deep Analysis', description: 'Thorough security analysis' }
      ]
    };

    return actionMap[platform] || actionMap.GENERIC;
  }

  /**
   * Obtém seletor específico da plataforma para conteúdo
   */
  getContentSelectors(platform) {
    const selectors = {
      WHATSAPP: {
        messages: 'div[data-tab] span[data-plain-text]',
        chatContainer: 'div[data-testid="chatlist"]',
        messageBubbles: 'div.message-in, div.message-out',
        senders: 'span[data-testid="conversation-info-header"]'
      },
      TELEGRAM: {
        messages: '.message-content',
        chatContainer: '.im-page_chat-content',
        messageBubbles: '.im-message',
        senders: '.tgico-verified'
      },
      GMAIL: {
        messages: '.a3s',
        chatContainer: '.nH',
        messageBubbles: '.ap',
        senders: '.gD'
      },
      GENERIC: {
        content: 'body',
        text: 'p, span, div, h1, h2, h3, h4, h5, h6'
      }
    };

    return selectors[platform] || selectors.GENERIC;
  }

  /**
   * Extrai conteúdo específico da plataforma
   */
  extractPlatformContent(platform) {
    const selectors = this.getContentSelectors(platform);
    
    try {
      if (platform === 'WHATSAPP' || platform === 'TELEGRAM') {
        // Extrai mensagens de chat
        const messageElements = document.querySelectorAll(selectors.messages);
        const messages = Array.from(messageElements).map(el => ({
          text: el.textContent,
          timestamp: new Date().toISOString(),
          sender: 'Unknown'
        }));
        
        return {
          platform,
          type: 'chat',
          messages,
          messageCount: messages.length,
          lastMessage: messages[messages.length - 1]
        };
      } else if (platform === 'GMAIL' || platform === 'OUTLOOK') {
        // Extrai emails
        const emailElements = document.querySelectorAll('tr[data-thread-perm-id]');
        const emails = Array.from(emailElements).slice(0, 20).map(el => ({
          subject: el.querySelector('.bog')?.textContent || '',
          sender: el.querySelector('.yW')?.textContent || '',
          snippet: el.querySelector('.y2')?.textContent || ''
        }));
        
        return {
          platform,
          type: 'email',
          emails,
          emailCount: emails.length
        };
      }
    } catch (error) {
      console.error('Error extracting platform content:', error);
    }

    return null;
  }

  /**
   * Extrai nome do remetente (WhatsApp/Telegram)
   */
  extractSenderName(element) {
    try {
      const parent = element.closest('[role="listitem"]');
      const nameElement = parent?.querySelector('span[title]');
      return nameElement?.getAttribute('title') || 'Unknown';
    } catch {
      return 'Unknown';
    }
  }
}

export default PlatformDetector;

