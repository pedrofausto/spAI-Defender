# Evaluation harness

This folder measures how well the deterministic local detection path separates scam messages from legitimate ones. It runs entirely offline and never calls an AI model or the network.

## What is evaluated

Each message is scored with `PhishingDetector.quickDetect` from `chrome-extension/src/utils/phishing-detector.js`. That is the deterministic scorer built on the scam-pattern rules in `chrome-extension/src/utils/scam-rules.js` (see "Rule design" below). The older keyword lists in `message-risk-patterns.js` are still used by the content script pre-highlight but no longer by `quickDetect`. A message is predicted as scam when its score is at or above the threshold (55 by default, which matches the boundary of the MEDIUM level in `quickDetect`).

Gemini Nano results are not part of this harness, because the built-in model only runs inside Chrome.

## Running it

- Run `npm run eval -- eval/fixtures/sample.jsonl` to evaluate the bundled synthetic sample.
- Add `--threshold 80` to change the decision threshold.
- Add `--top 10` to list more false positives and false negatives.
- Add `--json` to print machine-readable output instead of the text report.
- Add `--split tune` or `--split holdout` to evaluate one side of the split stored next to the dataset (`<name>.split.json`), or pass `--split-file <path>`. Holdout message text is hidden in the report unless `--show-text` is given.
- When records carry a `category` field, the report also lists per-category recall (scam categories) or false-positive rate (legit categories).

The report prints precision, recall, F1 and false-positive rate overall and for each language, followed by the highest-scoring false positives and the lowest-scoring false negatives.

## Dataset format

The input is a JSONL file: one JSON object per line, blank lines ignored. Each object has these fields:

- `id`: a unique identifier for the message. Optional; the line number is used when it is missing.
- `text`: the message text. Required.
- `label`: either `scam` or `legit`. Required. The positive class is `scam`.
- `lang`: a language code such as `pt` or `en`. Optional; missing values are grouped as `unknown`.
- `source`: where the message came from, for example the dataset name. Optional.

Lines that are not valid JSON, have no text or have any other label are skipped and reported at the top of the output.

## Plugging in a dataset

- Convert the dataset to the JSONL format above, mapping its labels to `scam` or `legit` (for example, phishing, smishing and fraud to `scam`, and ham or normal to `legit`).
- Keep the original dataset name in `source` and record its license and origin next to the file.
- Store large or third-party datasets outside the repository, or check their license before committing them, and pass the path to the script.
- Remove personal data such as phone numbers before sharing results.

## Sample fixture

`fixtures/sample.jsonl` holds ten clearly synthetic messages in Portuguese and English. All links use the reserved `example.invalid` domain. The file only proves that the harness works; its scores say nothing about real-world accuracy.

## Tests

`tests/unit/eval/metrics.test.js` covers the metric computations, JSONL parsing and error ranking in `eval/metrics.js`.

## FraudWhatsApp.Br and FraudTelegram.Br

These Brazilian datasets (SBSeg 2023, LSBD/UFC) are not public and must be requested from the authors. Run `npm run eval:fetch-fraud-br` without input to see the instructions. After placing the CSV files in `data/fraud-br/raw/`, run `npm run eval:fetch-fraud-br -- --text-column <column> --label-column <column> --positive <values>` to convert them into JSONL in `data/fraud-br/`. The `data/` folder is gitignored and its contents must never be committed, because the messages may contain personal data protected by the LGPD. The script makes no network calls. `tests/unit/eval/fraud-br-converter.test.js` covers the converter with a synthetic CSV.

## Curated Portuguese set

`datasets/ptbr-curated.jsonl` holds 300 synthetic Brazilian Portuguese chat messages with hard negatives. See `datasets/README.md`.

## Tune and holdout split

`datasets/ptbr-curated.split.json` was produced by `node eval/scripts/make-split.mjs eval/datasets/ptbr-curated.jsonl` (seed 20261114). Within each category and label, ids are ordered by a seeded hash and 60 percent go to `tune`, the rest to `holdout`: 180 and 120 messages, 9 and 6 per category. Rules are designed only against the tune split. The holdout split is run once after the rules are frozen, and its message text should not be read.

