/**
 * spAI-Defender Popup Script
 * Handles user interface and interactions
 */

// DOM Elements
const elements = {
  statusIcon: document.getElementById('statusIcon'),
  aiStatus: document.getElementById('aiStatus'),
  tabTitle: document.getElementById('tabTitle'),
  tabUrl: document.getElementById('tabUrl'),

  // Action buttons
  extractBtn: document.getElementById('extractBtn'),
  summarizeBtn: document.getElementById('summarizeBtn'),
  analyzeBtn: document.getElementById('analyzeBtn'),
  customPromptBtn: document.getElementById('customPromptBtn'),

  // Prompt section
  promptSection: document.getElementById('promptSection'),
  promptInput: document.getElementById('promptInput'),
  sendPromptBtn: document.getElementById('sendPromptBtn'),
  cancelPromptBtn: document.getElementById('cancelPromptBtn'),

  // Results section
  resultsSection: document.getElementById('resultsSection'),
  resultsContent: document.getElementById('resultsContent'),
  clearResultsBtn: document.getElementById('clearResultsBtn'),

  // Loading overlay
  loadingOverlay: document.getElementById('loadingOverlay'),

  // Footer links
  settingsLink: document.getElementById('settingsLink'),
  helpLink: document.getElementById('helpLink'),
  aboutLink: document.getElementById('aboutLink')
};

// State
let currentTab = null;
let extractedContent = null;
let aiAvailable = false;

/**
 * Initialize popup
 */
async function init() {
  console.log('Popup initialized');

  // Load current tab info
  await loadCurrentTab();

  // Check AI availability
  await checkAIAvailability();

  // Setup event listeners
  setupEventListeners();
}

/**
 * Load current tab information
 */
async function loadCurrentTab() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    currentTab = tab;

    if (tab) {
      elements.tabTitle.textContent = tab.title || 'Untitled';
      elements.tabUrl.textContent = tab.url || '-';
    }
  } catch (error) {
    console.error('Error loading current tab:', error);
    elements.tabTitle.textContent = 'Error loading tab';
  }
}

/**
 * Check AI model availability
 */
async function checkAIAvailability() {
  try {
    const response = await sendMessage({ type: 'CHECK_AI_AVAILABILITY' });

    if (response.success) {
      const { availability } = response;
      updateAIStatus(availability);
      aiAvailable = availability === 'readily';

      // Enable AI-dependent buttons
      if (aiAvailable) {
        elements.summarizeBtn.disabled = false;
        elements.analyzeBtn.disabled = false;
        elements.customPromptBtn.disabled = false;
      }
    } else {
      updateAIStatus('unavailable');
      showError('Failed to check AI availability');
    }
  } catch (error) {
    console.error('Error checking AI availability:', error);
    updateAIStatus('error');
  }
}

/**
 * Update AI status display
 */
function updateAIStatus(status) {
  elements.aiStatus.textContent = status;
  elements.aiStatus.className = `status-value ${status}`;

  switch (status) {
    case 'readily':
      elements.statusIcon.textContent = '✅';
      elements.aiStatus.textContent = 'Available';
      break;
    case 'after-download':
      elements.statusIcon.textContent = '⬇️';
      elements.aiStatus.textContent = 'Download Required';
      break;
    case 'no':
    case 'unavailable':
      elements.statusIcon.textContent = '❌';
      elements.aiStatus.textContent = 'Unavailable';
      break;
    case 'error':
      elements.statusIcon.textContent = '⚠️';
      elements.aiStatus.textContent = 'Error';
      break;
    default:
      elements.statusIcon.textContent = '⚙️';
      elements.aiStatus.textContent = status;
  }
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Action buttons
  elements.extractBtn.addEventListener('click', handleExtractContent);
  elements.summarizeBtn.addEventListener('click', handleSummarizeContent);
  elements.analyzeBtn.addEventListener('click', handleAnalyzeContent);
  elements.customPromptBtn.addEventListener('click', showCustomPrompt);

  // Prompt actions
  elements.sendPromptBtn.addEventListener('click', handleCustomPrompt);
  elements.cancelPromptBtn.addEventListener('click', hideCustomPrompt);

  // Results actions
  elements.clearResultsBtn.addEventListener('click', clearResults);

  // Footer links
  elements.settingsLink.addEventListener('click', (e) => {
    e.preventDefault();
    // TODO: Open settings page
    alert('Settings coming soon!');
  });

  elements.helpLink.addEventListener('click', (e) => {
    e.preventDefault();
    showHelp();
  });

  elements.aboutLink.addEventListener('click', (e) => {
    e.preventDefault();
    showAbout();
  });
}

/**
 * Handle extract content button click
 */
async function handleExtractContent() {
  showLoading();

  try {
    const response = await sendMessage({
      type: 'GET_TAB_CONTENT',
      tabId: currentTab.id
    });

    if (response.success) {
      extractedContent = response.content;
      showResults('Content Extracted', formatExtractedContent(extractedContent));
    } else {
      showError(response.error || 'Failed to extract content');
    }
  } catch (error) {
    console.error('Error extracting content:', error);
    showError('Failed to extract content');
  } finally {
    hideLoading();
  }
}

/**
 * Handle summarize content button click
 */
async function handleSummarizeContent() {
  if (!extractedContent) {
    showError('Please extract content first');
    return;
  }

  showLoading();

  try {
    const response = await sendMessage({
      type: 'SUMMARIZE_CONTENT',
      data: {
        content: extractedContent.text,
        maxLength: 150
      }
    });

    if (response.success) {
      showResults('Summary', response.summary);
    } else {
      showError(response.error || 'Failed to summarize content');
    }
  } catch (error) {
    console.error('Error summarizing content:', error);
    showError('Failed to summarize content');
  } finally {
    hideLoading();
  }
}

