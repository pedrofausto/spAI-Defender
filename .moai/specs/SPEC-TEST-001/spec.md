# SPEC-TEST-001: Automated Testing Framework Setup

---
id: SPEC-TEST-001
version: 1.0.0
status: draft
created: 2025-12-18
updated: 2025-12-18
author: spAI-Defender Team
priority: high
---

## HISTORY

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2025-12-18 | spAI-Defender Team | Initial SPEC creation for automated testing framework |

---

## OVERVIEW

### Purpose

Establish a comprehensive automated testing infrastructure for the spAI-Defender Chrome extension to ensure code quality, prevent regressions, and enable confident feature development. The testing framework will provide unit testing capabilities for all 11 utility modules and end-to-end testing for Chrome extension workflows.

### Context

**Current State:**
- 11 specialized utility modules (111,550 bytes total, ~3,875 LOC)
- Zero automated tests (100% manual testing)
- TDD constitution enabled with 90% coverage target
- Chrome Extension Manifest V3 architecture
- JavaScript ES6+ with no build system
- Zero external dependencies currently

**Project Requirements:**
- Privacy-first architecture (no external API calls)
- 95%+ phishing detection accuracy target
- <100ms analysis time for typical pages
- Chrome 138+ with Built-in AI support

**Testing Challenges:**
- Chrome Extension context isolation (background, content scripts, popup)
- Chrome Built-in AI mocking (experimental APIs)
- DOM manipulation across multiple platforms (WhatsApp, Telegram, Gmail, Outlook)
- Asynchronous analysis pipeline
- Service worker architecture (Manifest V3)

### Scope

**In Scope:**
- Jest unit testing framework installation and configuration
- Playwright end-to-end testing framework setup
- Test structure creation matching src/ directory hierarchy
- Sample test creation for all 11 utility modules
- Chrome Extension testing environment configuration
- Coverage reporting with 90% target
- GitHub Actions CI/CD pipeline integration
- Test documentation and best practices guide

**Out of Scope:**
- Achieving 90% coverage in initial implementation (target for gradual improvement)
- Testing private Chrome Built-in AI APIs (will use mocks)
- Performance benchmarking infrastructure (separate SPEC)
- Visual regression testing (future enhancement)
- Load testing and stress testing (not applicable for extension)

---

## EARS REQUIREMENTS

### Ubiquitous Requirements

**UBIQ-TEST-001: Code Coverage Target**
*While the test suite is active, the system shall maintain minimum 90% code coverage across all utility modules.*

**Rationale:** TDD constitution requires 90% coverage to ensure comprehensive testing and prevent untested code paths from entering production.

**UBIQ-TEST-002: Test Execution Speed**
*While executing the test suite, the system shall complete all unit tests within 30 seconds and all E2E tests within 5 minutes.*

**Rationale:** Fast test execution enables rapid development iteration and ensures developers run tests frequently without workflow disruption.

**UBIQ-TEST-003: Test Isolation**
*While executing any test, the system shall ensure complete test isolation such that no test depends on or modifies state used by other tests.*

**Rationale:** Test isolation prevents flaky tests, ensures reproducibility, and enables parallel test execution for faster CI/CD pipelines.

**UBIQ-TEST-004: Continuous Integration**
*While any code is pushed to the repository, the system shall automatically execute all tests via GitHub Actions and report results within 10 minutes.*

**Rationale:** Automated testing in CI/CD catches regressions early and prevents broken code from merging into main branch.

### Event-Driven Requirements

**EVENT-TEST-001: Test Failure Detection**
*When any test fails, the system shall report the failure with detailed error messages, stack traces, and failure context to enable rapid debugging.*

**Rationale:** Clear failure reporting accelerates debugging and reduces time spent investigating test failures.

**EVENT-TEST-002: Coverage Threshold Violation**
*When code coverage falls below 90%, the system shall fail the CI/CD pipeline and prevent merging until coverage is restored.*

**Rationale:** Enforcing coverage thresholds maintains code quality standards and prevents untested code from entering production.

**EVENT-TEST-003: Chrome Extension Context Setup**
*When initializing E2E tests, the system shall load the Chrome extension in developer mode and provide test access to extension contexts (background, content, popup).*

**Rationale:** Chrome extension testing requires specialized setup to access isolated extension contexts and simulate user interactions.

**EVENT-TEST-004: AI Mock Initialization**
*When executing tests requiring Chrome Built-in AI, the system shall provide mock implementations of window.ai APIs that return deterministic responses.*

**Rationale:** Chrome Built-in AI is experimental and unavailable in CI environments, requiring mocks for consistent test execution.

### State-Driven Requirements

**STATE-TEST-001: Test Environment Configuration**
*If the test environment is CI/CD, then the system shall use headless browser mode and disable AI-dependent features through environment variables.*

**Rationale:** CI environments require headless execution and cannot access experimental Chrome APIs, necessitating environment-aware test configuration.

**STATE-TEST-002: Local Development Testing**
*If the test environment is local development, then the system shall provide watch mode for automatic test re-execution on file changes.*

