/**
 * spAI-Defender Background Service Worker
 * Handles Chrome Built-in AI operations and tab communication
 */

import { AISessionManager } from '../utils/ai-session-manager.js';

const aiManager = new AISessionManager();

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

    sendResponse({
      success: true,
      availability,
      capabilities
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
 * Summarize content using Built-in AI
 */
async function handleSummarizeContent(data, sendResponse) {
  try {
    const { content, maxLength } = data;

    // Create AI session with specific parameters for summarization
    const session = await aiManager.createSession({
      temperature: 0.7,
      topK: 40
    });

    if (!session) {
      throw new Error('Failed to create AI session');
    }

    const summaryPrompt = maxLength
      ? `Summarize the following content in no more than ${maxLength} words:\n\n${content}`
      : `Provide a concise summary of the following content:\n\n${content}`;

    const summary = await session.prompt(summaryPrompt);

    sendResponse({
      success: true,
      summary
    });

    // Clean up session
    await aiManager.destroySession();

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

console.log('spAI-Defender service worker loaded');
