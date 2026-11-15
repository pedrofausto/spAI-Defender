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

## ptbr-independent.jsonl

A second Brazilian Portuguese evaluation set of 200 messages: 100 labelled `scam` and 100 labelled `legit`, five messages per category in 20 scam and 20 legit categories. It exists only for honest measurement.

### Rule: measurement only, never tuning

- This set must not be used to tune rules, lexicons, weights or thresholds. Do not read its messages while designing a rule.
- Any rule change should be validated on it only after the change was designed on other data, and the result should be reported as measured, whatever it is.
- If this set is used for tuning in any way, it is consumed and a new independent set must be written. The holdout of `ptbr-curated.jsonl` was already consumed, so it cannot serve this purpose.

### Method

- The messages were written from general knowledge of real Brazilian scams and real chats, without opening the detector rules, any lexicon or pattern file, or the first curated set. Only the file format and the CLI were consulted.
- All messages are synthetic. They contain no real people, phone numbers or CPFs. All domains use the reserved `.invalid` suffix and names are fictitious.

### Style differences from the first set

- Longer and messier messages, often with several lines that build trust before the ask, a conversation represented as one message with line breaks.
- Forwarded-chain text, voice-note style wording, heavy slang and regional expressions, abbreviations (vc, pq, tb, blz), missing accents, stray punctuation, ALL CAPS, emoji and some English words.
- Subtle scams with few obvious keywords, such as photo or video bait, a compromised friend asking for money, a changed PIX key or QR code, and rental deposits.
- Legit messages that are urgent or mention money, links, codes, banks and deliveries in ordinary life: family logistics, shared bills, rent, freelancer invoices, genuine support, school and work groups, real bank and app notifications that warn not to share codes, and warning chains about scams.

### Fields

`id` (ptbr2-0001 to ptbr2-0200), `text`, `label`, `lang` (always `pt`), `source` (always `synthetic-independent`) and `category`.

### Categories

Scam categories: fake_lawyer_court, fake_tax_refund, fake_utility_cutoff, fake_marketplace_buyer, fake_charity, photo_video_link_bait, compromised_friend_money, qr_pix_key_swap, fake_rental_deposit, fake_exam_job_fee, plus the original pix_payment, fake_relative_new_number, otp_code_theft, fake_bank_central, fake_delivery_correios, job_task_scam, fake_whatsapp_support, investment_crypto, fake_prize_promo and romance_or_extortion.

Legit categories, named by situation: family_logistics, shared_bills, rent_landlord, freelancer_invoice, support_genuine, school_group, work_group, bank_notification_nocode, otp_genuine, delivery_real, pix_friends, number_change_real, job_real, charity_real, tax_real_talk, utility_real, marketplace_real, links_urgency_everyday, scam_warning_forward and romance_family_chat.

### Limitations

An AI wrote this set, and an AI also wrote the first set and the rules tuned on it. Shared habits in vocabulary, phrasing and scam archetypes probably remain, so the measured results are likely still optimistic compared with real traffic. Five messages per category is too few for stable per-category figures. The `.invalid` link signal in the detector also helps on synthetic data and means nothing for real links.

### License

Released under the MIT License of this repository (see `LICENSE` at the repository root).
