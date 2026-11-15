import { evaluateLocalMessageRisk, isLocalPrehighlightCandidate, localRulesSeeLowRisk } from './local-prehighlight.js';

(() => {
const SPAI_CONTENT_SCRIPT_RUNTIME_KEY = '__spaiDefenderContentScript';
const SPAI_CONTENT_SCRIPT_VERSION = '2026-07';
const existingSpaiRuntime = window[SPAI_CONTENT_SCRIPT_RUNTIME_KEY];

if (existingSpaiRuntime?.active) {
  const root = document?.documentElement;
  if (root?.dataset) {
    root.dataset.spaiContentScript = 'active';
    root.dataset.spaiContentScriptVersion = SPAI_CONTENT_SCRIPT_VERSION;
  }
  console.debug('spAI-Defender content script already active on this page. Skipping duplicate bootstrap.');
  return;
}

window[SPAI_CONTENT_SCRIPT_RUNTIME_KEY] = {
  active: true,
  version: SPAI_CONTENT_SCRIPT_VERSION,
  bootedAt: Date.now()
};
/**
 * spAI-Defender Content Script
 * Injected into web pages to extract and monitor content
 */
// State management
let autoAnalysisInProgress = false; // Prevent multiple simultaneous analyses
let queuedWhatsAppAnalysisRequest = null;
let extensionContextInvalidated = false;

function isExtensionContextInvalidatedError(error) {
  return /extension context invalidated/i.test(String(error?.message || error || ''));
}

function stopAfterExtensionContextInvalidation() {
  if (extensionContextInvalidated) return;
  extensionContextInvalidated = true;
  autoAnalysisInProgress = false;
  clearTimeout(snapshotPublishTimeout);
  clearTimeout(whatsappAnalysisTimeout);
}

function hasActiveExtensionContext() {
  if (extensionContextInvalidated) return false;
  try {
    return Boolean(chrome?.runtime?.id && chrome.runtime.sendMessage);
  } catch (_) {
    stopAfterExtensionContextInvalidation();
    return false;
  }
}
function markContentScriptState(state = 'active') {
  const root = document?.documentElement;
  if (!root?.dataset) return;
  root.dataset.spaiContentScript = state;
  root.dataset.spaiContentScriptVersion = SPAI_CONTENT_SCRIPT_VERSION;
}


async function sendRuntimeMessage(message) {
  if (!hasActiveExtensionContext()) return null;
  try {
    return await chrome.runtime.sendMessage(message);
  } catch (error) {
    if (isExtensionContextInvalidatedError(error)) {
      stopAfterExtensionContextInvalidation();
      return null;
    }
    throw error;
  }
}

// Track max risk for the currently active WhatsApp chat so "HIGH RISK" isn't overwritten by later medium messages
let activeChatMaxRiskLevel = 'low';

function riskRank(level) {
  const v = String(level || '').toLowerCase();
  if (v === 'high') return 2;
  if (v === 'medium') return 1;
  return 0;
}

function getActiveWhatsAppChatSidebarItem() {
  return document.querySelector('#pane-side [role="listitem"][aria-selected="true"]') ||
         document.querySelector('#pane-side div[role="button"].active') ||
         document.querySelector('#pane-side [data-testid="chat-list-item-selected"]');
}

function clearActiveChatSidebarRisk() {
  const chatItem = getActiveWhatsAppChatSidebarItem();
  if (!chatItem) return;
  chatItem.querySelector('.spai-chat-threat-indicator')?.remove();
  chatItem.querySelector('.spai-chat-risk-badge')?.remove();
  chatItem.style.removeProperty('outline');
  chatItem.style.removeProperty('outline-offset');
  chatItem.style.removeProperty('border-radius');
}

function bumpActiveChatRiskLevel(level) {
  const normalized = String(level || '').toLowerCase();
  if (riskRank(normalized) <= riskRank(activeChatMaxRiskLevel)) return;
  activeChatMaxRiskLevel = normalized;

  const chatItem = getActiveWhatsAppChatSidebarItem();
  if (!chatItem) return;

  addChatThreatIndicator(chatItem, activeChatMaxRiskLevel);
}

/**
 * Initialize content script
 */
function init() {
  console.log('spAI-Defender content script loaded on:', window.location.href);
  console.log('spAI-Defender: Hostname is:', window.location.hostname);
  markContentScriptState('active');

  // Listen for messages from background script
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    handleMessage(request, sender, sendResponse);
    return true; // Keep channel open for async response
  });

  const isWhatsApp = window.location.hostname === 'web.whatsapp.com';
  console.log('spAI-Defender: Is WhatsApp?', isWhatsApp);

  if (isWhatsApp) {
    try {
      console.log('spAI-Defender: Calling initializeWhatsAppObserver...');
      initializeWhatsAppObserver();
    } catch (error) {
      console.error('spAI-Defender: Error in initializeWhatsAppObserver:', error);
    }
  }
  // Telegram Web: no adapter yet. The script stays idle apart from answering pings.
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
        sendResponse({ success: false, error: 'PLATFORM_NOT_READY' });
      }
      break;

    case 'SPAI_PING':
      sendResponse({
        success: true,
        ready: true,
        state: document?.documentElement?.dataset?.spaiContentScript || 'active',
        url: window.location.href
      });
      break;

    case 'FORCE_REANALYZE_VISIBLE_MESSAGES':
      if (window.location.hostname === 'web.whatsapp.com') {
        forceVisibleWhatsAppReanalysis(sendResponse);
      } else {
        sendResponse({ success: false, error: 'Unsupported platform' });
      }
      break;

    default:
      sendResponse({ error: 'Unknown message type' });
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

// Page-level helpers shared by the WhatsApp content and snapshot builders.
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
 * Automatically publish WhatsApp chat snapshot to background for storage
 * @param {string} trigger - What triggered this snapshot ('chat_change', 'new_message', 'manual')
 */
let lastSnapshotPublishTime = 0;
let snapshotPublishTimeout = null;
const SNAPSHOT_PUBLISH_DEBOUNCE = 500; // ms