## Rule design

The scorer in `chrome-extension/src/utils/scam-rules.js` works in three layers.

Normalization and cues:
- Text is normalized with Unicode NFD, diacritics are stripped, everything is lowercased and apostrophes are dropped, so "Código" and "codigo" match the same pattern.
- URLs are replaced by a neutral token before word matching, so host names such as "example" or "premio" do not trigger word cues. URLs are inspected separately.
- Atomic cues use word boundaries, so "shopping" never matches "pin" and "pixel" never matches "pix". Cues cover Portuguese and English: new number or identity change, money request, request to share a code or password, request for personal or bank data, urgency, threat, payment or fee demand, link or click wording, authority names, remote access and safe-account procedures, bank pretexts, paid-task jobs, guaranteed returns, prizes, deliveries, romance stories, extortion, PIX refund or new-key pretexts, fake app features, warnings and educational wording.

Negation:
- For request-type cues, a match is ignored when a negator (nao, nunca, jamais, nem, ninguem, never, not, dont, nobody) appears within four words before it in the same clause, or when it is followed by "a ninguem", "com ninguem", "with anyone" and similar.
- A comma or a contrastive word (mas, but, porem, however) starts a new clause, so "do not click, but pay now" still counts as a payment request.
- A shorter pattern inside the span of a negated longer one is negated too.

Families and scoring:
- Sixteen families combine cues into scam patterns: identity change plus money request, share a code, credential or data request with link or pressure, urgency or threat plus payment, fake bank central, task or exam job plus deposit or fee, investment with guaranteed return or withdrawal fee, prize plus fee or link, delivery plus fee, romance or extortion plus money, PIX pretext (payment target swap, or a "mistaken" PIX plus pressure), friend money request (inability to talk, secrecy, or urgency with a repayment promise), photo or video curiosity bait plus link, rental offer with upfront deposit, fake charity appeal with a payment target, and fake app or support threat.
- Each family scores only its strongest matching rule, which caps it. Families are combined with diminishing weight: the strongest counts in full, the second at half and the rest at a quarter.
- With no family match, isolated cues add only a few points and cannot reach the alert threshold of 55.
- Structural link findings (shortener, raw IP, punycode, lure words in a hyphenated host, link text that shows a different domain, and the non-resolvable `.invalid` domain at half weight) add up to 20 points, and at most 15 when no family matched.
- Educational wording subtracts 18, warning wording ("pode ser golpe", "nunca pedimos", "desconfie") subtracts 20 and official-channel wording subtracts 10, but only when no un-negated code, credential, fee, remote-access, identity-change or pressure-payment signal is present.
- Every matched family and link finding produces an evidence string, which `quickDetect` returns in `matches`, `suspiciousPhrases` and `evidence`.

Awareness context and legit payment chat (added after the first independent validation):
- A message is in awareness context when it carries one strong scam-talk marker (golpe, fraude, golpistas, "nao caiam", "repassem", "circulando", "ignore") or two weak ones ("cuidado", "alerta", "atencao", "aviso"), and no request cue is addressed to the reader. Request cues are a code or password request, a data request, a money request, a fee demand, remote access and a click or download verb. An occurrence is quoted or described, and therefore not addressed to the reader, when it sits inside quotation marks or its sentence starts with a reporting word such as "pedem", "dizendo", "recebi" or "se alguem te mandar". The bare word "link" is a description and is not a request. In awareness context the score is multiplied by 0.3 and an `awareness_context` evidence line is added. If any request cue is addressed to the reader ("me manda o codigo", "clique", "pague a taxa"), no discount applies, so a lure cannot hide behind warning words.
- A due date ("vence dia 10") is no longer urgency. Pressure words such as "urgente", "agora", "expira" and "ultimo aviso" still are.
- Phrases that state nothing is owed ("frete gratis", "nada a pagar", "sem custo") are removed before cue detection.
- "qr code" and "codigo de barras" are no longer read as secret codes.
- "Pix errado, pode devolver?" alone scores 35. It reaches the threshold only with urgency, a link, secrecy or a new key.
- `scoreMessage` exposes the flag as a top-level `awareness` field. The `quickDetect` return shape and its `context` object are unchanged.

