# Acceptance Criteria: SPEC-TEST-001

**SPEC ID:** SPEC-TEST-001
**Title:** Automated Testing Framework Setup
**Version:** 1.0.0
**Status:** Draft

---

## OVERVIEW

This document defines comprehensive acceptance criteria for the automated testing framework setup in Given/When/Then format. Each scenario represents a testable condition that must be satisfied for successful SPEC completion.

---

## ACCEPTANCE SCENARIOS

### Scenario 1: Jest Unit Testing Framework Installation

**Given:** A clean spAI-Defender repository with no existing test infrastructure
**When:** The testing framework installation is executed
**Then:** The following conditions must be met:

- package.json contains Jest 29.7.0+ in devDependencies
- package.json contains jest-environment-jsdom in devDependencies
- package.json contains jest-chrome in devDependencies
- node_modules/ directory exists with all dependencies installed
- package-lock.json exists for dependency version locking
- npm test command executes Jest successfully
- tests/setup/jest.config.js exists with complete configuration
- Coverage thresholds are set to 90% global minimum

**Success Criteria:**
- ✅ All dependencies installed without errors
- ✅ Jest runs with `npm test` command
- ✅ Configuration file loads without errors
- ✅ Coverage reporting generates HTML and LCOV reports

**Verification Method:**
```bash
# Verify installation
npm list jest jest-environment-jsdom jest-chrome

# Verify Jest execution
npm test

# Verify coverage configuration
npm run test:coverage
```

---

### Scenario 2: Playwright E2E Testing Framework Installation

**Given:** A clean spAI-Defender repository with no E2E testing capability
**When:** The Playwright framework installation is executed
**Then:** The following conditions must be met:

- package.json contains @playwright/test 1.47.0+ in devDependencies
- Playwright browsers are installed (Chromium)
- tests/setup/playwright.config.js exists with Chrome extension loading configuration
- npm run test:e2e command executes Playwright successfully
- Extension loads in test browser with developer mode
- Headless mode is configured for CI environment
- Screenshot capture on failure is enabled

**Success Criteria:**
- ✅ Playwright installed with Chromium browser
- ✅ Extension loads in Playwright test environment
- ✅ Headless mode functional for CI/CD
- ✅ Screenshots captured on test failure

**Verification Method:**
```bash
# Verify Playwright installation
npm list @playwright/test

# Verify browser installation
npx playwright --version

# Run sample E2E test
npm run test:e2e

# Verify extension loading
npx playwright test tests/e2e/extension-loading.spec.js
```

---

### Scenario 3: Chrome Extension API Mocking

**Given:** Jest test environment without Chrome Extension API access
**When:** Chrome API mocks are initialized in test setup
**Then:** The following conditions must be met:

- tests/helpers/chrome-api-mock.js exists with comprehensive mocks
- tests/setup/jest.setup.js exists and imports chrome-api-mock
- global.chrome object is available in all test files
- chrome.tabs API is mocked with query and sendMessage methods
- chrome.storage.local API is mocked with get and set methods
- chrome.scripting API is mocked with executeScript method
- chrome.runtime API is mocked with sendMessage and onMessage
- Mocks are reset between test executions (no state leakage)

**Success Criteria:**
- ✅ Chrome APIs accessible in test environment
- ✅ Mock methods callable without errors
- ✅ Mock reset confirmed between tests
- ✅ No real Chrome API calls during test execution

**Verification Method:**
```javascript
// Sample test verification
test('Chrome API mock availability', () => {
  expect(chrome.tabs).toBeDefined();
  expect(chrome.storage.local).toBeDefined();
  expect(chrome.scripting).toBeDefined();
  expect(chrome.runtime).toBeDefined();
  expect(chrome.tabs.query).toBeInstanceOf(Function);
});
```

---

### Scenario 4: Chrome Built-in AI API Mocking

**Given:** Jest test environment without Chrome Built-in AI access
**When:** AI API mocks are initialized in test setup
**Then:** The following conditions must be met:

