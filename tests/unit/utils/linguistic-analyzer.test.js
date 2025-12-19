/**
 * Linguistic Analyzer Tests
 * RED-GREEN-REFACTOR TDD cycle
 * Testing linguistic feature extraction, anomaly detection, and caching
 */

import { LinguisticAnalyzer } from '../../../chrome-extension/src/utils/linguistic-analyzer.js';

describe('LinguisticAnalyzer', () => {
  let analyzer;

  beforeEach(() => {
    analyzer = new LinguisticAnalyzer();
  });

  afterEach(() => {
    analyzer.clearCache();
  });

  describe('constructor', () => {
    test('should initialize with empty cache', () => {
      expect(analyzer.cache).toBeDefined();
      expect(analyzer.cache.size).toBe(0);
    });

    test('should set cache max size to 100', () => {
      expect(analyzer.cacheMaxSize).toBe(100);
    });

    test('should set cache timeout to 5 minutes', () => {
      expect(analyzer.cacheTimeout).toBe(5 * 60 * 1000);
    });

    test('should have all required methods', () => {
      expect(typeof analyzer.analyze).toBe('function');
      expect(typeof analyzer.tokenize).toBe('function');
      expect(typeof analyzer.splitIntoSentences).toBe('function');
      expect(typeof analyzer.extractLexicalFeatures).toBe('function');
      expect(typeof analyzer.extractSyntacticFeatures).toBe('function');
      expect(typeof analyzer.calculateReadability).toBe('function');
      expect(typeof analyzer.extractStructuralFeatures).toBe('function');
      expect(typeof analyzer.extractTemporalFeatures).toBe('function');
      expect(typeof analyzer.countKeywords).toBe('function');
      expect(typeof analyzer.calculateAnomalyScore).toBe('function');
      expect(typeof analyzer.categorizeAnomalyRisk).toBe('function');
      expect(typeof analyzer.clearCache).toBe('function');
    });
  });

  describe('tokenize', () => {
    test('should tokenize simple text', () => {
      const tokens = analyzer.tokenize('Hello world');
      expect(tokens).toEqual(['hello', 'world']);
    });

    test('should lowercase tokens', () => {
      const tokens = analyzer.tokenize('HELLO World');
      expect(tokens[0]).toBe('hello');
      expect(tokens[1]).toBe('world');
    });

    test('should remove punctuation', () => {
      const tokens = analyzer.tokenize('Hello, world!');
      expect(tokens).toEqual(['hello', 'world']);
    });

    test('should split on whitespace', () => {
      const tokens = analyzer.tokenize('one two three four');
      expect(tokens).toHaveLength(4);
    });

    test('should remove empty tokens', () => {
      const tokens = analyzer.tokenize('hello   world');
      expect(tokens.filter(t => t === '')).toHaveLength(0);
    });

    test('should handle special characters', () => {
      const tokens = analyzer.tokenize('test@email.com');
      expect(tokens.length).toBeGreaterThan(0);
    });

    test('should handle numbers', () => {
      const tokens = analyzer.tokenize('test 123 example');
      expect(tokens).toContain('123');
    });

    test('should handle empty string', () => {
      const tokens = analyzer.tokenize('');
      expect(tokens).toHaveLength(0);
    });

    test('should handle URLs', () => {
      const tokens = analyzer.tokenize('Visit https://example.com today');
      expect(tokens.length).toBeGreaterThan(0);
    });

    test('should handle hyphenated words', () => {
      const tokens = analyzer.tokenize('well-known phrase');
      expect(tokens.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('splitIntoSentences', () => {
    test('should split on periods', () => {
      const sentences = analyzer.splitIntoSentences('First sentence. Second sentence.');
      expect(sentences).toHaveLength(2);
    });

    test('should split on exclamation marks', () => {
      const sentences = analyzer.splitIntoSentences('First! Second!');
      expect(sentences).toHaveLength(2);
    });

    test('should split on question marks', () => {
      const sentences = analyzer.splitIntoSentences('First? Second?');
      expect(sentences).toHaveLength(2);
    });

    test('should handle multiple punctuation', () => {
      const sentences = analyzer.splitIntoSentences('First?? Second!!');
      expect(sentences.length).toBeGreaterThanOrEqual(2);
    });

    test('should return sentences that are filtered for length', () => {
      const sentences = analyzer.splitIntoSentences('First.  Second.');
      expect(sentences.length).toBeGreaterThan(0);
      sentences.forEach(s => {
        expect(typeof s).toBe('string');
      });
    });

    test('should remove empty sentences', () => {
      const sentences = analyzer.splitIntoSentences('First.  .  Second.');
      expect(sentences.every(s => s.trim().length > 0)).toBe(true);
    });

    test('should handle single sentence', () => {
      const sentences = analyzer.splitIntoSentences('Single sentence');
      expect(sentences).toHaveLength(1);
    });

    test('should handle empty string', () => {
      const sentences = analyzer.splitIntoSentences('');
      expect(sentences.length).toBe(0);
    });

    test('should handle abbreviations like Mr.', () => {
      const sentences = analyzer.splitIntoSentences('Mr. Smith went home.');
      expect(sentences.length).toBeGreaterThan(0);
    });

    test('should handle multiple sentence endings', () => {
      const sentences = analyzer.splitIntoSentences('First! Second? Third.');
      expect(sentences.length).toBe(3);
    });
  });

  describe('extractLexicalFeatures', () => {
    test('should calculate type-token ratio', () => {
      const tokens = ['hello', 'world', 'hello'];
      const sentences = ['hello world', 'hello'];
      const features = analyzer.extractLexicalFeatures(tokens, sentences);

      expect(features).toHaveProperty('typeTokenRatio');
      expect(features.typeTokenRatio).toBeGreaterThan(0);
      expect(features.typeTokenRatio).toBeLessThanOrEqual(1);
    });

    test('should calculate lexical diversity', () => {
      const tokens = ['hello', 'world', 'test'];
      const sentences = ['hello world', 'test'];
      const features = analyzer.extractLexicalFeatures(tokens, sentences);

      expect(features).toHaveProperty('lexicalDiversity');
      expect(features.lexicalDiversity).toBeLessThanOrEqual(1);
    });

    test('should calculate average word length', () => {
      const tokens = ['hello', 'world'];
      const sentences = ['hello world'];
      const features = analyzer.extractLexicalFeatures(tokens, sentences);

      expect(features).toHaveProperty('avgWordLength');
      expect(features.avgWordLength).toBeGreaterThan(0);
    });

    test('should count long words', () => {
      const tokens = ['a', 'word', 'verylongword'];
      const sentences = ['a word', 'verylongword'];
      const features = analyzer.extractLexicalFeatures(tokens, sentences);

      expect(features).toHaveProperty('longWordRatio');
      expect(features.longWordRatio).toBeGreaterThanOrEqual(0);
    });

    test('should calculate average sentence length', () => {
      const tokens = ['hello', 'world', 'test'];
      const sentences = ['hello world', 'test'];
      const features = analyzer.extractLexicalFeatures(tokens, sentences);

      expect(features).toHaveProperty('avgSentenceLength');
      expect(features.avgSentenceLength).toBeGreaterThan(0);
    });

    test('should count unique tokens', () => {
      const tokens = ['hello', 'world', 'hello'];
      const sentences = ['hello world', 'hello'];
      const features = analyzer.extractLexicalFeatures(tokens, sentences);

      expect(features).toHaveProperty('uniqueTokens');
      expect(features.uniqueTokens).toBe(2);
    });

    test('should count total tokens', () => {
      const tokens = ['hello', 'world', 'hello'];
      const sentences = ['hello world', 'hello'];
      const features = analyzer.extractLexicalFeatures(tokens, sentences);

      expect(features).toHaveProperty('totalTokens');
      expect(features.totalTokens).toBe(3);
    });

    test('should handle empty tokens', () => {
      const features = analyzer.extractLexicalFeatures([], []);
      expect(features.avgWordLength).toBe(0);
      expect(features.avgSentenceLength).toBe(0);
    });
  });

  describe('extractSyntacticFeatures', () => {
    test('should calculate uppercase ratio', () => {
      const features = analyzer.extractSyntacticFeatures('Hello WORLD', [], []);
      expect(features).toHaveProperty('uppercaseRatio');
      expect(features.uppercaseRatio).toBeGreaterThanOrEqual(0);
      expect(features.uppercaseRatio).toBeLessThanOrEqual(1);
    });

    test('should calculate special character density', () => {
      const features = analyzer.extractSyntacticFeatures('Hello!@#$ World', [], []);
      expect(features).toHaveProperty('specialCharDensity');
      expect(features.specialCharDensity).toBeGreaterThan(0);
    });

    test('should calculate numeric density', () => {
      const features = analyzer.extractSyntacticFeatures('Test 123 456', [], []);
      expect(features).toHaveProperty('numericDensity');
      expect(features.numericDensity).toBeGreaterThan(0);
    });

    test('should calculate exclamation density', () => {
      const features = analyzer.extractSyntacticFeatures('Hello! World! Test!', [], ['Hello', 'World', 'Test']);
      expect(features).toHaveProperty('exclamationDensity');
    });

    test('should calculate question density', () => {
      const features = analyzer.extractSyntacticFeatures('What? Really?', [], ['What', 'Really']);
      expect(features).toHaveProperty('questionDensity');
    });

    test('should calculate urgency punctuation ratio', () => {
      const features = analyzer.extractSyntacticFeatures('URGENT!!! IMMEDIATE???', [], ['URGENT', 'IMMEDIATE']);
      expect(features).toHaveProperty('urgencyPunctRatio');
      expect(features.urgencyPunctRatio).toBeGreaterThan(0);
    });

    test('should count ALL CAPS words', () => {
      const features = analyzer.extractSyntacticFeatures('HELLO world TEST me', [], []);
      expect(features).toHaveProperty('allCapsWords');
      expect(features.allCapsWords).toBeGreaterThan(0);
    });

    test('should calculate punctuation per sentence', () => {
      const features = analyzer.extractSyntacticFeatures('Hello! World.', [], ['Hello', 'World']);
      expect(features).toHaveProperty('punctuationPerSentence');
    });

    test('should handle text without special characters', () => {
      const features = analyzer.extractSyntacticFeatures('hello world', [], ['hello world']);
      expect(features.specialCharDensity).toBe(0);
      expect(features.numericDensity).toBe(0);
    });

    test('should handle text with multiple punct types', () => {
      const features = analyzer.extractSyntacticFeatures('Hello!!! World??? Test!!!', [], ['Hello', 'World', 'Test']);
      expect(features.urgencyPunctRatio).toBeGreaterThan(0);
    });
  });

  describe('calculateReadability', () => {
    test('should calculate Flesch score', () => {
      const readability = analyzer.calculateReadability('This is a test. It works well.', ['This is a test', 'It works well']);
      expect(readability).toHaveProperty('fleschScore');
      expect(readability.fleschScore).toBeGreaterThanOrEqual(0);
      expect(readability.fleschScore).toBeLessThanOrEqual(100);
    });

    test('should calculate ARI score', () => {
      const readability = analyzer.calculateReadability('Test content here.', ['Test content here']);
      expect(readability).toHaveProperty('ariScore');
      expect(readability.ariScore).toBeGreaterThanOrEqual(0);
    });

    test('should calculate syllables per word', () => {
      const readability = analyzer.calculateReadability('Testing analytical', ['Testing analytical']);
      expect(readability).toHaveProperty('avgSyllablesPerWord');
      expect(readability.avgSyllablesPerWord).toBeGreaterThan(0);
    });

    test('should categorize difficulty level', () => {
      const readability = analyzer.calculateReadability('The cat sat on the mat.', ['The cat sat on the mat']);
      expect(readability).toHaveProperty('difficulty');
      expect(['very-easy', 'easy', 'fairly-easy', 'standard', 'fairly-difficult', 'difficult', 'very-difficult']).toContain(readability.difficulty);
    });

    test('should handle very simple text', () => {
      const readability = analyzer.calculateReadability('a b c d e', ['a b c d e']);
      expect(readability.fleschScore).toBeGreaterThanOrEqual(0);
    });

    test('should handle complex text', () => {
      const text = 'The multifaceted philosophical implications necessitate comprehensive understanding.';
      const readability = analyzer.calculateReadability(text, [text]);
      expect(readability.difficulty).toBeDefined();
    });
  });

  describe('countSyllables', () => {
    test('should count syllables in simple words', () => {
      const syllables = analyzer.countSyllables('cat dog');
      expect(syllables).toBeGreaterThan(0);
    });

    test('should count syllables in longer words', () => {
      const syllables = analyzer.countSyllables('beautiful interesting');
      expect(syllables).toBeGreaterThan(2);
    });

    test('should handle words with e at end', () => {
      const syllablesWithE = analyzer.countSyllables('table');
      const syllablesWithoutE = analyzer.countSyllables('cat');
      expect(syllablesWithE).toBeGreaterThan(0);
      expect(syllablesWithoutE).toBeGreaterThan(0);
    });

    test('should handle empty text', () => {
      const syllables = analyzer.countSyllables('');
      expect(syllables).toBe(0);
    });

    test('should handle text without vowels', () => {
      const syllables = analyzer.countSyllables('xyz');
      expect(syllables).toBeGreaterThan(0); // At least 1
    });

    test('should handle multiple words', () => {
      const syllables = analyzer.countSyllables('information communication technology');
      expect(syllables).toBeGreaterThan(5);
    });
  });

  describe('categorizeDifficulty', () => {
    test('should categorize very easy (>= 90)', () => {
      const category = analyzer.categorizeDifficulty(95);
      expect(category).toBe('very-easy');
    });

    test('should categorize easy (80-89)', () => {
      const category = analyzer.categorizeDifficulty(85);
      expect(category).toBe('easy');
    });

    test('should categorize fairly easy (70-79)', () => {
      const category = analyzer.categorizeDifficulty(75);
      expect(category).toBe('fairly-easy');
    });

    test('should categorize standard (60-69)', () => {
      const category = analyzer.categorizeDifficulty(65);
      expect(category).toBe('standard');
    });

    test('should categorize fairly difficult (50-59)', () => {
      const category = analyzer.categorizeDifficulty(55);
      expect(category).toBe('fairly-difficult');
    });

    test('should categorize difficult (30-49)', () => {
      const category = analyzer.categorizeDifficulty(40);
      expect(category).toBe('difficult');
    });

    test('should categorize very difficult (< 30)', () => {
      const category = analyzer.categorizeDifficulty(20);
      expect(category).toBe('very-difficult');
    });
  });

  describe('extractStructuralFeatures', () => {
    test('should count URLs', () => {
      const features = analyzer.extractStructuralFeatures('Visit https://example.com and http://test.org', [], []);
      expect(features).toHaveProperty('urlCount');
      expect(features.urlCount).toBeGreaterThan(0);
    });

    test('should count email addresses', () => {
      const features = analyzer.extractStructuralFeatures('Contact test@example.com or admin@test.org', [], []);
      expect(features).toHaveProperty('emailCount');
      expect(features.emailCount).toBeGreaterThan(0);
    });

    test('should count phone patterns', () => {
      const features = analyzer.extractStructuralFeatures('Call 555-123-4567 or (555) 987-6543', [], []);
      expect(features).toHaveProperty('phoneCount');
    });

    test('should calculate URL character ratio', () => {
      const features = analyzer.extractStructuralFeatures('Visit https://example.com/path', [], []);
      expect(features).toHaveProperty('urlCharRatio');
    });

    test('should count form keywords', () => {
      const features = analyzer.extractStructuralFeatures('Submit the form and enter your password', ['submit', 'form', 'enter', 'password'], []);
      expect(features).toHaveProperty('formKeywords');
    });

    test('should count action keywords', () => {
      const features = analyzer.extractStructuralFeatures('Click here and submit now', ['click', 'submit'], []);
      expect(features).toHaveProperty('actionKeywords');
    });

    test('should handle text without URLs', () => {
      const features = analyzer.extractStructuralFeatures('Plain text without urls', [], []);
      expect(features.urlCount).toBe(0);
    });

    test('should handle text without emails', () => {
      const features = analyzer.extractStructuralFeatures('Plain text without emails', [], []);
      expect(features.emailCount).toBe(0);
    });
  });

  describe('extractTemporalFeatures', () => {
    test('should detect time patterns', () => {
      const features = analyzer.extractTemporalFeatures('You have 2 hours to respond');
      expect(features).toHaveProperty('timePressureCount');
      expect(features.timePressureCount).toBeGreaterThan(0);
    });

    test('should detect deadline keywords', () => {
      const features = analyzer.extractTemporalFeatures('The deadline expires tomorrow');
      expect(features).toHaveProperty('timePressureCount');
    });

    test('should detect hasTimeLimit flag', () => {
      const features = analyzer.extractTemporalFeatures('Limited time offer');
      expect(features).toHaveProperty('hasTimeLimit');
      expect(typeof features.hasTimeLimit).toBe('boolean');
    });

    test('should count urgency markers', () => {
      const features = analyzer.extractTemporalFeatures('Action required in 3 days');
      expect(features).toHaveProperty('urgencyMarkers');
    });

    test('should detect multiple time patterns', () => {
      const features = analyzer.extractTemporalFeatures('3 hours left, deadline ends in 24 hours');
      expect(features.timePressureCount).toBeGreaterThan(1);
    });

    test('should handle text without time pressure', () => {
      const features = analyzer.extractTemporalFeatures('This is a regular message');
      expect(features.hasTimeLimit).toBe(false);
    });

    test('should be case insensitive', () => {
      const featuresLower = analyzer.extractTemporalFeatures('2 hours to respond');
      const featuresUpper = analyzer.extractTemporalFeatures('2 HOURS to respond');
      expect(featuresLower.timePressureCount).toBe(featuresUpper.timePressureCount);
    });

    test('should detect various time units', () => {
      const features = analyzer.extractTemporalFeatures('1 hour or 30 minutes or 2 days or 1 week');
      expect(features.timePressureCount).toBeGreaterThan(2);
    });
  });

  describe('countKeywords', () => {
    test('should count matching keywords', () => {
      const tokens = ['hello', 'world', 'test'];
      const count = analyzer.countKeywords(tokens, ['hello', 'test']);
      expect(count).toBe(2);
    });

    test('should be case insensitive', () => {
      const tokens = ['hello', 'world'];
      const count = analyzer.countKeywords(tokens, ['HELLO', 'WORLD']);
      expect(count).toBe(2);
    });

    test('should return 0 for no matches', () => {
      const tokens = ['hello', 'world'];
      const count = analyzer.countKeywords(tokens, ['xyz', 'abc']);
      expect(count).toBe(0);
    });

    test('should handle empty keywords', () => {
      const tokens = ['hello', 'world'];
      const count = analyzer.countKeywords(tokens, []);
      expect(count).toBe(0);
    });

    test('should handle empty tokens', () => {
      const count = analyzer.countKeywords([], ['hello']);
      expect(count).toBe(0);
    });

    test('should not double-count duplicate tokens', () => {
      const tokens = ['hello', 'hello', 'hello'];
      const count = analyzer.countKeywords(tokens, ['hello']);
      expect(count).toBe(1); // Set-based, not array-based
    });
  });

  describe('calculateAnomalyScore', () => {
    test('should return object with score property', () => {
      const features = {
        syntactic: { urgencyPunctRatio: 0.1, allCapsWords: 0, specialCharDensity: 0.01, exclamationDensity: 0.1 },
        readability: { fleschScore: 60, lexical: {} },
        lexical: { avgWordLength: 4, avgSentenceLength: 10 },
        structural: { urlCount: 0 },
        temporal: { hasTimeLimit: false }
      };
      const result = analyzer.calculateAnomalyScore(features);

      expect(result).toHaveProperty('score');
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(1);
    });

    test('should return anomalies array', () => {
      const features = {
        syntactic: { urgencyPunctRatio: 0.1, allCapsWords: 0, specialCharDensity: 0.01, exclamationDensity: 0.1 },
        readability: { fleschScore: 60, lexical: {} },
        lexical: { avgWordLength: 4, avgSentenceLength: 10 },
        structural: { urlCount: 0 },
        temporal: { hasTimeLimit: false }
      };
      const result = analyzer.calculateAnomalyScore(features);

      expect(Array.isArray(result.anomalies)).toBe(true);
    });

    test('should return risk level', () => {
      const features = {
        syntactic: { urgencyPunctRatio: 0.1, allCapsWords: 0, specialCharDensity: 0.01, exclamationDensity: 0.1 },
        readability: { fleschScore: 60 },
        lexical: { avgWordLength: 4, avgSentenceLength: 10 },
        structural: { urlCount: 0 },
        temporal: { hasTimeLimit: false }
      };
      const result = analyzer.calculateAnomalyScore(features);

      expect(result).toHaveProperty('riskLevel');
      expect(['HIGH', 'MEDIUM', 'LOW', 'VERY_LOW']).toContain(result.riskLevel);
    });

    test('should detect excessive urgency punctuation', () => {
      const features = {
        syntactic: { urgencyPunctRatio: 0.6, allCapsWords: 0, specialCharDensity: 0.01, exclamationDensity: 0.5 },
        readability: { fleschScore: 60 },
        lexical: { avgWordLength: 4, avgSentenceLength: 10 },
        structural: { urlCount: 0 },
        temporal: { hasTimeLimit: false }
      };
      const result = analyzer.calculateAnomalyScore(features);

      expect(result.anomalies).toContain('excessive-urgency-punctuation');
      expect(result.score).toBeGreaterThan(0);
    });

    test('should detect excessive capitalization', () => {
      const features = {
        syntactic: { urgencyPunctRatio: 0.1, allCapsWords: 5, specialCharDensity: 0.01, exclamationDensity: 0.1 },
        readability: { fleschScore: 60 },
        lexical: { avgWordLength: 4, avgSentenceLength: 10 },
        structural: { urlCount: 0 },
        temporal: { hasTimeLimit: false }
      };
      const result = analyzer.calculateAnomalyScore(features);

      expect(result.anomalies).toContain('excessive-capitalization');
    });

    test('should detect excessive special characters', () => {
      const features = {
        syntactic: { urgencyPunctRatio: 0.1, allCapsWords: 0, specialCharDensity: 0.2, exclamationDensity: 0.1 },
        readability: { fleschScore: 60 },
        lexical: { avgWordLength: 4, avgSentenceLength: 10 },
        structural: { urlCount: 0 },
        temporal: { hasTimeLimit: false }
      };
      const result = analyzer.calculateAnomalyScore(features);

      expect(result.anomalies).toContain('excessive-special-chars');
    });

    test('should detect excessive URLs', () => {
      const features = {
        syntactic: { urgencyPunctRatio: 0.1, allCapsWords: 0, specialCharDensity: 0.01, exclamationDensity: 0.1 },
        readability: { fleschScore: 60 },
        lexical: { avgWordLength: 4, avgSentenceLength: 10 },
        structural: { urlCount: 5 },
        temporal: { hasTimeLimit: false }
      };
      const result = analyzer.calculateAnomalyScore(features);

      expect(result.anomalies).toContain('excessive-urls');
    });

    test('should detect time pressure', () => {
      const features = {
        syntactic: { urgencyPunctRatio: 0.1, allCapsWords: 0, specialCharDensity: 0.01, exclamationDensity: 0.1 },
        readability: { fleschScore: 60 },
        lexical: { avgWordLength: 4, avgSentenceLength: 10 },
        structural: { urlCount: 0 },
        temporal: { hasTimeLimit: true }
      };
      const result = analyzer.calculateAnomalyScore(features);

      expect(result.anomalies).toContain('time-pressure-detected');
    });
  });

  describe('categorizeAnomalyRisk', () => {
    test('should categorize as HIGH for score >= 0.7', () => {
      const risk = analyzer.categorizeAnomalyRisk(0.7);
      expect(risk).toBe('HIGH');
    });

    test('should categorize as MEDIUM for score 0.4-0.69', () => {
      const risk = analyzer.categorizeAnomalyRisk(0.5);
      expect(risk).toBe('MEDIUM');
    });

    test('should categorize as LOW for score 0.2-0.39', () => {
      const risk = analyzer.categorizeAnomalyRisk(0.3);
      expect(risk).toBe('LOW');
    });

    test('should categorize as VERY_LOW for score < 0.2', () => {
      const risk = analyzer.categorizeAnomalyRisk(0.1);
      expect(risk).toBe('VERY_LOW');
    });

    test('should handle boundary at 0.7', () => {
      const risk = analyzer.categorizeAnomalyRisk(0.7);
      expect(risk).toBe('HIGH');
    });

    test('should handle boundary at 0.4', () => {
      const risk = analyzer.categorizeAnomalyRisk(0.4);
      expect(risk).toBe('MEDIUM');
    });

    test('should handle boundary at 0.2', () => {
      const risk = analyzer.categorizeAnomalyRisk(0.2);
      expect(risk).toBe('LOW');
    });
  });

  describe('analyze', () => {
    test('should return complete feature set', () => {
      const result = analyzer.analyze('This is a test sentence.');

      expect(result).toHaveProperty('lexical');
      expect(result).toHaveProperty('syntactic');
      expect(result).toHaveProperty('readability');
      expect(result).toHaveProperty('structural');
      expect(result).toHaveProperty('temporal');
      expect(result).toHaveProperty('overall');
    });

    test('should include all lexical features', () => {
      const result = analyzer.analyze('Test sentence');
      expect(result.lexical).toHaveProperty('typeTokenRatio');
      expect(result.lexical).toHaveProperty('lexicalDiversity');
      expect(result.lexical).toHaveProperty('avgWordLength');
      expect(result.lexical).toHaveProperty('longWordRatio');
      expect(result.lexical).toHaveProperty('avgSentenceLength');
      expect(result.lexical).toHaveProperty('uniqueTokens');
      expect(result.lexical).toHaveProperty('totalTokens');
    });

    test('should include all syntactic features', () => {
      const result = analyzer.analyze('Test!!! HELLO world');
      expect(result.syntactic).toHaveProperty('uppercaseRatio');
      expect(result.syntactic).toHaveProperty('specialCharDensity');
      expect(result.syntactic).toHaveProperty('numericDensity');
      expect(result.syntactic).toHaveProperty('exclamationDensity');
      expect(result.syntactic).toHaveProperty('questionDensity');
      expect(result.syntactic).toHaveProperty('urgencyPunctRatio');
      expect(result.syntactic).toHaveProperty('allCapsWords');
      expect(result.syntactic).toHaveProperty('punctuationPerSentence');
    });

    test('should include all readability features', () => {
      const result = analyzer.analyze('This is a test. It works.');
      expect(result.readability).toHaveProperty('fleschScore');
      expect(result.readability).toHaveProperty('ariScore');
      expect(result.readability).toHaveProperty('avgSyllablesPerWord');
      expect(result.readability).toHaveProperty('avgSentenceLength');
      expect(result.readability).toHaveProperty('difficulty');
    });

    test('should include all structural features', () => {
      const result = analyzer.analyze('Visit https://example.com');
      expect(result.structural).toHaveProperty('urlCount');
      expect(result.structural).toHaveProperty('urlCharRatio');
      expect(result.structural).toHaveProperty('emailCount');
      expect(result.structural).toHaveProperty('phoneCount');
      expect(result.structural).toHaveProperty('hyperlinkDensity');
      expect(result.structural).toHaveProperty('formKeywords');
      expect(result.structural).toHaveProperty('actionKeywords');
    });

    test('should include all temporal features', () => {
      const result = analyzer.analyze('Deadline in 2 hours');
      expect(result.temporal).toHaveProperty('timePressureCount');
      expect(result.temporal).toHaveProperty('hasTimeLimit');
      expect(result.temporal).toHaveProperty('urgencyMarkers');
    });

    test('should include overall anomaly score', () => {
      const result = analyzer.analyze('Test content');
      expect(result.overall).toHaveProperty('score');
      expect(result.overall).toHaveProperty('anomalies');
      expect(result.overall).toHaveProperty('riskLevel');
    });

    test('should handle phishing-like text', () => {
      const result = analyzer.analyze('URGENT!!! Click here NOW or your account will be LOCKED!!!');
      expect(result.overall.score).toBeGreaterThan(0);
      expect(result.overall.anomalies.length).toBeGreaterThan(0);
    });

    test('should handle legitimate text', () => {
      const result = analyzer.analyze('The quick brown fox jumps over the lazy dog.');
      expect(result).toBeDefined();
      expect(result.overall).toBeDefined();
    });
  });

  describe('caching', () => {
    test('should cache analysis results', () => {
      const text = 'Test content for caching';
      const result1 = analyzer.analyze(text);
      const result2 = analyzer.analyze(text);

      expect(result1).toEqual(result2);
      expect(analyzer.cache.size).toBeGreaterThan(0);
    });

    test('should use cache key from first 100 characters', () => {
      const text = 'a'.repeat(150);
      analyzer.analyze(text);
      expect(analyzer.cache.size).toBe(1);
    });

    test('should clear cache', () => {
      analyzer.analyze('Test text');
      expect(analyzer.cache.size).toBeGreaterThan(0);
      analyzer.clearCache();
      expect(analyzer.cache.size).toBe(0);
    });

    test('should manage cache size to max 100', () => {
      // Add 101 items to cache
      for (let i = 0; i < 101; i++) {
        analyzer.analyze(`Text ${i}`.repeat(10)); // Make text different
      }
      expect(analyzer.cache.size).toBeLessThanOrEqual(100);
    });

    test('should handle cache expiration timeout', (done) => {
      analyzer.cacheTimeout = 100; // 100ms timeout for testing
      const text = 'Test content';
      analyzer.analyze(text);

      setTimeout(() => {
        const cachedValue = analyzer._getFromCache(text.substring(0, 100));
        expect(cachedValue).toBeNull();
        done();
      }, 150);
    });
  });

  describe('integration tests', () => {
    test('should analyze simple phishing text', () => {
      const result = analyzer.analyze('CONFIRM your details NOW before your account expires');
      expect(result.overall.score).toBeGreaterThan(0);
      expect(result.overall.anomalies.length).toBeGreaterThan(0);
    });

    test('should analyze legitimate email', () => {
      const result = analyzer.analyze('Hello, I hope this email finds you well. Please let me know if you have any questions.');
      expect(result).toBeDefined();
      expect(result.overall).toBeDefined();
    });

    test('should analyze mixed content', () => {
      const result = analyzer.analyze('Great news! Limited offer expires in 24 hours. Visit https://example.com');
      expect(result.structural.urlCount).toBe(1);
      expect(result.temporal.hasTimeLimit).toBe(true);
    });

    test('should handle long text efficiently', () => {
      const longText = 'This is a test. '.repeat(100);
      const result = analyzer.analyze(longText);
      expect(result).toBeDefined();
    });

    test('should detect linguistic anomalies', () => {
      const suspiciousText = 'URGENT!!! ACT NOW!!! CLICK HERE!!! VERIFY ACCOUNT!!!';
      const result = analyzer.analyze(suspiciousText);
      expect(result.overall.riskLevel).toMatch(/HIGH|MEDIUM/);
    });
  });

  describe('edge cases', () => {
    test('should handle empty string', () => {
      const result = analyzer.analyze('');
      expect(result).toBeDefined();
    });

    test('should handle single word', () => {
      const result = analyzer.analyze('test');
      expect(result).toBeDefined();
    });

    test('should handle very long word', () => {
      const result = analyzer.analyze('a'.repeat(1000));
      expect(result).toBeDefined();
    });

    test('should handle only punctuation', () => {
      const result = analyzer.analyze('!!!???...!!!');
      expect(result).toBeDefined();
    });

    test('should handle only numbers', () => {
      const result = analyzer.analyze('123456789');
      expect(result).toBeDefined();
    });

    test('should handle Unicode characters', () => {
      const result = analyzer.analyze('Test with émojis 🚨 and special chars');
      expect(result).toBeDefined();
    });

    test('should handle newlines and tabs', () => {
      const result = analyzer.analyze('Line1\nLine2\tTab');
      expect(result).toBeDefined();
    });

    test('should handle mixed case', () => {
      const result = analyzer.analyze('ThIs Is A MiXeD CaSe TeXt');
      expect(result).toBeDefined();
    });
  });
});
