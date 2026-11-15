/**
 * Language options shared by the popup, the offscreen document and the service-worker proxy.
 * availability() and create() must receive identical options, so the construction lives in one place.
 * Supported languages per https://developer.chrome.com/docs/ai/prompt-api (expectedInputs section) and
 * https://developer.chrome.com/docs/ai/get-started: English, Spanish, Japanese, German and French.
 * Portuguese is not listed as supported.
 */
export const SUPPORTED_AI_LANGUAGES = new Set(['de', 'en', 'es', 'fr', 'ja']);

export function pickOutputLanguage(navigatorLanguage) {
  const raw = String(navigatorLanguage || 'en').toLowerCase();
  const lang = raw.split('-')[0];
  return SUPPORTED_AI_LANGUAGES.has(lang) ? lang : 'en';
}

function currentNavigatorLanguage() {
  return typeof navigator !== 'undefined' ? navigator.language : undefined;
}

/**
 * Fills outputLanguage, expectedInputs and expectedOutputs. The first expectedInputs language is the system
 * prompt language (English); the output language is added as the expected user prompt language.
 */
export function normalizeLanguageModelExpectations(options, navigatorLanguage = currentNavigatorLanguage()) {
  const outputLanguage = SUPPORTED_AI_LANGUAGES.has(options.outputLanguage)
    ? options.outputLanguage
    : pickOutputLanguage(navigatorLanguage);

  options.outputLanguage = outputLanguage;

  if (!Array.isArray(options.expectedInputs) || options.expectedInputs.length === 0) {
    options.expectedInputs = [{ type: 'text', languages: Array.from(new Set(['en', outputLanguage])) }];
  }

  if (!Array.isArray(options.expectedOutputs) || options.expectedOutputs.length === 0) {
    options.expectedOutputs = [{ type: 'text', languages: [outputLanguage] }];
  }

  return options;
}
