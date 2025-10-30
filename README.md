# spAI-Defender

A defensive security project featuring a Chrome extension powered by Chrome's Built-in AI (Gemini Nano) to prevent social engineering attacks and analyze web content intelligently.

## Mission

spAI-Defender aims to protect users from social engineering attacks by leveraging on-device AI to analyze content sentiment, detect phishing attempts, and identify manipulation tactics - all while preserving user privacy through local processing.

## Vision

Chrome plugin to prevent social engineering. Capable of sentiment analysis, it can discover if you're being targeted by a phishing message. It will read locally your main messages on WhatsApp, Telegram, and other platforms, and give you a verdict on potential threats.

## Project Overview

spAI-Defender is a privacy-focused security tool that leverages on-device AI to:
- Analyze web content for social engineering patterns
- Detect potential phishing and manipulation attempts
- Provide sentiment analysis of messages and content
- Give intelligent insights without sending data to external servers

## Components

### Chrome Extension
A robust browser extension that reads and analyzes content from web pages using Chrome's Built-in AI.

**Current Features:**
- ✅ **Automatic page analysis** - No clicks required
- ✅ **Progressive visual alerts** - Faded red outlines (risk > 50) + badge (risk > 75)
- ✅ **Image analysis with OCR** - Detects phishing in images
- ✅ **Phishing detection** - AI-powered multi-layer detection
- ✅ **Sentiment analysis** - Identifies manipulation tactics
- ✅ **On-device AI processing** - Privacy-first, no data sent
- ✅ **Summarization API optimized** - 2x faster performance
- ✅ **Security dashboard** - Real-time statistics
- ✅ **Multi-platform support** - WhatsApp, Telegram, Gmail, Outlook
- ✅ **Visual security badge** - Appears for high risk pages
- ✅ **Custom prompts** - Ask specific security questions

**Advanced Features:**
- ✅ Progressive alert system (highlights → badge)
- ✅ Automatic background analysis
- ✅ Silent protection for low risk
- ✅ Visual guidance for medium risk
- ✅ Critical warnings for high risk

**Learn More:** See [chrome-extension/README.md](chrome-extension/README.md) for detailed documentation.

## Getting Started

### Prerequisites
- Chrome 138 or later
- 22 GB free disk space
- System requirements as specified in the extension documentation

### Quick Start

1. **Clone the repository**:
```bash
git clone https://github.com/pedrofausto/spAI-Defender.git
cd spAI-Defender
```

2. **Enable Chrome Built-in AI**:
- Navigate to `chrome://flags/#prompt-api-for-gemini-nano`
- Set to "Enabled"
- Restart Chrome

3. **Install the Chrome Extension**:
- Follow instructions in [chrome-extension/README.md](chrome-extension/README.md)

## Project Structure

```
spAI-Defender/
├── chrome-extension/        # Chrome extension with Built-in AI
│   ├── src/
│   │   ├── background/     # Service worker
│   │   ├── content/        # Content scripts
│   │   ├── popup/          # UI components
│   │   └── utils/          # Utilities and AI manager
│   ├── assets/             # Icons and resources
│   ├── docs/               # Documentation
│   └── README.md           # Extension documentation
├── README.md               # This file
└── LICENSE                 # MIT License
```

## Use Cases

### Social Engineering Defense
- Detect phishing attempts in messages and content
- Analyze sentiment to identify manipulation tactics
- Review suspicious communications locally
- Get threat verdicts on potentially dangerous content

### Security Analysis
- Analyze web pages for potential security risks
- Detect suspicious patterns in content
- Review privacy policies and terms of service
- Monitor page changes in real-time

### Content Review
- Summarize long articles and documentation
- Extract key information from web pages
- Analyze content quality and authenticity
- Custom security queries about page content

## Technology Stack

- **Chrome Built-in AI (Gemini Nano)**: On-device AI model
- **Manifest V3**: Latest Chrome extension standard
- **JavaScript ES6+**: Modern JavaScript features
- **Chrome Extension APIs**: tabs, scripting, storage

## Privacy & Security

### Privacy-First Design
- All AI processing happens locally on your device
- No data sent to external servers
- No tracking or analytics
- Local storage only
- Messages analyzed locally without transmission

### Security Features
- Manifest V3 compliance
- Content Security Policy enforced
- Minimal permissions
- No remote code execution
- Defensive security focus only

## Development

### Contributing
Contributions are welcome! Please read the development guide:
- [Chrome Extension Development Guide](chrome-extension/docs/DEVELOPMENT.md)
- [API Documentation](chrome-extension/docs/API.md)

### Development Setup
```bash
# Clone the repository
git clone https://github.com/pedrofausto/spAI-Defender.git

# Navigate to extension directory
cd spAI-Defender/chrome-extension

# Load in Chrome (chrome://extensions/ -> Load unpacked)
```

## Roadmap

### Phase 1 (Completed - ✅)
- [x] Basic Chrome extension structure
- [x] Content extraction from web pages
- [x] AI integration (Prompt API + Summarization API)
- [x] Summarization and analysis
- [x] Custom prompts
- [x] Robust architecture

### Phase 2 (Completed - ✅)
- [x] Sentiment analysis implementation
- [x] Phishing detection patterns
- [x] Automatic page analysis
- [x] Progressive visual alerts (highlights + badge)
- [x] Threat scoring system
- [x] Image analysis with OCR
- [x] Social engineering detection

### Phase 3 (Completed - ✅)
- [x] WhatsApp Web platform detection
- [x] Telegram Web platform detection
- [x] Gmail/Outlook email analysis
- [x] Multi-platform support
- [x] Real-time statistics tracking

### Phase 4 (Future)
- [ ] Real-time monitoring dashboard
- [ ] Advanced pattern recognition
- [ ] Machine learning improvements
- [ ] Community threat database
- [ ] Browser-wide protection

## Resources

### Documentation
- [Chrome Extension README](chrome-extension/README.md)
- [API Documentation](chrome-extension/docs/API.md)
- [Development Guide](chrome-extension/docs/DEVELOPMENT.md)

### External Resources
- [Chrome Built-in AI](https://developer.chrome.com/docs/ai/built-in)
- [Chrome Extensions](https://developer.chrome.com/docs/extensions/)
- [Chrome Built-in AI Challenge 2025](https://googlechromeai2025.devpost.com/)

## License

MIT License - See [LICENSE](chrome-extension/LICENSE) file for details

## Support

- Open an issue on GitHub
- Check the documentation
- Review troubleshooting guides

## Acknowledgments

- Chrome Built-in AI team for making on-device AI accessible
- Chrome Extensions team for Manifest V3
- Open source security community

---

**Note**: This project is for defensive security purposes only. It leverages Chrome's experimental Built-in AI features which are still evolving. The extension does not assist with offensive security, credential harvesting, or malicious activities. 