- tests/helpers/ai-mock.js exists with complete AI API mocking
- global.ai object is available in all test files
- window.ai.languageModel.capabilities returns deterministic availability
- window.ai.languageModel.create returns mock session with prompt method
- window.ai.summarizer.create returns mock summarizer with summarize method
- Mock sessions support lifecycle (create, prompt, destroy)
- Mock responses are deterministic and configurable per test
- tests/fixtures/ai-mock-responses.js contains sample AI responses

**Success Criteria:**
- ✅ AI APIs accessible in test environment
- ✅ Deterministic responses for consistent testing
- ✅ Session lifecycle properly mocked
- ✅ Error scenarios testable (AI unavailable, session failure)

**Verification Method:**
```javascript
// Sample test verification
test('AI API mock availability', async () => {
  const { available } = await ai.languageModel.capabilities();
  expect(available).toBe('readily');

  const session = await ai.languageModel.create();
  expect(session.prompt).toBeInstanceOf(Function);

  const result = await session.prompt('Test prompt');
  expect(result).toBeDefined();
});
```

---

### Scenario 5: Utility Module Unit Tests - AI Session Manager

**Given:** ai-session-manager.js module with no existing tests
**When:** Unit tests are created for AI session management
**Then:** The following conditions must be met:

- tests/unit/utils/ai-session-manager.test.js exists
- Test coverage for checkAvailability() function is ≥95%
- Test coverage for createSession() function is ≥95%
- Test coverage for Summarization API usage is ≥95%
- Tests verify AI availability checking
- Tests verify session creation with custom system prompts
- Tests verify error handling for unavailable AI
- Tests verify session cleanup (destroy method called)
- All tests pass consistently (no flakiness)

**Success Criteria:**
- ✅ Module coverage ≥95%
- ✅ All happy path scenarios tested
- ✅ All error scenarios tested
- ✅ Edge cases covered (empty prompts, null values)

**Verification Method:**
```bash
# Run specific module tests
npm test -- ai-session-manager.test.js

# Verify coverage
npm run test:coverage -- --collectCoverageFrom=chrome-extension/src/utils/ai-session-manager.js
```

---

### Scenario 6: Utility Module Unit Tests - Phishing Detector

**Given:** phishing-detector.js module with no existing tests
**When:** Unit tests are created for phishing detection
**Then:** The following conditions must be met:

- tests/unit/utils/phishing-detector.test.js exists
- Test coverage for analyzeContent() function is ≥95%
- Tests verify phishing pattern detection (urgency, credentials, suspicious URLs)
- Tests verify confidence scoring algorithm
- Tests use fixtures from tests/fixtures/phishing-samples.js
- Tests verify legitimate content classification (low scores)
- Tests verify high-risk content detection (high scores)
- Tests verify evidence collection for detected threats
- All tests pass with deterministic AI mock responses

**Success Criteria:**
- ✅ Module coverage ≥95%
- ✅ Known phishing samples correctly detected
- ✅ Legitimate content correctly classified
- ✅ Confidence scores within expected ranges

**Verification Method:**
```javascript
// Sample phishing detection test
test('should detect urgent phishing patterns', async () => {
  const phishingSample = 'URGENT: Verify your account immediately or it will be suspended!';
  const result = await phishingDetector.analyzeContent(phishingSample);
  expect(result.score).toBeGreaterThan(70);
  expect(result.evidence).toContain('urgency');
});
```

---

### Scenario 7: Utility Module Unit Tests - Sentiment Analyzer

**Given:** sentiment-analyzer.js module with no existing tests
**When:** Unit tests are created for sentiment analysis
**Then:** The following conditions must be met:

- tests/unit/utils/sentiment-analyzer.test.js exists
- Test coverage for analyzeSentiment() function is ≥95%
- Tests verify sentiment classification (positive, negative, neutral)
- Tests verify manipulation tactic detection (fear, authority, social proof)
- Tests verify emotional pressure scoring
- Tests verify urgency detection
- Tests use fixtures with known manipulative content
- All tests pass with mocked AI responses

**Success Criteria:**
- ✅ Module coverage ≥95%
- ✅ Sentiment correctly classified
- ✅ Manipulation tactics accurately detected
- ✅ Scoring algorithm validated