function publishWhatsAppSnapshot(trigger) {
    if (!hasActiveExtensionContext()) return;
    // Debounce to avoid spamming storage/messages
    clearTimeout(snapshotPublishTimeout);
    const snapshotDebounceMs = trigger === 'manual_reanalyze' ? 0 : (trigger === 'viewport_change' ? 160 : SNAPSHOT_PUBLISH_DEBOUNCE);
    snapshotPublishTimeout = setTimeout(() => {
        try {
            const now = Date.now();
            // Throttle repeated message snapshots, but always accept viewport/chat changes.
            if (trigger === 'new_message' && now - lastSnapshotPublishTime < SNAPSHOT_PUBLISH_DEBOUNCE) {
                console.log(`⏱️ Snapshot publish throttled (trigger: ${trigger})`);
                return;
            }
            lastSnapshotPublishTime = now;

            console.log(`📸 Publishing WhatsApp snapshot (trigger: ${trigger})...`);

            const chatInfo = extractWhatsAppChatInfo();
            const messages = extractFullWhatsAppConversation();
            const conversationText = messages.map(m => `${m.sender}: ${m.text}`).join('\n');
            const analysisSummary = buildVisibleChatRiskSummary(messages);

            const content = {
                url: window.location.href,
                title: document.title,
                timestamp: new Date().toISOString(),
                bodyText: conversationText,
                headings: chatInfo.chatName !== 'Unknown Chat'
                    ? [{ level: 1, text: `Chat with ${chatInfo.chatName}` }]
                    : [],
                paragraphs: messages.map(m => m.text),
                links: extractWhatsAppLinks(),
                images: extractImages(),
                stats: {
                    wordCount: conversationText.split(/\s+/).filter(Boolean).length,
                    paragraphCount: messages.length,
                    linkCount: extractWhatsAppLinks().length,
                    imageCount: extractImages().length
                },
                lists: [],
                tables: [],
                meta: extractMetadata(),
                structure: analyzeStructure()
            };

            // Send to background for storage
            sendRuntimeMessage({
                type: 'WHATSAPP_CHAT_SNAPSHOT',
                data: {
                    trigger,
                    chatId: typeof currentChatId !== 'undefined' ? currentChatId : null,
                    chatName: chatInfo.chatName,
                    analysisSummary,
                    content
                }
            }).then((response) => {
                if (response === null) return;
                console.log(`✅ Snapshot published successfully (${messages.length} messages)`);
            }).catch(err => {
                console.warn('⚠️ Failed to publish snapshot:', err.message);
            });
        } catch (error) {
            console.error('❌ Error in publishWhatsAppSnapshot:', error.message);
        }
    }, snapshotDebounceMs);
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


//
// --- WhatsApp Specific Functions ---
//

let whatsappAnalysisTimeout;
let lastAnalysisTime = 0;
let currentChatId = null;
let chatCooldowns = new Map(); // Per-chat cooldown tracking
const ANALYSIS_COOLDOWN = 2000; // Reduced to 2 seconds per chat for faster response
const DEBOUNCE_DELAY = 500; // Reduced to 500ms for instant-feeling feedback
const GLOBAL_COOLDOWN = 500; // Minimum gap between any analyses
const MESSAGE_ANALYSIS_TIMEOUT = 185000; // Covers offscreen prompt queueing plus native execution timeout
const MAX_MESSAGES_PER_ANALYSIS_CYCLE = 3; // Bound work to the newest visible messages
const ANALYSIS_LOCK_TIMEOUT = (MESSAGE_ANALYSIS_TIMEOUT * MAX_MESSAGES_PER_ANALYSIS_CYCLE) + 15000;

// Persist message risk across WhatsApp re-renders (WhatsApp often replaces nodes on selection changes)
// Keyed by BOTH data-id AND text hash so we can find cached risk even when WhatsApp swaps DOM nodes.
const messageRiskCache = new Map(); // key (data-id OR textHash) -> { riskScore, riskLevel, status, classification, isMalicious, highlightSeverity }

// Guards to avoid self-triggering loops (our own DOM updates can trip observers)
let spaiReapplyInProgress = false;
let spaiLastReapplyAt = 0;
const SPAI_REAPPLY_MIN_INTERVAL_MS = 300;

/**
 * Simple fast hash function for message text.
 * Returns a stable string key that survives DOM recycling.
 */
function getMessageTextHash(text) {
  if (!text || typeof text !== 'string') return null;
  // Hash the complete normalized text so long messages cannot collide by prefix.
  const sample = text.trim();
  if (sample.length < 3) return null;
  // Simple DJB2-ish hash
  let hash = 5381;
  for (let i = 0; i < sample.length; i++) {
    hash = ((hash << 5) + hash) ^ sample.charCodeAt(i);
  }
  return 'txthash_' + (hash >>> 0).toString(36);
}

function getMessageIdFromElement(el) {
  if (!el) return null;
  const direct = el.getAttribute?.('data-id');
  if (direct) return direct;
  const nested = el.querySelector?.('[data-id]')?.getAttribute?.('data-id');
  return nested || null;
}
function inferWhatsAppDirection(element, bubbleElement, viewportElement = null) {
  const directIncoming =
    element?.hasAttribute?.('data-incoming') ||
    bubbleElement?.hasAttribute?.('data-incoming') ||
    element?.querySelector?.('[data-incoming]') ||
    bubbleElement?.querySelector?.('[data-incoming]');
  if (directIncoming) return 'in';

  const directOutgoing =
    element?.hasAttribute?.('data-outgoing') ||
    bubbleElement?.hasAttribute?.('data-outgoing') ||
    element?.querySelector?.('[data-outgoing]') ||
    bubbleElement?.querySelector?.('[data-outgoing]');
  if (directOutgoing) return 'out';

  const semanticIncoming = element?.querySelector?.('.message-in') || bubbleElement?.querySelector?.('.message-in');
  if (semanticIncoming || element?.classList?.contains('message-in') || bubbleElement?.classList?.contains('message-in')) {
    return 'in';
  }

  const semanticOutgoing = element?.querySelector?.('.message-out') || bubbleElement?.querySelector?.('.message-out');
  if (semanticOutgoing || element?.classList?.contains('message-out') || bubbleElement?.classList?.contains('message-out')) {
    return 'out';
  }

  const alignmentTarget = bubbleElement?.parentElement || element?.parentElement || bubbleElement || element;
  if (alignmentTarget) {
    const style = window.getComputedStyle(alignmentTarget);
    if (style.alignItems === 'flex-end' || style.alignSelf === 'flex-end' || style.justifyContent === 'flex-end') {
      return 'out';
    }
    if (style.alignItems === 'flex-start' || style.alignSelf === 'flex-start' || style.justifyContent === 'flex-start') {
      return 'in';
    }
  }

  const bubbleRect = bubbleElement?.getBoundingClientRect?.() || element?.getBoundingClientRect?.();
  const viewportRect = viewportElement?.getBoundingClientRect?.();
  if (bubbleRect) {
    const midpoint = viewportRect
      ? ((viewportRect.left + viewportRect.right) / 2)
      : (window.innerWidth / 2);
    const center = (bubbleRect.left + bubbleRect.right) / 2;
    return center >= midpoint ? 'out' : 'in';
  }

  return 'unknown';
}


function isElementVisibleInChatViewport(element, viewportElement = null) {
  if (!element || typeof element.getBoundingClientRect !== 'function') return false;

  const rect = element.getBoundingClientRect();
  const hasLayout = rect.width > 0 || rect.height > 0 || rect.top !== 0 || rect.bottom !== 0;
  if (!hasLayout) return true;

  const viewportRect = viewportElement && typeof viewportElement.getBoundingClientRect === 'function'
    ? viewportElement.getBoundingClientRect()
    : null;
  const hasViewportLayout = viewportRect &&
    (viewportRect.width > 0 || viewportRect.height > 0 || viewportRect.top !== 0 || viewportRect.bottom !== 0);

  const top = hasViewportLayout ? viewportRect.top : 0;
  const bottom = hasViewportLayout ? viewportRect.bottom : window.innerHeight;
  const left = hasViewportLayout ? viewportRect.left : 0;
  const right = hasViewportLayout ? viewportRect.right : window.innerWidth;

  return rect.bottom > top && rect.top < bottom && rect.right > left && rect.left < right;
}

/**
 * Store risk data in cache under BOTH data-id and text hash keys (if available).
 */
function cacheMessageRisk(messageId, textHash, riskData) {
  if (messageId) {
    messageRiskCache.set(messageId, riskData);
  }
  if (textHash) {
    messageRiskCache.set(textHash, riskData);
  }
}


// Set to true only for local debugging. Logs that include WhatsApp message text are gated behind it.
const DEBUG = false;

function debugLog(...args) {
  if (DEBUG) console.log(...args);
}

function applyLocalPendingHighlight(message, localRisk) {
  if (!message?.element) return;
  if (!localRisk?.severity) return;
  requestAnimationFrame(() => {
    // Local heuristics are advisory only. Keep the pending highlight amber until a validated result upgrades it.
    highlightSuspiciousMessage(message.element, localRisk.score, [], message.textElement, 'medium');
    if (message.element.dataset) {
      message.element.dataset.spaiPendingLocal = 'true';
      message.element.dataset.spaiPendingLocalScore = String(localRisk.score);
      message.element.dataset.spaiPendingLocalSeverity = localRisk.severity;
    }
  });
}

/**
 * An AI result that is not a validated threat must not remove a local rule-based pre-highlight.
 * The highlight is cleared only when local rules agree the message is low risk.
 */
function clearMessageHighlightIfLocalRulesAgree(message) {
  if (!message?.element) return;
  if (!localRulesSeeLowRisk(message.text)) return;
  removeMessageHighlight(message.element);
}

function clearLocalPendingHighlightState(element) {
  if (!element?.dataset) return;
  delete element.dataset.spaiPendingLocal;
  delete element.dataset.spaiPendingLocalScore;
  delete element.dataset.spaiPendingLocalSeverity;
}

function prehighlightVisibleMessagesWithLocalHeuristics() {
  if (window.location.hostname !== 'web.whatsapp.com') return 0;

  let highlighted = 0;
  try {
    const messages = extractFullWhatsAppConversation();
    messages.forEach((message) => {
      if (!message?.element?.dataset) return;
      if (message.element.dataset.spaiAnalyzed === 'true') return;
      if (message.element.dataset.spaiPendingLocal === 'true') return;
      if (message.element.dataset.spaiHighlightSeverity === 'high') return;
      if (!isLocalPrehighlightCandidate(message)) return;

      const localRisk = evaluateLocalMessageRisk(message.text);
      if (!localRisk.severity) return;
      applyLocalPendingHighlight(message, localRisk);
      highlighted += 1;
    });
  } catch (error) {
    console.warn('Local heuristic pre-highlight failed:', error?.message || error);
  }

  if (highlighted > 0) {
    console.log(`⚡ Pre-highlighted ${highlighted} visible message(s) using local heuristics.`);
  }
  return highlighted;
}

function getMessageHighlightSeverity(analysis = {}, riskScore = null) {
  const status = String(analysis.status || '').toUpperCase();
  const classification = String(analysis.classification || '').toUpperCase();
  const riskLevel = String(analysis.riskLevel || '').toUpperCase();
  const normalizedScore = Number.isFinite(Number(riskScore))
    ? Number(riskScore)
    : Number(analysis.finalRiskScore ?? analysis.riskScore ?? 0);

  if (
    status === 'VALID' &&
    ['PHISHING', 'SCAM', 'SOCIAL_ENGINEERING'].includes(classification) &&
    ['HIGH', 'CRITICAL'].includes(riskLevel)
  ) {
    return 'high';
  }

  const mediumClassification = classification === 'SUSPICIOUS';
  const mediumRiskLevel = ['MEDIUM', 'MEDIUM_HIGH'].includes(riskLevel);
  const mediumScore = normalizedScore >= 45 && normalizedScore < 75;
  const riskyButUnvalidated = status !== 'VALID' && normalizedScore >= 60 && classification !== 'SAFE';

  if (mediumClassification || mediumRiskLevel || mediumScore || riskyButUnvalidated) {
    return 'medium';
  }

  return null;
}

function isElementHighlighted(el) {
  if (!el) return false;
  return el.dataset?.spaiHighlightSeverity === 'high' ||
    el.dataset?.spaiHighlightSeverity === 'medium' ||
    el.classList?.contains('spai-malicious-message') ||
    el.classList?.contains('spai-suspicious-message') ||
    Boolean(el.querySelector?.('.spai-malicious-message, .spai-suspicious-message'));
}

function getCachedRiskForMessage(message) {
  // Try messageId (data-id) first
  const id = message?.messageId;
  if (id && messageRiskCache.has(id)) return messageRiskCache.get(id);

  // Try textHash fallback (survives WhatsApp DOM recycling)
  const textHash = message?.textHash;
  if (textHash && messageRiskCache.has(textHash)) return messageRiskCache.get(textHash);

  // Fallback: look for persisted dataset values on the element itself
  const el = message?.element;
  const riskScore = Number(el?.dataset?.spaiRiskScore || 0);
  const riskLevel = String(el?.dataset?.spaiRiskLevel || '').toLowerCase() || null;
  const isMalicious = el?.dataset?.spaiMalicious === 'true';
  const highlightSeverity = el?.dataset?.spaiHighlightSeverity || null;
  if (riskScore > 0) {
    return {
      riskScore,
      riskLevel: riskLevel || (riskScore > 75 ? 'high' : 'medium'),
      isMalicious,
      highlightSeverity
    };
  }
  return null;
}

function reapplyCachedHighlights(messages) {
  const now = Date.now();
  if (spaiReapplyInProgress) return 0;
  if (now - spaiLastReapplyAt < SPAI_REAPPLY_MIN_INTERVAL_MS) return 0;
  spaiLastReapplyAt = now;
  spaiReapplyInProgress = true;

  let reapplied = 0;
  try {
    messages.forEach((m) => {
      const cached = getCachedRiskForMessage(m);
      if (!cached?.highlightSeverity) {
        clearMessageHighlightIfLocalRulesAgree(m);
        return;
      }

      // If the bubble got re-rendered, our highlight styles/classes disappear. Reapply.
      if (!isElementHighlighted(m.element)) {
        try {
          highlightSuspiciousMessage(m.element, cached.riskScore, [], m.textElement, cached.highlightSeverity);
          reapplied++;
        } catch (_) {}
      }
    });
    if (reapplied > 0) {
      console.log(`♻️ Reapplied ${reapplied} cached message highlight(s) after DOM change/selection.`);
    }
    return reapplied;
  } finally {
    spaiReapplyInProgress = false;
  }
}

/**
 * Initializes an observer to detect when the WhatsApp chat interface is loaded
 * and then starts monitoring the chat for new messages.
 * OPTIMIZED: Includes active event listeners for instant message detection
 */
function initializeWhatsAppObserver() {
  console.log('spAI-Defender: WhatsApp detected. Initializing automatic chat monitoring.');

  // More robust selector for the main chat panel container
  const chatPanelSelector = '#main';
  let chatPanel = document.querySelector(chatPanelSelector);

  // Throttled chat change handler
  const handleChatChange = () => {
    const activeChat = document.querySelector('#main header');
    if (!activeChat) return;

    // Get chat identifier
    const chatTitle = activeChat.querySelector('span[dir="auto"]')?.textContent;
    const newChatId = chatTitle || Math.random().toString();

    // Only trigger if chat actually changed
    if (newChatId === currentChatId) return;

    console.log('🎯 Chat changed to:', chatTitle || 'Unknown');
    currentChatId = newChatId;

    // Reset per-chat sidebar risk state (so previous chat's HIGH doesn't leak into new chat)
    activeChatMaxRiskLevel = 'low';
    clearActiveChatSidebarRisk();
    clearWhatsAppMessageHighlights();

    // AUTO-EXTRACT: Pre-highlight visible risky messages and publish snapshot on chat change
    prehighlightVisibleMessagesWithLocalHeuristics();
    publishWhatsAppSnapshot('chat_change');

    // Check per-chat cooldown
    const now = Date.now();
    const lastChatAnalysis = chatCooldowns.get(newChatId) || 0;
    if (now - lastChatAnalysis < GLOBAL_COOLDOWN) {
      return;
    }

    // Schedule analysis with reduced delay
    scheduleAnalysis();
  };

  // Debounced scheduler with per-chat cooldown for message bursts only.
  const scheduleAnalysis = (reason = 'new_message') => {
    if (!hasActiveExtensionContext()) return;
    clearTimeout(whatsappAnalysisTimeout);
    const isViewportRefresh = reason === 'viewport_change' || reason === 'manual_reanalyze' || reason === 'chat_change';
    whatsappAnalysisTimeout = setTimeout(() => {
      const now = Date.now();
      const lastChatAnalysis = chatCooldowns.get(currentChatId) || 0;

      if (!isViewportRefresh && now - lastChatAnalysis < ANALYSIS_COOLDOWN) {
        console.log('⏱️ Analysis on cooldown for this chat, skipping...');
        return;
      }

      chatCooldowns.set(currentChatId, now);
      runOrQueueVisibleWhatsAppAnalysis({ forceAllVisible: reason === 'manual_reanalyze', reason });
    }, isViewportRefresh ? 120 : DEBOUNCE_DELAY);
  };

  // Listen for chat selection with throttling
  let chatChangeTimeout;
  const throttledChatObserver = new MutationObserver(() => {
    clearTimeout(chatChangeTimeout);
    chatChangeTimeout = setTimeout(handleChatChange, 100); // Faster throttle for responsiveness
  });

  // Observe the side panel for chat selection
  const sidePanelSelector = '#pane-side';
  const sidePanel = document.querySelector(sidePanelSelector);
  if (sidePanel) {
    throttledChatObserver.observe(sidePanel, {
      childList: true,
      subtree: false
    });

    // ADD CLICK LISTENERS to sidebar chat items (INSTANT TRIGGER)
    setupChatSidebarClickListeners(sidePanelSelector, handleChatChange);
  }

  // Lightweight observer for new messages only
  const onChatUpdate = (trigger = 'new_message') => {
    prehighlightVisibleMessagesWithLocalHeuristics();
    publishWhatsAppSnapshot(trigger);
    scheduleAnalysis(trigger);
  };

  if (chatPanel) {
    const messageContainer = chatPanel.querySelector('[role="application"] [role="log"]') ||
      chatPanel.querySelector('[role="main"]') ||
      chatPanel;

    startWhatsAppChatObserver(chatPanel, () => onChatUpdate('new_message'));
    // Setup real-time message detection
    setupRealtimeMessageDetection(chatPanel);
    setupViewportReanalysis(messageContainer, () => onChatUpdate('viewport_change'));

    // Reapply cached highlights after user interactions (WhatsApp re-renders message nodes on click/selection)
    // Throttled by reapplyCachedHighlights() guards.
    chatPanel.addEventListener('click', () => {
      setTimeout(() => {
        try {
          const msgs = extractFullWhatsAppConversation();
          reapplyCachedHighlights(msgs);
        } catch (_) {}
      }, 250);
    }, true);
    return;
  }

  // If the panel is not there yet, wait for it to appear
  const bodyObserver = new MutationObserver((mutations, obs) => {
    chatPanel = document.querySelector(chatPanelSelector);
    if (chatPanel) {
      obs.disconnect();
      const messageContainer = chatPanel.querySelector('[role="application"] [role="log"]') ||
        chatPanel.querySelector('[role="main"]') ||
        chatPanel;
      startWhatsAppChatObserver(chatPanel, () => onChatUpdate('new_message'));
      // Setup real-time message detection
      setupRealtimeMessageDetection(chatPanel);
      setupViewportReanalysis(messageContainer, () => onChatUpdate('viewport_change'));

      // ALSO add click listener for reapply (same as above, but for late-appearing panel)
      chatPanel.addEventListener('click', () => {
        setTimeout(() => {
          try {
            const msgs = extractFullWhatsAppConversation();
            reapplyCachedHighlights(msgs);
          } catch (_) {}
        }, 250);
      }, true);
    }
  });

  bodyObserver.observe(document.body, { childList: true, subtree: true });
}

/**
 * Setup click listeners on chat sidebar items for instant message analysis
 * @param {string} sidePanelSelector - CSS selector for the sidebar
 * @param {Function} callback - Function to call when chat is clicked
 */
function setupChatSidebarClickListeners(sidePanelSelector, callback) {
  const sidePanel = document.querySelector(sidePanelSelector);
  if (!sidePanel) return;

  sidePanel.addEventListener('click', (event) => {
    // Find the closest chat item
    const chatItem = event.target.closest('[role="listitem"], [data-testid="chat-list-item"], div[role="button"]');
    if (chatItem) {
      console.log('👆 Chat item clicked - triggering immediate analysis');
      // Small delay to allow WhatsApp to switch to the chat
      setTimeout(() => callback('chat_change'), 100);
    }
  }, true); // Use capture phase for better event handling

  console.log('✅ Chat sidebar click listeners installed');
}

/**
 * Setup real-time detection of new messages as they arrive
 * @param {HTMLElement} chatPanel - The main chat panel element
 */
function collectViewportReanalysisTargets(messageContainer) {
  const targets = new Set();
  const addTarget = (target) => {
    if (target && typeof target.addEventListener === 'function') {
      targets.add(target);
    }
  };

  addTarget(messageContainer);
  addTarget(document.querySelector('#main'));

  let current = messageContainer;
  while (current && current !== document.body) {
    try {
      const style = window.getComputedStyle(current);
      const isScrollable = current.scrollHeight > current.clientHeight || /(auto|scroll)/i.test(style.overflowY || '');
      if (isScrollable) addTarget(current);
    } catch (_) {}
    current = current.parentElement;
  }

  addTarget(document);
  addTarget(window);
  return Array.from(targets);
}

function setupViewportReanalysis(messageContainer, onChatUpdate) {
  if (!messageContainer) return;

  let viewportChangeTimeout = null;
  const handleViewportChange = () => {
    clearTimeout(viewportChangeTimeout);
    viewportChangeTimeout = setTimeout(() => {
      if (!hasActiveExtensionContext()) return;
      console.log('👁️ WhatsApp viewport changed - refreshing visible analysis');
      onChatUpdate();
    }, 180);
  };

  collectViewportReanalysisTargets(messageContainer).forEach(target => {
    const useCapture = target === document;
    target.addEventListener('scroll', handleViewportChange, { passive: true, capture: useCapture });
    target.addEventListener('wheel', handleViewportChange, { passive: true, capture: useCapture });
    target.addEventListener('touchmove', handleViewportChange, { passive: true, capture: useCapture });
  });
  window.addEventListener('resize', handleViewportChange, { passive: true });
}

function buildVisibleChatRiskSummary(messages = []) {
  let high = 0;
  let medium = 0;
  let maxRiskScore = 0;
  let maxSeverity = 'low';

  messages.forEach((message) => {
    const cached = getCachedRiskForMessage(message);
    const severity = cached?.highlightSeverity;
    const riskScore = Number(cached?.riskScore || message?.element?.dataset?.spaiRiskScore || 0);
    if (riskScore > maxRiskScore) {
      maxRiskScore = riskScore;
    }
    if (severity === 'high') {
      high += 1;
      maxSeverity = 'high';
    } else if (severity === 'medium') {
      medium += 1;
      if (maxSeverity !== 'high') maxSeverity = 'medium';
    }
  });

  return {
    visibleMessages: messages.length,
    highlightedHigh: high,
    highlightedMedium: medium,
    maxRiskScore,
    maxSeverity
  };
}

function setupRealtimeMessageDetection(chatPanel) {
  let lastDetectedMessageCount = 0;
  let reapplyDebounce = null;

  // Observer specifically for detecting new message elements AND DOM replacements
  const messageDetectionObserver = new MutationObserver((mutations) => {
    // Avoid loops caused by our own highlight DOM/style updates
    if (spaiReapplyInProgress) return;

    let needsReapply = false;

    mutations.forEach(mutation => {
      // Check for ADDED nodes (new messages)
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === 1) { // Element node
          // Ignore our own injected nodes (badges/styles) to prevent loops
          if (node.classList?.contains('spai-risk-badge') ||
              node.classList?.contains('spai-suspicious-overlay') ||
              node.classList?.contains('spai-chat-threat-indicator') ||
              node.classList?.contains('spai-chat-risk-badge') ||
              node.id === 'spai-whatsapp-highlight-styles') {
            return;
          }

          // Check if this is a message element
          const messageElement = node.closest('div[data-id]') ||
                                node.querySelector('div[data-id]');
          if (messageElement) {
            console.log('📨 New message detected - queuing analysis');
            // Schedule quick analysis for just new messages
            scheduleQuickMessageAnalysis(messageElement);
            // Only reapply when a real message node was added (avoid reapply on unrelated additions)
            needsReapply = true;
          }
        }
      });

      // Check for REMOVED nodes (WhatsApp recycling DOM)
      mutation.removedNodes.forEach(node => {
        if (node.nodeType === 1) {
          // Ignore our own removed nodes (if any)
          if (node.classList?.contains('spai-risk-badge') ||
              node.classList?.contains('spai-suspicious-overlay')) {
            return;
          }
          // If any element was removed, WhatsApp may have recycled/replaced nodes
          needsReapply = true;
        }
      });
    });

    // Debounced reapply of cached highlights after DOM changes
    if (needsReapply) {
      clearTimeout(reapplyDebounce);
      reapplyDebounce = setTimeout(() => {
        try {
          const msgs = extractFullWhatsAppConversation();
          reapplyCachedHighlights(msgs);
        } catch (e) {
          console.warn('Reapply after DOM change failed:', e.message);
        }
      }, 100);
    }
  });

  // Observer configuration: watch for new child elements in message container
  const messageContainer = chatPanel.querySelector('[role="application"] [role="log"]') ||
                          chatPanel.querySelector('[role="main"]');

  if (messageContainer) {
    messageDetectionObserver.observe(messageContainer, {
      childList: true,  // Watch for new message elements AND removals
      subtree: true,
      characterData: false
    });
    console.log('✅ Real-time message detection enabled (with DOM replacement handling)');
  }
}