**Rationale:** Watch mode enables rapid development feedback cycles and encourages developers to run tests continuously during development.

**STATE-TEST-003: Coverage Report Generation**
*If code coverage is measured, then the system shall generate HTML coverage reports viewable locally and upload coverage data to CI artifacts.*

**Rationale:** Visual coverage reports help developers identify untested code paths and prioritize test creation.

**STATE-TEST-004: Platform-Specific Test Execution**
*If platform-specific modules are tested (WhatsApp, Telegram, Gmail, Outlook readers), then the system shall provide mock DOM structures matching each platform's HTML structure.*

**Rationale:** Platform readers depend on specific DOM structures that must be mocked for unit testing without requiring actual platform access.

### Unwanted Behaviors

**UNWANTED-TEST-001: Flaky Tests**
*The system shall not produce inconsistent test results across multiple executions with identical code.*

**Rationale:** Flaky tests erode developer trust in the test suite and waste time debugging non-existent failures.

**UNWANTED-TEST-002: Test Data Leakage**
*The system shall not persist test data to Chrome storage or create side effects that affect subsequent test execution.*

**Rationale:** Test data leakage causes unpredictable failures and violates test isolation principles.

**UNWANTED-TEST-003: External Network Requests**
*The system shall not make external network requests during test execution to maintain speed, reliability, and privacy compliance.*

**Rationale:** External requests introduce test flakiness, slow execution, and violate the privacy-first architecture principle.

**UNWANTED-TEST-004: Excessive Test Coupling**
*The system shall not create test dependencies where multiple tests must execute in specific order to pass.*

**Rationale:** Test coupling prevents parallel execution, complicates debugging, and reduces test suite maintainability.

### Optional Requirements

**OPTIONAL-TEST-001: Visual Snapshot Testing**
*The system may provide visual regression testing for UI components using Playwright screenshot comparison.*

**Rationale:** Visual testing catches unintended UI changes but adds complexity and maintenance overhead for snapshot updates.

**OPTIONAL-TEST-002: Mutation Testing**
*The system may implement mutation testing to verify test suite effectiveness by introducing code mutations and ensuring tests detect them.*

**Rationale:** Mutation testing validates test quality but significantly increases test execution time and complexity.

**OPTIONAL-TEST-003: Performance Benchmarking**
*The system may include performance benchmarks for analysis modules to detect performance regressions during development.*

**Rationale:** Performance tracking prevents gradual slowdowns but requires baseline establishment and threshold tuning.

**OPTIONAL-TEST-004: Test Report Dashboard**
*The system may generate interactive test reports with historical trend analysis for test success rates and coverage evolution.*

**Rationale:** Historical analysis provides insights into code quality trends but requires additional infrastructure and maintenance.

---

## TECHNICAL CONSTRAINTS

### Technology Stack Requirements

**Programming Language:**
- JavaScript ES6+ (matching project codebase)
- No TypeScript (pure JavaScript project)

**Testing Frameworks:**
- Jest 29.7.0+ for unit testing (industry standard, excellent ES6 support)
- Playwright 1.47.0+ for E2E testing (Chrome extension support)

**Environment Requirements:**
- Node.js 20 LTS or later (for Jest and Playwright execution)
- Chrome 138+ for E2E testing
- GitHub Actions for CI/CD

**Browser Compatibility:**
- Primary: Chrome 138+ (Built-in AI support)
- CI: Chromium (headless mode via Playwright)

### Chrome Extension Testing Constraints

**Context Isolation:**
- Background service worker runs in separate V8 context
- Content scripts run in isolated context with DOM access
- Popup UI runs in extension page context
- Tests must account for message passing between contexts

**API Mocking Requirements:**
- Chrome Extension APIs (chrome.tabs, chrome.scripting, chrome.storage)
- Chrome Built-in AI (window.ai.languageModel, window.ai.summarizer)
- DOM structures for platform-specific readers

**Manifest V3 Service Worker Constraints:**
- Service workers terminate after inactivity
- No persistent background pages
- Event-driven execution model must be tested

### Coverage Requirements

**Minimum Coverage Targets:**
- Overall: 90%
- Utility modules: 95% (core analysis logic)
- Content scripts: 85% (DOM interaction complexity)
- Background service worker: 90% (orchestration logic)
- Popup UI: 80% (user interaction handling)

**Coverage Metrics:**
- Line coverage: 90%+
- Branch coverage: 85%+
- Function coverage: 95%+
- Statement coverage: 90%+

### Performance Constraints

**Test Execution Time Limits:**
- Unit tests: <30 seconds for full suite
- E2E tests: <5 minutes for full suite
- Individual unit test: <100ms average
- Individual E2E test: <30 seconds average

**CI/CD Time Budget:**
- Total pipeline execution: <10 minutes
- Parallel test execution to maximize speed

---

## ARCHITECTURE DESIGN

### Test Directory Structure

