/**
 * spAI-Defender Content Script
 * Injected into web pages to extract and monitor content
 */

// State management
let observerActive = false;
let contentObserver = null;

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

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
