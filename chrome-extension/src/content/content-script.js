/**
 * spAI-Defender Content Script
 * Injected into web pages to extract and monitor content
 */

import { SecurityBadge } from './security-badge.js';

// State management
let observerActive = false;
let contentObserver = null;
const securityBadge = new SecurityBadge();

/**
 * Initialize content script
 */
function init() {
  console.log('spAI-Defender content script loaded on:', window.location.href);

  // Listen for messages from background script
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    handleMessage(request, sender, sendResponse);
    return true; // Keep channel open for async response
  });

  // Notify background that content script is ready
  chrome.runtime.sendMessage({
    type: 'CONTENT_SCRIPT_READY',
    url: window.location.href,
    title: document.title
  });

  // Auto-analyze page when loaded
  autoAnalyzePage();
}

/**
 * Handle messages from background script
 */
function handleMessage(request, sender, sendResponse) {
  switch (request.type) {
    case 'EXTRACT_CONTENT':
      extractContent(sendResponse);
      break;

    case 'EXTRACT_SELECTION':
      extractSelection(sendResponse);
      break;

    case 'START_MONITORING':
      startContentMonitoring(sendResponse);
      break;

    case 'STOP_MONITORING':
      stopContentMonitoring(sendResponse);
      break;

    case 'GET_PAGE_INFO':
      getPageInfo(sendResponse);
      break;

    case 'SHOW_SECURITY_BADGE':
      showSecurityBadge(request.data);
      sendResponse({ success: true });
      break;

    case 'HIDE_SECURITY_BADGE':
      securityBadge.remove();
      sendResponse({ success: true });
      break;

    default:
      sendResponse({ error: 'Unknown message type' });
  }
}

/**
 * Extract all content from current page
 */
