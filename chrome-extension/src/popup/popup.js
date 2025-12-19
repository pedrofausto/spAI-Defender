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

  // Dashboard
  riskScore: document.getElementById('riskScore'),
  threatsCount: document.getElementById('threatsCount'),
  pagesCount: document.getElementById('pagesCount'),
  riskFill: document.getElementById('riskFill'),

  // Action buttons
  extractBtn: document.getElementById('extractBtn'),
  summarizeBtn: document.getElementById('summarizeBtn'),
  analyzeBtn: document.getElementById('analyzeBtn'),
  customPromptBtn: document.getElementById('customPromptBtn'),
  phishingScanBtn: document.getElementById('phishingScanBtn'),
  sentimentBtn: document.getElementById('sentimentBtn'),

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
  helpLink: document.getElementById('helpLink'),
  aboutLink: document.getElementById('aboutLink'),

  // Advanced metrics
  advancedMetrics: document.getElementById('advancedMetrics'),
  closeMetricsBtn: document.getElementById('closeMetricsBtn'),
  valenceFill: document.getElementById('valenceFill'),
  valenceValue: document.getElementById('valenceValue'),
  arousalFill: document.getElementById('arousalFill'),
  arousalValue: document.getElementById('arousalValue'),
  dominanceFill: document.getElementById('dominanceFill'),
  dominanceValue: document.getElementById('dominanceValue'),
  emotionalState: document.getElementById('emotionalState'),
  lexiconScores: document.getElementById('lexiconScores'),
  anomaliesList: document.getElementById('anomaliesList'),
  confidenceScores: document.getElementById('confidenceScores')
};

// State
let currentTab = null;
let extractedContent = null;
let aiAvailable = false;
let currentPlatform = 'GENERIC';
let threatStats = { total: 0, today: 0, recent: [], byRiskLevel: {} };

/**
 * Initialize popup
 */
async function init() {
  console.log('Popup initialized');

  // Load current tab info
  await loadCurrentTab();

  // Check AI availability
  await checkAIAvailability();

  // Load threat stats
  await loadThreatStats();

  // Detect platform
  detectCurrentPlatform();

  // Setup event listeners
  setupEventListeners();
  
  // Auto-extract content when popup opens
  await autoExtractContent();
}

/**
 * Auto-extract content when popup opens
 */
async function autoExtractContent() {
  if (!currentTab) return;
  
  console.log('Auto-extracting content for:', currentTab.url);
  
  try {
    // For WhatsApp, try to get the latest snapshot first
    if (currentTab.url && currentTab.url.includes('web.whatsapp.com')) {
      console.log('📸 Attempting to load WhatsApp snapshot...');
      
      const snapshotResponse = await sendMessage({
        type: 'GET_LAST_WHATSAPP_SNAPSHOT'
      });

      if (snapshotResponse.success && snapshotResponse.snapshot) {
        const snapshot = snapshotResponse.snapshot;
        
        // Verify snapshot is from the current tab
        if (snapshot.tabId === currentTab.id) {
          extractedContent = snapshot.content;
          console.log(`✅ WhatsApp snapshot loaded (${snapshot.chatName}, trigger: ${snapshot.trigger})`);
          return; // Use snapshot, skip GET_TAB_CONTENT
        } else {
          console.log('⚠️ Snapshot is from a different tab, falling back to GET_TAB_CONTENT');
        }
      }
    }

    // Fallback: standard extraction
    const response = await sendMessage({
      type: 'GET_TAB_CONTENT',
      tabId: currentTab.id
    });

    if (response.success) {
      extractedContent = response.content;
      console.log('✅ Content auto-extracted');
      // Don't show results automatically, just enable buttons
    }
  } catch (error) {
    console.error('Auto-extract failed:', error);
  }
}

/**
 * Load current tab information
 */
async function loadCurrentTab() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    currentTab = tab;

    if (tab) {
      safeSetText(elements.tabTitle, tab.title || 'Untitled');
      safeSetText(elements.tabUrl, tab.url || '-');
    }
  } catch (error) {
    console.error('Error loading current tab:', error);
    safeSetText(elements.tabTitle, 'Error loading tab');
  }
}

/**
 * Check AI model availability
 */
