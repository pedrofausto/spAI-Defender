/**
 * spAI-Defender Background Service Worker
 * Handles Chrome Built-in AI operations and tab communication
 */

import { AIOffscreenProxy } from '../utils/ai-offscreen-proxy.js';
import { PhishingDetector } from '../utils/phishing-detector.js';
import { SentimentAnalyzer } from '../utils/sentiment-analyzer.js';
import { PlatformDetector } from '../utils/platform-detector.js';
import { ImageAnalyzer } from '../utils/image-analyzer.js';
import { WhatsAppReader } from '../utils/whatsapp-reader.js';
import { TelegramReader } from '../utils/telegram-reader.js';
import { collectAIDiagnostics } from '../utils/ai-diagnostics.js';
import { AnalysisCache } from '../utils/analysis-cache.js';

const aiManager = new AIOffscreenProxy();
const phishingDetector = new PhishingDetector(aiManager);
const sentimentAnalyzer = new SentimentAnalyzer(aiManager);
const platformDetector = new PlatformDetector();
const imageAnalyzer = new ImageAnalyzer(aiManager);

// Analysis cache to reduce IDLE time and improve performance without cross-contaminating analyzers.
const ANALYSIS_ALGORITHM_VERSION = 'risk-analysis-v2';
const analysisCache = new AnalysisCache({
  maxEntries: 50,
  ttlMs: 5 * 60 * 1000,
  algorithmVersion: ANALYSIS_ALGORITHM_VERSION
});

async function buildAnalysisCacheKey({ analysisType, url = '', content = '', options = {} }) {
  return await analysisCache.buildKey({
    analysisType,
    url,
    content,
    algorithmVersion: ANALYSIS_ALGORITHM_VERSION,
    options
  });
}

function getCachedResult(key) {
  return analysisCache.get(key);
}

function cacheResult(key, result) {
  analysisCache.set(key, result);
  console.log(`💾 Cached analysis result (cache size: ${analysisCache.size()}/50)`);
}

// Extension installation and updates
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('spAI-Defender installed:', details.reason);

  // Check AI availability on installation
  const availability = await aiManager.checkAvailability();
  console.log('AI Availability:', availability);

  // Store initial state
  await chrome.storage.local.set({
    aiAvailability: availability,
    installedAt: new Date().toISOString()
  });
});

// Listen for messages from popup and content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Message received:', request.type);

  switch (request.type) {
    case 'CHECK_AI_AVAILABILITY':
      handleCheckAvailability(sendResponse);
      return true; // Async response

    case 'RUN_AI_DIAGNOSTICS':
      handleRunAIDiagnostics(sendResponse);
      return true; // Async response

    case 'ANALYZE_TAB_CONTENT':
      handleAnalyzeTabContent(request.data, sendResponse);
      return true; // Async response

    case 'GET_TAB_CONTENT':
      handleGetTabContent(request.tabId, sendResponse);
      return true; // Async response

    case 'SUMMARIZE_CONTENT':
      handleSummarizeContent(request.data, sendResponse);
      return true; // Async response

    case 'DETECT_PHISHING':
      handlePhishingDetection(request.data, sendResponse);
      return true; // Async response

    case 'ANALYZE_SENTIMENT':
      handleSentimentAnalysis(request.data, sendResponse);
      return true; // Async response

    case 'ANALYZE_SENTIMENT_ADVANCED':
      handleAdvancedSentimentAnalysis(request.data, sendResponse);
      return true; // Async response

    case 'EXTRACT_WHATSAPP_MESSAGES':
      handleExtractWhatsAppMessages(request.tabId, sendResponse);
      return true; // Async response

    case 'EXTRACT_TELEGRAM_MESSAGES':
      handleExtractTelegramMessages(request.tabId, sendResponse);
      return true; // Async response

    case 'ANALYZE_MESSAGES_PHISHING':
      handleAnalyzeMessagesPhishing(request.data, sendResponse);
      return true; // Async response

    case 'GET_PLATFORM_INFO':
      handleGetPlatformInfo(request.url, sendResponse);
      return true; // Async response

    case 'GET_THREAT_STATS':
      handleGetThreatStats(sendResponse);
      return true; // Async response

    case 'SCAN_MESSAGES':
      handleScanMessages(request.data, sendResponse);
      return true; // Async response

    case 'ANALYZE_IMAGE':
      handleAnalyzeImage(request.data, sendResponse);
      return true; // Async response

    case 'ANALYZE_PAGE_IMAGES':
      handleAnalyzePageImages(request.data, sendResponse);
      return true; // Async response

    case 'EXTRACT_IMAGE_TEXT':
      handleExtractImageText(request.data, sendResponse);
      return true; // Async response

    case 'WHATSAPP_CHAT_SNAPSHOT':
      handleWhatsAppChatSnapshot(request.data, sender, sendResponse);
      return true; // Async response

    case 'GET_LAST_WHATSAPP_SNAPSHOT':
      handleGetLastWhatsAppSnapshot(sendResponse);
      return true; // Async response

    default:
      sendResponse({ error: 'Unknown message type' });
      return false;
  }
});