**Verification Method:**
```javascript
// Sample sentiment analysis test
test('should detect fear tactics in content', async () => {
  const fearContent = 'Your account will be terminated if you do not act now!';
  const result = await sentimentAnalyzer.analyzeSentiment(fearContent);
  expect(result.tactics).toContain('fear');
  expect(result.manipulation_score).toBeGreaterThan(60);
});
```

---

### Scenario 8: Utility Module Unit Tests - All 11 Modules

**Given:** All 11 utility modules with no existing tests
**When:** Complete unit test suite is created
**Then:** The following conditions must be met:

- All 11 test files exist in tests/unit/utils/
- ai-session-manager.test.js coverage ≥95%
- phishing-detector.test.js coverage ≥95%
- sentiment-analyzer.test.js coverage ≥95%
- linguistic-analyzer.test.js coverage ≥95%
- emotion-analyzer.test.js coverage ≥95%
- image-analyzer.test.js coverage ≥95%
- hybrid-scorer.test.js coverage ≥95%
- platform-detector.test.js coverage ≥95%
- whatsapp-reader.test.js coverage ≥95%
- telegram-reader.test.js coverage ≥95%
- phishing-lexicons.test.js coverage ≥95%
- Overall utility module coverage ≥95%

**Success Criteria:**
- ✅ All 11 modules have comprehensive tests
- ✅ Combined utility module coverage ≥95%
- ✅ All tests pass consistently
- ✅ Test execution time <20 seconds

**Verification Method:**
```bash
# Run all utility module tests
npm test -- tests/unit/utils/

# Verify coverage for all modules
npm run test:coverage -- --collectCoverageFrom=chrome-extension/src/utils/**/*.js
```

---

### Scenario 9: Background Service Worker Unit Tests

**Given:** Background service worker with no existing tests
**When:** Unit tests are created for service worker orchestration
**Then:** The following conditions must be met:

- tests/unit/background/service-worker.test.js exists
- Test coverage for analysis pipeline orchestration is ≥90%
- Tests verify message passing between contexts
- Tests verify cache management (LRU eviction)
- Tests verify statistics tracking and updates
- Tests verify multi-layer analysis coordination
- Tests mock all utility module dependencies
- All tests pass with complete isolation

**Success Criteria:**
- ✅ Service worker coverage ≥90%
- ✅ Orchestration logic verified
- ✅ Cache behavior confirmed
- ✅ Message passing tested

**Verification Method:**
```javascript
// Sample service worker test
test('should orchestrate multi-layer analysis', async () => {
  const content = 'Test content for analysis';
  const result = await analyzeContent(content);

  expect(phishingDetector.analyzeContent).toHaveBeenCalled();
  expect(sentimentAnalyzer.analyzeSentiment).toHaveBeenCalled();
  expect(hybridScorer.calculateScore).toHaveBeenCalled();
  expect(result.riskScore).toBeDefined();
});
```

---

### Scenario 10: Content Script Unit Tests

**Given:** Content scripts with no existing tests
**When:** Unit tests are created for content extraction and visual indicators
**Then:** The following conditions must be met:

- tests/unit/content/content-script.test.js exists
- tests/unit/content/security-badge.test.js exists
- Test coverage for DOM extraction is ≥85%
- Test coverage for visual highlights is ≥85%
- Test coverage for security badge is ≥85%
- Tests verify content extraction from mock DOM
- Tests verify highlight injection logic
- Tests verify badge positioning and display
- All tests use mock DOM structures

**Success Criteria:**
- ✅ Content script coverage ≥85%
- ✅ DOM extraction verified
- ✅ Visual indicators tested
- ✅ Badge behavior confirmed

**Verification Method:**
```javascript
// Sample content script test
test('should extract page content from DOM', () => {
  document.body.innerHTML = '<h1>Test Page</h1><p>Content here</p>';
  const content = extractPageContent();

  expect(content.title).toBe('Test Page');
  expect(content.text).toContain('Content here');
});
```

---

### Scenario 11: E2E Test - Extension Loading

**Given:** Chrome extension with no E2E tests
**When:** Extension loading E2E test is executed
**Then:** The following conditions must be met:

