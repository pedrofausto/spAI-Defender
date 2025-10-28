/**
 * spAI-Defender Content Script
 * Injected into web pages to extract and monitor content
 */

import { SecurityBadge } from './security-badge.js';

// State management
let observerActive = false;
let contentObserver = null;
const securityBadge = new SecurityBadge();
let autoAnalysisInProgress = false; // Prevent multiple simultaneous analyses
let imageOverlaysAdded = false; // Track if image overlays are already added

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

  if (window.location.hostname === 'web.whatsapp.com') {
    initializeWhatsAppObserver();
  } else {
    // Auto-analyze page when loaded
    autoAnalyzePage();
    // Start automatic content monitoring
    startAutoMonitoring();
    // Add image analysis overlays
    addImageOverlays();
  }
}

/**
 * Handle messages from background script
 */
function handleMessage(request, sender, sendResponse) {
  switch (request.type) {
    case 'EXTRACT_CONTENT':
      if (window.location.hostname === 'web.whatsapp.com') {
        extractWhatsAppContent(sendResponse);
      } else {
        extractContent(sendResponse);
      }
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
      bodyText: document.body.innerText || '',

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
 * Extracts all content from the current WhatsApp chat for UI display.
 */
function extractWhatsAppContent(sendResponse) {
    try {
        const chatInfo = extractWhatsAppChatInfo();
        const messages = extractFullWhatsAppConversation();
        const conversationText = messages.map(m => `${m.sender}: ${m.text}`).join('\n');

        const content = {
            url: window.location.href,
            title: document.title,
            timestamp: new Date().toISOString(),
            bodyText: conversationText,
            headings: chatInfo.chatName !== 'Unknown Chat' ? [{ level: 1, text: `Chat with ${chatInfo.chatName}` }] : [],
            paragraphs: messages.map(m => m.text),
            links: extractWhatsAppLinks(),
            images: extractImages(),
            stats: {
                wordCount: conversationText.split(/\s+/).filter(Boolean).length,
                paragraphCount: messages.length,
                linkCount: extractWhatsAppLinks().length,
                imageCount: extractImages().length,
            },
            lists: [],
            tables: [],
            meta: extractMetadata(),
            structure: analyzeStructure()
        };
        sendResponse({ success: true, content });
    } catch (error) {
        console.error('Error extracting WhatsApp content:', error);
        sendResponse({ success: false, error: error.message });
    }
}

/**
 * Fallback: Extract links from WhatsApp Web and similar apps
 */
function extractWhatsAppLinks() {
  const links = [];
  
  // Standard link extraction still works
  const standardLinks = document.querySelectorAll('a[href]');
  standardLinks.forEach(link => {
    links.push({
      text: link.textContent.trim(),
      href: link.href,
      title: link.title || null,
      external: link.hostname !== window.location.hostname
    });
  });
  
  // Also try to find links in divs (WhatsApp URLs)
  const divsWithLinks = document.querySelectorAll('div[data-id] a, [role="link"]');
  divsWithLinks.forEach(link => {
    if (link.href && !links.some(l => l.href === link.href)) {
      links.push({
        text: link.textContent.trim() || link.href,
        href: link.href,
        title: link.title || null,
        external: link.hostname !== window.location.hostname
      });
    }
  });
  
  return links;
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

  // Standard elements
  let paragraphCount = document.querySelectorAll('p').length;
  let headingCount = document.querySelectorAll('h1, h2, h3, h4, h5, h6').length;
  let linkCount = document.querySelectorAll('a[href]').length;
  let imageCount = document.querySelectorAll('img').length;
  
  // Fallback for apps like WhatsApp
  if (paragraphCount === 0 && words.length > 0) {
    // Count WhatsApp messages or generic text elements
    const whatsappMessages = document.querySelectorAll('span.selectable-text');
    paragraphCount = whatsappMessages.length;
    
    // Try to find meaningful heading-like elements
    const headerElement = document.querySelector('[data-testid="conversation-info-header"]');
    if (headerElement) {
      headingCount = 1;
    }
    
    // Count all links (including embedded in divs)
    linkCount = document.querySelectorAll('a[href], [role="link"]').length;
  }

  return {
    characterCount: bodyText.length,
    wordCount: words.length,
    paragraphCount: paragraphCount,
    headingCount: headingCount,
    linkCount: linkCount,
    imageCount: imageCount,
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
 * Start automatic content monitoring and re-analyze when content changes
 */
function startAutoMonitoring() {
  let lastContentLength = 0;
  let lastContentHash = '';

  const checkAndAnalyze = () => {
    const bodyText = document.body.innerText || '';
    const currentLength = bodyText.length;
    
    // Create a simple, robust hash of the content to check for changes
    const currentHash = simpleHash(bodyText.substring(0, 2000));

    // Only analyze if content has changed significantly
    if (currentLength !== lastContentLength || currentHash !== lastContentHash) {
      console.log('🔄 Content changed, re-analyzing...');
      lastContentLength = currentLength;
      lastContentHash = currentHash;
      autoAnalyzePage();
    }
  };

  // Use MutationObserver to watch for content changes
  if (!contentObserver) {
    contentObserver = new MutationObserver((mutations) => {
      // Check if new images were added
      let hasNewImages = false;
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === 1) { // Element node
            if (node.tagName === 'IMG' || node.querySelector && node.querySelector('img')) {
              hasNewImages = true;
            }
          }
        });
      });
      
      // Debounce: wait 2 seconds after last change before analyzing
      clearTimeout(window.autoAnalysisTimeout);
      window.autoAnalysisTimeout = setTimeout(checkAndAnalyze, 2000);
      
      // Re-add image overlays ONLY for new images (don't reset the flag)
      if (hasNewImages) {
        setTimeout(() => {
          // Only scan for NEW images, don't reset the flag
          const images = document.querySelectorAll('img[src]:not(.spai-image-container img)');
          if (images.length > 0) {
            console.log(`📸 Found ${images.length} new images, adding overlays...`);
            // Wrap each unwrapped image
            images.forEach(img => {
              if (!img.parentElement.classList.contains('spai-image-container')) {
                // Use the internal wrapImageWithOverlay if available
                addOverlayToImage(img);
              }
            });
          }
        }, 100);
      }
    });

    contentObserver.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });

    console.log('✅ Auto-monitoring started - will analyze when content changes');
  }
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

    // Skip if already analyzing
    if (autoAnalysisInProgress) {
      console.log('⏭️ Auto-analysis already in progress, skipping');
      return;
    }

    autoAnalysisInProgress = true;
    console.log('🔄 Auto-analyzing page for threats...');

    // Extract page content (image analysis disabled for performance)
    const content = {
      url: window.location.href,
      text: document.body.innerText,
      title: document.title,
      images: [] // Disabled for performance
    };

    // Request phishing detection from background
    const response = await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({
        type: 'DETECT_PHISHING',
        data: content
      }, (response) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(response);
        }
      });
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
  } finally {
    // Always release the lock
    autoAnalysisInProgress = false;
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

/**
 * Add image analysis overlays to all images on the page
 */
function addImageOverlays() {
  if (imageOverlaysAdded) return;
  
  // Inject styles for image overlay
  if (!document.getElementById('spai-image-overlay-styles')) {
    const style = document.createElement('style');
    style.id = 'spai-image-overlay-styles';
    style.textContent = `
      .spai-image-container {
        position: relative;
        display: inline-block;
      }
      
      .spai-image-analysis-btn {
        position: absolute;
        top: 5px;
        right: 5px;
        background: #4285f4;
        color: white;
        border: none;
        border-radius: 50%;
        width: 32px;
        height: 32px;
        font-size: 16px;
        cursor: pointer;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        z-index: 1000;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      }
      
      .spai-image-analysis-btn:hover {
        background: #3367d6;
        transform: scale(1.1);
        box-shadow: 0 4px 12px rgba(0,0,0,0.4);
      }
      
      .spai-image-analysis-btn:active {
        transform: scale(0.95);
      }
      
      .spai-image-analysis-btn.analyzing {
        background: #ea4335;
        animation: pulse 1s infinite;
      }
      
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.7; }
      }
      
      .spai-image-tooltip {
        position: absolute;
        background: #202124;
        color: white;
        padding: 8px 12px;
        border-radius: 8px;
        font-size: 12px;
        z-index: 1001;
        max-width: 250px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        pointer-events: none;
        display: none;
      }
      
      .spai-image-tooltip.show {
        display: block;
      }
    `;
    document.head.appendChild(style);
  }

  // Function to wrap image with overlay
  const wrapImageWithOverlay = (img) => {
    // Skip if already wrapped
    if (img.parentElement && img.parentElement.classList.contains('spai-image-container')) {
      return;
    }

    try {
      const container = document.createElement('div');
      container.className = 'spai-image-container';
      
      const btn = document.createElement('button');
      btn.className = 'spai-image-analysis-btn';
      btn.innerHTML = '🔍';
      btn.title = 'Analyze image for phishing';
      btn.setAttribute('aria-label', 'Analyze image');
      
      const tooltip = document.createElement('div');
      tooltip.className = 'spai-image-tooltip';
      
      // Store original image to avoid closure issues
      const imgElement = img;
      
      // Wrap image
      const parent = img.parentNode;
      if (parent) {
        parent.insertBefore(container, img);
        container.appendChild(img);
        container.appendChild(btn);
        container.appendChild(tooltip);

        // Add click handler
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          e.preventDefault();
          
          await analyzeImage(imgElement, btn, tooltip);
        });
      }
    } catch (error) {
      console.warn('Failed to wrap image:', error);
    }
  };

  // Add overlays to all images
  const images = document.querySelectorAll('img[src]');
  let imagesWrapped = 0;
  
  images.forEach(img => {
    // Only wrap meaningful images (relax size restriction for WhatsApp/Telegram)
    if (img.src && img.src !== 'data:image/svg+xml,') {
      // Skip very small images (likely icons, bullets)
      const hasSize = img.naturalWidth > 0 || img.clientWidth > 0;
      const isLargeEnough = (img.naturalWidth > 20 || img.clientWidth > 20) && 
                           (img.naturalHeight > 20 || img.clientHeight > 20);
      
      if (hasSize && isLargeEnough) {
        wrapImageWithOverlay(img);
        imagesWrapped++;
      }
    }
  });

  imageOverlaysAdded = true;
  console.log(`✅ Added image analysis overlays to ${imagesWrapped} of ${images.length} images`);
}

