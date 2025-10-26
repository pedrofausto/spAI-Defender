# spAI-Defender - Chrome Extension with Built-in AI

A powerful Chrome extension that leverages Chrome's Built-in AI (Gemini Nano) to read, analyze, and summarize content from browser tabs. This extension provides privacy-focused, on-device AI processing without sending data to external servers.

## Features

- **Content Extraction**: Extract structured content from any web page including text, headings, links, images, and metadata
- **AI-Powered Summarization**: Generate concise summaries of web page content
- **Content Analysis**: Get detailed AI analysis of page content, including main topics, key points, and quality assessment
- **Custom Prompts**: Ask custom questions about page content using natural language
- **Privacy-First**: All AI processing happens locally on your device using Chrome's Built-in AI
- **Tab Reading**: Access and analyze content from multiple browser tabs
- **Modern UI**: Clean, intuitive interface following Google's design principles

## Requirements

### System Requirements
- **Chrome Version**: Chrome 138 or later (Stable channel)
- **Operating System**:
  - Windows 10 or later
  - macOS 13 or later
  - Linux (any recent distribution)
  - ChromeOS (Chromebook Plus only)
- **Storage**: At least 22 GB of free disk space
- **Hardware**:
  - GPU with more than 4 GB VRAM, OR
  - CPU with 16 GB RAM and 4+ cores
- **Network**: Unlimited/unmetered connection (for initial model download)

### Chrome Built-in AI Setup

1. **Enable the Feature Flag**:
   - Navigate to `chrome://flags/#prompt-api-for-gemini-nano`
   - Set it to "Enabled"
   - Restart Chrome

2. **Verify AI Availability**:
   - Open Chrome DevTools (F12)
   - In the Console, type: `await ai.languageModel.availability()`
   - If it returns `"readily"`, you're all set!
   - If it returns `"after-download"`, the model will download on first use

3. **Download the AI Model** (if needed):
   - The model will download automatically when you first use an AI feature
   - This requires user interaction (clicking a button in the extension)
   - Download size is approximately 1-2 GB
   - Download happens in the background

## Installation

### Development Installation (Local)

1. **Clone or download this repository**:
   ```bash
   git clone https://github.com/yourusername/spAI-Defender.git
   cd spAI-Defender/chrome-extension
   ```

2. **Create Extension Icons** (if not provided):
   - Place PNG icons in `assets/icons/`:
     - icon16.png (16x16 pixels)
     - icon32.png (32x32 pixels)
     - icon48.png (48x48 pixels)
     - icon128.png (128x128 pixels)
   - Or run the icon generation script (requires ImageMagick):
     ```bash
     cd assets/icons
     ./create-icons.sh
     ```

3. **Load the Extension in Chrome**:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top-right corner)
   - Click "Load unpacked"
   - Select the `chrome-extension` folder
   - The extension should now appear in your extensions list

4. **Pin the Extension** (optional but recommended):
   - Click the puzzle piece icon in Chrome's toolbar
   - Find "spAI-Defender Tab Reader"
   - Click the pin icon to keep it visible

### Chrome Web Store Installation (Coming Soon)

The extension will be available on the Chrome Web Store after initial testing and refinement.

## Usage

### Basic Workflow

1. **Open the Extension**:
   - Click the spAI-Defender icon in your Chrome toolbar
   - The popup will open showing the current tab information

2. **Check AI Status**:
   - The top of the popup shows the AI availability status
   - If it shows "Available", you're ready to use AI features
   - If it shows "Download Required", click any AI button to start the download

3. **Extract Content**:
   - Click the "Extract Content" button
   - The extension will analyze the current tab and extract structured content
   - View basic statistics and metadata in the results section

4. **Use AI Features**:
   - **Summarize**: Get a concise summary of the page content
   - **Analyze**: Get detailed analysis including main topics, key points, and target audience
   - **Custom Prompt**: Ask specific questions about the content

### Example Use Cases