/**
 * Schedule analysis of a specific new message with minimal delay
 * @param {HTMLElement} messageElement - The message element to analyze
 */
function scheduleQuickMessageAnalysis() {
  // Use requestAnimationFrame for faster response
  requestAnimationFrame(() => {
    setTimeout(() => {
      analyzeAndHighlightMessages();
    }, 200); // Very minimal delay
  });
}

/**
 * Add a threat indicator badge to a chat sidebar item
 * @param {HTMLElement} chatItem - The chat list item element
 * @param {string} riskLevel - Risk level (high/medium/low)
 */
function addChatThreatIndicator(chatItem, riskLevel) {
  // Remove existing indicator
  const existing = chatItem.querySelector('.spai-chat-threat-indicator');
  if (existing) {
    existing.remove();
  }

  // Remove existing risk badge (we may re-add for HIGH risk)
  const existingBadge = chatItem.querySelector('.spai-chat-risk-badge');
  if (existingBadge) {
    existingBadge.remove();
  }

  // Don't add indicator for low risk
  if (riskLevel === 'low' || riskLevel === 'LOW') {
    return;
  }

  const indicator = document.createElement('div');
  indicator.className = `spai-chat-threat-indicator spai-${riskLevel.toLowerCase()}`;
  indicator.title = `spAI-Defender: ${riskLevel.toUpperCase()} RISK - Suspicious content detected`;

  // Make position relative if needed
  if (getComputedStyle(chatItem).position === 'static') {
    chatItem.style.position = 'relative';
  }

  chatItem.appendChild(indicator);
  console.log(`🚨 Threat indicator added to chat (${riskLevel})`);

  // ALSO add a "HIGH RISK" bubble badge in the left pane (as requested)
  const normalized = String(riskLevel).toLowerCase();
  if (normalized === 'high') {
    const badge = document.createElement('div');
    badge.className = `spai-chat-risk-badge spai-risk-high`;
    badge.textContent = 'HIGH RISK';
    chatItem.appendChild(badge);
  }
}