/**
 * Creates a simple, non-cryptographic hash from a string.
 * @param {string} str The string to hash.
 * @returns {string} The calculated hash.
 */
function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash |= 0; // Convert to 32bit integer
    }
    return hash.toString();
}

/**
 * Add overlay to a single image (helper function for dynamic content)
 */
function addOverlayToImage(img) {
  // Skip if already wrapped
  if (img.parentElement && img.parentElement.classList.contains('spai-image-container')) {
    return;
  }
  
  // Only wrap meaningful images (relax size restriction)
  if (!img.src || img.src === 'data:image/svg+xml,') {
    return;
  }
  
  // Skip very small images (likely icons, bullets)
  const hasSize = img.naturalWidth > 0 || img.clientWidth > 0;
  const isLargeEnough = (img.naturalWidth > 20 || img.clientWidth > 20) && 
                       (img.naturalHeight > 20 || img.clientHeight > 20);
  
  if (!hasSize || !isLargeEnough) {
    return;
  }

  try {
    const container = document.createElement('div');
    container.className = 'spai-image-container';
    
    const btn = document.createElement('button');
    btn.className = 'spai-image-analysis-btn';
    btn.innerHTML = '🔍';
    btn.title = 'Analyze image for phishing';
    btn.setAttribute('aria-label', 'Analyze image');
    
    const tooltip = document.createElement('div');
    tooltip.className = 'spai-image-tooltip';
    
    // Store original image to avoid closure issues
    const imgElement = img;
    
    // Wrap image
    const parent = img.parentNode;
    if (parent) {
      parent.insertBefore(container, img);
      container.appendChild(img);
      container.appendChild(btn);
      container.appendChild(tooltip);

      // Add click handler
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        e.preventDefault();
        
        await analyzeImage(imgElement, btn, tooltip);
      });
    }
  } catch (error) {
    console.warn('Failed to add overlay to image:', error);
  }
}

