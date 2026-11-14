# Evaluation harness

This folder measures how well the deterministic local detection path separates scam messages from legitimate ones. It runs entirely offline and never calls an AI model or the network.

## What is evaluated

Each message is scored with `PhishingDetector.quickDetect` from `chrome-extension/src/utils/phishing-detector.js`. That is the lexicon-based heuristic scorer, built on the shared keyword lexicon in `chrome-extension/src/utils/message-risk-patterns.js`. A message is predicted as scam when its score is at or above the threshold (55 by default, which matches the boundary of the MEDIUM level in `quickDetect`).

Gemini Nano results are not part of this harness, because the built-in model only runs inside Chrome.

## Running it

- Run `npm run eval -- eval/fixtures/sample.jsonl` to evaluate the bundled synthetic sample.
- Add `--threshold 80` to change the decision threshold.
- Add `--top 10` to list more false positives and false negatives.
- Add `--json` to print machine-readable output instead of the text report.

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