function removeChatRiskBadge(chatItem) {
  const badge = chatItem?.querySelector?.('.spai-chat-risk-badge');
  if (badge) badge.remove();
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
 * OPTIMIZED: Only analyzes new/unanalyzed messages, uses batching
 */
function queueVisibleWhatsAppAnalysis(options = {}) {
    queuedWhatsAppAnalysisRequest = {
        reason: options.reason || queuedWhatsAppAnalysisRequest?.reason || 'viewport_change',
        forceAllVisible: Boolean(options.forceAllVisible || queuedWhatsAppAnalysisRequest?.forceAllVisible)
    };
}

function runOrQueueVisibleWhatsAppAnalysis(options = {}) {
    if (autoAnalysisInProgress) {
        queueVisibleWhatsAppAnalysis(options);
        console.log(`⏳ Queued WhatsApp analysis refresh (${options.reason || 'viewport_change'}) while another pass is running.`);
        return false;
    }

    void analyzeAndHighlightMessages(options);
    return true;
}

function markVisibleMessagesForReanalysis(messages = []) {
    messages.forEach(message => {
        const dataset = message?.element?.dataset;
        if (!dataset) return;
        delete dataset.spaiAnalyzed;
        clearLocalPendingHighlightState(message.element);
    });
}

async function forceVisibleWhatsAppReanalysis(sendResponse) {
    try {
        const messages = extractFullWhatsAppConversation();
        markVisibleMessagesForReanalysis(messages);
        prehighlightVisibleMessagesWithLocalHeuristics();
        publishWhatsAppSnapshot('manual_reanalyze');
        const started = runOrQueueVisibleWhatsAppAnalysis({ forceAllVisible: true, reason: 'manual_reanalyze' });
        sendResponse({ success: true, queued: !started, visibleMessages: messages.length });
    } catch (error) {
        sendResponse({ success: false, error: error?.message || String(error) });
    }
}

async function analyzeAndHighlightMessages(options = {}) {
    const { forceAllVisible = false, reason = 'new_message' } = options;
    if (!hasActiveExtensionContext()) return;
    if (autoAnalysisInProgress) {
        queueVisibleWhatsAppAnalysis({ forceAllVisible, reason });
        console.log(`⏭️ WhatsApp analysis already in progress, queueing ${reason}.`);
        return;
    }

    let lockTimeoutId = null; // Declare outside try block for finally access

    try {
        autoAnalysisInProgress = true;

        // SAFETY: Set a timeout to force-release the lock if analysis hangs
        lockTimeoutId = setTimeout(() => {
            if (autoAnalysisInProgress) {
                console.warn('⚠️ Analysis lock timeout (30s) - force releasing');
                autoAnalysisInProgress = false;
            }
        }, ANALYSIS_LOCK_TIMEOUT);

        const startTime = performance.now();
        console.log('🔄 Analyzing WhatsApp messages for highlighting...');

        const messages = extractFullWhatsAppConversation();
        if (messages.length === 0) {
            console.log('⚠️ No messages found to analyze');
            return;
        }

        // Always reapply cached highlights first (handles WhatsApp DOM re-render removing borders/classes)
        reapplyCachedHighlights(messages);

        // Enhanced debugging: Count messages by direction
        const incomingCount = messages.filter(m => m.direction === 'in').length;
        const outgoingCount = messages.filter(m => m.direction === 'out').length;
        const unknownCount = messages.filter(m => m.direction === 'unknown').length;
        console.log(`📊 Message breakdown: ${incomingCount} incoming, ${outgoingCount} outgoing, ${unknownCount} unknown`);

        // Reanalyze the currently visible window only for messages that have not been processed yet.
        const visibleMessagesNeedingAnalysis = messages.filter(msg => {
            if (msg.element.dataset.spaiAnalyzed === 'pending') return false;
            if (forceAllVisible) return true;
            return msg.element.dataset.spaiAnalyzed !== 'true';
        });

        if (visibleMessagesNeedingAnalysis.length === 0) {
            console.log('✅ No newly visible messages to analyze (cached highlights already reapplied if needed).');
            return;
        }

        console.log(`📊 Found ${visibleMessagesNeedingAnalysis.length} visible messages to analyze (of ${messages.length} total visible)`);
        const messagesToAnalyze = visibleMessagesNeedingAnalysis.slice(-MAX_MESSAGES_PER_ANALYSIS_CYCLE);

        // Gemini Nano is a constrained local resource. Serialize requests to avoid contention.
        const BATCH_SIZE = 1;
        let analyzedCount = 0;

        for (let i = 0; i < messagesToAnalyze.length; i += BATCH_SIZE) {
            const batch = messagesToAnalyze.slice(i, i + BATCH_SIZE);

            // Process batch
            await Promise.all(batch.map(async (message, batchIndex) => {
                try {
                    // RETRY-SAFE: Mark as pending (not 'true' yet) to allow retry on failures
                    message.element.dataset.spaiAnalyzed = 'pending';

                    const localRisk = isLocalPrehighlightCandidate(message)
                        ? evaluateLocalMessageRisk(message.text)
                        : { score: 0, severity: null };
                    if (localRisk.severity) {
                        applyLocalPendingHighlight(message, localRisk);
                    }

                    // Enhanced debugging: Log message being analyzed
                    const msgPreview = message.text.substring(0, 50) + (message.text.length > 50 ? '...' : '');
                    debugLog(`🔍 Analyzing [${message.direction}]: "${msgPreview}"`);
                    if (localRisk.severity) {
                        console.log(`⚡ Local heuristic pre-highlight: ${localRisk.severity} (${localRisk.score})`);
                    }

                    // Add timeout to prevent hanging forever
                    const sendMessageWithTimeout = async (msg, timeoutMs = MESSAGE_ANALYSIS_TIMEOUT) => {
                        let timeoutId;
                        try {
                          return await Promise.race([
                            sendRuntimeMessage(msg),
                            new Promise((_, reject) => {
                              timeoutId = setTimeout(() => {
                                const error = new Error('Gemini Nano analysis timed out after ' + timeoutMs + 'ms');
                                error.name = 'AnalysisTimeoutError';
                                reject(error);
                              }, timeoutMs);
                            })
                          ]);
                        } finally {
                          clearTimeout(timeoutId);
                        }
                    };

                    console.log('📤 Sending DETECT_PHISHING to background...');
                    const response = await sendMessageWithTimeout({
                        type: 'DETECT_PHISHING',
                        data: {
                            content: message.text,
                            url: window.location.href,
                            title: `WhatsApp Message from ${message.sender || 'Unknown'}`
                        }
                    });
                    console.log('📥 Response received:', response ? 'success' : 'empty');

                    if (response?.success && response.analysis) {
                        const riskScore = response.analysis.finalRiskScore || response.analysis.riskScore || 0;
                        const msgRiskLevel = riskScore > 75 ? 'high' : (riskScore > 30 ? 'medium' : 'low');
                        const isMalicious = isValidatedMaliciousAnalysis(response.analysis);
                        const highlightSeverity = getMessageHighlightSeverity(response.analysis, riskScore);

                        // Persist risk data on element + in cache so highlight can survive WhatsApp re-renders
                        const messageId = message.messageId || getMessageIdFromElement(message.element);
                        const textHash = message.textHash || getMessageTextHash(message.text);
                        message.messageId = messageId;
                        message.textHash = textHash;
                        message.element.dataset.spaiRiskScore = String(riskScore);
                        message.element.dataset.spaiRiskLevel = msgRiskLevel;
                        message.element.dataset.spaiHighlighted = String(Boolean(highlightSeverity));
                        message.element.dataset.spaiMalicious = String(isMalicious);
                        message.element.dataset.spaiHighlightSeverity = highlightSeverity || 'none';
                        // Cache under BOTH data-id and text hash for reliable lookup
                        const riskData = {
                          riskScore,
                          riskLevel: msgRiskLevel,
                          status: response.analysis.status,
                          classification: response.analysis.classification,
                          isMalicious,
                          highlightSeverity
                        };
                        cacheMessageRisk(messageId, textHash, riskData);

                        // RETRY-SAFE: Only mark as analyzed after successful response
                        message.element.dataset.spaiAnalyzed = 'true';
                        clearLocalPendingHighlightState(message.element);

                        // Enhanced debugging: Always log risk score
                        console.log(`📈 Risk score for message: ${riskScore} (threshold: 30)`);

                        if (highlightSeverity) {
                            requestAnimationFrame(() => {
                                highlightSuspiciousMessage(message.element, riskScore, [], message.textElement, highlightSeverity);
                            });
                            bumpActiveChatRiskLevel(highlightSeverity === 'high' ? 'high' : 'medium');
                        } else {
                            clearMessageHighlightIfLocalRulesAgree(message);
                        }
                        analyzedCount++;
                    } else {
                        // RETRY-SAFE: Remove flag on failure to allow retry
                        delete message.element.dataset.spaiAnalyzed;
                        console.warn('⚠️ No analysis response received for message (will retry later)');
                    }
                } catch (err) {
                    // RETRY-SAFE: Remove flag on exception to allow retry
                    delete message.element.dataset.spaiAnalyzed;
                    if (isExtensionContextInvalidatedError(err) || extensionContextInvalidated) return;
                    if (err?.name === 'AnalysisTimeoutError') {
                      console.info('Gemini Nano analysis inconclusive after timeout; message will be retried.');
                      return;
                    }
                    console.warn('Error analyzing individual message:', err.message);
                }
            }));

            // Yield to main thread between batches
            if (i + BATCH_SIZE < messagesToAnalyze.length) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }

        const duration = (performance.now() - startTime).toFixed(2);
        console.log(`✅ Analysis complete: ${analyzedCount}/${visibleMessagesNeedingAnalysis.length} messages analyzed in ${duration}ms`);

        // Update sidebar threat indicator based on analysis results
        if (messagesToAnalyze.some(msg => msg.element.dataset.spaiAnalyzed === 'true')) {
          updateChatSidebarThreatIndicator();
        }
    } catch (error) {
        console.error('Error during WhatsApp message highlighting:', error.message);
    } finally {
        clearTimeout(lockTimeoutId); // Clear the safety timeout
        autoAnalysisInProgress = false;
        const queuedRequest = queuedWhatsAppAnalysisRequest;
        queuedWhatsAppAnalysisRequest = null;
        if (queuedRequest && hasActiveExtensionContext()) {
            setTimeout(() => {
                void analyzeAndHighlightMessages(queuedRequest);
            }, 0);
        }
    }
}

/**
 * Update threat indicator on the sidebar for the currently active chat
 */
function updateChatSidebarThreatIndicator() {
  // Find the current active chat in the sidebar
  const activeChatItem = document.querySelector('#pane-side [role="listitem"][aria-selected="true"]') ||
                        document.querySelector('#pane-side div[role="button"].active') ||
                        document.querySelector('#pane-side [data-testid="chat-list-item-selected"]');

  if (!activeChatItem) {
    console.log('Could not find active chat item in sidebar');
    return;
  }

  // Scan all messages in current chat for any with high risk
  const messages = extractFullWhatsAppConversation();
  let maxRiskLevel = 'low';

  messages.forEach(msg => {
    if (msg.element.dataset.spaiRiskLevel) {
      const riskLevel = msg.element.dataset.spaiRiskLevel;
      if (riskLevel === 'high' || riskLevel === 'HIGH') {
        maxRiskLevel = 'high';
      } else if ((riskLevel === 'medium' || riskLevel === 'MEDIUM') && maxRiskLevel !== 'high') {
        maxRiskLevel = 'medium';
      }
    }
  });

  // Add threat indicator if needed
  if (maxRiskLevel !== 'low') {
    addChatThreatIndicator(activeChatItem, maxRiskLevel);
    // ALSO outline the active chat item on the left (explicitly), since message highlighting is scoped to #main
    const chatBorderColor = maxRiskLevel === 'high' ? '#ea4335' : '#ff9800';
    activeChatItem.classList.add('spai-chat-risk', `spai-risk-${maxRiskLevel}`);
    activeChatItem.style.setProperty('outline', `3px solid ${chatBorderColor}`, 'important');
    activeChatItem.style.setProperty('outline-offset', '2px', 'important');
    activeChatItem.style.setProperty('border-radius', '10px', 'important');
  } else {
    // If low risk, remove any lingering badge
    removeChatRiskBadge(activeChatItem);
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

        // SAFETY: Set a timeout to force-release the lock if analysis hangs
        const lockTimeoutId = setTimeout(() => {
            if (autoAnalysisInProgress) {
                console.warn('⚠️ Analysis lock timeout (30s) - force releasing');
                autoAnalysisInProgress = false;
            }
        }, ANALYSIS_LOCK_TIMEOUT);

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
                if (isValidatedMaliciousAnalysis(response.analysis)) {
                    highlightSuspiciousMessage(message.element, riskScore, [], message.textElement);
                } else {
                    clearMessageHighlightIfLocalRulesAgree(message);
                }
            }
        }
        console.log(`✅ WhatsApp individual message analysis complete for ${messages.length} messages.`);

    } catch (error) {
        console.error('Error during WhatsApp chat analysis:', error.message);
    } finally {
        clearTimeout(lockTimeoutId); // Clear the safety timeout
        autoAnalysisInProgress = false;
        const queuedRequest = queuedWhatsAppAnalysisRequest;
        queuedWhatsAppAnalysisRequest = null;
        if (queuedRequest && hasActiveExtensionContext()) {
            setTimeout(() => {
                void analyzeAndHighlightMessages(queuedRequest);
            }, 0);
        }
    }
}

