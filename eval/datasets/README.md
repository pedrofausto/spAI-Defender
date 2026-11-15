# Evaluation datasets

## ptbr-curated.jsonl

A curated Brazilian Portuguese evaluation set of 300 short chat messages in the style of WhatsApp and Telegram: 150 labelled `scam` and 150 labelled `legit`.

### Method

- Every message was written originally for this repository. No text was copied from news articles, datasets, bank warnings or any other source.
- Messages imitate real chat writing: informal tone, missing accents, typos, abbreviations such as "vc", "pfv" and "qndo", and the occasional emoji.
- The legit half is made of hard negatives. These messages talk about PIX, number changes, verification codes, banks, deliveries, jobs, links and urgency, so a keyword-based detector cannot separate them from scams by vocabulary alone.
- All messages are synthetic. They contain no real people, phone numbers, CPFs or real URLs. Every link uses a reserved `.invalid` domain such as `example.invalid`. Banks, Correios, WhatsApp and Telegram are named only generically, the way scammers mention them.

### Fields

Each line has `id` (ptbr-0001 to ptbr-0300), `text`, `label`, `lang` (always `pt`), `source` (always `synthetic-curated`) and `category`.

### Scam categories (15 messages each)

- `pix_payment`: payment or refund requests by PIX under a pretext.
- `fake_relative_new_number`: a "relative" with a new number asking for money or a code.
- `otp_code_theft`: requests to forward a verification code.
- `fake_bank_central`: fake bank security desk, safe account, courier collecting cards.
- `fake_delivery_correios`: fake customs or redelivery fees.
- `job_task_scam`: task or like-for-pay jobs that require deposits.
- `fake_whatsapp_support`: fake messenger support asking for codes or PINs.
- `investment_crypto`: guaranteed-return investments and fake withdrawal fees.
- `fake_prize_promo`: fake prizes, cashback and promotions with fees.
- `romance_or_extortion`: romance scams, sextortion and fake police or kidnapping threats.

### Legit categories (15 messages each)

- `pix_receipt_friends`: genuine PIX receipts and requests between friends and family.
- `family_number_change`: real number-change notices with verification context.
- `otp_notification`: genuine one-time-code notifications that say not to share the code.
- `legit_bank_notice`: real bank notices and anti-fraud warnings.
- `real_delivery`: real delivery updates with nothing to pay.
- `legit_job`: genuine hiring and work conversations.
- `everyday_money_chat`: everyday chat about money.
- `everyday_links_urgency`: everyday chat with links and urgency.
- `legit_support_promo`: genuine support tickets, promotions and loyalty notices.
- `legit_relationship`: ordinary relationship and family chat.

### Limitations

The set is small and written by one author, so it reflects that author's idea of typical scams. Use it to compare detector versions and to find blind spots, not to estimate real-world accuracy.

### License

Released under the MIT License of this repository (see `LICENSE` at the repository root).

## FraudWhatsApp.Br and FraudTelegram.Br

These datasets (SBSeg 2023, LSBD/UFC) are not public and are not stored here. See `eval/scripts/fetch-fraud-br.mjs`, which converts a copy obtained from the authors into the gitignored `data/fraud-br/` folder.