function extractContent(sendResponse) {
  try {
    const content = {
      // Basic info
      url: window.location.href,
      title: document.title,
      timestamp: new Date().toISOString(),

      // Text content
      bodyText: document.body.innerText,

      // Structured content
      headings: extractHeadings(),
      paragraphs: extractParagraphs(),
      lists: extractLists(),
      links: extractLinks(),
      images: extractImages(),
      tables: extractTables(),

      // Metadata
      meta: extractMetadata(),

      // Structural info
      structure: analyzeStructure(),

      // Statistics
      stats: calculateStats()
    };

    sendResponse({ success: true, content });
  } catch (error) {
    console.error('Error extracting content:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Extract currently selected text
 */
function extractSelection(sendResponse) {
  try {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();

    if (!selectedText) {
      sendResponse({ success: false, error: 'No text selected' });
      return;
    }

    const range = selection.getRangeAt(0);
    const container = range.commonAncestorContainer;

    sendResponse({
      success: true,
      selection: {
        text: selectedText,
        html: range.cloneContents().textContent,
        context: getSelectionContext(container),
        position: getSelectionPosition(range)
      }
    });
  } catch (error) {
    console.error('Error extracting selection:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Extract headings from page
 */
function extractHeadings() {
  const headings = [];
  const headingElements = document.querySelectorAll('h1, h2, h3, h4, h5, h6');

  headingElements.forEach(heading => {
    headings.push({
      level: parseInt(heading.tagName[1]),
      text: heading.textContent.trim(),
      id: heading.id || null
    });
  });

  return headings;
}

/**
 * Extract paragraphs
 */
function extractParagraphs() {
  const paragraphs = [];
  const pElements = document.querySelectorAll('p');

  pElements.forEach(p => {
    const text = p.textContent.trim();
    if (text.length > 0) {
      paragraphs.push(text);
    }
  });

  return paragraphs;
}

/**
 * Extract lists
 */
function extractLists() {
  const lists = [];
  const listElements = document.querySelectorAll('ul, ol');

  listElements.forEach(list => {
    const items = Array.from(list.querySelectorAll('li')).map(li =>
      li.textContent.trim()
    );

    lists.push({
      type: list.tagName.toLowerCase(),
      items
    });
  });

  return lists;
}

/**
 * Extract links
 */
function extractLinks() {
  const links = [];
  const linkElements = document.querySelectorAll('a[href]');

  linkElements.forEach(link => {
    links.push({
      text: link.textContent.trim(),
      href: link.href,
      title: link.title || null,
      external: link.hostname !== window.location.hostname
    });
  });

  return links;
}

/**
 * Extract images
 */
function extractImages() {
  const images = [];
  const imgElements = document.querySelectorAll('img');

  imgElements.forEach(img => {
    images.push({
      src: img.src,
      alt: img.alt || '',
      width: img.naturalWidth,
      height: img.naturalHeight
    });
  });

  return images;
}

/**
 * Extract tables
 */
function extractTables() {
  const tables = [];
  const tableElements = document.querySelectorAll('table');

  tableElements.forEach(table => {
    const rows = [];
    const trElements = table.querySelectorAll('tr');

    trElements.forEach(tr => {
      const cells = Array.from(tr.querySelectorAll('td, th')).map(cell =>
        cell.textContent.trim()
      );
      rows.push(cells);
    });

    tables.push({ rows });
  });

  return tables;
}

/**
 * Extract metadata
 */
function extractMetadata() {
  const meta = {
    description: getMetaContent('description'),
    keywords: getMetaContent('keywords'),
    author: getMetaContent('author'),
    viewport: getMetaContent('viewport'),

    // Open Graph
    ogTitle: getMetaProperty('og:title'),
    ogDescription: getMetaProperty('og:description'),
    ogImage: getMetaProperty('og:image'),
    ogUrl: getMetaProperty('og:url'),

    // Twitter Card
    twitterCard: getMetaContent('twitter:card'),
    twitterTitle: getMetaContent('twitter:title'),
    twitterDescription: getMetaContent('twitter:description'),

    // Language
    lang: document.documentElement.lang || null
  };

  return meta;
}

function getMetaContent(name) {
  const element = document.querySelector(`meta[name="${name}"]`);
  return element ? element.getAttribute('content') : null;
}

function getMetaProperty(property) {
  const element = document.querySelector(`meta[property="${property}"]`);
  return element ? element.getAttribute('content') : null;
}

/**
 * Analyze page structure
 */
function analyzeStructure() {
  return {
    hasHeader: !!document.querySelector('header'),
    hasFooter: !!document.querySelector('footer'),
    hasNav: !!document.querySelector('nav'),
    hasMain: !!document.querySelector('main'),
    hasArticle: !!document.querySelector('article'),
    hasAside: !!document.querySelector('aside'),
    formCount: document.querySelectorAll('form').length,
    iframeCount: document.querySelectorAll('iframe').length
  };
}

/**
 * Calculate content statistics
 */
function calculateStats() {
  const bodyText = document.body.innerText;
  const words = bodyText.trim().split(/\s+/).filter(w => w.length > 0);

  return {
    characterCount: bodyText.length,
    wordCount: words.length,
    paragraphCount: document.querySelectorAll('p').length,
    headingCount: document.querySelectorAll('h1, h2, h3, h4, h5, h6').length,
    linkCount: document.querySelectorAll('a[href]').length,
    imageCount: document.querySelectorAll('img').length,
    readingTime: Math.ceil(words.length / 200) // Average reading speed: 200 words/min
  };
}

/**
 * Get context around selection
 */
function getSelectionContext(container) {
  const parent = container.parentElement || container;
  return {
    tagName: parent.tagName,
    className: parent.className,
    id: parent.id
  };
}

/**
 * Get selection position in document
 */
function getSelectionPosition(range) {
  const rect = range.getBoundingClientRect();
  return {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height
  };
}

/**
 * Get basic page information
 */
function getPageInfo(sendResponse) {
  const info = {
    url: window.location.href,
    title: document.title,
    readyState: document.readyState,
    timestamp: new Date().toISOString()
  };

  sendResponse({ success: true, info });
}

/**
 * Start monitoring page content changes
 */
function startContentMonitoring(sendResponse) {
  if (observerActive) {
    sendResponse({ success: false, error: 'Monitoring already active' });
    return;
  }

  contentObserver = new MutationObserver((mutations) => {
    // Notify background of content changes
    chrome.runtime.sendMessage({
      type: 'CONTENT_CHANGED',
      url: window.location.href,
      mutationCount: mutations.length
    });
  });

  contentObserver.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true
  });

  observerActive = true;
  sendResponse({ success: true, message: 'Content monitoring started' });
}

/**
 * Stop monitoring page content changes
 */
function stopContentMonitoring(sendResponse) {
  if (!observerActive || !contentObserver) {
    sendResponse({ success: false, error: 'Monitoring not active' });
    return;
  }

  contentObserver.disconnect();
  contentObserver = null;
  observerActive = false;

  sendResponse({ success: true, message: 'Content monitoring stopped' });
}

/**
 * Show security badge with risk information
 */
function showSecurityBadge(data) {
  const { riskLevel, riskScore, indicators = [] } = data;
  securityBadge.create(riskLevel, riskScore, indicators);
}

/**
 * Auto-analyze page for phishing threats
 */
async function autoAnalyzePage() {
  try {
    // Skip certain pages
    if (window.location.protocol === 'chrome:' || 
        window.location.protocol === 'chrome-extension:' ||
        window.location.protocol === 'moz-extension:') {
      return;
    }

    console.log('🔄 Auto-analyzing page for threats...');

    // Extract page content
    const content = {
      url: window.location.href,
      text: document.body.innerText,
      title: document.title,
      images: Array.from(document.querySelectorAll('img')).map(img => img.src)
    };

    // Request phishing detection from background
    const response = await new Promise((resolve) => {
      chrome.runtime.sendMessage({
        type: 'DETECT_PHISHING',
        data: content
      }, resolve);
    });

    if (response && response.success && response.analysis) {
      const analysis = response.analysis;
      
      // Use finalRiskScore from hybrid scoring if available, otherwise riskScore
      const riskScore = analysis.finalRiskScore || analysis.riskScore || 0;
      const riskLevel = analysis.riskLevel || 'UNKNOWN';

      // If risk > 50: highlight suspicious text elements
      if (riskScore > 50) {
        highlightSuspiciousElements(analysis);
      }

      // If risk > 75: also show badge
      if (riskScore > 75) {
        securityBadge.create(
          riskLevel,
          riskScore,
          analysis.redFlags || []
        );
        console.log('🚨 HIGH RISK DETECTED - Badge displayed');
      }

      console.log('✅ Auto-analysis complete. Risk:', riskLevel, `(${riskScore}/100)`);
    }

  } catch (error) {
    console.error('Auto-analysis error:', error);
  }
}

/**
 * Highlight suspicious elements on page
 */
function highlightSuspiciousElements(analysis) {
  const suspiciousPatterns = [
    /act now|urgent|immediately|suspended|verify|confirm/i,
    /password|login|account/i,
    /click here|download now|limited time/i,
    /\$\d+|prize|winner|congratulations/i
  ];

  // Find text nodes containing suspicious patterns
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    null,
    false
  );

  const suspiciousElements = [];
  let node;

  while (node = walker.nextNode()) {
    if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
      for (const pattern of suspiciousPatterns) {
        if (pattern.test(node.textContent)) {
          // Check if it's an important element (not already highlighted)
          const parent = node.parentElement;
          if (parent && !parent.classList.contains('spai-highlighted')) {
            suspiciousElements.push({
              element: parent,
              text: node.textContent.substring(0, 100)
            });
            break;
          }
        }
      }
    }
  }

  // Highlight first 10 suspicious elements with subtle style
  suspiciousElements.slice(0, 10).forEach((item, index) => {
    try {
      item.element.classList.add('spai-highlighted');
      item.element.style.cssText += `
        outline: 2px dashed rgba(234, 67, 53, 0.3) !important;
        outline-offset: 2px !important;
        position: relative !important;
      `;

      // Add subtle tooltip on hover
      item.element.title = `⚠️ Potential phishing indicator`;
      item.element.style.cursor = 'help';
    } catch (e) {
      console.warn('Could not highlight element:', e);
    }
  });

  // Inject styles
  if (!document.getElementById('spai-highlight-styles')) {
    const style = document.createElement('style');
    style.id = 'spai-highlight-styles';
    style.textContent = `
      .spai-highlighted {
        transition: outline 0.3s ease !important;
      }
      .spai-highlighted:hover {
        outline-color: rgba(234, 67, 53, 0.5) !important;
      }
    `;
    document.head.appendChild(style);
  }

  if (suspiciousElements.length > 0) {
    console.log(`🔍 Highlighted ${suspiciousElements.length} potentially suspicious elements`);
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