```
spAI-Defender/
├── tests/
│   ├── unit/                          # Unit tests mirror src/ structure
│   │   ├── utils/
│   │   │   ├── ai-session-manager.test.js
│   │   │   ├── phishing-detector.test.js
│   │   │   ├── sentiment-analyzer.test.js
│   │   │   ├── linguistic-analyzer.test.js
│   │   │   ├── emotion-analyzer.test.js
│   │   │   ├── image-analyzer.test.js
│   │   │   ├── hybrid-scorer.test.js
│   │   │   ├── platform-detector.test.js
│   │   │   ├── whatsapp-reader.test.js
│   │   │   ├── telegram-reader.test.js
│   │   │   └── phishing-lexicons.test.js
│   │   ├── background/
│   │   │   └── service-worker.test.js
│   │   └── content/
│   │       ├── content-script.test.js
│   │       └── security-badge.test.js
│   │
│   ├── e2e/                           # End-to-end tests
│   │   ├── extension-loading.spec.js
│   │   ├── content-analysis.spec.js
│   │   ├── popup-interaction.spec.js
│   │   ├── whatsapp-detection.spec.js
│   │   ├── telegram-detection.spec.js
│   │   └── visual-indicators.spec.js
│   │
│   ├── fixtures/                      # Test data and mocks
│   │   ├── phishing-samples.js        # Known phishing examples
│   │   ├── legitimate-content.js      # Legitimate content samples
│   │   ├── platform-dom-mocks.js      # WhatsApp/Telegram DOM structures
│   │   └── ai-mock-responses.js       # Mock AI analysis results
│   │
│   ├── helpers/                       # Test utilities
│   │   ├── chrome-api-mock.js         # Chrome Extension API mocks
│   │   ├── ai-mock.js                 # Chrome Built-in AI mocks
│   │   ├── dom-mock.js                # DOM structure generators
│   │   └── test-utils.js              # Common test utilities
│   │
│   └── setup/                         # Test configuration
│       ├── jest.setup.js              # Jest global setup
│       ├── jest.config.js             # Jest configuration
│       └── playwright.config.js       # Playwright configuration
│
├── coverage/                          # Generated coverage reports
│   └── [auto-generated by Jest]
│
└── package.json                       # Test dependencies
```

### Test Execution Flow

**Unit Test Execution:**
```
1. Jest initializes with jest.config.js configuration
2. Load jest.setup.js for global mocks (Chrome APIs, AI APIs)
3. Execute all *.test.js files in tests/unit/
4. Generate coverage report
5. Report results and fail if coverage < 90%
```

**E2E Test Execution:**
```
1. Playwright launches Chrome with extension loaded
2. Navigate to test scenarios (WhatsApp, Gmail, etc.)
3. Execute user interaction scenarios
4. Verify visual indicators and analysis results
5. Capture screenshots on failure for debugging
6. Cleanup extension and browser instances
```

---

## DEPENDENCIES

### Development Dependencies

```json
{
  "devDependencies": {
    "jest": "^29.7.0",
    "jest-environment-jsdom": "^29.7.0",
    "@playwright/test": "^1.47.0",
    "jest-chrome": "^0.8.0"
  }
}
```

**Dependency Justification:**

- **jest**: Industry-standard JavaScript testing framework with excellent ES6 module support and coverage reporting
- **jest-environment-jsdom**: Provides DOM environment for testing browser code in Node.js
- **@playwright/test**: E2E testing framework with native Chrome extension support
- **jest-chrome**: Mock Chrome Extension APIs for unit testing

**Security Consideration:**
- All dependencies are development-only (devDependencies)
- No runtime dependencies added to extension
- Regular dependency audits via npm audit

---

## TRACEABILITY

**Related Project Documents:**
- `.moai/project/product.md` - Detection accuracy target (95%+), performance target (<100ms)
- `.moai/project/tech.md` - Testing strategy section (lines 418-445), planned frameworks
- `.moai/project/structure.md` - 11 utility modules requiring test coverage

**Quality Requirements:**
- TDD Constitution: 90% coverage minimum
- TRUST Framework: Testability, Reliability principles

**Future SPECs:**
- SPEC-TDD-002: Test-Driven Development Implementation (will reference this SPEC for framework setup)
- SPEC-PERF-001: Performance Benchmarking (may extend this test infrastructure)

---

## ACCEPTANCE CRITERIA

See `acceptance.md` for detailed Given/When/Then scenarios and success criteria.

---

## NOTES

**Risk Factors:**
- Chrome Built-in AI unavailability in CI requires comprehensive mocking strategy
- Chrome extension context isolation adds testing complexity
- 90% coverage target may require significant initial effort for 3,875 LOC

**Mitigation Strategies:**
- Gradual coverage improvement approach (prioritize high-value modules first)
- Comprehensive mock library development
- Parallel test execution to meet time constraints

**Future Enhancements:**
- Visual regression testing with Playwright screenshots
- Mutation testing for test quality verification
- Performance benchmarking integration
- Test report dashboard with historical trends

---

**Document Version**: 1.0.0
**Last Updated**: 2025-12-18
**Status**: Draft
**SPEC ID**: SPEC-TEST-001