- tests/e2e/extension-loading.spec.js exists
- Test successfully loads extension in Playwright browser
- Test verifies background service worker starts
- Test verifies content scripts inject into test pages
- Test verifies popup UI is accessible
- Test verifies AI availability check executes
- Test passes in both headless and headed modes
- Test execution time <30 seconds

**Success Criteria:**
- ✅ Extension loads without errors
- ✅ All contexts initialized correctly
- ✅ AI availability verified
- ✅ Test passes consistently

**Verification Method:**
```javascript
// Sample E2E test
test('extension loads and initializes', async ({ page, context }) => {
  // Load extension
  const extensionId = await getExtensionId(context);
  expect(extensionId).toBeDefined();

  // Verify popup accessible
  const popupPage = await context.newPage();
  await popupPage.goto(`chrome-extension://${extensionId}/src/popup/popup.html`);
  await expect(popupPage.locator('h1')).toContainText('spAI-Defender');
});
```

---

### Scenario 12: E2E Test - Content Analysis Workflow

**Given:** Functional extension with content analysis capability
**When:** Full content analysis workflow E2E test is executed
**Then:** The following conditions must be met:

- tests/e2e/content-analysis.spec.js exists
- Test navigates to test page with known content
- Test verifies automatic analysis trigger
- Test verifies content extraction from page
- Test verifies analysis result propagation
- Test verifies visual indicator injection (highlights or badge)
- Test verifies statistics update in storage
- Test execution time <30 seconds

**Success Criteria:**
- ✅ Full workflow executes successfully
- ✅ Visual indicators appear correctly
- ✅ Statistics updated accurately
- ✅ Test passes consistently

**Verification Method:**
```javascript
// Sample content analysis E2E test
test('analyzes page content and displays indicators', async ({ page }) => {
  await page.goto('https://example-phishing-site.test');

  // Wait for analysis completion
  await page.waitForSelector('.security-badge', { timeout: 5000 });

  // Verify badge displayed
  const badge = await page.locator('.security-badge');
  await expect(badge).toBeVisible();

  // Verify statistics updated
  const stats = await chrome.storage.local.get('stats');
  expect(stats.pagesAnalyzed).toBeGreaterThan(0);
});
```

---

### Scenario 13: E2E Test - Platform-Specific Detection

**Given:** Extension with platform-specific analysis capabilities
**When:** Platform detection E2E tests are executed
**Then:** The following conditions must be met:

- tests/e2e/whatsapp-detection.spec.js exists
- tests/e2e/telegram-detection.spec.js exists
- WhatsApp test verifies message extraction from mock WhatsApp page
- Telegram test verifies conversation parsing from mock Telegram page
- Tests verify platform-specific threat detection
- Tests verify platform-specific visual indicators
- Each test execution time <30 seconds
- Both tests pass consistently

**Success Criteria:**
- ✅ Platform detection works correctly
- ✅ Content extraction verified for each platform
- ✅ Platform-specific threats detected
- ✅ Visual indicators platform-appropriate

**Verification Method:**
```javascript
// Sample WhatsApp E2E test
test('detects phishing in WhatsApp messages', async ({ page }) => {
  await page.goto('mock-whatsapp-page.html');

  // Wait for message analysis
  await page.waitForSelector('.message-in.highlighted', { timeout: 5000 });

  // Verify highlight on suspicious message
  const highlightedMessages = await page.locator('.message-in.highlighted');
  expect(await highlightedMessages.count()).toBeGreaterThan(0);
});
```

---

### Scenario 14: E2E Test - Popup Interaction

**Given:** Extension popup UI with action buttons
**When:** Popup interaction E2E test is executed
**Then:** The following conditions must be met:

- tests/e2e/popup-interaction.spec.js exists
- Test opens extension popup successfully
- Test clicks "Summarize" button and verifies summary display
- Test clicks "Analyze Content" button and verifies analysis results
- Test enters custom prompt and verifies AI response
- Test verifies statistics display updates
- Test execution time <30 seconds
- All interactions function correctly

**Success Criteria:**
- ✅ Popup opens successfully
- ✅ All buttons functional
- ✅ Results displayed correctly
- ✅ Statistics accurate

**Verification Method:**
```javascript
// Sample popup interaction E2E test
test('popup actions function correctly', async ({ page, context }) => {
  const extensionId = await getExtensionId(context);
  await page.goto(`chrome-extension://${extensionId}/src/popup/popup.html`);

  // Click analyze button
  await page.click('#analyzeBtn');

  // Verify results displayed
  await page.waitForSelector('#results', { timeout: 5000 });
  const results = await page.locator('#results').textContent();
  expect(results).not.toBe('');
});
```

---

### Scenario 15: Code Coverage Achievement

**Given:** Complete test suite for all modules
**When:** Coverage report is generated
**Then:** The following conditions must be met:

- Overall code coverage is ≥90%
- Utility modules coverage is ≥95%
- Background service worker coverage is ≥90%
- Content scripts coverage is ≥85%
- Popup UI coverage is ≥80%
- Line coverage is ≥90%
- Branch coverage is ≥85%
- Function coverage is ≥95%
- Statement coverage is ≥90%
- Coverage report generated in HTML format
- Coverage report uploaded to CI artifacts

**Success Criteria:**
- ✅ All coverage thresholds met
- ✅ No uncovered critical code paths
- ✅ HTML report viewable locally
- ✅ LCOV report generated for CI integration

**Verification Method:**
```bash
# Generate coverage report
npm run test:coverage

