# spAI-Defender

spAI-Defender is a Chrome (Manifest V3) extension that warns about scam, phishing and social engineering messages inside web messaging apps. Analysis runs on the device using Chrome's built-in AI (Gemini Nano) plus deterministic local heuristics.

## Scope

- WhatsApp Web (https://web.whatsapp.com): working. Visible chat messages are scored locally, suspicious bubbles are outlined, and the chat list shows a risk marker.
- Telegram Web (https://web.telegram.org): planned. The content script is injected but stays idle, and the popup shows a "coming soon" notice there.
- Every other site: the extension does nothing. It has no host permission there, injects no script, and its toolbar icon stays disabled (greyed out, no popup). This is enforced with `chrome.declarativeContent`, which only enables the action on the two hosts above.

## How detection works

Detection is layered. Each layer runs locally.

- Local heuristics: a shared keyword lexicon (`chrome-extension/src/utils/message-risk-patterns.js`) scores credential requests, urgency, authority impersonation, rewards, payment requests and link calls to action, with damping for educational or negated wording. The content script uses it to pre-highlight messages in amber immediately.
- Gemini Nano: the service worker forwards message text to an offscreen document, which calls Chrome's built-in Prompt API (`LanguageModel`) with a structured, delimiter-guarded prompt. Only a validated malicious result escalates a highlight to red. When the model is unavailable the result is reported as inconclusive rather than guessed.
- Supporting analyzers: sentiment, linguistic and emotion (valence, arousal, dominance) analyzers built on weighted phishing lexicons, combined by a hybrid scorer.

## Privacy

- No network calls. The extension source contains no `fetch`, XHR or WebSocket usage, and all model inference uses the on-device Chrome built-in AI APIs.
- WhatsApp chat snapshots and the recent or dangerous chat history are kept in `chrome.storage.session`, which is cleared when the browser session ends. Copies left in local storage by older versions are removed on startup.
- `chrome.storage.local` holds metadata only: analysis events (platform, classification, risk level, score, latency, counts) and a threat history of risk level, score and timestamp, both limited to the last seven days. Message text, chat names, page titles and full URLs are not stored there.
- Logs that could contain message text or chat names are gated behind a `DEBUG` flag that is off by default.

## Permissions

- `scripting`: inject the content script into WhatsApp Web or Telegram Web tabs that were already open when the extension was installed or updated.
- `storage`: session snapshots and local metadata described above.
- `offscreen`: host the document that talks to the built-in AI APIs.
- `declarativeContent`: enable the toolbar action only on the two supported hosts.
- Host permissions: `https://web.whatsapp.com/*` and `https://web.telegram.org/*` only.

## Requirements

Chrome built-in AI availability depends on the Chrome version, enabled flags or origin trials, the operating system, free disk space and GPU or CPU resources. These requirements change between releases, so the exact values are to be verified against the official Chrome documentation for built-in AI (developer.chrome.com, "Built-in AI" and "Prompt API" pages) before relying on them. Without the model, the local heuristics still run and AI-backed results are reported as inconclusive.

## Install for development

- Install dependencies with `npm install`.
- Load the `chrome-extension/` folder as an unpacked extension from `chrome://extensions` with Developer mode enabled.
- Open WhatsApp Web and click the toolbar icon to see the popup.

## Tests

- Run `npx jest` (or `npm test`) to run the unit test suite against the source files.
- Run `npm run test:coverage` for a coverage report.

## Repository layout

- `chrome-extension/`: extension source (manifest, service worker, content script, offscreen document, popup, shared utilities).
- `tests/`: Jest unit tests and Chrome API mocks.

## License

See `LICENSE`.