/**
 * Check AI model availability (real check via offscreen proxy)
 */
async function handleCheckAvailability(sendResponse) {
  try {
    const availability = await aiManager.checkAvailability();
    const capabilities = await aiManager.getCapabilities().catch((e) => ({
      available: false,
      availability: 'no',
      defaultTemperature: 0.8,
      defaultTopK: 40,
      maxTopK: 40,
      error: e?.message || String(e)
    }));

    const hasSummarizationAPI =
      typeof aiManager.hasSummarizationAPI === 'function'
        ? await aiManager.hasSummarizationAPI()
        : false;

    sendResponse({
      success: true,
      availability,
      capabilities,
      summarizationCapabilities: true,
      hasSummarizationAPI
    });
  } catch (error) {
    console.error('Error checking AI availability:', error);
    sendResponse({
      success: false,
      availability: 'no',
      error: error?.message || String(error),
      hasSummarizationAPI: false
    });
  }
}

/**
 * Return detailed diagnostics report for debugging AI availability.
 */
async function handleRunAIDiagnostics(sendResponse) {
  try {
    const report = await collectAIDiagnostics(aiManager);
    sendResponse({ success: true, report });
  } catch (error) {
    console.error('Error running AI diagnostics:', error);
    sendResponse({ success: false, error: error?.message || String(error) });
  }
}

/**
 * Get content from a specific tab
 */