/**
 * Analyze a specific image for phishing
 */
async function analyzeImage(img, btn, tooltip) {
  try {
    // Update button state
    btn.classList.add('analyzing');
    btn.innerHTML = '⏳';
    btn.disabled = true;

    // Show tooltip
    tooltip.textContent = 'Analyzing image...';
    tooltip.classList.add('show');
    tooltip.style.top = '-40px';
    tooltip.style.left = '0';

    // Send to background for analysis
    const response = await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({
        type: 'ANALYZE_IMAGE',
        data: {
          imageUrl: img.src,
          pageContext: window.location.href,
          imageAlt: img.alt || '',
          imageTitle: img.title || ''
        }
      }, (response) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(response);
        }
      });
    });

    if (response && response.success) {
      const riskScore = response.analysis?.riskScore || 0;
      const riskLevel = response.analysis?.riskLevel || 'UNKNOWN';
      
      // Update tooltip with results
      let tooltipText = '';
      if (riskScore > 75) {
        tooltipText = '🚨 HIGH RISK';
        btn.style.background = '#ea4335';
      } else if (riskScore > 50) {
        tooltipText = '⚠️ MEDIUM RISK';
        btn.style.background = '#fbbc04';
      } else {
        tooltipText = '✅ LOW RISK';
        btn.style.background = '#34a853';
      }
      
      tooltip.textContent = `${tooltipText} (${riskScore}/100)`;
      
      // Log analysis
      console.log(`🖼️ Image analysis: ${riskLevel} (${riskScore}/100)`);
      
    } else {
      tooltip.textContent = '❌ Analysis failed';
      btn.style.background = '#ea4335';
    }

  } catch (error) {
    console.error('Error analyzing image:', error);
    tooltip.textContent = '❌ Error';
    btn.style.background = '#ea4335';
  } finally {
    // Reset button
    btn.classList.remove('analyzing');
    btn.innerHTML = '🔍';
    btn.disabled = false;

    // Auto-hide tooltip after 3 seconds
    setTimeout(() => {
      tooltip.classList.remove('show');
    }, 3000);
  }
}