function isValidatedMaliciousAnalysis(analysis = {}) {
  const classification = String(analysis.classification || '').toUpperCase();
  const riskLevel = String(analysis.riskLevel || '').toUpperCase();
  return analysis.status === 'VALID' &&
    ['PHISHING', 'SCAM', 'SOCIAL_ENGINEERING'].includes(classification) &&
    ['HIGH', 'CRITICAL'].includes(riskLevel);
}

function resolveWhatsAppMessageBubble(element, textElement = null) {
  if (!element) return null;
  const anchor = textElement ||
    element.querySelector('[data-pre-plain-text], .copyable-text, .selectable-text');
  if (!anchor) return element.getAttribute?.('role') === 'row' ? element.firstElementChild : element;

  const semantic = anchor.closest?.('[data-pre-plain-text], .copyable-text');
  if (semantic) {
    const parent = semantic.parentElement;
    return parent && parent !== element ? parent : semantic;
  }

  let candidate = anchor;
  while (candidate?.parentElement && candidate.parentElement !== element) {
    if (candidate.matches?.('.message-in, .message-out') ||
        candidate.querySelector?.('span[data-icon="tail-in"], span[data-icon="tail-out"]')) {
      return candidate;
    }
    candidate = candidate.parentElement;
  }
  return anchor.parentElement || element.firstElementChild || element;
}