/**
 * Handle analyze content button click
 */
async function handleAnalyzeContent() {
  if (!extractedContent) {
    showError('Please extract content first');
    return;
  }

  showLoading();

  try {
    const analysisPrompt = `Analyze this web page and provide:
1. Main topic and purpose
2. Key points (3-5 bullet points)
3. Target audience
4. Content quality assessment

Page Title: ${extractedContent.title}
Content: ${extractedContent.text.substring(0, 2000)}...`;

    const response = await sendMessage({
      type: 'ANALYZE_TAB_CONTENT',
      data: {
        content: extractedContent.text,
        prompt: analysisPrompt
      }
    });

    if (response.success) {
      showResults('Content Analysis', response.analysis);
    } else {
      showError(response.error || 'Failed to analyze content');
    }
  } catch (error) {
    console.error('Error analyzing content:', error);
    showError('Failed to analyze content');
  } finally {
    hideLoading();
  }
}

/**
 * Show custom prompt section
 */
function showCustomPrompt() {
  if (!extractedContent) {
    showError('Please extract content first');
    return;
  }

  elements.promptSection.style.display = 'block';
  elements.promptInput.focus();
}

/**
 * Hide custom prompt section
 */
function hideCustomPrompt() {
  elements.promptSection.style.display = 'none';
  elements.promptInput.value = '';
}

/**
 * Handle custom prompt submission
 */
async function handleCustomPrompt() {
  const customPrompt = elements.promptInput.value.trim();

  if (!customPrompt) {
    showError('Please enter a prompt');
    return;
  }

  if (!extractedContent) {
    showError('Please extract content first');
    return;
  }

  hideCustomPrompt();
  showLoading();

  try {
    const fullPrompt = `${customPrompt}\n\nContext from current page:\nTitle: ${extractedContent.title}\nContent: ${extractedContent.text.substring(0, 2000)}...`;

    const response = await sendMessage({
      type: 'ANALYZE_TAB_CONTENT',
      data: {
        content: extractedContent.text,
        prompt: fullPrompt
      }
    });

    if (response.success) {
      showResults('Custom Prompt Response', response.analysis);
    } else {
      showError(response.error || 'Failed to process prompt');
    }
  } catch (error) {
    console.error('Error processing custom prompt:', error);
    showError('Failed to process prompt');
  } finally {
    hideLoading();
  }
}

/**
 * Format extracted content for display
 */
function formatExtractedContent(content) {
  const stats = content.stats || {};
  const meta = content.meta || {};

  return `
<strong>Page Information:</strong>
• Title: ${content.title}
• URL: ${content.url}
• Word Count: ${stats.wordCount || 'N/A'}
• Reading Time: ~${stats.readingTime || 'N/A'} minutes

<strong>Structure:</strong>
• Headings: ${stats.headingCount || 0}
• Paragraphs: ${stats.paragraphCount || 0}
• Links: ${stats.linkCount || 0}
• Images: ${stats.imageCount || 0}

<strong>Metadata:</strong>
• Description: ${meta.description || 'N/A'}
• Language: ${meta.lang || 'N/A'}

Content extracted successfully! You can now use the Summarize or Analyze buttons.
  `.trim();
}

/**
 * Show results section
 */
function showResults(title, content) {
  elements.resultsContent.innerHTML = `<h3>${title}</h3><div>${content}</div>`;
  elements.resultsSection.style.display = 'block';
}

/**
 * Clear results
 */
function clearResults() {
  elements.resultsContent.innerHTML = '';
  elements.resultsSection.style.display = 'none';
}

/**
 * Show error message
 */
function showError(message) {
  showResults('Error', `<span style="color: var(--danger-color);">${message}</span>`);
}

/**
 * Show loading overlay
 */
function showLoading() {
  elements.loadingOverlay.style.display = 'flex';
}

/**
 * Hide loading overlay
 */
function hideLoading() {
  elements.loadingOverlay.style.display = 'none';
}

/**
 * Send message to background script
 */
function sendMessage(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(response);
      }
    });
  });
}

/**
 * Show help information
 */
function showHelp() {
  const helpText = `
<strong>How to Use spAI-Defender:</strong>

1. <strong>Extract Content:</strong> Click to extract all content from the current tab
2. <strong>Summarize Page:</strong> Get an AI-generated summary of the page content
3. <strong>Analyze Content:</strong> Get detailed AI analysis of the page
4. <strong>Custom Prompt:</strong> Ask custom questions about the page content

<strong>Requirements:</strong>
• Chrome 138 or later
• Built-in AI feature enabled
• Sufficient system resources (see documentation)

<strong>Note:</strong> The AI model must be downloaded on first use (requires user interaction).
  `.trim();

  showResults('Help', helpText);
}

/**
 * Show about information
 */
function showAbout() {
  const aboutText = `
<strong>spAI-Defender Tab Reader</strong>
Version 1.0.0

A Chrome extension powered by Chrome's Built-in AI (Gemini Nano) to read, analyze, and summarize web page content.

<strong>Features:</strong>
• Extract content from web pages
• AI-powered summarization
• Content analysis
• Custom prompts for specific queries

<strong>Privacy:</strong>
All processing happens locally on your device using Chrome's Built-in AI. No data is sent to external servers.

<strong>Technology:</strong>
Built with Chrome's Prompt API and Manifest V3

<strong>License:</strong> MIT
  `.trim();

  showResults('About', aboutText);
}

// Initialize popup when DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
