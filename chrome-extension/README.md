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

## License

See `LICENSE` in this folder.