//
// --- WhatsApp Specific Functions ---
//

let whatsappAnalysisTimeout;

/**
 * Initializes an observer to detect when the WhatsApp chat interface is loaded
 * and then starts monitoring the chat for new messages.
 */
function initializeWhatsAppObserver() {
  console.log('spAI-Defender: WhatsApp detected. Initializing automatic chat monitoring.');

  // More robust selector for the main chat panel container
  const chatPanelSelector = '#main';
  let chatPanel = document.querySelector(chatPanelSelector);

  // This function will be called whenever the chat updates
  const onChatUpdate = () => {
      // Debounce analysis to avoid running on every small DOM change
      clearTimeout(whatsappAnalysisTimeout);
      whatsappAnalysisTimeout = setTimeout(analyzeAndHighlightMessages, 1500);
  };

  if (chatPanel) {
    startWhatsAppChatObserver(chatPanel, onChatUpdate);
    return;
  }

  // If the panel is not there yet, wait for it to appear
  const bodyObserver = new MutationObserver((mutations, obs) => {
    chatPanel = document.querySelector(chatPanelSelector);
    if (chatPanel) {
      obs.disconnect();
      startWhatsAppChatObserver(chatPanel, onChatUpdate);
    }
  });

  bodyObserver.observe(document.body, { childList: true, subtree: true });
}

/**
 * Sets up a MutationObserver to monitor a specific WhatsApp chat panel for changes.
 * @param {HTMLElement} messagePanel The chat panel element to observe.
 */
function startWhatsAppChatObserver(chatPanel, callback) {
    console.log('spAI-Defender: WhatsApp chat panel found. Starting observer.');
    injectWhatsAppHighlightStyles();
    
    const observer = new MutationObserver(callback);

    observer.observe(chatPanel, {
        childList: true,
        subtree: true,
    });

    // Run an initial analysis when the chat is first loaded
    callback();
}


