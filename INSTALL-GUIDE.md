# 🚀 Quick Installation Guide - spAI-Defender

## ⚡ Quick Steps (5 minutes)

### 1️⃣ Enable Native AI (2 min)

1. Open Chrome
2. Go to: `chrome://flags`
3. Search: `prompt-api-for-gemini-nano`
4. Change to: **Enabled**
5. **RESTART Chrome** ⚠️ (CRITICAL)

### 2️⃣ Load Extension (1 min)

1. Open: `chrome://extensions/`
2. Enable **"Developer mode"** (toggle top-right corner)
3. Click **"Load unpacked"**
4. Select folder: `chrome-extension`
5. ✅ Done! Extension installed

### 3️⃣ Test (2 min)

1. Click the 🛡️ spAI-Defender icon in Chrome toolbar
2. Navigate to any website
3. ✨ **Watch it auto-analyze automatically!**
4. If risk > 50: Look for subtle red outlines around suspicious text
5. If risk > 75: See the red shield badge appear
6. 🎉 See the results!

---

## 🎯 Complete Test

### Quick Test (30 seconds)

```bash
1. Open any website
2. Wait 3-5 seconds
3. See automatic analysis
4. Check for red outlines on suspicious text
5. See badge if high risk
```

### Complete Test (5 minutes)

1. **Auto-Analysis**
   - Open 3-4 different websites
   - Watch auto-highlighting work
   - Check statistics incrementing

2. **Phishing Detection**
   - Open suspicious site
   - Check automatic risk score
   - Verify badge appears
   - Check highlighted elements

3. **Sentiment Analysis**
   - Run sentiment analysis
   - Check manipulation detection

4. **Custom Prompt**
   - Ask custom question
   - Verify contextual answer

---

## 🔧 Troubleshooting

### ❌ "AI Status: Unavailable"

**Solution:**
- Verify feature flag is Enabled
- Restart Chrome (IMPORTANT)
- Check Chrome version (must be 138+)
- Check system resources

### ⬇️ Model needs download

**Solution:**
- First time normal (1-2 GB)
- Need stable internet connection
- Wait for automatic download

### 🔴 Buttons disabled

**Solution:**
- Extract content first
- Check if AI is available
- Check console (F12) for errors

### 🔍 Highlights not appearing

**Solution:**
- Check if page is analyzed (console log)
- Ensure risk score > 30
- Check if text contains suspicious patterns
- Reload page

---

## 📊 File Structure

```
chrome-extension/
├── manifest.json          # Extension configuration
├── src/
│   ├── background/
│   │   └── service-worker.js    # Main worker + handlers
│   ├── content/
│   │   ├── content-script.js    # Page script with auto-analysis
│   │   └── security-badge.js    # Visual badge
│   ├── popup/
│   │   ├── popup.html          # Extension UI
│   │   ├── popup.css           # Styles
│   │   └── popup.js            # Popup logic
│   └── utils/
│       ├── ai-session-manager.js    # AI manager
│       ├── phishing-detector.js     # Phishing detector
│       ├── sentiment-analyzer.js    # Sentiment analyzer
│       ├── platform-detector.js     # Platform detector
│       └── image-analyzer.js         # Image analyzer with OCR
└── TESTING.md              # Complete testing guide
```

---

## 🎬 Demo for Contest

### Demo Script (2 minutes)

**0:00-0:20** - Introduction
> "spAI-Defender uses Chrome's native AI to protect against phishing. All processed locally, zero data sent."

**0:20-0:40** - Show Dashboard
> "See real-time statistics: current risk, threats blocked, pages analyzed."

**0:40-1:20** - Live Demo
> "I'll scan a suspicious site... Watch the subtle red outlines appear around suspicious text. See the badge show up."

**1:20-1:50** - Auto-Analysis
> "Best part: it analyzes automatically. No clicks needed. Silent protection, smart highlights."

**1:50-2:00** - Wrap-up
> "Fully local, private, and powerful. Open source."

---

## ✨ Implemented Features

- ✅ Automatic phishing detection
- ✅ Visual text highlighting  
- ✅ Security badge on page
- ✅ Dashboard with statistics
- ✅ Multi-platform detection
- ✅ Custom prompts
- ✅ Persistent statistics
- ✅ Modern UI
- ✅ Image analysis with OCR ⭐
- ✅ Summarization API optimized ⭐

---

## 🚀 Start Now!

1. Follow the 3 steps above
2. Test the features
3. Use the code for your own learning
4. Good luck in the contest!

**Total time:** 5 minutes ⏱️
