# Phase 2 Continuation Guide

## Quick Status

**Phase 2 Current Progress**: 2/10 modules complete (20%)

### Completed ✅
- `ai-session-manager.js` - 84 tests, 93.89% coverage
- `phishing-detector.js` - 71 tests, 88.96% coverage
- **Total**: 155 tests passing (100% pass rate)

### Remaining 🔄
- 8 modules requiring comprehensive test suites
- 22-26 hours estimated remaining work

---

## How to Continue Phase 2

### Step 1: Execute Tests for Next Module

```bash
# Run a specific test file
npm test -- tests/unit/utils/sentiment-analyzer.test.js

# Run all test files in utils/
npm test -- tests/unit/utils/

# Run with coverage
npm test -- --coverage tests/unit/utils/
```

### Step 2: Test File Template

Use this pattern for creating new test suites (based on completed modules):

```javascript
/**
 * [Module Name] Tests
 * RED-GREEN-REFACTOR TDD cycle
 * [Brief description of what's being tested]
 */

import { [ClassName] } from '../../../chrome-extension/src/utils/[module].js';
import { setupChromeMocks } from '../../helpers/chrome-api-mock.js';
import { setupAIMocks } from '../../helpers/ai-mock.js';

describe('[ClassName]', () => {
  let instance;

  beforeEach(() => {
    setupChromeMocks();
    setupAIMocks();
    instance = new [ClassName](mockDependencies);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    test('should initialize with required properties', () => {
      expect(instance).toBeInstanceOf([ClassName]);
      expect(instance.property).toBeDefined();
    });
  });

  // Continue with additional describe blocks...
});
```

### Step 3: Key Test Categories for Each Module

For each utility module, implement tests for:

1. **Constructor & Initialization** (2-3 tests)
   - Property initialization
   - Dependency injection
   - Default values

2. **Core Methods** (5-10 tests per method)
   - Happy path
   - Parameter variations
   - Edge cases

3. **Error Handling** (3-5 tests)
   - Invalid inputs
   - API failures
   - Timeout/cancellation

4. **Integration** (2-4 tests)
   - Multi-method workflows
   - State consistency
   - Mock verification

5. **Edge Cases** (3-5 tests)
   - Null/undefined values
   - Very large inputs
   - Rapid/concurrent operations
   - Special characters/Unicode

---

## Recommended Execution Order

### Next 3 Modules (Priority HIGH)

1. **sentiment-analyzer.js** (~1 hour)
   - File: `chrome-extension/src/utils/sentiment-analyzer.js`
   - Test file: `tests/unit/utils/sentiment-analyzer.test.js`
   - Methods to test: analyzeSentiment, analyzeAdvanced, parseTextResponse
   - Key mocks: AI session, LinguisticAnalyzer, EmotionAnalyzer

2. **linguistic-analyzer.js** (~1 hour)
   - File: `chrome-extension/src/utils/linguistic-analyzer.js`
   - Test file: `tests/unit/utils/linguistic-analyzer.test.js`
   - Methods to test: analyze, detectManipulation, calculateScore
   - Key mocks: AI session, PhishingLexicons

3. **emotion-analyzer.js** (~1 hour)
   - File: `chrome-extension/src/utils/emotion-analyzer.js`
   - Test file: `tests/unit/utils/emotion-analyzer.test.js`
   - Methods to test: detectEmotion, analyzeEmotionalState, getEmotionScore
   - Key mocks: AI session

### Middle 3 Modules (Priority MEDIUM)

4. **image-analyzer.js** (~1 hour)
   - Focus: OCR functionality, visual text extraction
   - Methods: extractTextFromImage, analyzeImagePhishing

5. **hybrid-scorer.js** (~1 hour)
   - Focus: Multi-factor scoring algorithm
   - Methods: calculateHybridScore, weightComponents

6. **whatsapp-reader.js** (~1 hour)
   - Focus: DOM parsing, message extraction
   - Methods: extractMessages, parseDOM, parseMessageElements

### Last 2 Modules (Priority LOWER)

7. **telegram-reader.js** (~45 min)
   - Focus: Telegram-specific DOM parsing
   - Methods: extractMessages, parseDOM

8. **phishing-lexicons.js** (~45 min)
   - Focus: Data structure validation (may be simpler)
   - Methods: lexicon access, pattern matching

---

## Useful Commands

### Run Tests

```bash
# Run specific test file
npm test -- tests/unit/utils/[module].test.js

# Watch mode (auto-rerun on file changes)
npm test -- --watch

# Run with coverage report
npm test -- --coverage

# Run only failing tests
npm test -- --lastCommit

# Run tests matching pattern
npm test -- --testNamePattern="should initialize"
```

### Check Coverage

```bash
# Generate full HTML coverage report
npm test -- --coverage

# View coverage for specific file
npm test -- --coverage --collectCoverageFrom="chrome-extension/src/utils/[module].js"
```

### Debug Tests

```bash
# Run single test
npm test -- --testNamePattern="exact test name"

# Increase timeout for slow tests
npm test -- --testTimeout=30000
```

---

## Mock Infrastructure Available

### Chrome API Mocks
```javascript
import { setupChromeMocks } from '../../helpers/chrome-api-mock.js';

// Provides:
// chrome.tabs, chrome.scripting, chrome.storage
// chrome.runtime, chrome.alarms, chrome.permissions
// chrome.identity, chrome.action
```

### AI API Mocks
```javascript
import {
  setupAIMocks,
  setLanguageModelResponse,
  setSummarizerResponse,
  setupFetchMock
} from '../../helpers/ai-mock.js';

// Provides:
// window.ai.languageModel, window.ai.summarizer
// window.ai.rewriter, window.ai.detector
```

