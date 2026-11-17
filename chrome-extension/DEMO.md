# spAI-Defender: Chrome test guide

This guide walks through loading the extension in desktop Chrome and checking the behavior that has only been read in code so far. Nothing in this project has been run in a real Chrome yet. The goal of this session is to find out what actually works.

## What has and has not been verified

Verified by automated tests (Jest, simulated Chrome APIs): scoring rules, message handling, popup states, sender validation, storage handling. The test suite and the build pass.

Not verified in a real browser, and the reason for this guide:

- The extension loads without errors and shows its icon.
- The toolbar icon stays grey, with no popup and no notice, on every site except WhatsApp Web and Telegram Web.
- The Prompt API works inside the offscreen document. The official docs only document top-level windows, so this is the biggest open question.
- A model download started from the popup becomes usable by the offscreen document.
- The popup download button and progress bar behave correctly.
- Message highlighting on a real WhatsApp Web page, whose page structure may differ from the selectors in the code.
- Quality of Gemini Nano on Brazilian Portuguese text. Portuguese is not a documented supported language.

Telegram Web support is not implemented yet. The extension is allowed to run there but does nothing useful.

## Requirements

These come from the official Chrome pages saved on 2026-11-15 (see `docs/chrome-ai-verified.md` at the repository root, with source URLs):

- Desktop Chrome on Windows 10 or 11, macOS 13 or later, Linux, or a Chromebook Plus. Phones and tablets are not supported.
- At least 22 GB of free disk space on the drive that holds the Chrome profile.
- A GPU with more than 4 GB of video memory, or a CPU with at least 16 GB of RAM and 4 cores.
- An unmetered internet connection for the first model download only. Afterwards the model runs offline.
- Node.js and npm, to build the extension from source.

Not verified: the minimum Chrome version for the Prompt API in extensions. The documentation is ambiguous between 138 and 148. Use a current stable Chrome and write down the version from `chrome://version`.

Not verified: whether any `chrome://flags` setting is needed. The official pages do not list a required flag for stable Chrome. Do not enable flags at first. If the AI status stays "Unavailable" on a machine that meets the requirements, say so in your report and we will investigate flags using the official documentation.

## Step 1: get the code and build it

1. Clone the repository and check out the branch `ccr-a9c76cc0-ffccc1`.
2. In the repository root, run `npm install`.
3. Run `npm run build`. It should end with a line saying the build finished and create a `dist` folder at the repository root.

The folder to load into Chrome is the `dist` folder at the repository root, not the `chrome-extension` folder. The source folder contains files the bundler has not processed yet.

## Step 2: load the extension

1. Open `chrome://extensions`.
2. Turn on Developer mode, in the top right.
3. Click Load unpacked and select the `dist` folder.
4. Check that the extension card appears with no red "Errors" button and with an icon.
5. Pin the extension to the toolbar using the puzzle piece menu, so you can see the icon.

Report any error text exactly as shown, including the file name.

## Step 3: confirm the extension stays silent on other sites

Open each of these tabs and look at the toolbar icon:

- An ordinary website such as a news site.
- A new tab page.
- A `chrome://` page such as `chrome://extensions`.

Expected: the icon is greyed out, clicking it opens nothing, and the page shows no banner, outline, overlay or message of any kind. Right click the icon: the entries may still appear, which is normal Chrome behavior.

If a popup opens, or the page shows anything, on a site that is not WhatsApp Web or Telegram Web, that is a bug. Report the site and what appeared.

## Step 4: open WhatsApp Web and check the popup

1. Open `https://web.whatsapp.com/` and sign in with the QR code, as usual.
2. Open any chat so that messages are visible.
3. Click the extension icon. It should now be in color and open a popup.

Look at the AI status chip at the top of the popup. It shows one of four states:

- Available: the model is ready. Continue to step 6.
- Download required: the model has not been downloaded. Continue to step 5.
- Downloading: a download is in progress. Wait, then reopen the popup.
- Unavailable: this device or this Chrome cannot run the model. Write down your Chrome version, operating system, free disk space, GPU and RAM, and skip to step 8.

