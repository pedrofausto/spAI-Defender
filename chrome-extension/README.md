# spAI-Defender extension source

This folder contains the Manifest V3 extension. See the repository root `README.md` for scope, privacy facts, permissions and requirements.

## Components

- `manifest.json`: content script and host permissions limited to `https://web.whatsapp.com/*` and `https://web.telegram.org/*`.
- `src/background/service-worker.js`: message routing, sender checks for privileged requests, analysis cache, session storage of WhatsApp snapshots, install-time injection into already-open supported tabs, and the `declarativeContent` rule that enables the toolbar action only on the supported hosts.
- `src/content/content-script.js`: WhatsApp Web observer that extracts visible messages, pre-highlights them with local heuristics, requests AI analysis and marks risky chats. On Telegram Web it only answers pings and reports that the platform is not ready.
- `src/offscreen/`: offscreen document that calls Chrome's built-in AI APIs (Prompt and Summarizer).
- `src/popup/`: popup UI with English and Brazilian Portuguese strings. It is only reachable on the supported hosts.
- `src/utils/`: detectors and analyzers (phishing detector, local AI threat classifier, sentiment, linguistic and emotion analyzers, hybrid scorer, lone AI verdict cap, lexicons, prompt guard, analysis cache and metrics store).

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
- A lone AI verdict is capped when the rule score is below 20, as described in the next section.

Nothing here has been verified in a real Chrome build with Portuguese input.

## Lone AI verdict cap

The lone AI verdict policy is implemented in `src/utils/lone-ai-verdict.js` and applied on both the simple and the advanced detection paths of `PhishingDetector`, and on the social-engineering path.

- The floor is a rule score of 20. The cap is a final score of 54, just below the scam threshold of 55.
- When the rule score is below 20 (including 0), a risky AI verdict cannot push the final score above 54. The result is then reported as SUSPICIOUS, which means "needs review". A malicious classification (PHISHING, SCAM or SOCIAL_ENGINEERING) is replaced by SUSPICIOUS, the recommendation WARNING or DANGEROUS becomes CAUTION, and the social-engineering flag is cleared. The result carries `loneAiVerdictCapped: true`.
- In the WhatsApp content script, a SUSPICIOUS result gets the medium (amber) highlight, not the malicious (red) outline.
- The heuristic floor still holds. The AI never lowers the score below the rule score, and with a rule score below 20 the cap is never below the rule score.
- When the rule score is 20 or higher, the cap does not apply. An AI verdict can then raise the score as before, up to 100. The "Seu pix foi estornado, confirme seus dados aqui" example scores 40 under the rules and can be raised above the cap.
- The cap also applies when the advanced path's hybrid weighting lifts a capped verdict. The cap is applied after the weighting.
- Threat tracking keeps counting results above 50, so a capped result of 54 is still recorded in the local threat history. A capped social-engineering verdict is not counted as a social-engineering threat.
- The cap reads only the rule score and the final score. It does not change scam-rules.js scoring, the eval datasets or the sentiment and linguistic components.

Limitation: the cap depends on the rule score. A non-benign text that the rules do not recognize (score below 20) is capped even when the AI is correct. Such text is shown as needing review, not as an alarm. This policy is a design decision, not a measured result, and it has not been checked against a real Chrome build.

## AI analysis and outgoing WhatsApp messages

The content script sends a message to AI analysis only when its direction is incoming or cannot be determined. Messages the user sent (direction out) get neither the AI call nor the local pre-highlight.

## Threat history privacy

The threat history in `chrome.storage.local` keeps only the timestamp, risk score and level, classification, platform, and counts of signals and evidence. Evidence strings, URLs, titles, senders and message text are not stored. The service worker rewrites older records that still carry removed fields on each start, and records older than 7 days or beyond the 250-record cap are dropped.

## License

See `LICENSE` in this folder.