#### Summarizing Articles
1. Navigate to any article or blog post
2. Open spAI-Defender
3. Click "Extract Content"
4. Click "Summarize Page"
5. Get a concise summary in seconds

#### Analyzing Content Quality
1. Open a web page you want to analyze
2. Click "Extract Content"
3. Click "Analyze Content"
4. Review AI insights about topic, purpose, and quality

#### Custom Queries
1. Extract content from the current page
2. Click "Custom Prompt"
3. Enter your question (e.g., "What are the main arguments in this article?")
4. Click "Send"
5. Get AI-powered answers based on the page content

## Architecture

### Project Structure

```
chrome-extension/
├── manifest.json                 # Extension configuration
├── src/
│   ├── background/
│   │   └── service-worker.js    # Background service worker
│   ├── content/
│   │   └── content-script.js    # Content script for page interaction
│   ├── popup/
│   │   ├── popup.html           # Popup UI
│   │   ├── popup.css            # Popup styles
│   │   └── popup.js             # Popup logic
│   └── utils/
│       └── ai-session-manager.js # AI session management
├── assets/
│   └── icons/                    # Extension icons
└── docs/                         # Documentation
```

### Component Overview

#### Service Worker (`service-worker.js`)
- Manages background tasks and message passing
- Handles AI session creation and management
- Coordinates content extraction and analysis
- Provides centralized error handling

#### Content Script (`content-script.js`)
- Injected into web pages
- Extracts structured content from DOM
- Monitors page changes
- Handles selection extraction

#### AI Session Manager (`ai-session-manager.js`)
- Wraps Chrome's Built-in AI Prompt API
- Manages session lifecycle
- Provides simplified interface for AI operations
- Handles availability checking and error states

#### Popup Interface
- User-facing interface
- Displays current tab information
- Provides action buttons for AI features
- Shows results and AI responses

## API Reference

### Background Script Messages

The extension uses Chrome's messaging API for communication between components.

#### `CHECK_AI_AVAILABILITY`
Check if the AI model is available.

**Request**:
```javascript
{ type: 'CHECK_AI_AVAILABILITY' }
```

**Response**:
```javascript
{
  success: true,
  availability: 'readily' | 'after-download' | 'no',
  capabilities: { ... }
}
```

#### `GET_TAB_CONTENT`
Extract content from a specific tab.

**Request**:
```javascript
{
  type: 'GET_TAB_CONTENT',
  tabId: number  // Optional, defaults to active tab
}
```

**Response**:
```javascript
{
  success: true,
  content: {
    title: string,
    url: string,
    text: string,
    headings: Array,
    links: Array,
    images: Array,
    meta: Object,
    stats: Object
  }
}
```

#### `SUMMARIZE_CONTENT`
Generate a summary of content.

**Request**:
```javascript
{
  type: 'SUMMARIZE_CONTENT',
  data: {
    content: string,
    maxLength: number  // Optional
  }
}
```

**Response**:
```javascript
{
  success: true,
  summary: string
}
```

#### `ANALYZE_TAB_CONTENT`
Analyze content with AI.

**Request**:
```javascript
{
  type: 'ANALYZE_TAB_CONTENT',
  data: {
    content: string,
    prompt: string,
    options: Object  // Optional AI session options
  }
}
```

**Response**:
```javascript
{
  success: true,
  analysis: string
}
```

## Development

### Prerequisites
- Node.js (for development tools, optional)
- Chrome 138 or later
- Basic knowledge of Chrome Extension development

### Testing

1. **Manual Testing**:
   - Load the extension in developer mode
   - Test on various websites
   - Check console for errors
   - Verify AI functionality

2. **Testing AI Features**:
   - Ensure the Gemini Nano model is available
   - Test with different content types
   - Verify error handling for unavailable AI

### Debugging

1. **Service Worker Console**:
   - Go to `chrome://extensions/`
   - Click "service worker" under your extension
   - View console logs and errors