async function checkAIAvailability() {
  try {
    const response = await sendMessage({ type: 'CHECK_AI_AVAILABILITY' });

    if (response.success) {
      const { availability, hasSummarizationAPI } = response;
      updateAIStatus(availability);
      aiAvailable = availability === 'readily';

      // Log if using optimized Summarization API
      if (hasSummarizationAPI) {
        console.log('✅ Using Optimized Summarization API');
      } else {
        console.log('⚠️ Using Fallback Prompt API for Summarization');
      }

      // Enable AI-dependent buttons
      if (aiAvailable) {
        elements.summarizeBtn.disabled = false;
        elements.analyzeBtn.disabled = false;
        elements.customPromptBtn.disabled = false;
        elements.phishingScanBtn.disabled = false;
        elements.sentimentBtn.disabled = false;
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
 * Escape HTML to prevent XSS
 */
function escapeHTML(str) {
  if (typeof str !== 'string') return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Safely set text content
 */
function safeSetText(element, text) {
  if (element) {
    element.textContent = text || '';
  }
}

/**
 * Update AI status display
 */
function updateAIStatus(status) {
  if (!elements.aiStatus || !elements.statusIcon) return;

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
  elements.phishingScanBtn.addEventListener('click', handlePhishingScan);
  elements.sentimentBtn.addEventListener('click', handleSentimentAnalysis);

  // Prompt actions
  elements.sendPromptBtn.addEventListener('click', handleCustomPrompt);
  elements.cancelPromptBtn.addEventListener('click', hideCustomPrompt);

  // Results actions
  elements.clearResultsBtn.addEventListener('click', clearResults);

  // Footer links
  elements.helpLink.addEventListener('click', (e) => {
    e.preventDefault();
    showHelp();
  });

  elements.aboutLink.addEventListener('click', (e) => {
    e.preventDefault();
    showAbout();
  });

  // Advanced metrics close button
  elements.closeMetricsBtn.addEventListener('click', () => {
    elements.advancedMetrics.style.display = 'none';
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
        content: extractedContent.bodyText, // Use bodyText for better summaries
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
Content: ${extractedContent.bodyText.substring(0, 3000)}...`;

    const response = await sendMessage({
      type: 'ANALYZE_TAB_CONTENT',
      data: {
        content: extractedContent.bodyText,
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
    const fullPrompt = `${customPrompt}\n\nContext from current page:\nTitle: ${extractedContent.title}\nContent: ${extractedContent.bodyText.substring(0, 3000)}...`;

    const response = await sendMessage({
      type: 'ANALYZE_TAB_CONTENT',
      data: {
        content: extractedContent.bodyText,
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
 * Show results section with safe HTML
 */
function showResults(title, content) {
  if (!elements.resultsContent || !elements.resultsSection) return;

  // Sanitize title but allow safe content formatting (for now, content is already formatted)
  const safeTitle = escapeHTML(title);

  // Note: content may contain safe HTML like <strong>, <span> which we want to preserve
  // Only escape if it's user-generated content
  elements.resultsContent.innerHTML = `<h3>${safeTitle}</h3><div>${content}</div>`;
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

/**
 * Display advanced metrics
 */
function displayAdvancedMetrics(analysis) {
  // Show metrics section
  elements.advancedMetrics.style.display = 'block';

  // Update VAD Profile
  const sentimentDetails = analysis.details?.sentiment;
  if (sentimentDetails) {
    // Valence (range: -1 to +1, display 0-100%)
    const valence = sentimentDetails.valence ?? 0;
    const valencePercent = ((valence + 1) / 2) * 100;
    elements.valenceFill.style.width = `${Math.max(0, Math.min(100, valencePercent))}%`;
    elements.valenceValue.textContent = valence.toFixed(2);

    // Arousal (0 to 1, display as percentage)
    const arousal = sentimentDetails.arousal ?? 0;
    elements.arousalFill.style.width = `${Math.max(0, Math.min(100, arousal * 100))}%`;
    elements.arousalValue.textContent = arousal.toFixed(2);

    // Dominance (0 to 1, display as percentage)
    const dominance = sentimentDetails.dominance ?? 0;
    elements.dominanceFill.style.width = `${Math.max(0, Math.min(100, dominance * 100))}%`;
    elements.dominanceValue.textContent = dominance.toFixed(2);

    // Emotional state
    elements.emotionalState.textContent = `Emotional State: ${sentimentDetails.emotionalState || 'N/A'}`;
  }

  // Update lexicon scores
  const dominantLexicons = analysis.originalAnalysis?.sentiment?.dominantLexicons;
  if (dominantLexicons && dominantLexicons.length > 0) {
    const lexicons = dominantLexicons;
    const explanations = {
      urgency: 'Uses time pressure',
      authority: 'Claims authority',
      fear: 'Creates fear',
      reward: 'Offers rewards',
      action: 'Demands action',
      credential: 'Requests credentials',
      trust: 'False trust markers'
    };

    elements.lexiconScores.innerHTML = lexicons.map(lex => 
      `<span class="lexicon-tag">${explanations[lex] || lex}</span>`
    ).join('');
  } else {
    elements.lexiconScores.innerHTML = '<span class="lexicon-tag">None detected</span>';
  }

  // Update linguistic anomalies
  const linguisticAnomalies = analysis.originalAnalysis?.sentiment?.linguisticFeatures?.anomalies;
  if (linguisticAnomalies && linguisticAnomalies.length > 0) {
    const anomalies = linguisticAnomalies;
    elements.anomaliesList.innerHTML = anomalies.map(anomaly => 
      `<div class="anomaly-item">${anomaly}</div>`
    ).join('');
  } else {
    elements.anomaliesList.innerHTML = '<div class="anomaly-item">No anomalies found</div>';
  }

  // Update confidence breakdown
  if (analysis.breakdown) {
    const breakdown = analysis.breakdown;
    elements.confidenceScores.innerHTML = `
      <div class="confidence-item">
        <span class="confidence-label">Sentiment</span>
        <div class="confidence-bar"><div class="confidence-fill" style="width: ${breakdown.sentiment}%"></div></div>
        <span class="confidence-value">${breakdown.sentiment}%</span>
      </div>
      <div class="confidence-item">
        <span class="confidence-label">Phishing</span>
        <div class="confidence-bar"><div class="confidence-fill" style="width: ${breakdown.phishing}%"></div></div>
        <span class="confidence-value">${breakdown.phishing}%</span>
      </div>
      <div class="confidence-item">
        <span class="confidence-label">Image</span>
        <div class="confidence-bar"><div class="confidence-fill" style="width: ${breakdown.image}%"></div></div>
        <span class="confidence-value">${breakdown.image}%</span>
      </div>
      <div class="confidence-item">
        <span class="confidence-label">Linguistic</span>
        <div class="confidence-bar"><div class="confidence-fill" style="width: ${breakdown.linguistic}%"></div></div>
        <span class="confidence-value">${breakdown.linguistic}%</span>
      </div>
    `;
  }
}

/**
 * Load threat statistics
 */
async function loadThreatStats() {
  try {
    const response = await sendMessage({ type: 'GET_THREAT_STATS' });
    if (response.success) {
      threatStats = response.stats;
      updateDashboard();
    }
  } catch (error) {
    console.error('Error loading threat stats:', error);
  }
}

/**
 * Update dashboard with current stats
 */
function updateDashboard() {
  if (!elements.threatsCount || !elements.pagesCount || !elements.riskScore || !elements.riskFill) {
    console.warn('Dashboard elements not found');
    return;
  }

  safeSetText(elements.threatsCount, threatStats.today || 0);
  safeSetText(elements.pagesCount, threatStats.total || 0);

  // Update risk level based on recent threats
  const recentHighRisk = (threatStats.recent || []).filter(t =>
    ['HIGH', 'CRITICAL'].includes(t.riskLevel)
  ).length;

  if (recentHighRisk > 0) {
    elements.riskScore.textContent = 'HIGH';
    elements.riskFill.className = 'risk-fill high';
  } else if (threatStats.total > 0) {
    elements.riskScore.textContent = 'MEDIUM';
    elements.riskFill.className = 'risk-fill medium';
  } else {
    elements.riskScore.textContent = 'LOW';
    elements.riskFill.className = 'risk-fill low';
  }
}

/**
 * Detect current platform
 */
async function detectCurrentPlatform() {
  try {
    const response = await sendMessage({
      type: 'GET_PLATFORM_INFO',
      url: currentTab.url
    });
    
    if (response.success) {
      currentPlatform = response.platform;
      console.log('Platform detected:', currentPlatform);
    }
  } catch (error) {
    console.error('Error detecting platform:', error);
  }
}

/**
 * Handle phishing scan
 */
async function handlePhishingScan() {
  if (!extractedContent) {
    showError('Please extract content first');
    return;
  }

  showLoading();

  try {
    // Extract image URLs from content
    const images = extractedContent.images ? 
      extractedContent.images.map(img => img.src || img).filter(Boolean) : 
      [];

    const response = await sendMessage({
      type: 'DETECT_PHISHING',
      data: {
        url: extractedContent.url,
        content: extractedContent.bodyText,
        title: extractedContent.title,
        images: images
      }
    });

    if (response.success) {
      const analysis = response.analysis;

      // Update dashboard
      const finalScore = analysis.finalRiskScore || analysis.riskScore || 0;
      const riskLevel = analysis.riskLevel || 'UNKNOWN';
      elements.riskScore.textContent = riskLevel;
      elements.pagesCount.textContent = (threatStats.total || 0) + 1;
      
      // Update risk fill based on risk level
      const riskClass = riskLevel.toLowerCase();
      elements.riskFill.className = `risk-fill ${riskClass}`;
      
      // Show advanced metrics if available
      if (analysis.details || analysis.breakdown) {
        displayAdvancedMetrics(analysis);
      }
      
      // Show results
      let resultText = `
<strong>Phishing Analysis Result:</strong>

🚨 <strong>Risk Level:</strong> ${riskLevel} (${finalScore}/100)
🎯 <strong>Phishing Detected:</strong> ${
  analysis.isPhishing ? 'YES' : 
  (finalScore > 50 ? 'Probably' : 
  (finalScore > 30 ? 'Possibly' : 'NO'))
}
${analysis.recommendation ? `
📋 <strong>Recommendation:</strong> ${analysis.recommendation.action || analysis.recommendation}
` : ''}
${analysis.dominantFactors && analysis.dominantFactors.length > 0 ? `
🔍 <strong>Dominant Factors:</strong> ${analysis.dominantFactors.join(', ')}
` : ''}
${analysis.redFlags && analysis.redFlags.length > 0 ? `
⚠️ <strong>Red Flags:</strong>
${analysis.redFlags.map(flag => `• ${flag}`).join('\n')}
` : ''}
      `.trim();

      // Add image analysis results if available
      if (analysis.imageAnalysis) {
        resultText += `\n\n🖼️ <strong>Image Analysis:</strong>
• Total Images: ${analysis.imageAnalysis.totalImages}
• Analyzed: ${analysis.imageAnalysis.analyzedImages}
• Malicious: ${analysis.imageAnalysis.maliciousCount}
• Max Risk: ${analysis.imageAnalysis.maxRiskLevel}`;
      }
      
      showResults('Phishing Scan Results', resultText);
      
      // Reload stats
      await loadThreatStats();
    } else {
      showError(response.error || 'Failed to scan for phishing');
    }
  } catch (error) {
    console.error('Error in phishing scan:', error);
    showError('Failed to scan for phishing');
  } finally {
    hideLoading();
  }
}

/**
 * Handle sentiment analysis
 */
async function handleSentimentAnalysis() {
  if (!extractedContent) {
    showError('Please extract content first');
    return;
  }

  showLoading();

  try {
    const response = await sendMessage({
      type: 'ANALYZE_SENTIMENT',
      data: {
        content: extractedContent.bodyText,
        url: extractedContent.url
      }
    });

    if (response.success) {
      const analysis = response.analysis;
      
      let resultText = `
<strong>Sentiment Analysis Result:</strong>

😊 <strong>Sentiment:</strong> ${analysis.sentiment || analysis.sentimentScore ? analysis.sentiment : 'NEUTRAL'} 
⚡ <strong>Urgency Level:</strong> ${analysis.urgencyLevel || 'N/A'}
${analysis.manipulationDetected || analysis.manipulationScore > 0.3 ? 
  '⚠️ <strong>Manipulation Detected:</strong> YES' : 
  '✅ <strong>Manipulation Detected:</strong> NO'}
${analysis.emotionalTriggers && analysis.emotionalTriggers.length > 0 ? `
🎭 <strong>Emotional Triggers:</strong>
${analysis.emotionalTriggers.map(trigger => `• ${trigger}`).join('\n')}
` : ''}
🛡️ <strong>Trustworthiness:</strong> ${analysis.trustworthiness || 'UNKNOWN'}
📊 <strong>Recommendation:</strong> ${analysis.recommendation || 'SAFE'}
      `.trim();

      // Show VAD profile if available
      if (analysis.valence !== undefined || analysis.arousal !== undefined) {
        resultText += `\n\n<strong>Emotional Profile (VAD):</strong>
• <strong>Valence:</strong> ${analysis.valence?.toFixed(2) || 0} (negative to positive)
• <strong>Arousal:</strong> ${analysis.arousal?.toFixed(2) || 0} (calm to urgent)
• <strong>Dominance:</strong> ${analysis.dominance?.toFixed(2) || 0.5} (powerless to empowered)
${analysis.emotionalState ? `• <strong>State:</strong> ${analysis.emotionalState}` : ''}`;
      }
      
      showResults('Sentiment Analysis', resultText);
    } else {
      showError(response.error || 'Failed to analyze sentiment');
    }
  } catch (error) {
    console.error('Error in sentiment analysis:', error);
    showError('Failed to analyze sentiment');
  } finally {
    hideLoading();
  }
}

/**
 * Update dashboard on content extraction
 */
function updateDashboardOnExtract() {
  if (elements.pagesCount) {
    const currentCount = parseInt(elements.pagesCount.textContent) || 0;
    elements.pagesCount.textContent = currentCount + 1;
  }
}

// Initialize popup when DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
