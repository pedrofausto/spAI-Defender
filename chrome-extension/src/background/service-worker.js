/**
 * spAI-Defender Background Service Worker
 * Handles Chrome Built-in AI operations and tab communication
 */

import { AISessionManager } from '../utils/ai-session-manager.js';
import { PhishingDetector } from '../utils/phishing-detector.js';
import { SentimentAnalyzer } from '../utils/sentiment-analyzer.js';
import { PlatformDetector } from '../utils/platform-detector.js';
import { ImageAnalyzer } from '../utils/image-analyzer.js';

const aiManager = new AISessionManager();
const phishingDetector = new PhishingDetector(aiManager);
const sentimentAnalyzer = new SentimentAnalyzer(aiManager);
const platformDetector = new PlatformDetector();
const imageAnalyzer = new ImageAnalyzer(aiManager);

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

    default:
      sendResponse({ error: 'Unknown message type' });
      return false;
  }
});

/**
 * Check AI model availability
 */
async function handleCheckAvailability(sendResponse) {
  try {
    const availability = await aiManager.checkAvailability();
    const capabilities = await aiManager.getCapabilities();
    const summarizationCapabilities = await aiManager.getSummarizationCapabilities();

    sendResponse({
      success: true,
      availability,
      capabilities,
      summarizationCapabilities,
      hasSummarizationAPI: summarizationCapabilities !== null
    });
  } catch (error) {
    console.error('Error checking AI availability:', error);
    sendResponse({
      success: false,
      error: error.message
    });
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

    // Execute content script to extract page content
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: extractPageContent
    });

    if (results && results[0]) {
      sendResponse({
        success: true,
        content: results[0].result
      });
    } else {
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

/**
 * Analyze tab content using Built-in AI
 */
async function handleAnalyzeTabContent(data, sendResponse) {
  try {
    const { content, prompt, options } = data;

    // Create AI session
    const session = await aiManager.createSession(options);

    if (!session) {
      throw new Error('Failed to create AI session');
    }

    // Prepare the analysis prompt
    const analysisPrompt = prompt || `Analyze the following web page content and provide insights:\n\n${content}`;

    // Get AI response
    const response = await session.prompt(analysisPrompt);

    sendResponse({
      success: true,
      analysis: response
    });

    // Clean up session
    await aiManager.destroySession();

  } catch (error) {
    console.error('Error analyzing content:', error);
    sendResponse({
      success: false,
      error: error.message
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
    timestamp: new Date().toISOString()
  };

  return content;
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
  try {
    const { url, content, title, images = [] } = data;
    const analysis = await phishingDetector.detectPhishing(url, content, title, images);
    
    // Show badge if high risk
    if (analysis.riskScore > 50) {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: 'SHOW_SECURITY_BADGE',
          data: {
            riskLevel: analysis.riskLevel,
            riskScore: analysis.riskScore,
            indicators: analysis.redFlags
          }
        });
      }
    }

    sendResponse({
      success: true,
      analysis
    });
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
    const analysis = await sentimentAnalyzer.analyzeSentiment(content, url);
    
    sendResponse({
      success: true,
      analysis
    });
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

console.log('spAI-Defender service worker loaded');
