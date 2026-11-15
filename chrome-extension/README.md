# spAI-Defender extension source

This folder contains the Manifest V3 extension. See the repository root `README.md` for scope, privacy facts, permissions and requirements.

## Components

- `manifest.json`: content script and host permissions limited to `https://web.whatsapp.com/*` and `https://web.telegram.org/*`.
- `src/background/service-worker.js`: message routing, sender checks for privileged requests, analysis cache, session storage of WhatsApp snapshots, install-time injection into already-open supported tabs, and the `declarativeContent` rule that enables the toolbar action only on the supported hosts.
- `src/content/content-script.js`: WhatsApp Web observer that extracts visible messages, pre-highlights them with local heuristics, requests AI analysis and marks risky chats. On Telegram Web it only answers pings and reports that the platform is not ready.
- `src/offscreen/`: offscreen document that calls Chrome's built-in AI APIs (Prompt and Summarizer).
- `src/popup/`: popup UI with English and Brazilian Portuguese strings. It is only reachable on the supported hosts.
- `src/utils/`: detectors and analyzers (phishing detector, local AI threat classifier, sentiment, linguistic and emotion analyzers, hybrid scorer, lexicons, prompt guard, analysis cache and metrics store).

## Telegram Web status

A Telegram Web adapter is planned. Until it exists, the content script stays idle on Telegram Web, the service worker answers tab content requests with `PLATFORM_NOT_READY`, and the popup shows a localized "coming soon" notice.

## Built-in AI requirements

The Chrome version, flags, disk space and hardware needed for Gemini Nano are to be verified against the official Chrome built-in AI documentation. This project does not assert specific numbers.

## Portuguese content and the rules-primary policy

Portuguese is not a documented supported language of Chrome's Prompt API (documented: en, ja, es, de, fr; see docs/chrome-ai-verified.md), and model behavior on Portuguese input is unverified. For that reason the deterministic rules in utils/scam-rules.js (exposed through PhishingDetector.quickDetect) are the primary decision maker for Portuguese content:

- Gemini Nano acts as a complement. It may raise the risk, but the final score is never below the rule score on any path (simple or advanced; valid, inconclusive, rejected, timed-out or unavailable AI).
- A SAFE or low-risk AI verdict cannot stand against a rule score of 55 or higher: the result is downgraded to inconclusive with a caution recommendation, with or without model evidence.
- In WhatsApp Web, a non-threat AI verdict cannot clear a local pre-highlight unless the local rules also see low risk.
- When the model is available and the extracted text looks Portuguese (a small accent-insensitive stopword heuristic in utils/portuguese-hint.js, used only for this note and never for scoring), the popup shows a short note in English or pt-BR saying AI analysis has limited Portuguese support and local rules are the main signal.
- A lone AI verdict is not capped when the rule score is 0: on the simple path an AI high-risk verdict with validated evidence can still raise the score. Treat that as documented behavior, not a guarantee.

Nothing here has been verified in a real Chrome build with Portuguese input.

## License

See `LICENSE` in this folder.
