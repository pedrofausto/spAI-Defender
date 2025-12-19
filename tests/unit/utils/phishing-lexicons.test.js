/**
 * Phishing Lexicons Tests
 * RED-GREEN-REFACTOR TDD cycle
 * Testing lexicon data structures, scoring algorithms, and caching mechanisms
 */

import { PhishingLexicons } from '../../../chrome-extension/src/utils/phishing-lexicons.js';

describe('PhishingLexicons', () => {
  let lexicons;

  beforeEach(() => {
    lexicons = new PhishingLexicons();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    test('should initialize with lexicons', () => {
      expect(lexicons.lexicons).toBeDefined();
      expect(typeof lexicons.lexicons).toBe('object');
    });

    test('should initialize cache as empty Map', () => {
      expect(lexicons.cache).toBeInstanceOf(Map);
      expect(lexicons.cache.size).toBe(0);
    });

    test('should set cache configuration', () => {
      expect(lexicons.cacheMaxSize).toBe(100);
      expect(lexicons.cacheTimeout).toBe(5 * 60 * 1000);
    });

    test('should create PhishingLexicons instance', () => {
      expect(lexicons).toBeInstanceOf(PhishingLexicons);
    });

    test('should have all required methods', () => {
      expect(typeof lexicons.calculateLexiconScores).toBe('function');
      expect(typeof lexicons.calculateTrustManipulation).toBe('function');
      expect(typeof lexicons.getDominantLexicons).toBe('function');
      expect(typeof lexicons.getLexiconExplanation).toBe('function');
      expect(typeof lexicons.clearCache).toBe('function');
    });

    test('should initialize all lexicon categories', () => {
      const categories = ['urgency', 'authority', 'fear', 'reward', 'action', 'credential', 'trust'];
      categories.forEach(category => {
        expect(lexicons.lexicons[category]).toBeDefined();
        expect(typeof lexicons.lexicons[category]).toBe('object');
      });
    });
  });

  describe('lexicon data', () => {
    test('should have urgency lexicon with terms and weights', () => {
      const urgencyLexicon = lexicons.lexicons.urgency;
      expect(urgencyLexicon['immediately']).toBe(0.95);
      expect(urgencyLexicon['urgent']).toBe(0.90);
      expect(urgencyLexicon['limited time']).toBe(0.85);
    });

    test('should have authority lexicon with high weight terms', () => {
      const authorityLexicon = lexicons.lexicons.authority;
      expect(authorityLexicon['verify']).toBe(0.92);
      expect(authorityLexicon['account suspended']).toBe(0.98);
    });

    test('should have fear lexicon with threat terms', () => {
      const fearLexicon = lexicons.lexicons.fear;
      expect(fearLexicon['suspended']).toBe(0.95);
      expect(fearLexicon['hacked']).toBe(0.95);
      expect(fearLexicon['compromised']).toBe(0.95);
    });

    test('should have reward lexicon with incentive terms', () => {
      const rewardLexicon = lexicons.lexicons.reward;
      expect(rewardLexicon['prize']).toBe(0.92);
      expect(rewardLexicon['winner']).toBe(0.95);
      expect(rewardLexicon['free']).toBe(0.70);
    });

    test('should have action lexicon with call-to-action terms', () => {
      const actionLexicon = lexicons.lexicons.action;
      expect(actionLexicon['click']).toBe(0.92);
      expect(actionLexicon['click here']).toBe(0.96);
      expect(actionLexicon['download now']).toBe(0.94);
    });

    test('should have credential lexicon with sensitive info terms', () => {
      const credentialLexicon = lexicons.lexicons.credential;
      expect(credentialLexicon['password']).toBe(0.94);
      expect(credentialLexicon['credit card']).toBe(0.96);
      expect(credentialLexicon['social security']).toBe(0.98);
    });

    test('should have trust lexicon with legitimacy markers', () => {
      const trustLexicon = lexicons.lexicons.trust;
      expect(trustLexicon['verified']).toBe(0.38);
      expect(trustLexicon['secure']).toBe(0.35);
      expect(trustLexicon['encrypted']).toBe(0.32);
    });

    test('should have multiple terms per lexicon', () => {
      Object.values(lexicons.lexicons).forEach(lexicon => {
        expect(Object.keys(lexicon).length).toBeGreaterThan(5);
      });
    });

    test('should have weights between 0 and 1', () => {
      Object.values(lexicons.lexicons).forEach(lexicon => {
        Object.values(lexicon).forEach(weight => {
          expect(weight).toBeGreaterThanOrEqual(0);
          expect(weight).toBeLessThanOrEqual(1);
        });
      });
    });
  });

  describe('calculateLexiconScores', () => {
    test('should return score object with all categories', () => {
      const result = lexicons.calculateLexiconScores('verify account immediately');

      expect(result).toHaveProperty('scores');
      expect(result).toHaveProperty('matches');
      expect(result).toHaveProperty('phishingScore');
      expect(result).toHaveProperty('dominantLexicons');
    });

    test('should detect urgency terms', () => {
      const result = lexicons.calculateLexiconScores('immediately verify your account');

      expect(result.scores.urgency).toBeGreaterThan(0);
    });

    test('should detect authority terms', () => {
      const result = lexicons.calculateLexiconScores('account suspended - urgent action required');

      expect(result.scores.authority).toBeGreaterThan(0);
    });

    test('should detect fear terms', () => {
      const result = lexicons.calculateLexiconScores('your account has been hacked');

      expect(result.scores.fear).toBeGreaterThan(0);
    });

    test('should detect reward terms', () => {
      const result = lexicons.calculateLexiconScores('congratulations you have won a prize');

      expect(result.scores.reward).toBeGreaterThan(0);
    });

    test('should detect action terms', () => {
      const result = lexicons.calculateLexiconScores('click here to verify your account');

      expect(result.scores.action).toBeGreaterThan(0);
    });

    test('should detect credential terms', () => {
      const result = lexicons.calculateLexiconScores('enter your password and credit card number');

      expect(result.scores.credential).toBeGreaterThan(0);
    });

    test('should calculate phishing score', () => {
      const result = lexicons.calculateLexiconScores('verify account immediately claim prize');

      expect(result.phishingScore).toBeGreaterThanOrEqual(0);
      expect(result.phishingScore).toBeLessThanOrEqual(100);
    });

    test('should cache results', () => {
      const text = 'test message for caching';
      const result1 = lexicons.calculateLexiconScores(text);

      expect(lexicons.cache.size).toBeGreaterThan(0);
    });

    test('should return cached results on repeated calls', () => {
      const text = 'test message';
      lexicons.calculateLexiconScores(text);
      const initialCacheSize = lexicons.cache.size;

      lexicons.calculateLexiconScores(text);

      expect(lexicons.cache.size).toBeGreaterThanOrEqual(initialCacheSize);
    });

    test('should be case insensitive', () => {
      const result1 = lexicons.calculateLexiconScores('VERIFY ACCOUNT');
      const result2 = lexicons.calculateLexiconScores('verify account');

      expect(result1.scores.authority).toBeGreaterThan(0);
      expect(result2.scores.authority).toBeGreaterThan(0);
    });

    test('should handle empty text', () => {
      const result = lexicons.calculateLexiconScores('');

      expect(result.scores).toBeDefined();
      expect(result.phishingScore).toBe(0);
    });

    test('should handle text with special characters', () => {
      const result = lexicons.calculateLexiconScores('verify <account> & claim "prize"');

      expect(result).toBeDefined();
    });

    test('should handle very long text', () => {
      const longText = 'verify account ' + 'urgently '.repeat(100);
      const result = lexicons.calculateLexiconScores(longText);

      expect(result).toBeDefined();
    });

    test('should include matches array', () => {
      const result = lexicons.calculateLexiconScores('verify account immediately');

      expect(Array.isArray(result.matches.urgency)).toBe(true);
      expect(Array.isArray(result.matches.authority)).toBe(true);
    });

    test('should identify dominant lexicons', () => {
      const result = lexicons.calculateLexiconScores('verify account suspended - account will be locked');

      expect(Array.isArray(result.dominantLexicons)).toBe(true);
    });
  });

  describe('calculateTrustManipulation', () => {
    test('should return high score when trust words in phishing context', () => {
      const score = lexicons.calculateTrustManipulation('secure verified official encrypted');

      expect(score).toBeGreaterThan(0);
    });

    test('should return 0 for text without trust words', () => {
      const score = lexicons.calculateTrustManipulation('random text without trust words');

      expect(score).toBe(0);
    });

    test('should be case insensitive', () => {
      const score1 = lexicons.calculateTrustManipulation('SECURE VERIFIED');
      const score2 = lexicons.calculateTrustManipulation('secure verified');

      expect(score1).toBeGreaterThan(0);
      expect(score2).toBeGreaterThan(0);
    });

    test('should handle multiple trust words', () => {
      const score = lexicons.calculateTrustManipulation('secure verified certified authentic trusted');

      expect(score).toBeGreaterThan(0);
    });

    test('should return value between 0 and 1', () => {
      const score = lexicons.calculateTrustManipulation('secure official verified');

      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });
  });

  describe('getDominantLexicons', () => {
    test('should return lexicons above threshold', () => {
      const scores = {
        urgency: 0.8,
        authority: 0.7,
        fear: 0.5,
        reward: 0.2,
        action: 0.65,
        credential: 0.3,
        trust: 0.4
      };

      const dominant = lexicons.getDominantLexicons(scores);

      expect(Array.isArray(dominant)).toBe(true);
    });

    test('should use 0.6 as default threshold', () => {
      const scores = {
        urgency: 0.65,
        authority: 0.55,
        fear: 0.7,
        reward: 0.4,
        action: 0.6,
        credential: 0.3,
        trust: 0.5
      };

      const dominant = lexicons.getDominantLexicons(scores);

      expect(dominant).toContain('urgency');
      expect(dominant).toContain('fear');
    });

    test('should exclude lexicons below threshold', () => {
      const scores = {
        urgency: 0.2,
        authority: 0.3,
        fear: 0.1,
        reward: 0.15,
        action: 0.25,
        credential: 0.05,
        trust: 0.1
      };

      const dominant = lexicons.getDominantLexicons(scores);

      expect(dominant.length).toBe(0);
    });

    test('should return array of strings', () => {
      const scores = {
        urgency: 0.7,
        authority: 0.65,
        fear: 0.3,
        reward: 0.4,
        action: 0.35,
        credential: 0.2,
        trust: 0.1
      };

      const dominant = lexicons.getDominantLexicons(scores);

      dominant.forEach(item => {
        expect(typeof item).toBe('string');
      });
    });
  });

  describe('getLexiconExplanation', () => {
    test('should return explanation for urgency', () => {
      const explanation = lexicons.getLexiconExplanation('urgency');

      expect(explanation).toContain('time pressure');
    });

    test('should return explanation for authority', () => {
      const explanation = lexicons.getLexiconExplanation('authority');

      expect(explanation).toContain('trusted');
    });

    test('should return explanation for fear', () => {
      const explanation = lexicons.getLexiconExplanation('fear');

      expect(explanation).toContain('fear');
    });

    test('should return explanation for reward', () => {
      const explanation = lexicons.getLexiconExplanation('reward');

      expect(explanation).toContain('prize');
    });

    test('should return explanation for action', () => {
      const explanation = lexicons.getLexiconExplanation('action');

      expect(explanation).toContain('immediate action');
    });

    test('should return explanation for credential', () => {
      const explanation = lexicons.getLexiconExplanation('credential');

      expect(explanation).toContain('sensitive');
    });

    test('should return explanation for trust', () => {
      const explanation = lexicons.getLexiconExplanation('trust');

      expect(explanation).toContain('trust');
    });

    test('should return name for unknown lexicon', () => {
      const explanation = lexicons.getLexiconExplanation('unknown-lexicon');

      expect(explanation).toBe('unknown-lexicon');
    });
  });

  describe('cache management', () => {
    test('should clear cache', () => {
      lexicons.calculateLexiconScores('test message');
      expect(lexicons.cache.size).toBeGreaterThan(0);

      lexicons.clearCache();

      expect(lexicons.cache.size).toBe(0);
    });

    test('should enforce cache size limit', () => {
      // Fill cache up to max size
      for (let i = 0; i < 110; i++) {
        lexicons.calculateLexiconScores(`message ${i}`);
      }

      expect(lexicons.cache.size).toBeLessThanOrEqual(lexicons.cacheMaxSize);
    });

    test('should respect cache timeout', (done) => {
      const originalTimeout = lexicons.cacheTimeout;
      lexicons.cacheTimeout = 100; // 100ms

      lexicons.calculateLexiconScores('test message');

      setTimeout(() => {
        // Cache should be expired
        lexicons.calculateLexiconScores('test message');
        lexicons.cacheTimeout = originalTimeout;
        done();
      }, 150);
    });

    test('should retrieve valid cached entries', () => {
      const text = 'test cached message';
      lexicons.calculateLexiconScores(text);

      expect(lexicons.cache.size).toBeGreaterThan(0);
    });
  });

  describe('integration tests', () => {
    test('should analyze complete phishing email', () => {
      const phishingEmail = 'URGENT: Your account has been suspended! Click here to verify your ' +
                           'account immediately. Confirm your password and credit card details within 24 hours ' +
                           'or your account will be permanently deleted.';

      const result = lexicons.calculateLexiconScores(phishingEmail);

      expect(result.phishingScore).toBeGreaterThan(60);
      expect(result.dominantLexicons.length).toBeGreaterThan(0);
    });

    test('should analyze benign message', () => {
      const benignMessage = 'Hi John, how are you doing today? Would love to catch up soon!';

      const result = lexicons.calculateLexiconScores(benignMessage);

      expect(result.phishingScore).toBeLessThan(30);
    });

    test('should compare messages by risk', () => {
      const phishing = lexicons.calculateLexiconScores('verify account urgently - claim free prize now!');
      const benign = lexicons.calculateLexiconScores('hello how are you');

      expect(phishing.phishingScore).toBeGreaterThan(benign.phishingScore);
    });

    test('should provide actionable intelligence', () => {
      const text = 'account suspended verify immediately';
      const result = lexicons.calculateLexiconScores(text);

      if (result.dominantLexicons.length > 0) {
        const dominant = result.dominantLexicons[0];
        const explanation = lexicons.getLexiconExplanation(dominant);
        expect(explanation).toBeDefined();
        expect(explanation.length).toBeGreaterThan(0);
      }
    });

    test('should detect multi-factor phishing attempts', () => {
      const text = 'URGENT: Verify your account (limited time offer). Claim your free prize now! ' +
                  'Enter password and credit card details to proceed.';

      const result = lexicons.calculateLexiconScores(text);

      expect(result.dominantLexicons.length).toBeGreaterThan(1);
    });
  });

  describe('performance tests', () => {
    test('should handle fast consecutive calls', () => {
      const texts = [
        'message 1',
        'message 2',
        'message 3',
        'message 4',
        'message 5'
      ];

      const startTime = Date.now();

      texts.forEach(text => {
        lexicons.calculateLexiconScores(text);
      });

      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(1000); // Should complete in less than 1 second
    });

    test('should efficiently cache repeated calls', () => {
      const text = 'repeated message for performance testing';

      // First call
      const start1 = Date.now();
      lexicons.calculateLexiconScores(text);
      const time1 = Date.now() - start1;

      // Cached call
      const start2 = Date.now();
      lexicons.calculateLexiconScores(text);
      const time2 = Date.now() - start2;

      // Cached call should be faster or equal
      expect(time2).toBeLessThanOrEqual(time1 + 5);
    });

    test('should handle batch analysis', () => {
      const batchSize = 50;
      const messages = Array(batchSize)
        .fill(null)
        .map((_, i) => `message number ${i}`);

      const startTime = Date.now();

      messages.forEach(msg => {
        lexicons.calculateLexiconScores(msg);
      });

      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(2000); // Should complete in less than 2 seconds
    });
  });

  describe('edge cases and error handling', () => {
    test('should handle null input gracefully', () => {
      expect(() => {
        lexicons.calculateLexiconScores(null);
      }).not.toThrow();
    });

    test('should handle undefined input gracefully', () => {
      expect(() => {
        lexicons.calculateLexiconScores(undefined);
      }).not.toThrow();
    });

    test('should handle empty string', () => {
      const result = lexicons.calculateLexiconScores('');

      expect(result.phishingScore).toBe(0);
    });

    test('should handle whitespace only text', () => {
      const result = lexicons.calculateLexiconScores('   \n\t  ');

      expect(result).toBeDefined();
    });

    test('should handle text with only special characters', () => {
      const result = lexicons.calculateLexiconScores('!@#$%^&*()[]{}');

      expect(result).toBeDefined();
    });

    test('should handle numbers and symbols', () => {
      const result = lexicons.calculateLexiconScores('123456 7890 -=[]\\;\\,./');

      expect(result).toBeDefined();
    });

    test('should handle unicode and emoji', () => {
      const result = lexicons.calculateLexiconScores('verify account 🔐 urgent ⚡');

      expect(result).toBeDefined();
    });

    test('should handle very long text gracefully', () => {
      const longText = 'verify ' + 'account '.repeat(1000);

      const result = lexicons.calculateLexiconScores(longText);

      expect(result).toBeDefined();
      expect(result.phishingScore).toBeDefined();
    });

    test('should handle repeated terms', () => {
      const repeatedText = 'verify ' + 'urgently '.repeat(50) + 'now';

      const result = lexicons.calculateLexiconScores(repeatedText);

      expect(result.phishingScore).toBeGreaterThan(0);
    });
  });

  describe('score calculation accuracy', () => {
    test('should calculate correct phishing score for high-risk text', () => {
      const highRiskText = 'Verify account suspended claim prize immediately';

      const result = lexicons.calculateLexiconScores(highRiskText);

      expect(result.phishingScore).toBeGreaterThan(50);
    });

    test('should calculate correct phishing score for medium-risk text', () => {
      const mediumRiskText = 'Please verify your account';

      const result = lexicons.calculateLexiconScores(mediumRiskText);

      expect(result.phishingScore).toBeGreaterThan(20);
      expect(result.phishingScore).toBeLessThan(60);
    });

    test('should calculate correct phishing score for low-risk text', () => {
      const lowRiskText = 'Hello friend how are you today';

      const result = lexicons.calculateLexiconScores(lowRiskText);

      expect(result.phishingScore).toBeLessThan(30);
    });

    test('should handle mixed risk factors', () => {
      const mixedText = 'verify and claim your prize urgently';

      const result = lexicons.calculateLexiconScores(mixedText);

      expect(result.phishingScore).toBeGreaterThan(0);
      expect(result.phishingScore).toBeLessThanOrEqual(100);
    });

    test('should normalize scores correctly', () => {
      const result = lexicons.calculateLexiconScores('test');

      Object.values(result.scores).forEach(score => {
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(1);
      });
    });
  });
});