## Step 5: download the model

Only needed when the status says "Download required".

1. Click the Download model button in the popup. This click is what gives Chrome the user activation it requires.
2. Keep the popup open. A progress bar should fill and show a label.
3. When it finishes, the popup should say the model is downloaded and the status should become Available.

Things to note for the report:

- Did the progress bar move, and did it reach the end?
- If you close the popup during the download, does the download continue? Reopen the popup and check the status. This is not documented and we need the answer.
- Did any error text appear?

Analysis is intentionally paused until the status is Available.

## Step 6: check the analysis on harmless sample messages

The extension skips messages you send yourself, both for the quick local highlight and for the AI analysis, so a chat with yourself will not show highlights. Use a second account or ask a friend to send you these fictional messages, or paste them into a group where it is fine to do so. They contain no real links or numbers.

Message that should be flagged as risky:

- "Oi mae, esse e meu numero novo, salva ai. To com problema no banco, me faz um pix urgente de 500 que eu te explico depois"

Message that should NOT be flagged, because it warns people about scams:

- "Gente, cuidado com o golpe do numero novo que ta circulando. Nunca façam pix sem ligar pra pessoa."

Message that should NOT be flagged, ordinary chat about money:

- "Segue o comprovante do pix da pizza de ontem, valeu!"

After each message arrives, wait a few seconds and look at the chat and then at the popup. Expected:

- The risky message gets an amber outline in the chat, and the popup shows an elevated risk score with evidence lines.
- The two harmless messages get no outline.
- The popup shows the classification, the Portuguese note about limited AI language support, and a "Reanalyze" action for WhatsApp.

The accuracy of the local rules is limited. On synthetic test data, they miss a share of scams and flag a share of normal messages. Single wrong results are expected and useful to record, but they are not a bug in the extension loading or the pipeline.

Record for each message: what the popup showed, whether the chat outline appeared, and whether the AI part ran or the popup said it was unavailable or paused.

## Step 7: privacy checks

The promise is that nothing leaves the machine apart from Chrome's own model download.

1. Open `chrome://extensions`, find the extension, and click the "service worker" link under Inspect views to open its developer tools. If an offscreen page is listed there too, open that as well.
2. In each developer tools window, open the Network tab, keep it open, and use the extension on WhatsApp Web as in steps 4 to 6.
3. Expected: no requests to any external address made by the extension. Requests that belong to WhatsApp Web itself belong to the page, not to the extension.
4. Open the Console tab. Expected: no message text, no sender names and no chat names printed. Operational lines are fine.
5. In the service worker developer tools, open Application and then Storage. The WhatsApp snapshot and chat history should be in Session storage, not in Local storage. Local storage should hold no chat messages. Threat records there should contain only a time, a risk score, a risk level, a classification, the platform and two counts. Any page address, title, sender name, message text or evidence snippet in Local storage is a bug: report the key name and what it contained, without copying private text.

Report anything that contradicts these expectations.

## Step 8: what to send back

Please send, in any format:

- Chrome version from `chrome://version`, operating system, free disk space, GPU, RAM.
- The AI status shown in step 4, and what happened in step 5 if you ran it.
- Result of step 2: any errors, with exact text.
- Result of step 3: whether anything appeared on other sites.
- Result of step 6 for each message.
- Result of step 7.
- Any red error lines from the service worker, offscreen or popup consoles, copied exactly.

The two most valuable answers are whether the model analysis ran at all in the offscreen document after the status became Available, and what happens to a download when the popup is closed. Everything else can be fixed from there.

## Troubleshooting

- The extension card shows errors: copy the text and the file path, then send it.
- The popup says analysis is paused: the model is not Available yet. Check the status chip.
- Nothing is highlighted on WhatsApp Web: the page structure may differ from what the code expects. Open the service worker console and look for errors, and note the exact time and message.
- You changed the code and want to rebuild: run `npm run build` again and click the reload arrow on the extension card in `chrome://extensions`.
