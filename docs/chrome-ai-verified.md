# Chrome built-in AI: verified facts

Verification date: 2026-11-15. All facts below were taken from copies of the official pages saved on 2026-11-15 by the coordinator through the session proxy (the WebFetch tool could not resolve developer.chrome.com). The saved pages are the origin of every statement. Nothing here was run in a real Chrome.

Sources (exact URLs fetched):

- Prompt API page: https://developer.chrome.com/docs/ai/prompt-api (page text says "Last updated 2026-08-26 UTC" in the footer and "Last updated: October 21, 2026" in the header).
- Extensions Prompt API URL: https://developer.chrome.com/docs/extensions/ai/prompt-api. Its text content is identical to the page above after tag stripping (only page-embedded tokens differ), so it is the same page via redirect. A separate extensions-specific Prompt API page was therefore not found.
- Extensions and AI landing page: https://developer.chrome.com/docs/extensions/ai (it links to the Prompt API and to demo extensions but contains no technical contract).
- Get started: https://developer.chrome.com/docs/ai/get-started (footer date not shown in the fetched text; header says "Last updated: May 20, 2025", yet it contains Chrome 149 language text, so treat the header date as stale).
- Offscreen reference: https://developer.chrome.com/docs/extensions/reference/api/offscreen (Last updated 2026-11-10 UTC).
- Summarizer API: https://developer.chrome.com/docs/ai/summarizer-api.

## (a) API shape

From the Prompt API page and the get-started page:

- The API is the global `LanguageModel`.
- `LanguageModel.availability(options)` is asynchronous. The Prompt API page says to "always pass the same options to the availability() function that you use in prompt() or promptStreaming()" because some models may not support certain modalities or languages.
- The get-started page lists exactly four return values: "unavailable" (device or requested session options not supported; may be insufficient power or disk space), "downloadable" (additional downloads needed; "User activation may be required to call create()"), "downloading" (downloads ongoing and must complete before a session can be used), and "available" (a session can be created immediately). The old strings "readily", "after-download" and "no" do not appear on any fetched page.
- `LanguageModel.create(options)` accepts, per the pages: `monitor(m)` with `m.addEventListener('downloadprogress', (e) => ...)` where `e.loaded` is used as a fraction (the sample multiplies by 100); `signal` (an AbortSignal that destroys the session); `initialPrompts`; `expectedInputs` and `expectedOutputs`; and, for extensions, `topK` and `temperature` (both or neither).
- `expectedInputs` entries have a `type` of text, image or audio. `expectedOutputs` allows text only. Each can carry a `languages` array. For `expectedInputs` the page says to set the system prompt language plus one or more user prompt languages.
- The Prompt API page says it "accepts en, ja, es, de, and fr" and that support for additional languages is in development. The get-started page says "From Chrome 149, the models support English, Spanish, Japanese, German, and French for input and output text." Portuguese is NOT listed for input or output. An unsupported input or output may raise a `NotSupportedError` DOMException.
- `session.prompt(input, { responseConstraint, omitResponseConstraintInput, signal })` and `promptStreaming()` exist. `responseConstraint` takes a JSON Schema (or regular expression per the page text). `omitResponseConstraintInput` is documented.
- `session.destroy()` exists and aborts ongoing execution. `session.clone()`, `session.append()` and `session.measureContextUsage()` are documented.
- Quota and usage names are `session.contextUsage` and `session.contextWindow`, plus a `contextoverflow` event. `QuotaExceededError` carries `requested` and `contextWindow`. The names `inputQuota` and `inputUsage` do not appear anywhere in the fetched pages.
- `LanguageModel.params()` is documented as available only in Chrome Extensions, returning `defaultTopK`, `maxTopK`, `defaultTemperature`, `maxTemperature`. The page caution says "For Chrome Extensions, legacy sampling parameters (topK, temperature) and LanguageModel.params() still exist." On the web, a `samplingMode` option is under an origin trial.
- `LanguageModel.capabilities()` is not mentioned anywhere in the fetched pages. The pages neither confirm it was removed nor document it. This is treated as unverified removal.
- The option `outputLanguage` that this extension passes to `create()` and `prompt()` is not documented on the Prompt API page (it documents `expectedOutputs` languages instead). Unverified.

## (b) Minimum Chrome version, flags, origin trial

- The Prompt API page shows version badges "Chrome 148" and "Chrome 138" without labels in the text, so the mapping (for example web versus extensions) is ambiguous. The Summarizer page states explicitly "The Summarizer API is available from Chrome 138 stable." A minimum stable version for the Prompt API in extensions is therefore not firmly established by the fetched text. Treat Chrome 138 as the likely floor but unverified.
- The page says "Extensions Developers should remove the expired origin trial permissions: "permissions": ["aiLanguageModelOriginTrial"]". So no origin trial permission is needed. This extension's manifest does not use it.
- The get-started page says that if an API is in an origin trial the extension must register for it. No flag requirement for stable use is stated on the fetched pages. Whether any chrome://flags setting is needed for the Prompt API in extensions today is unverified.