/**
 * NEW: Iterates through messages, analyzes them, and applies highlights.
 */
async function analyzeAndHighlightMessages() {
    if (autoAnalysisInProgress) {
        console.log('⏭️ WhatsApp analysis already in progress, skipping.');
        return;
    }
    
    try {
        autoAnalysisInProgress = true;
        console.log('🔄 Analyzing WhatsApp messages for highlighting...');
        
        const messages = extractFullWhatsAppConversation();
        if (messages.length === 0) {
            console.log('⚠️ No messages found to analyze');
            return;
        }
        
        console.log(`📊 Found ${messages.length} messages, analyzing each one...`);

        // Clear previous highlights to handle deleted messages or chat switches
        document.querySelectorAll('.spai-suspicious-overlay').forEach(el => el.remove());

        for (const message of messages) {
            // Only analyze incoming messages that haven't been checked yet
            if (message.direction === 'in' && !message.element.dataset.spaiAnalyzed) {
                
                message.element.dataset.spaiAnalyzed = 'true'; // Mark as checked

                const response = await chrome.runtime.sendMessage({
                    type: 'DETECT_PHISHING',
                    data: { content: message.text }
                });

                if (response?.success && response.analysis) {
                    const riskScore = response.analysis.finalRiskScore || response.analysis.riskScore || 0;
                    if (riskScore > 50) {
                        // Extract suspicious phrases from analysis
                        const suspiciousPhrases = response.analysis.suspiciousPhrases || [];
                        highlightSuspiciousMessage(message.element, riskScore, suspiciousPhrases);
                    }
                }
            }
        }
        console.log(`✅ WhatsApp individual message analysis complete for ${messages.length} messages.`);
    } catch (error) {
        console.error('Error during WhatsApp message highlighting:', error.message);
    } finally {
        autoAnalysisInProgress = false;
    }
}

/**
 * Extracts the full conversation, sends it for analysis, and logs the result.
 */
async function analyzeCurrentWhatsAppChat() {
    if (autoAnalysisInProgress) {
        console.log('⏭️ WhatsApp analysis already in progress, skipping.');
        return;
    }
    
    try {
        autoAnalysisInProgress = true;
        console.log('🔄 Analyzing WhatsApp chat content individually...');
        
        const messages = extractFullWhatsAppConversation();

        if (messages.length === 0) {
            console.log('No messages found to analyze.');
            return;
        }

        // Clear previous highlights
        document.querySelectorAll('.spai-suspicious-overlay').forEach(el => el.remove());

        for (const message of messages) {
            const response = await chrome.runtime.sendMessage({
                type: 'DETECT_PHISHING',
                data: {
                    content: message.text,
                    url: window.location.href,
                    title: `WhatsApp Message from ${message.sender}`
                }
            });

            if (response && response.success && response.analysis) {
                const riskScore = response.analysis.finalRiskScore || response.analysis.riskScore || 0;
                if (riskScore > 50) {
                    // Extract suspicious phrases from analysis
                    const suspiciousPhrases = response.analysis.suspiciousPhrases || [];
                    highlightSuspiciousMessage(message.element, riskScore, suspiciousPhrases);
                }
            }
        }
        console.log(`✅ WhatsApp individual message analysis complete for ${messages.length} messages.`);
        
    } catch (error) {
        console.error('Error during WhatsApp chat analysis:', error.message);
    } finally {
        autoAnalysisInProgress = false;
    }
}

/**
 * Applies a colored overlay to a suspicious message element.
 * @param {HTMLElement} element The message element to highlight.
 * @param {number} riskScore The risk score of the message.
 * @param {Array<string>} suspiciousPhrases Optional array of suspicious phrases to highlight specifically.
 */
