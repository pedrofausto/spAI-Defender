# Development Guide

## Getting Started

### Prerequisites
1. Chrome 138 or later
2. Node.js (optional, for tooling)
3. Git
4. Text editor (VS Code recommended)

### Initial Setup

1. **Clone the repository**:
```bash
git clone https://github.com/yourusername/spAI-Defender.git
cd spAI-Defender/chrome-extension
```

2. **Enable Chrome Built-in AI**:
- Navigate to `chrome://flags/#prompt-api-for-gemini-nano`
- Set to "Enabled"
- Restart Chrome

3. **Load extension in Developer Mode**:
- Open `chrome://extensions/`
- Enable "Developer mode"
- Click "Load unpacked"
- Select the `chrome-extension` directory

## Project Structure

```
chrome-extension/
├── manifest.json              # Extension manifest (MV3)
├── src/
│   ├── background/
│   │   └── service-worker.js # Background service worker
│   ├── content/
│   │   └── content-script.js # Injected into pages
│   ├── popup/
│   │   ├── popup.html        # UI structure
│   │   ├── popup.css         # UI styles
│   │   └── popup.js          # UI logic
│   └── utils/
│       └── ai-session-manager.js # AI API wrapper
├── assets/
│   └── icons/                 # Extension icons
└── docs/                      # Documentation
```

## Development Workflow

### Making Changes

1. **Edit source files** in your preferred editor
2. **Reload extension**:
   - Go to `chrome://extensions/`
   - Click the refresh icon on your extension
   - Or use the keyboard shortcut: `Ctrl+R` (after clicking the extension card)

3. **Test changes**:
   - Open extension popup
   - Check browser console for errors
   - Test on different websites

### Debugging

#### Service Worker
```bash
# View service worker console
1. Go to chrome://extensions/
2. Find your extension
3. Click "service worker" link
4. View console output
```

#### Content Script
```bash
# View content script console
1. Open any web page
2. Press F12 (DevTools)
3. Go to Console tab
4. Content script logs appear here
```

#### Popup
```bash
# View popup console
1. Right-click extension icon
2. Select "Inspect popup"
3. DevTools opens for popup
```

## Code Style

### JavaScript
- Use ES6+ features (const, let, arrow functions, async/await)
- Use modules (import/export)
- No semicolons (consistent with modern JS)
- 2-space indentation
- Descriptive variable names

```javascript
// Good
const extractContent = async () => {
  const response = await fetch(url)
  return response.json()
}

// Avoid
var getStuff = function() {
  // ...
};
```

### CSS
- Use CSS variables for theming
- BEM naming convention for classes
- Mobile-first approach
- Consistent spacing

```css
/* Good */
.popup-header {
  padding: var(--spacing-md);
}

.popup-header__title {
  font-size: var(--font-lg);
}

/* Avoid */
.header {
  padding: 16px;
}
```

### HTML
- Semantic HTML5 elements
- Accessible markup (ARIA labels when needed)
- Descriptive IDs and classes

```html
<!-- Good -->
<section class="results-section" aria-label="Analysis results">
  <h2 class="section-title">Results</h2>
  <!-- ... -->
</section>

<!-- Avoid -->
<div class="box">
  <div class="title">Results</div>
</div>
```

## Testing

### Manual Testing Checklist

#### Basic Functionality
- [ ] Extension loads without errors
- [ ] Popup opens and displays correctly
- [ ] AI availability check works
- [ ] Current tab information displays

#### Content Extraction
- [ ] Extract content from simple pages
- [ ] Extract content from complex pages
- [ ] Handle pages with dynamic content
- [ ] Handle pages with iframes
- [ ] Handle protected pages (graceful failure)

#### AI Features
- [ ] Summarization works correctly
- [ ] Analysis provides meaningful insights
- [ ] Custom prompts are processed
- [ ] Streaming responses work
- [ ] Error handling for unavailable AI

#### Edge Cases
- [ ] Extension works on `https://` pages
- [ ] Graceful failure on `chrome://` pages
- [ ] Handles very long content
- [ ] Handles pages with minimal content
- [ ] Works across multiple tabs

### Testing AI Features

```javascript
// Test AI availability
const availability = await ai.languageModel.availability()
console.log('AI Status:', availability)

// Test session creation
const session = await ai.languageModel.create()
console.log('Session created:', session)

// Test prompting
const response = await session.prompt('Hello!')
console.log('Response:', response)

// Cleanup
await session.destroy()
```

## Common Issues