function removeMessageHighlight(element) {
  if (!element) return;
  const nodes = [element, ...element.querySelectorAll('.spai-malicious-message, .spai-suspicious-message, .spai-highlighted-message, .spai-highlighted-text')];
  nodes.forEach(node => {
    node.classList?.remove('spai-malicious-message', 'spai-suspicious-message', 'spai-highlighted-message', 'spai-highlighted-text', 'spai-risk-medium', 'spai-risk-high');
    node.style?.removeProperty('border');
    node.style?.removeProperty('outline');
    node.style?.removeProperty('outline-offset');
    node.style?.removeProperty('box-shadow');
    node.style?.removeProperty('border-radius');
  });
  element.querySelectorAll('.spai-risk-badge, .spai-suspicious-overlay').forEach(node => node.remove());
  if (element.dataset) {
    element.dataset.spaiHighlighted = 'false';
    element.dataset.spaiMalicious = 'false';
    element.dataset.spaiHighlightSeverity = 'none';
  }
  clearLocalPendingHighlightState(element);
}

function clearWhatsAppMessageHighlights() {
  document.querySelectorAll('#main [data-spai-highlight-severity="high"], #main [data-spai-highlight-severity="medium"], #main .spai-malicious-message, #main .spai-suspicious-message')
    .forEach(node => removeMessageHighlight(node.closest?.('[data-id], [role="row"]') || node));
}