function highlightSuspiciousMessage(element, riskScore, suspiciousPhrases = []) {
    if (!element) return;

    let riskLevel = 'medium';
    if (riskScore > 75) {
        riskLevel = 'high';
    }

    // If we have specific suspicious phrases, highlight those specifically
    if (suspiciousPhrases && suspiciousPhrases.length > 0) {
        highlightSpecificPhrases(element, suspiciousPhrases, riskLevel, riskScore);
    } else {
        // Fallback: highlight entire message
        const overlay = document.createElement('div');
        overlay.className = 'spai-suspicious-overlay';
        overlay.classList.add(`spai-risk-${riskLevel}`);
        overlay.title = `spAI-Defender Warning: This message has a risk score of ${riskScore}/100. It may be a phishing attempt or a scam.`;
        
        // Ensure the message container is positioned to contain the overlay
        const messageContainer = element.querySelector('div[role="application"]');
        if (messageContainer) {
            messageContainer.style.position = 'relative';
            messageContainer.appendChild(overlay);
        } else {
            element.style.position = 'relative';
            element.appendChild(overlay);
        }
    }
}

/**
 * Highlights specific suspicious phrases within the message text.
 * @param {HTMLElement} element The message element containing the text.
 * @param {Array<string>} phrases The suspicious phrases to highlight.
 * @param {string} riskLevel The risk level (medium/high).
 * @param {number} riskScore The risk score.
 */
function highlightSpecificPhrases(element, phrases, riskLevel, riskScore) {
    try {
        // Find the text content element
        let textEl = element.querySelector('.selectable-text span');
        if (!textEl) {
            textEl = element.querySelector('span.selectable-text');
        }
        if (!textEl) {
            textEl = element.querySelector('[data-lexical-text="true"]');
        }
        if (!textEl) {
            // Try any span with meaningful text
            const spans = element.querySelectorAll('span');
            for (const span of spans) {
                const text = span.textContent.trim();
                if (text && text.length > 3) {
                    textEl = span;
                    break;
                }
            }
        }
        
        if (!textEl || !textEl.textContent) {
            console.warn('Could not find text element for phrase highlighting');
            return;
        }

        let originalHTML = textEl.innerHTML;
        let modifiedHTML = originalHTML;
        let highlighted = false;

        // Wrap each suspicious phrase with a highlight span
        for (const phrase of phrases) {
            if (!phrase || phrase.trim().length < 3) continue;
            
            // Escape special regex characters
            const escapedPhrase = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            
            // Use a new regex for each phrase to avoid lastIndex issues
            const testRegex = new RegExp(escapedPhrase, 'gi');
            if (testRegex.test(originalHTML)) {
                const replaceRegex = new RegExp(`(${escapedPhrase})`, 'gi');
                modifiedHTML = modifiedHTML.replace(replaceRegex, (match) => {
                    if (!match.includes('spai-suspicious-text')) {
                        highlighted = true;
                        return `<span class="spai-suspicious-text spai-risk-${riskLevel}" style="
                            background: ${riskLevel === 'high' ? 'rgba(234, 67, 53, 0.25)' : 'rgba(255, 235, 59, 0.25)'};
                            border-bottom: 2px solid ${riskLevel === 'high' ? '#ea4335' : '#fbbc04'};
                            border-radius: 2px;
                            padding: 0 2px;
                            font-weight: 500;
                            transition: all 0.2s ease;
                        " title="⚠️ Suspicious content detected (risk: ${riskScore}/100)">${match}</span>`;
                    }
                    return match;
                });
                // Update originalHTML after each replacement to accumulate changes
                originalHTML = modifiedHTML;
            }
        }

        // Only update HTML if we made changes
        if (highlighted && modifiedHTML !== originalHTML) {
            textEl.innerHTML = modifiedHTML;
            console.log(`✅ Highlighted ${phrases.length} suspicious phrase(s) in message`);
        }

    } catch (error) {
        console.error('Error highlighting specific phrases:', error);
        // Fallback to full message highlight
        const overlay = document.createElement('div');
        overlay.className = 'spai-suspicious-overlay';
        overlay.classList.add(`spai-risk-${riskLevel}`);
        overlay.title = `spAI-Defender Warning: Risk score ${riskScore}/100`;
        
        const messageContainer = element.querySelector('div[role="application"]');
        if (messageContainer) {
            messageContainer.style.position = 'relative';
            messageContainer.appendChild(overlay);
        } else {
            element.style.position = 'relative';
            element.appendChild(overlay);
        }
    }
}

