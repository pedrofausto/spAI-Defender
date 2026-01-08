# AI Diagnostics Script (spAI-Defender)

Use this to find out why Chrome Built-in AI (Gemini Nano / Prompt API) is not being used by the extension.

## Where to run it

1. Open `chrome://extensions`
2. Enable Developer mode
3. Find **spAI-Defender**
4. Click **Service worker** → **Inspect**
5. Paste the script below into the **Service worker DevTools console**

## Script

```javascript
(async () => {
  const res = await chrome.runtime.sendMessage({ type: 'RUN_AI_DIAGNOSTICS' });
  console.log('RUN_AI_DIAGNOSTICS response:', res);

  if (res?.report) {
    console.log('AI diagnostics report:', res.report);
  }
})();
```

## How to interpret the report

- If `report.offscreenApi.present` is false: your Chrome/environment does not expose the offscreen API to this extension context.
- If `report.availability` is `no`: the offscreen document likely does not have `self.LanguageModel` (or capabilities call failed).
- If `report.offscreen.languageModelPresent` is false: Built-in AI is not available in offscreen context, even if it is available in page context.
- If `report.errors` has entries: the `area` field points to the failing step.