/**
 * Adds a non-layout-shifting outline to a suspicious or malicious message bubble.
 */
function highlightSuspiciousMessage(element, riskScore, _suspiciousPhrases = [], textElement = null, severity = 'high') {
  if (!element) return;
  injectWhatsAppHighlightStyles();
  removeMessageHighlight(element);
  const bubble = resolveWhatsAppMessageBubble(element, textElement);
  if (!bubble || bubble === document.body || bubble.id === 'main') return;
  bubble.classList.add(severity === 'high' ? 'spai-malicious-message' : 'spai-suspicious-message');
  bubble.dataset.spaiMessageBubble = 'true';
  element.dataset.spaiHighlighted = severity ? 'true' : 'false';
  element.dataset.spaiMalicious = severity === 'high' ? 'true' : 'false';
  element.dataset.spaiHighlightSeverity = severity || 'none';
  element.dataset.spaiRiskScore = String(riskScore);
}

/**
 * Extracts all visible messages from the current WhatsApp chat.
 * @returns {Array<Object>} An array of message objects.
 */
function extractFullWhatsAppConversation() {
    console.log('🔍 Starting WhatsApp message extraction...');
    const messages = [];
    const seenElements = new Set(); // Track already processed elements to avoid duplicates

    // IMPORTANT: Only extract from the RIGHT chat pane (messages), never from the LEFT sidebar (#pane-side)
    const mainChatPane = document.querySelector('#main') || document.querySelector('div[role="main"]');
    if (!mainChatPane) {
        console.warn('⚠️ WhatsApp main chat pane (#main) not found. Skipping message extraction.');
        return messages;
    }

    // ENHANCED: Multiple strategies for different WhatsApp versions
    const strategies = [
        // Strategy 1: div[role="row"] - Latest WhatsApp Web
        () => mainChatPane.querySelectorAll('div[role="row"]'),

        // Strategy 2: div with data-id and specific message structure
        () => mainChatPane.querySelectorAll('div[data-id][role="article"]'),

        // Strategy 3: Message containers with message-in/message-out classes
        () => mainChatPane.querySelectorAll('div.message-in, div.message-out'),

        // Strategy 4: Divs containing selectable-text spans
        () => {
            const results = [];
            mainChatPane.querySelectorAll('.selectable-text').forEach(textEl => {
                let parent = textEl.parentElement;
                while (parent && !parent.hasAttribute('data-id') && parent !== document.body) {
                    parent = parent.parentElement;
                }
                if (parent && parent.hasAttribute('data-id') && !results.includes(parent)) {
                    results.push(parent);
                }
            });
            return results;
        },

        // Strategy 5: Main message container divs
        () => mainChatPane.querySelectorAll('div > div'),

        // Strategy 6: Fallback - any div with data-id attribute in message area
        () => {
            return mainChatPane.querySelectorAll('div[data-id]');
        }
    ];

    let messageElements = [];
    for (let i = 0; i < strategies.length; i++) {
        try {
            const result = strategies[i]();
            // Ensure we never include sidebar rows even if WhatsApp DOM changes
            messageElements = Array.from(result).filter(el => !el.closest('#pane-side') && (el.closest('#main') || mainChatPane.contains(el)));
            if (messageElements.length > 0) {
                console.log(`✅ Strategy ${i + 1} found ${messageElements.length} messages`);
                break;
            } else {
                console.log(`Strategy ${i + 1}: No messages found`);
            }
        } catch (e) {
            console.warn(`Strategy ${i + 1} failed:`, e.message);
        }
    }

    // OPTIMIZED: Deduplication and text extraction
    messageElements.forEach((el, index) => {
        try {
            // Skip if already processed or outside the visible chat viewport
            if (seenElements.has(el)) return;
            seenElements.add(el);
            if (!isElementVisibleInChatViewport(el, mainChatPane)) return;

            // Try to find text in multiple ways
            let textEl = el.querySelector('.selectable-text span');
            if (!textEl) {
                textEl = el.querySelector('span.selectable-text');
            }
            if (!textEl) {
                textEl = el.querySelector('[data-lexical-text="true"]');
            }
            if (!textEl) {
                // Try finding any span with meaningful text (avoid short UI text)
                const spans = Array.from(el.querySelectorAll('span')).filter(span => {
                    const text = span.textContent.trim();
                    // Filter out timestamps, UI elements (usually <20 chars and very short)
                    return text && text.length > 3 && text.length < 1000;
                });
                if (spans.length > 0) {
                    // Prefer the longest text (usually the message content)
                    textEl = spans.reduce((longest, current) =>
                        current.textContent.length > longest.textContent.length ? current : longest
                    );
                }
            }

            if (!textEl) {
                // Last resort: get all text content from element
                const fullText = el.innerText?.trim();
                if (!fullText || fullText.length < 3) return;

                messages.push({
                    element: el,
                    text: fullText,
                    textHash: getMessageTextHash(fullText), // Stable hash for cache lookup
                    sender: 'Unknown',
                    timestamp: '',
                    direction: 'unknown'
                });
                return;
            }

            const text = textEl.textContent.trim();
            if (!text || text.length < 1) return;

            const bubbleElement =
                el.querySelector('[data-testid="msg-container"]') ||
                el.querySelector('[data-id]') ||
                el.querySelector('.message-in, .message-out') ||
                el;
            const direction = inferWhatsAppDirection(el, bubbleElement, mainChatPane);

            const messageId = getMessageIdFromElement(el);
            const textHash = getMessageTextHash(text); // Stable hash for cache lookup
            messages.push({
                element: el,
                messageId, // Stable-ish id used for cached highlight reapplication
                textHash,  // Text hash as fallback when data-id changes
                textElement: textEl, // Store reference to actual text element for reliable highlighting
                text,
                sender: direction === 'out' ? 'You' : 'Contact',
                timestamp: '',
                direction
            });
        } catch (e) {
            console.warn(`Could not parse message element ${index}:`, e.message);
        }
    });

    console.log(`✅ Extracted ${messages.length} visible messages from WhatsApp (${seenElements.size} elements scanned)`);
    if (messages.length === 0) {
        console.warn('⚠️ No messages found - WhatsApp DOM may have changed. Debug info:');
        console.warn('- Body element exists:', !!document.body);
        console.warn('- Main container:', document.querySelector('div[role="main"]') ? 'Found' : 'Not found');
        console.warn('- Selectable text elements:', document.querySelectorAll('.selectable-text').length);
    }
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
        /* ===== Message Overlay Styles (THICK BORDER - no background) ===== */
        .spai-suspicious-overlay {
            position: absolute;
            top: -4px;
            left: -4px;
            right: -4px;
            bottom: -4px;
            border-radius: 12px;
            pointer-events: none;
            transition: border 0.3s ease, box-shadow 0.3s ease;
            z-index: 10;
        }
        .spai-suspicious-overlay.spai-risk-medium {
            border: 4px solid #ff9800;
            box-shadow: 0 0 8px #ff9800;
        }
        .spai-suspicious-overlay.spai-risk-high {
            border: 4px solid #ea4335;
            box-shadow: 0 0 10px #ea4335;
        }
        .message-in:hover .spai-suspicious-overlay,
        .message-out:hover .spai-suspicious-overlay {
            box-shadow: 0 0 12px var(--wa-bubble-border-color, #ff5722);
        }
        .message-in:hover .spai-suspicious-overlay.spai-risk-medium {
            box-shadow: 0 0 12px #ff9800;
        }
        .message-in:hover .spai-suspicious-overlay.spai-risk-high {
            box-shadow: 0 0 14px #ea4335;
        }

        /* ===== Suspicious Text Highlighting ===== */
        .spai-suspicious-text {
            cursor: help;
        }
        .spai-suspicious-text:hover {
            opacity: 0.8;
        }

        /* ===== Message-Level Risk Badge ===== */
        .spai-risk-badge {
            position: absolute;
            top: 4px;
            right: 8px;
            background: linear-gradient(135deg, #d32f2f 0%, #c62828 100%);
            color: white;
            padding: 3px 8px;
            border-radius: 12px;
            font-size: 10px;
            font-weight: 700;
            z-index: 100;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
            letter-spacing: 0.5px;
            animation: slideInDown 0.3s ease-out;
        }
        .spai-risk-badge.spai-risk-medium {
            background: linear-gradient(135deg, #f57c00 0%, #e65100 100%);
        }

        /* ===== Loading Indicator ===== */
        .spai-message-loading {
            position: absolute;
            top: 50%;
            right: 8px;
            transform: translateY(-50%);
            width: 16px;
            height: 16px;
            z-index: 99;
        }
        .spai-message-loading::after {
            content: '';
            position: absolute;
            width: 100%;
            height: 100%;
            border: 2px solid rgba(66, 133, 244, 0.3);
            border-top-color: #4285f4;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
        }

        /* ===== Chat Sidebar Threat Indicator ===== */
        .spai-chat-threat-indicator {
            position: absolute;
            top: 8px;
            right: 8px;
            width: 10px;
            height: 10px;
            border-radius: 50%;
            z-index: 50;
            animation: pulse 2s ease-in-out infinite;
        }
        .spai-chat-threat-indicator.spai-high {
            background-color: #d32f2f;
            box-shadow: 0 0 8px rgba(211, 47, 47, 0.6);
        }
        .spai-chat-threat-indicator.spai-medium {
            background-color: #f57c00;
            box-shadow: 0 0 6px rgba(245, 124, 0, 0.5);
        }

        /* ===== Chat Sidebar "HIGH RISK" Bubble Badge ===== */
        .spai-chat-risk-badge {
            position: absolute;
            bottom: 8px;
            right: 8px;
            padding: 2px 8px;
            border-radius: 999px;
            font-size: 10px;
            font-weight: 800;
            letter-spacing: 0.3px;
            color: #fff;
            z-index: 60;
            box-shadow: 0 2px 8px rgba(0,0,0,0.25);
            pointer-events: none;
        }
        .spai-chat-risk-badge.spai-risk-high {
            background: linear-gradient(135deg, #ea4335 0%, #c62828 100%);
        }

        /* ===== Warning Text (Fallback) ===== */
        .spai-warning-text {
            color: #d32f2f;
            font-weight: bold;
            font-size: 11px;
            margin-bottom: 4px;
            padding: 4px;
            background: rgba(255, 255, 255, 0.5);
            border-radius: 4px;
        }

        /* ===== Highlighted Message Container (THICK BORDER - no background) ===== */
        .spai-malicious-message {
            outline: 3px solid #d93025 !important;
            outline-offset: 2px !important;
            box-shadow: 0 0 0 1px rgba(217, 48, 37, 0.2), 0 2px 8px rgba(217, 48, 37, 0.28) !important;
            position: relative;
        }
        .spai-suspicious-message {
            outline: 3px solid #f29900 !important;
            outline-offset: 2px !important;
            box-shadow: 0 0 0 1px rgba(242, 153, 0, 0.18), 0 2px 8px rgba(242, 153, 0, 0.22) !important;
            position: relative;
        }

        .spai-highlighted-message {
            transition: all 0.3s ease;
            position: relative;
        }
        .spai-highlighted-message.spai-risk-medium {
            border: 4px solid #ff9800 !important;
            border-radius: 10px !important;
            box-shadow: 0 0 8px #ff9800 !important;
        }
        .spai-highlighted-message.spai-risk-high {
            border: 4px solid #ea4335 !important;
            border-radius: 10px !important;
            box-shadow: 0 0 10px #ea4335 !important;
        }

        /* ===== Highlighted Text Spans (no background change) ===== */
        .spai-highlighted-text {
            transition: all 0.3s ease;
        }
        .spai-highlighted-text.spai-risk-medium {
            /* No background - border on container is enough */
        }
        .spai-highlighted-text.spai-risk-high {
            /* No background - border on container is enough */
        }

        /* ===== WhatsApp span[dir="auto"] specific styling ===== */
        span[dir="auto"].spai-highlighted-text {
            /* Keep text styling natural */
        }
        div.spai-highlighted-message span[dir="auto"] {
            /* Keep text styling natural */
        }

        /* ===== Animations ===== */
        @keyframes spin {
            to {
                transform: rotate(360deg);
            }
        }
        @keyframes pulse {
            0%, 100% {
                opacity: 1;
                transform: scale(1);
            }
            50% {
                opacity: 0.6;
                transform: scale(1.1);
            }
        }
        @keyframes slideInDown {
            from {
                opacity: 0;
                transform: translateY(-10px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
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
})();