# Verify thresholds
cat coverage/coverage-summary.json | jq '.total'

# Expected output:
# {
#   "lines": { "pct": 90.5 },
#   "statements": { "pct": 90.3 },
#   "functions": { "pct": 95.2 },
#   "branches": { "pct": 85.7 }
# }
```

---

### Scenario 16: CI/CD Integration

**Given:** GitHub repository with automated testing requirements
**When:** CI/CD pipeline is configured and executed
**Then:** The following conditions must be met:

- .github/workflows/test.yml exists and is valid
- Pipeline executes on every push to repository
- Pipeline executes on every pull request
- Pipeline installs dependencies with npm ci
- Pipeline runs unit tests with npm run test:unit
- Pipeline runs E2E tests with npm run test:e2e
- Pipeline generates coverage report
- Pipeline uploads coverage to CI artifacts
- Pipeline fails if coverage <90%
- Pipeline fails if any test fails
- Pipeline execution time <10 minutes
- Pull request status checks reflect pipeline results

**Success Criteria:**
- ✅ CI pipeline runs automatically
- ✅ All tests execute successfully in CI
- ✅ Coverage thresholds enforced
- ✅ Pipeline completes within time budget

**Verification Method:**
```yaml
# Verify GitHub Actions workflow
cat .github/workflows/test.yml

# Check recent workflow runs
gh run list --workflow=test.yml

# View specific run details
gh run view <run-id>
```

---

### Scenario 17: Test Execution Performance

**Given:** Complete test suite with all unit and E2E tests
**When:** Full test suite is executed locally
**Then:** The following conditions must be met:

- Unit test suite completes in <30 seconds
- E2E test suite completes in <5 minutes
- Individual unit tests average <100ms execution time
- Individual E2E tests average <30 seconds execution time
- No test timeouts or performance degradation
- Test execution speed consistent across multiple runs
- Parallel execution enabled for faster performance

**Success Criteria:**
- ✅ Unit tests <30s total
- ✅ E2E tests <5min total
- ✅ No performance regressions
- ✅ Consistent execution times

**Verification Method:**
```bash
# Measure unit test execution time
time npm run test:unit

# Measure E2E test execution time
time npm run test:e2e

# Run with verbose timing
npm test -- --verbose --detectOpenHandles
```

---

### Scenario 18: Test Isolation and Reliability

**Given:** Complete test suite with multiple tests
**When:** Tests are executed in random order multiple times
**Then:** The following conditions must be met:

- All tests pass consistently across 10 consecutive executions
- No test failures due to execution order
- No shared state between tests
- All mocks reset properly between tests
- Chrome storage cleared between E2E tests
- No external network requests during tests
- No test data leakage to production storage
- Test flakiness rate <1%

**Success Criteria:**
- ✅ 100% test pass rate across multiple runs
- ✅ Zero order-dependent failures
- ✅ Complete test isolation verified
- ✅ No state leakage detected

**Verification Method:**
```bash
# Run tests 10 times in random order
for i in {1..10}; do npm test -- --randomize --bail; done