### Issue: AI Not Available
**Symptom**: AI status shows "Unavailable"

**Solutions**:
1. Check Chrome version (must be 138+)
2. Enable feature flag
3. Restart Chrome
4. Check system requirements

### Issue: Extension Won't Load
**Symptom**: Errors when loading unpacked extension

**Solutions**:
1. Check manifest.json syntax
2. Verify all file paths are correct
3. Ensure icons exist
4. Check for JavaScript syntax errors

### Issue: Content Script Not Injecting
**Symptom**: Content extraction fails

**Solutions**:
1. Check manifest permissions
2. Verify matches pattern in manifest
3. Check for CSP violations
4. Try reloading the page

### Issue: Service Worker Crashes
**Symptom**: Background operations fail

**Solutions**:
1. Check service worker console
2. Look for unhandled promises
3. Verify async/await usage
4. Check for memory leaks

## Performance Optimization

### Best Practices
1. **Minimize content script payload**
   - Only inject when needed
   - Use dynamic import for large dependencies
   - Cache frequently used data

2. **Efficient AI usage**
   - Reuse sessions when possible
   - Destroy sessions promptly
   - Use appropriate temperature/topK values
   - Limit context size for prompts

3. **Storage optimization**
   - Store only necessary data
   - Use compression for large data
   - Clean up old data regularly

4. **UI responsiveness**
   - Show loading states
   - Use async operations
   - Debounce frequent operations
   - Optimize DOM manipulation

## Adding New Features

### Step-by-Step Guide

1. **Plan the feature**
   - Define requirements
   - Design user interface
   - Identify affected components

2. **Update manifest.json** (if needed)
   - Add new permissions
   - Update version
   - Add new resources

3. **Implement backend logic**
   - Add message handler in service-worker.js
   - Add utility functions
   - Implement AI integration

4. **Implement frontend**
   - Add UI elements to popup.html
   - Style with popup.css
   - Add event handlers in popup.js

5. **Test thoroughly**
   - Manual testing
   - Edge cases
   - Error scenarios
   - Cross-browser testing

6. **Document the feature**
   - Update README.md
   - Update API.md
   - Add inline comments
   - Update version

### Example: Adding Translation Feature

```javascript
// 1. Add message handler (service-worker.js)
case 'TRANSLATE_CONTENT':
  handleTranslateContent(request.data, sendResponse);
  return true;

// 2. Implement handler
async function handleTranslateContent(data, sendResponse) {
  try {
    const { content, targetLang } = data;
    // Use Chrome's Translator API
    const translator = await ai.translator.create({
      sourceLanguage: 'auto',
      targetLanguage: targetLang
    });
    const translated = await translator.translate(content);
    sendResponse({ success: true, translated });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

// 3. Add UI button (popup.html)
<button class="btn btn-secondary" id="translateBtn">
  <span class="btn-icon">🌐</span>
  Translate
</button>

// 4. Add event handler (popup.js)
elements.translateBtn.addEventListener('click', handleTranslate);

async function handleTranslate() {
  const targetLang = 'es'; // Could be user-selected
  showLoading();
  const response = await sendMessage({
    type: 'TRANSLATE_CONTENT',
    data: { content: extractedContent.text, targetLang }
  });
  if (response.success) {
    showResults('Translation', response.translated);
  }
  hideLoading();
}
```

## Release Checklist

Before releasing a new version:

- [ ] Test all features thoroughly
- [ ] Update version in manifest.json
- [ ] Update CHANGELOG.md
- [ ] Update documentation
- [ ] Check for console errors
- [ ] Test on multiple sites
- [ ] Verify AI features work
- [ ] Check permissions are minimal
- [ ] Review code for security issues
- [ ] Create git tag
- [ ] Build release package
- [ ] Test packaged extension

## Resources

### Official Documentation
- [Chrome Extensions API](https://developer.chrome.com/docs/extensions/)
- [Manifest V3](https://developer.chrome.com/docs/extensions/mv3/)
- [Chrome Built-in AI](https://developer.chrome.com/docs/ai/built-in)

### Tools
- [Chrome Extension CLI](https://github.com/dutiyesh/chrome-extension-cli)
- [Extension Reloader](https://chrome.google.com/webstore/detail/extensions-reloader/)
- [Chrome Extension Source Viewer](https://chrome.google.com/webstore/detail/chrome-extension-source-v/)

### Community
- [Chrome Extensions Google Group](https://groups.google.com/a/chromium.org/g/chromium-extensions)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/google-chrome-extension)