async function handleGetTabContent(tabId, sendResponse) {
  try {
    // If no tabId specified, use active tab
    if (!tabId) {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      tabId = activeTab.id;
    }

    // Get tab info to check URL
    const tab = await chrome.tabs.get(tabId);
    console.log('Extracting content for tab:', tabId, tab.url);

    // Get the content via message from content script (preferred)
    try {
      const response = await chrome.tabs.sendMessage(tabId, { type: 'EXTRACT_CONTENT' });
      if (response && response.success) {
        console.log('Content extracted successfully via content script');
        sendResponse({
          success: true,
          content: response.content
        });
        return;
      }
    } catch (err) {
      console.log('Direct message to content script failed, using injection method:', err.message);
    }

    // Fallback: Inject appropriate extraction function based on platform
    let extractFunc = extractPageContent;
    
    if (tab.url.includes('web.whatsapp.com')) {
      console.log('Detected WhatsApp Web - using specialized extractor');
      extractFunc = extractWhatsAppContentDirect;
    }

    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: extractFunc
    });

    if (results && results[0] && results[0].result) {
      console.log('Content extracted via injected script');
      sendResponse({
        success: true,
        content: results[0].result
      });
    } else {
      console.error('No results from content extraction');
      sendResponse({
        success: false,
        error: 'Failed to extract content'
      });
    }
  } catch (error) {
    console.error('Error getting tab content:', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
}

function normalizeTabAnalysisData(data = {}) {
  const rawContent = data?.content;
  const content = typeof rawContent === 'string'
    ? rawContent
    : rawContent?.bodyText || rawContent?.text || rawContent?.content || '';

  return {
    content: String(content || '').trim(),
    url: typeof data?.url === 'string' ? data.url : (typeof rawContent?.url === 'string' ? rawContent.url : ''),
    title: typeof data?.title === 'string' ? data.title : (typeof rawContent?.title === 'string' ? rawContent.title : '')
  };
}

function formatStructuredTabAnalysis(result) {
  const evidence = Array.isArray(result.evidence) ? result.evidence : [];
  const signals = Array.isArray(result.semanticSignals) ? result.semanticSignals : [];
  const phrases = Array.isArray(result.suspiciousPhrases) ? result.suspiciousPhrases : [];
  const lines = [
    `Classification: ${result.classification || 'INCONCLUSIVE'}`,
    `Risk level: ${result.riskLevel || 'UNKNOWN'}`,
    `Risk score: ${Number.isFinite(result.riskScore) ? result.riskScore : 0}`,
    `Confidence: ${Number.isFinite(result.confidence) ? result.confidence : 0}`,
    `Recommendation: ${result.recommendation || 'CAUTION'}`
  ];

  if (signals.length > 0) lines.push(`Signals: ${signals.join(', ')}`);
  if (evidence.length > 0) lines.push(`Evidence: ${evidence.join('; ')}`);
  if (phrases.length > 0) lines.push(`Suspicious phrases: ${phrases.join('; ')}`);
  if (result.validationError) lines.push(`Validation: ${result.validationError}`);

  return lines.join('\n');
}
/**
 * Analyze tab content using the structured local threat classifier.
 */
async function handleAnalyzeTabContent(data, sendResponse) {
  try {
    const normalized = normalizeTabAnalysisData(data);
    if (!normalized.content) {
      sendResponse({ success: false, error: 'No analyzable content provided' });
      return;
    }

    const result = await phishingDetector.detectPhishing(
      normalized.url,
      normalized.content,
      normalized.title,
      [],
      false
    );

    sendResponse({
      success: true,
      analysis: formatStructuredTabAnalysis(result),
      result,
      ignoredPrompt: Boolean(data?.prompt || data?.options),
      mode: 'structured_local_threat_analysis'
    });
  } catch (error) {
    console.error('Error analyzing content:', error);
    sendResponse({
      success: false,
      error: error?.message || String(error)
    });
  }
}
/**
 * Summarize content using Built-in AI Summarization API (optimized)
 */
async function handleSummarizeContent(data, sendResponse) {
  try {
    const { content, maxLength } = data;

    // Use the optimized Summarization API
    const summaryOptions = {
      text: content,
      maxLength: maxLength || 150
    };

    const summary = await aiManager.summarize(content, summaryOptions);

    sendResponse({
      success: true,
      summary,
      api: 'summarization' // Indicate which API was used
    });

  } catch (error) {
    console.error('Error summarizing content:', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
}

/**
 * Extract page content (injected function)
 * This function runs in the page context
 */
function extractPageContent() {
  const content = {
    title: document.title,
    url: window.location.href,
    text: document.body.innerText,
    bodyText: document.body.innerText,
    html: document.body.innerHTML,
    headings: Array.from(document.querySelectorAll('h1, h2, h3')).map(h => ({
      level: h.tagName,
      text: h.textContent.trim()
    })),
    links: Array.from(document.querySelectorAll('a[href]')).map(a => ({
      text: a.textContent.trim(),
      href: a.href
    })),
    images: Array.from(document.querySelectorAll('img[src]')).map(img => ({
      src: img.src,
      alt: img.alt
    })),
    meta: {
      description: document.querySelector('meta[name="description"]')?.content || '',
      keywords: document.querySelector('meta[name="keywords"]')?.content || '',
      author: document.querySelector('meta[name="author"]')?.content || ''
    },
    stats: {
      wordCount: document.body.innerText.split(/\s+/).filter(Boolean).length,
      paragraphCount: document.querySelectorAll('p').length,
      headingCount: document.querySelectorAll('h1, h2, h3, h4, h5, h6').length,
      linkCount: document.querySelectorAll('a[href]').length,
      imageCount: document.querySelectorAll('img').length,
      readingTime: Math.ceil(document.body.innerText.split(/\s+/).filter(Boolean).length / 200)
    },
    timestamp: new Date().toISOString()
  };

  return content;
}

/**
 * Extract WhatsApp Web content (injected function)
 * This function runs in the page context on WhatsApp Web
 */
function extractWhatsAppContentDirect() {
  // Extract chat name
  const chatNameEl = document.querySelector('#main header span[dir="auto"][title]');
  const chatName = chatNameEl ? chatNameEl.title : 'Unknown Chat';
  
  // Extract messages using multiple selector strategies
  const messages = [];
  
  // Strategy 1: Look for message rows
  const messageRows = document.querySelectorAll('div[role="row"]');
  messageRows.forEach(rowEl => {
    try {
      const textEl = rowEl.querySelector('.selectable-text span, span.selectable-text');
      if (!textEl) return;
      
      const text = textEl.textContent.trim();
      if (!text) return;
      
      const messageContainer = rowEl.querySelector('.message-in, .message-out');
      const direction = messageContainer?.classList.contains('message-in') ? 'in' : 'out';
      
      messages.push({ text, direction });
    } catch (e) {
      // Skip this message
    }
  });
  
  // Strategy 2: If no messages found, try direct selectable-text search
  if (messages.length === 0) {
    const textElements = document.querySelectorAll('span.selectable-text');
    textElements.forEach(el => {
      const text = el.textContent.trim();
      if (text && text.length > 0) {
        messages.push({ text, direction: 'unknown' });
      }
    });
  }
  
  const conversationText = messages.map(m => m.text).join('\n');
  
  // Extract links
  const links = Array.from(document.querySelectorAll('a[href]')).map(a => ({
    text: a.textContent.trim(),
    href: a.href
  }));
  
  return {
    title: document.title,
    url: window.location.href,
    text: conversationText,
    bodyText: conversationText,
    headings: [{ level: 1, text: `Chat with ${chatName}`, id: null }],
    paragraphs: messages.map(m => m.text),
    links: links,
    images: Array.from(document.querySelectorAll('img[src]')).map(img => ({
      src: img.src,
      alt: img.alt || ''
    })),
    stats: {
      wordCount: conversationText.split(/\s+/).filter(Boolean).length,
      paragraphCount: messages.length,
      headingCount: 1,
      linkCount: links.length,
      imageCount: document.querySelectorAll('img').length,
      readingTime: Math.ceil(conversationText.split(/\s+/).filter(Boolean).length / 200)
    },
    meta: {
      description: `WhatsApp chat with ${chatName}`,
      keywords: 'whatsapp, chat, messages',
      author: chatName
    },
    timestamp: new Date().toISOString()
  };
}

// Handle tab updates to refresh content
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    console.log('Tab updated:', tab.url);
    // Could trigger automatic analysis here if needed
  }
});