## (c) Contexts that expose the API

- The page says: "By default, the Prompt API is only available to top-level windows and to their same-origin iframes", delegable to cross-origin iframes with `allow="language-model"`. It also says "The Prompt API isn't available in Web Workers for now."
- Consequences, as inferred from those statements: an extension page such as the popup is a top-level window, so it should work. An extension service worker is a worker and so is documented as not supported. Content scripts and offscreen documents are not named on the Prompt API page. The offscreen document is a document with a window, but no page states that the Prompt API is exposed there. The offscreen architecture currently used by this repository is therefore not confirmed by the docs. Unverified in a real browser.
- Recommendation to the owner: the docs do not show the Prompt API working in the service worker, so do not remove the offscreen architecture based on docs alone.

## (d) User activation for the download

- Prompt API page: "To trigger the download and instantiate the language model, check for user activation. Then, call the create() function."
- Get-started page: when availability is "downloadable" or "downloading", "the user must meaningfully interact with your page" before `create()`, checkable with `navigator.userActivation.isActive`.
- Consequence: the create-with-monitor call that starts a download should run in a page the user just clicked in. An offscreen document never receives the user's click, so it cannot satisfy this itself. Whether a click in the popup can start a download that the offscreen document later benefits from (shared model, same extension origin) is not stated by the docs. Unverified.

## (e) Hardware, OS, disk, network

From the Prompt API and get-started pages:

- Operating system: Windows 10 or 11; macOS 13 or later; Linux; or ChromeOS from Platform 16389.0.0 on Chromebook Plus devices. Android, iOS and non-Chromebook-Plus ChromeOS are not supported for the APIs that use foundation models.
- Storage: at least 22 GB free on the volume holding the Chrome profile. The model should be significantly smaller. If free space falls below 10 GB after download, the model is removed and redownloads when requirements are met again.
- GPU or CPU: GPU with strictly more than 4 GB of VRAM, or CPU with 16 GB of RAM or more and 4 or more cores. Audio input requires a GPU.
- Network: unlimited data or an unmetered connection, for the initial download only. Afterwards no network connection is needed and no data is sent to Google or any third party when using the model.
- The model download is separate from Chrome: "the model is downloaded separately the first time an origin uses the API."

## (f) chrome.offscreen reasons

From the offscreen reference page, valid Reason values are: TESTING, AUDIO_PLAYBACK, IFRAME_SCRIPTING, DOM_SCRAPING, BLOBS, DOM_PARSER, USER_MEDIA, DISPLAY_MEDIA, WEB_RTC, CLIPBOARD, LOCAL_STORAGE, WORKERS, BATTERY_STATUS, MATCH_MEDIA, GEOLOCATION.

- DOM_SCRAPING is defined as needing "to embed an iframe and scrape its DOM to extract information". Running a local AI model is not that.
- No Reason describes running a local AI model. TESTING is "for testing purposes only". Of the reasons whose description covers something this extension actually does, none fits the model; the closest honest descriptions are WORKERS (spawning workers; the offscreen code does not spawn workers), or BLOBS and DOM_PARSER (not used for the AI). The docs therefore show that no Reason fits.
- Only AUDIO_PLAYBACK sets a lifetime limit (closes after 30 seconds without audio). All other reasons set no lifetime limit.
- `createDocument` requires `url`, `reasons` and `justification`. `chrome.offscreen.hasDocument()` is marked Chrome 150+ in the reference; `runtime.getContexts()` is Chrome 116+. The proxy (`ai-offscreen-proxy.js`) therefore checks for an existing offscreen document with `chrome.runtime.getContexts()` first, falls back to `chrome.offscreen.hasDocument()` only when `getContexts` is missing, and finally to its own in-memory record. A creation error saying only a single offscreen document may be created is treated as success. This order is covered by Jest tests only, not by a real Chrome run.
- The page notes that the API is available as `browser.*` from Chrome 148 and that `chrome.*` is still the namespace this repository uses.

## Still unverified

- Whether the Prompt API is exposed inside an offscreen document, a service worker or a content script (only top-level windows, same-origin iframes and non-availability in Web Workers are documented).
- Whether a model download started from the popup is visible to the offscreen document's availability() call afterwards, and whether closing the popup mid-download cancels it.
- The exact minimum stable Chrome version for the Prompt API in extensions, and any flags needed.
- Whether `LanguageModel.capabilities()` and the `outputLanguage` option still exist.
- Portuguese: not listed as supported. Behaviour with Portuguese chat text as input is unverified.
