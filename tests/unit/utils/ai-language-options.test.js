import {
  SUPPORTED_AI_LANGUAGES,
  pickOutputLanguage,
  normalizeLanguageModelExpectations
} from '../../../chrome-extension/src/utils/ai-language-options.js';

describe('ai-language-options', () => {
  test('supported languages match the Prompt API docs and exclude Portuguese', () => {
    expect([...SUPPORTED_AI_LANGUAGES].sort()).toEqual(['de', 'en', 'es', 'fr', 'ja']);
    expect(SUPPORTED_AI_LANGUAGES.has('pt')).toBe(false);
  });

  test.each([
    ['pt-BR', 'en'],
    ['es-MX', 'es'],
    ['ja', 'ja'],
    ['FR-ca', 'fr'],
    [undefined, 'en']
  ])('pickOutputLanguage(%p) is %p', (navLang, expected) => {
    expect(pickOutputLanguage(navLang)).toBe(expected);
  });

  test('builds expectedInputs (system prompt language first) and expectedOutputs for a supported output language', () => {
    const options = normalizeLanguageModelExpectations({}, 'es-ES');
    expect(options.outputLanguage).toBe('es');
    expect(options.expectedInputs).toEqual([{ type: 'text', languages: ['en', 'es'] }]);
    expect(options.expectedOutputs).toEqual([{ type: 'text', languages: ['es'] }]);
  });

  test('never declares Portuguese, falling back to English', () => {
    const options = normalizeLanguageModelExpectations({ outputLanguage: 'pt' }, 'pt-BR');
    expect(options.expectedInputs[0].languages).toEqual(['en']);
    expect(options.expectedOutputs[0].languages).toEqual(['en']);
  });

  test('keeps caller supplied expectations', () => {
    const expectedInputs = [{ type: 'text', languages: ['en', 'ja'] }];
    const options = normalizeLanguageModelExpectations({ expectedInputs, outputLanguage: 'ja' }, 'en');
    expect(options.expectedInputs).toBe(expectedInputs);
  });
});