# Verify no failures across all runs
echo "All runs passed if no errors above"
```

---

## QUALITY GATE CRITERIA

### Definition of Done

The SPEC-TEST-001 implementation is considered complete when ALL of the following conditions are met:

**Framework Setup:**
- [x] Jest installed and configured with 90% coverage threshold
- [x] Playwright installed and configured for Chrome extension testing
- [x] Chrome API mocks comprehensive and functional
- [x] AI API mocks complete with deterministic responses

**Unit Test Coverage:**
- [x] All 11 utility modules have ≥95% coverage
- [x] Background service worker has ≥90% coverage
- [x] Content scripts have ≥85% coverage
- [x] Popup UI has ≥80% coverage
- [x] Overall code coverage ≥90%

**E2E Test Coverage:**
- [x] Extension loading test passes
- [x] Content analysis workflow test passes
- [x] Platform-specific detection tests pass
- [x] Popup interaction test passes
- [x] Visual indicator tests pass

**CI/CD Integration:**
- [x] GitHub Actions workflow configured
- [x] Pipeline runs on all pushes and pull requests
- [x] Coverage reports uploaded to CI artifacts
- [x] Pipeline enforces coverage thresholds
- [x] Pipeline execution time <10 minutes

**Performance:**
- [x] Unit tests complete in <30 seconds
- [x] E2E tests complete in <5 minutes
- [x] No test timeouts or performance issues

**Reliability:**
- [x] Test flakiness rate <1%
- [x] Complete test isolation verified
- [x] No state leakage between tests
- [x] Consistent results across multiple executions

**Documentation:**
- [x] Testing best practices guide created
- [x] Mock usage documentation complete
- [x] E2E test writing guide available
- [x] CI/CD troubleshooting guide published

---

## REGRESSION PREVENTION

### Continuous Monitoring

After implementation completion, the following must be maintained:

**Coverage Monitoring:**
- Weekly coverage report review
- Immediate investigation if coverage drops below 90%
- Coverage trends tracked over time

**Test Health:**
- Flaky test identification and resolution
- Test execution time monitoring
- Regular mock update and maintenance

**CI/CD Health:**
- Pipeline success rate monitoring
- Execution time tracking
- Failure pattern analysis

---

## EDGE CASES AND BOUNDARY CONDITIONS

### Edge Case Testing Requirements

**Input Validation:**
- Empty content strings
- Extremely long content (>10,000 words)
- Null and undefined values
- Special characters and Unicode content
- Malformed DOM structures

**Error Scenarios:**
- AI unavailable (no network, insufficient resources)
- Chrome API failures (permission denied, context invalidated)
- Timeout conditions (slow analysis, unresponsive scripts)
- Memory constraints (cache overflow, large DOM trees)

**Boundary Conditions:**
- Risk score exactly at thresholds (50, 75, 100)
- Cache at maximum capacity (50 entries)
- Concurrent analysis requests
- Service worker termination and restart

---

## ACCEPTANCE SIGN-OFF

### Stakeholder Approval

**Technical Lead:**
- [ ] All acceptance scenarios verified
- [ ] Coverage thresholds met
- [ ] Performance requirements satisfied
- [ ] Code quality standards maintained

**QA/Testing Lead:**
- [ ] Test reliability confirmed
- [ ] CI/CD integration validated
- [ ] Documentation complete and accurate
- [ ] Regression prevention mechanisms in place

**Product Owner:**
- [ ] Testing framework supports development velocity
- [ ] Quality gates appropriate for project needs
- [ ] Future maintainability ensured

---

**Document Version:** 1.0.0
**Last Updated:** 2025-12-18
**Status:** Draft
**SPEC ID:** SPEC-TEST-001