/**
 * Extracts all visible messages from the current WhatsApp chat.
 * @returns {Array<Object>} An array of message objects.
 */
function extractFullWhatsAppConversation() {
    console.log('🔍 Starting WhatsApp message extraction...');
    const messages = [];
    
    // Try multiple strategies to find messages
    
    // Strategy 1: div[role="row"] with selectable-text
    let messageElements = document.querySelectorAll('div[role="row"]');
    console.log(`Strategy 1: Found ${messageElements.length} role="row" elements`);
    
    if (messageElements.length === 0) {
        // Strategy 2: Look for selectable-text directly
        messageElements = document.querySelectorAll('[data-id]');
        console.log(`Strategy 2: Found ${messageElements.length} data-id elements`);
    }

    messageElements.forEach((el, index) => {
        try {
            // Try to find text in multiple ways
            let textEl = el.querySelector('.selectable-text span');
            if (!textEl) {
                textEl = el.querySelector('span.selectable-text');
            }
            if (!textEl) {
                textEl = el.querySelector('[data-lexical-text="true"]');
            }
            if (!textEl) {
                // Try any span with meaningful text
                const spans = el.querySelectorAll('span');
                for (const span of spans) {
                    const text = span.textContent.trim();
                    if (text && text.length > 3 && text.length < 500) {
                        textEl = span;
                        break;
                    }
                }
            }
            
            if (!textEl) return;

            const text = textEl.textContent.trim();
            if (!text) return;

            // Determine direction - incoming or outgoing
            let direction = 'unknown';
            if (el.classList.contains('message-in') || el.querySelector('.message-in')) {
                direction = 'in';
            } else if (el.classList.contains('message-out') || el.querySelector('.message-out')) {
                direction = 'out';
            }

            messages.push({
                element: el,
                text,
                sender: direction === 'out' ? 'You' : 'Contact',
                timestamp: '',
                direction
            });
        } catch (e) {
            console.warn(`Could not parse message element ${index}:`, e);
        }
    });

    console.log(`✅ Extracted ${messages.length} messages from WhatsApp`);
    return messages;
}

/**
 * Extracts the name of the current chat partner or group.
 * @returns {Object} An object containing the chat name.
 */
function extractWhatsAppChatInfo() {
    // More robust selector for chat name
    const chatNameEl = document.querySelector('#main header span[dir="auto"][title]');
    return {
        chatName: chatNameEl ? chatNameEl.title : 'Unknown Chat'
    };
}

/**
 * Injects the necessary CSS for highlighting suspicious WhatsApp messages.
 */
function injectWhatsAppHighlightStyles() {
    const styleId = 'spai-whatsapp-highlight-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
        .spai-suspicious-overlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            border-radius: 7.5px; /* Match WhatsApp's message bubble radius */
            pointer-events: none; /* Allows clicking through the overlay */
            transition: background-color 0.3s ease, box-shadow 0.3s ease;
            z-index: 10;
        }
        .spai-suspicious-overlay.spai-risk-medium {
            background-color: rgba(255, 235, 59, 0.15); /* Yellow with low opacity */
            box-shadow: inset 0 0 0 1px rgba(251, 188, 4, 0.4);
        }
        .spai-suspicious-overlay.spai-risk-high {
            background-color: rgba(234, 67, 53, 0.15); /* Red with low opacity */
            box-shadow: inset 0 0 0 1px rgba(234, 67, 53, 0.4);
        }
        .message-in:hover .spai-suspicious-overlay,
        .message-out:hover .spai-suspicious-overlay {
            background-color: rgba(255, 255, 255, 0.1);
            box-shadow: inset 0 0 0 2px var(--wa-bubble-border-color, #ff5722);
        }
        .message-in:hover .spai-suspicious-overlay.spai-risk-medium {
            box-shadow: inset 0 0 0 2px #fbbc04;
        }
        .message-in:hover .spai-suspicious-overlay.spai-risk-high {
            box-shadow: inset 0 0 0 2px #ea4335;
        }
        .spai-suspicious-text {
            cursor: help;
        }
        .spai-suspicious-text:hover {
            opacity: 0.8;
        }
    `;
    document.head.appendChild(style);
}


// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