### Custom Mock Example
```javascript
beforeEach(() => {
  mockAIManager = {
    getPooledSession: jest.fn().mockReturnValue(null),
    getOrCreateSession: jest.fn().mockResolvedValue({
      prompt: jest.fn().mockResolvedValue('response')
    }),
    returnSessionToPool: jest.fn()
  };
});
```

---

## Coverage Thresholds

Target coverage for each module:

```javascript
// From jest.config.cjs
'chrome-extension/src/utils/': {
  branches: 95,    // Try to reach 95%
  functions: 95,   // Try to reach 95%
  lines: 95,       // Try to reach 95%
  statements: 95   // Try to reach 95%
}
```

Completed modules achieved:
- ai-session-manager: 93.89% lines (excellent)
- phishing-detector: 88.96% lines (good, close to target)

---

## Common Issues & Solutions

### Issue: "Chrome API not mocked"
**Solution**: Add `setupChromeMocks()` in your `beforeEach()` block

### Issue: "ReferenceError: global.self is not defined"
**Solution**: Mock `global.self` in your test:
```javascript
beforeEach(() => {
  global.self = global.self || {};
  global.self.LanguageModel = { create: jest.fn() };
});
```

### Issue: "Cannot read property 'mock' of undefined"
**Solution**: Ensure mocks are set up BEFORE calling methods that use them

### Issue: Tests timeout
**Solution**: Increase timeout in jest.config.cjs or specific test:
```javascript
test('long running test', async () => {
  // ...
}, 15000); // 15 second timeout
```

### Issue: "Coverage threshold not met"
**Solution**: Add more tests to reach 95% coverage on uncovered lines

---

## Quality Checklist for Each Module

Before considering a module complete:

- [ ] All tests written first (RED phase)
- [ ] Implementation code verified to pass tests (GREEN phase)
- [ ] Code refactored for quality (REFACTOR phase)
- [ ] Coverage >= 95% for lines and statements
- [ ] All 155+ existing tests still passing (no regressions)
- [ ] Edge cases tested (null, undefined, large data, rapid calls)
- [ ] Error handling verified
- [ ] Integration tests with related modules
- [ ] Test file > 700 lines with comprehensive coverage
- [ ] Clear describe blocks and test naming

---

## File Locations Reference

```
Project Root: /home/purple/workspace/spAI-Defender/

Source Files:
├── chrome-extension/src/utils/
│   ├── ai-session-manager.js         ✅ Complete
│   ├── phishing-detector.js           ✅ Complete
│   ├── sentiment-analyzer.js          🔄 Next
│   ├── linguistic-analyzer.js         🔄
│   ├── emotion-analyzer.js            🔄
│   ├── image-analyzer.js              🔄
│   ├── hybrid-scorer.js               🔄
│   ├── whatsapp-reader.js             🔄
│   ├── telegram-reader.js             🔄
│   ├── phishing-lexicons.js           🔄
│   └── platform-detector.js           ✅ Phase 1

Test Files:
├── tests/unit/utils/
│   ├── ai-session-manager.test.js     ✅ Complete
│   ├── phishing-detector.test.js      ✅ Complete
│   ├── platform-detector.test.js      ✅ Phase 1
│   └── [8 more test files needed]

Helpers:
├── tests/helpers/
│   ├── chrome-api-mock.js             ✅ Complete
│   ├── ai-mock.js                     ✅ Complete
│   └── [custom mocks as needed]

Setup:
├── tests/setup/jest.setup.js          ✅ Complete
└── jest.config.cjs                    ✅ Complete
```

---

## Report & Documentation

**Main Report**: `/home/purple/workspace/spAI-Defender/PHASE2-REPORT.md`

Contains:
- Executive summary
- Completed module details
- Coverage statistics
- Test infrastructure documentation
- Challenges and solutions
- Code quality metrics
- Remaining work details

---

## Progress Tracking

Update progress as you complete each module:

```markdown
## Phase 2 Progress

- [x] ai-session-manager.js (84 tests, 93.89% coverage)
- [x] phishing-detector.js (71 tests, 88.96% coverage)
- [ ] sentiment-analyzer.js (target: 80+ tests, 95% coverage)
- [ ] linguistic-analyzer.js (target: 80+ tests, 95% coverage)
- [ ] emotion-analyzer.js (target: 75+ tests, 95% coverage)
- [ ] image-analyzer.js (target: 70+ tests, 95% coverage)
- [ ] hybrid-scorer.js (target: 65+ tests, 95% coverage)
- [ ] whatsapp-reader.js (target: 70+ tests, 95% coverage)
- [ ] telegram-reader.js (target: 65+ tests, 95% coverage)
- [ ] phishing-lexicons.js (target: 60+ tests, 95% coverage)

Total: 155/700+ tests complete (22%)
```

---

## Next Session Kickoff

When continuing Phase 2:

1. Run existing tests to ensure no regressions:
   ```bash
   npm test -- tests/unit/utils/ai-session-manager.test.js tests/unit/utils/phishing-detector.test.js
   ```

2. Check current coverage:
   ```bash
   npm test -- --coverage
   ```

3. Pick next module from recommended order

4. Follow test template provided above

5. Iterate through RED-GREEN-REFACTOR cycle

6. Update this document with progress

---

**Last Updated**: 2025-12-18
**Phase Status**: 2/10 modules (20% complete)
**Tests Passing**: 155/155 (100%)
**Estimated Remaining**: 22-26 hours
