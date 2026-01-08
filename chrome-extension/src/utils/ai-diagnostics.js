/**
 * AI Diagnostics
 * Collects a structured report to help debug why Chrome Built-in AI is not being used.
 */

export async function collectAIDiagnostics(aiManager) {
  const report = {
    generatedAt: new Date().toISOString(),
    context: 'service_worker',
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
    offscreenApi: {
      present: typeof chrome !== 'undefined' && !!chrome.offscreen,
      hasDocument: null
    },
    availability: null,
    capabilities: null,
    hasSummarizationAPI: null,
    offscreen: null,
    errors: []
  };

  try {
    if (typeof chrome !== 'undefined' && chrome.offscreen?.hasDocument) {
      report.offscreenApi.hasDocument = await chrome.offscreen.hasDocument();
    }
  } catch (e) {
    report.errors.push({ area: 'offscreen.hasDocument', message: e?.message || String(e) });
  }

  try {
    report.availability = await aiManager.checkAvailability();
  } catch (e) {
    report.errors.push({ area: 'checkAvailability', message: e?.message || String(e) });
  }

  try {
    report.capabilities = await aiManager.getCapabilities();
  } catch (e) {
    report.errors.push({ area: 'getCapabilities', message: e?.message || String(e) });
  }

  try {
    if (typeof aiManager.hasSummarizationAPI === 'function') {
      report.hasSummarizationAPI = await aiManager.hasSummarizationAPI();
    }
  } catch (e) {
    report.errors.push({ area: 'hasSummarizationAPI', message: e?.message || String(e) });
  }

  try {
    if (typeof aiManager.getOffscreenDiagnostics === 'function') {
      report.offscreen = await aiManager.getOffscreenDiagnostics();
    }
  } catch (e) {
    report.errors.push({ area: 'getOffscreenDiagnostics', message: e?.message || String(e) });
  }

  return report;
}