2. **Content Script Console**:
   - Open DevTools on any page (F12)
   - Content script logs appear in the page console

3. **Popup Console**:
   - Right-click the extension icon
   - Select "Inspect popup"
   - View popup-specific console

## Privacy & Security

### Data Privacy
- **No External Servers**: All AI processing happens locally on your device
- **No Data Collection**: The extension does not collect or transmit personal data
- **No Analytics**: No usage tracking or analytics
- **Local Storage Only**: Data is stored locally in Chrome's storage

### Permissions Explained
- `tabs`: Required to read tab information and titles
- `activeTab`: Required to access content of the currently active tab
- `scripting`: Required to inject content scripts for content extraction
- `storage`: Required to store settings and cache data locally
- `<all_urls>`: Required to work on any website

### Security Best Practices
- Extension uses Manifest V3 (latest security standards)
- Content Security Policy enforced
- No inline scripts or eval()
- Minimal permissions requested

## Troubleshooting

### AI Not Available
**Problem**: AI status shows "Unavailable"

**Solutions**:
1. Verify Chrome version (must be 138+)
2. Check system requirements (RAM, storage)
3. Enable the feature flag: `chrome://flags/#prompt-api-for-gemini-nano`
4. Restart Chrome after enabling the flag
5. Ensure you have sufficient disk space (22 GB)

### Model Download Issues
**Problem**: Model download fails or hangs

**Solutions**:
1. Ensure you have a stable, unmetered internet connection
2. Check available disk space
3. Try again after Chrome restart
4. Clear Chrome cache and try again

### Content Extraction Fails
**Problem**: Cannot extract content from a page

**Solutions**:
1. Check if the page has loaded completely
2. Some pages may block content scripts (e.g., chrome:// URLs)
3. Try refreshing the page
4. Check browser console for errors

### Extension Icon Not Showing
**Problem**: Extension icon doesn't appear or shows as broken

**Solutions**:
1. Ensure all icon files are present in `assets/icons/`
2. Icons must be PNG format
3. Icons must be exact sizes: 16x16, 32x32, 48x48, 128x128
4. Reload the extension after adding icons

## Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

### Code Style
- Use ES6+ JavaScript features
- Follow existing code structure
- Add comments for complex logic
- Use meaningful variable names

## Roadmap

### Planned Features
- [ ] Multi-tab comparison and analysis
- [ ] Export summaries and analyses
- [ ] Customizable AI parameters (temperature, topK)
- [ ] History of analyzed pages
- [ ] Keyboard shortcuts
- [ ] Dark mode
- [ ] Language translation integration
- [ ] Bulk processing of multiple tabs
- [ ] Save and organize analyses
- [ ] Share analysis results

## Resources

### Chrome Built-in AI Documentation
- [Built-in AI Overview](https://developer.chrome.com/docs/ai/built-in)
- [Prompt API Documentation](https://developer.chrome.com/docs/ai/built-in-apis)
- [Get Started Guide](https://developer.chrome.com/docs/ai/get-started)

### Chrome Extension Development
- [Manifest V3 Documentation](https://developer.chrome.com/docs/extensions/mv3/)
- [Chrome Extensions API](https://developer.chrome.com/docs/extensions/reference/)

### Related Projects
- [Chrome Built-in AI Challenge 2025](https://googlechromeai2025.devpost.com/)
- [WebML Community Group](https://www.w3.org/community/webmachinelearning/)

## License

MIT License - See LICENSE file for details

## Support

For issues, questions, or suggestions:
- Open an issue on GitHub
- Check existing issues for solutions
- Review the troubleshooting section

## Acknowledgments

- Built with Chrome's Built-in AI (Gemini Nano)
- Inspired by the Chrome Built-in AI Challenge 2025
- Thanks to the Chrome team for making on-device AI accessible

---

**Note**: This extension is experimental and uses Chrome's Built-in AI APIs which are still evolving. Some features may change as the APIs mature.