/**
 * Handle phishing detection (includes image analysis)
 */
async function handlePhishingDetection(data, sendResponse) {
  console.log('🔵 handlePhishingDetection called with data:', data?.content?.substring(0, 50) || 'no content');
  try {
    // Extract content properly - data has {url, text, title, images}
    const url = data.url || '';
    const content = data.text || data.content || '';
    const title = data.title || '';
    const images = data.images || [];

    console.log('🔵 Content length:', content.length, 'chars');

    // Check cache first to reduce IDLE time
    const cacheKey = await buildAnalysisCacheKey({
      analysisType: 'phishing',
      url,
      content,
      options: { title, imageCount: images.length }
    });
    const cachedResult = getCachedResult(cacheKey);

    if (cachedResult) {
      console.log('📦 Using cached analysis result - reducing IDLE time');
      sendResponse(cachedResult);
      return;
    }

    console.log('🔵 Calling phishingDetector.detectPhishing...');
    const analysis = await phishingDetector.detectPhishing(url, content, title, images);
    console.log('🔵 phishingDetector returned full analysis:', JSON.stringify(analysis, null, 2));
    
    // Show badge if high risk
    if (analysis.riskScore > 50) {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs[0]) {
        try {
          await chrome.tabs.sendMessage(tabs[0].id, {
            type: 'SHOW_SECURITY_BADGE',
            data: {
              riskLevel: analysis.riskLevel,
              riskScore: analysis.riskScore,
              indicators: analysis.redFlags
            }
          });
        } catch (e) {
          // Content script may not be injected on this page; ignore.
          console.warn('SHOW_SECURITY_BADGE sendMessage failed:', e?.message || e);
        }
      }
    }

    const response = {
      success: true,
      analysis
    };
    
    // Cache the result for future requests
    cacheResult(cacheKey, response);
    
    sendResponse(response);
  } catch (error) {
    console.error('Error in phishing detection:', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
}

/**
 * Handle sentiment analysis
 */
async function handleSentimentAnalysis(data, sendResponse) {
  try {
    const { content, url } = data;
    
    // Check cache first
    const cacheKey = await buildAnalysisCacheKey({
      analysisType: 'sentiment',
      url,
      content,
      options: { analyzer: 'basic' }
    });
    const cachedResult = getCachedResult(cacheKey);
    
    if (cachedResult) {
      console.log('📦 Using cached sentiment analysis - reducing IDLE time');
      sendResponse(cachedResult);
      return;
    }
    
    const analysis = await sentimentAnalyzer.analyzeSentiment(content, url);
    
    const response = {
      success: true,
      analysis
    };
    
    // Cache the result
    cacheResult(cacheKey, response);
    
    sendResponse(response);
  } catch (error) {
    console.error('Error in sentiment analysis:', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
}

/**
 * Handle get platform info
 */
async function handleGetPlatformInfo(url, sendResponse) {
  try {
    const platform = platformDetector.detectPlatform(url);
    const platformInfo = platformDetector.getPlatformInfo(platform);
    const actions = platformDetector.getPlatformActions(platform);
    
    sendResponse({
      success: true,
      platform,
      platformInfo,
      actions
    });
  } catch (error) {
    console.error('Error getting platform info:', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
}

/**
 * Handle get threat stats
 */
async function handleGetThreatStats(sendResponse) {
  try {
    const stats = await phishingDetector.getThreatStats();
    
    sendResponse({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error getting threat stats:', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
}

/**
 * Handle scan messages (WhatsApp/Telegram)
 */
async function handleScanMessages(data, sendResponse) {
  try {
    const { messages, platform } = data;
    const results = [];

    for (const message of messages.slice(0, 10)) { // Scan last 10 messages
      const text = message.text || '';
      const sender = message.sender || 'Unknown';
      
      if (text.length > 10) { // Only scan meaningful messages
        const analysis = await phishingDetector.detectSocialEngineering(text, sender);
        results.push({
          message,
          analysis
        });
      }
    }

    sendResponse({
      success: true,
      results,
      scanned: results.length
    });
  } catch (error) {
    console.error('Error scanning messages:', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
}

/**
 * Handle analyze single image
 */
async function handleAnalyzeImage(data, sendResponse) {
  try {
    const { imageUrl, pageContext } = data;
    const analysis = await imageAnalyzer.analyzeImage(imageUrl, pageContext);
    
    sendResponse({
      success: true,
      analysis
    });
  } catch (error) {
    console.error('Error analyzing image:', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
}

/**
 * Handle analyze all page images
 */
async function handleAnalyzePageImages(data, sendResponse) {
  try {
    const { imageUrls, pageContext } = data;
    const results = await imageAnalyzer.analyzePageImages(imageUrls, pageContext);
    
    sendResponse({
      success: true,
      results
    });
  } catch (error) {
    console.error('Error analyzing page images:', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
}

/**
 * Handle extract text from image (OCR)
 */
async function handleExtractImageText(data, sendResponse) {
  try {
    const { imageUrl } = data;
    const extractedText = await imageAnalyzer.extractTextFromImage(imageUrl);
    
    sendResponse({
      success: true,
      text: extractedText
    });
  } catch (error) {
    console.error('Error extracting image text:', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
}

/**
 * Handle advanced sentiment analysis with multi-stage pipeline
 */
async function handleAdvancedSentimentAnalysis(data, sendResponse) {
  try {
    const { content, url } = data;
    
    // Use advanced sentiment analysis
    const analysis = await sentimentAnalyzer.analyzeAdvanced(content, url);
    
    sendResponse({
      success: true,
      analysis
    });
  } catch (error) {
    console.error('Error in advanced sentiment analysis:', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
}

/**
 * Handle WhatsApp messages extraction
 */
async function handleExtractWhatsAppMessages(tabId, sendResponse) {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        // Import will be done in background, function is executed in page context
        return JSON.stringify({
          messages: [],
          error: 'WhatsApp reader must be injected as content script'
        });
      }
    });

    // For actual implementation, we need to inject WhatsAppReader as content script
    sendResponse({
      success: true,
      messages: [],
      count: 0,
      platform: 'WhatsApp Web'
    });
  } catch (error) {
    console.error('Error extracting WhatsApp messages:', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
}

/**
 * Handle Telegram messages extraction
 */
async function handleExtractTelegramMessages(tabId, sendResponse) {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        return JSON.stringify({
          messages: [],
          error: 'Telegram reader must be injected as content script'
        });
      }
    });

    sendResponse({
      success: true,
      messages: [],
      count: 0,
      platform: 'Telegram Web'
    });
  } catch (error) {
    console.error('Error extracting Telegram messages:', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
}

/**
 * Handle phishing analysis for messages
 */
async function handleAnalyzeMessagesPhishing(data, sendResponse) {
  try {
    const { messages, platform } = data;
    const results = [];

    for (const message of messages) {
      if (message.text && message.text.length > 10) {
        const analysis = await phishingDetector.detectPhishing(
          message.sender || 'Unknown',
          message.text,
          `${platform} Message`,
          []
        );

        results.push({
          message,
          analysis
        });
      }
    }

    sendResponse({
      success: true,
      results,
      analyzed: results.length
    });
  } catch (error) {
    console.error('Error analyzing messages for phishing:', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
}

/**
 * Handle WhatsApp chat snapshot storage
 */
async function handleWhatsAppChatSnapshot(data, sender, sendResponse) {
  try {
    const tabId = sender?.tab?.id || null;
    
    if (!tabId) {
      console.warn('WhatsApp snapshot received without tab ID');
      sendResponse({ success: false, error: 'No tab ID' });
      return;
    }

    const snapshot = {
      tabId,
      receivedAt: new Date().toISOString(),
      trigger: data.trigger,
      chatId: data.chatId,
      chatName: data.chatName,
      content: data.content
    };

    // Store in chrome.storage.local
    await chrome.storage.local.set({
      lastWhatsAppSnapshot: snapshot
    });

    console.log(`✅ WhatsApp snapshot stored (trigger: ${data.trigger}, chat: ${data.chatName})`);
    
    sendResponse({ success: true });
  } catch (error) {
    console.error('Error storing WhatsApp snapshot:', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
}

/**
 * Handle get last WhatsApp snapshot
 */
async function handleGetLastWhatsAppSnapshot(sendResponse) {
  try {
    const result = await chrome.storage.local.get('lastWhatsAppSnapshot');
    
    if (result.lastWhatsAppSnapshot) {
      sendResponse({
        success: true,
        snapshot: result.lastWhatsAppSnapshot
      });
    } else {
      sendResponse({
        success: false,
        error: 'No snapshot available'
      });
    }
  } catch (error) {
    console.error('Error retrieving WhatsApp snapshot:', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
}

console.log('spAI-Defender service worker loaded');