Known limits:
- The same author wrote the curated set and the rules, so tune results overstate real accuracy. The drop from tune to holdout shows how much the rules fit the wording of the tune messages.
- Messages that carry no request yet (for example "this is my new number, save it") are left to the AI classifier on purpose, because the legit family messages look the same.
- The `.invalid` link signal reflects the reserved domain used in the synthetic data and has no meaning for real traffic.

## Tune-extra set

`datasets/ptbr-tune-extra.jsonl` holds 154 new synthetic messages (74 scam, 80 legit, ids ptbr3-0001 to ptbr3-0154, source `synthetic-tune-extra`) that were written after the first independent validation, before any rule change, from general knowledge of Brazilian chats and the aggregate category-level findings of that validation. It is tuning data, like the tune split. Run it with `npm run eval -- eval/datasets/ptbr-tune-extra.jsonl`.

## Independent set and baseline

`datasets/ptbr-independent.jsonl` is a second, independently written set of 200 messages (100 scam, 100 legit) used only for measurement. It must not be used for tuning. See `datasets/README.md`. The holdout of the first curated set was already consumed during rule design, so this set is the only remaining unbiased check.

Baseline measured once on the unchanged detector at threshold 55, with `npm run eval -- eval/datasets/ptbr-independent.jsonl --top 10`: precision 80.3 percent, recall 61.0 percent, F1 69.3 percent, false-positive rate 15.0 percent (TP 61, FP 15, TN 85, FN 39). Weakest scam categories were photo_video_link_bait (0 of 5), fake_rental_deposit and qr_pix_key_swap (1 of 5 each). Legit categories with the most false positives were scam_warning_forward (3 of 5), delivery_real, pix_friends, tax_real_talk and utility_real (2 of 5 each).


## Second round on the independent set (contaminated)

After the awareness and payment-chat changes, `datasets/ptbr-independent.jsonl` was run exactly once more, with `--top 0` and the output redirected to a file so that no message text was displayed. The result is contaminated: the aggregate category-level findings of the first run (which legit situations produced false positives and which scam categories were missed) shaped the design, so the improvement is optimistic. The independent set is now consumed twice and must not be used to judge further changes. The next validation needs a fresh set from a different source, for example messages written by people who have not seen the rules, or consented and anonymized real traffic, with the tune-extra and curated sets kept for tuning only.

Measured at threshold 55:
- Independent set, before: precision 80.3 percent, recall 61.0 percent, F1 69.3 percent, false-positive rate 15.0 percent (TP 61, FP 15, TN 85, FN 39).
- Independent set, after (contaminated): precision 88.8 percent, recall 71.0 percent, F1 78.9 percent, false-positive rate 9.0 percent (TP 71, FP 9, TN 91, FN 29). The under-5-percent false-positive target is not met. Remaining false positives were most frequent in delivery_real (2 of 5) and scam_warning_forward (2 of 5), with one each in charity_real, pix_friends, shared_bills, tax_real_talk and utility_real.
- Tune split of the curated set (180 messages): before and after both recall 97.8 percent, false-positive rate 0.0 percent.
- Tune-extra (154 messages, in-sample): before precision 75.0 percent, recall 48.6 percent, false-positive rate 15.0 percent (FP 12 of 80); after precision 100.0 percent, recall 98.6 percent, false-positive rate 0.0 percent. This set was used to iterate, so it overstates real accuracy.
- Curated set, full 300 messages: before precision 95.9 percent, recall 77.3 percent, false-positive rate 3.3 percent; after precision 96.7 percent, recall 78.0 percent, false-positive rate 2.7 percent. The holdout part of the curated set was already consumed in earlier work and was run for these aggregates only (before: recall 46.7 percent, false-positive rate 8.3 percent; after: recall 48.3 percent, false-positive rate 6.7 percent). The large gap between tune and holdout recall shows how closely the scam rules fit the tune wording.
- Bundled sample (10 messages): 100 percent before and after.

Caveats: all data is synthetic and the same author family wrote the sets and the rules, nothing was run in a real browser, and category sizes of 5 per category on the independent set are too small for stable per-category figures.
