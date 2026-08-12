# Automatic attention QA

Low-quality survey data is not a UI problem; it is a **data-quality problem**
that corrupts every downstream analysis. `collect` embeds a lightweight,
fully automatic attention verification in every observation — no extra taps,
no visible "test", and nothing stored that could embarrass a contributor.

> Status: implemented and committed. Client bank `src/data/attentionChecks.ts`
> must stay in sync with the server seed
> `supabase/migrations/20260812140000_attention_checks.sql` (both files say so
> in comments). The migration ships with `npm run provision`.

---

## 1. Why

A tired, distracted, or rushed field worker produces noise. Classic quality
controls are retrospective (outlier detection after the fact) or intrusive
(interrupting the flow with "are you sure?" dialogs). Attention checks are the
middle path used by survey science: **one trivial question that a careful
respondent always gets right and a careless one may miss**. Because the answer
is verifiable, every observation earns a per-contributor quality signal that
is comparable across contributors and projects.

## 2. How it works, end to end

```text
collector opens
  └─ pick 1 random check from the bank (per observation)
       └─ options shuffled (memorized positions never help)
            └─ injected as a normal single-choice question somewhere after question 2
                 └─ contributor answers (auto-advances, like any choice)
                      └─ answer travels as values["_attention"] = "checkKey:value"
                           └─ submission.ts strips it from the research payload
                                └─ server validates answer against ITS OWN bank
                                     └─ records attention_responses (idempotent)
                                          └─ recomputes the contributor's score
                                               └─ score surfaces to contributor + admin + exports
```

### 2.1 The bank

Ten universally valid, culturally neutral four-option checks
(`src/data/attentionChecks.ts`, mirrored by the server migration), each with a
blind-guess probability of exactly **0.25**:

- "On a clear day, what color is the sky?" → Blue
- "How many sides does a triangle have?" → 3
- "What is 2 + 2?" → 4
- "In which direction does the sun rise?" → East
- "Which of these is a fruit?" → Apple
- "Which month falls in winter in the northern hemisphere?" → December
- "At sea level, what is the boiling point of water in degrees Celsius?" → 100
- "How many days are in a week?" → 7
- "What is 3 × 3?" → 9
- "Which of these is a planet?" → Mars

Every question is valid for any literate adult, in any season, anywhere on
Earth — deliberately designed so that **failure correlates with attention,
never with knowledge, culture, or local conditions**.

### 2.2 Injection

- One random check per **observation** (not per session), chosen with
  `pickAttentionCheck`, avoiding the previous check's key when possible.
- Inserted after at least the first two questions of the guided flow, while attention
  is freshest (the flow already orders high-effort questions first).
- Options are shuffled per presentation, so a memorized screen position never
  helps.
- The synthetic field uses the reserved key `_attention`, is required, and
  auto-advances like any single-choice answer. The contributor sees a calm
  "Quick check" question — nothing labels it as a test.

### 2.3 Collection and stripping

The selected option's id encodes the answer self-descriptively:
`sky_color:blue`. It rides through the normal draft/save path as
`values["_attention"]`, then `extractAttentionResponse` (submission.ts):

- **removes** `_attention` from the research payload — the observation data
  scientists receive never contains it, and the payload hash is computed on
  the clean payload;
- **carries** `{ checkKey, selectedValue }` separately on the observation and
  the durable submission record, so it survives retries and restarts.

### 2.4 Server validation

`sync-submission` re-derives everything from its **own** bank:

1. looks up the check by key where `active = true`;
2. compares the selected value with `correct_value`;
3. inserts into `attention_responses` (unique per `submission_id`, so retries
   are idempotent);
4. stores the binary flag `submissions.attention_failed` on the submission;
5. calls `recompute_attention_score(user)` to refresh the profile.

The server never trusts the client's claim about correctness — the client
doesn't even send one.

### 2.5 The score

The per-contributor score is guess-adjusted:

```
score = (observed_correct − expected_by_chance) / (total − expected_by_chance)
```

clamped to [0, 1] and stored as 0–100 on `contributor_profiles.attention_score`.

| Scenario                                                       | Score       |
| -------------------------------------------------------------- | ----------- |
| Everything correct                                             | 100         |
| Exactly what blind guessing predicts (e.g. 2 of 8 with p=0.25) | 0           |
| Below chance                                                   | 0 (clamped) |
| No checks yet                                                  | null        |

A score of 0 therefore does **not** mean "this person is bad" — it means
"indistinguishable from random clicking". A single miss barely moves it; the
score only becomes meaningful as checks accumulate.

### 2.6 Visibility

- **Contributor**: their own score (with the number of checks) in the account
  menu — private to them.
- **Administrator**: score and check count on every contributor row in the
  readiness lists and the export panel.
- **Exports**: `data/attention.csv` (per submission: check key, selected
  value, correct, guess probability, timestamp) and the score columns in
  `data/contributors.csv`.

### 2.7 Privacy

Only `check_key`, `selected_value`, and the derived flag are stored. The
**question text is never persisted anywhere** — not in the payload, not in the
database, not in exports. There is nothing in the dataset that could
embarrass a contributor or reveal what the check was.

---

## 3. Invariants

1. **The server is the authority.** Correctness is computed server-side from
   the server's bank; the client bank is only for offline rendering.
2. **The payload stays clean.** `_attention` is stripped before hashing,
   storage, or export of research data.
3. **Idempotent.** One `attention_responses` row per submission; retries and
   crash-recovery never double-record.
4. **Non-blocking.** A missing or invalid check never blocks ingestion —
   attention is advisory provenance, not a gate on the data path.
5. **Never personal.** Questions are universally valid; no contributor data
   is used to pick or personalize a check.

---

## 4. Configuration and extension

- Add a check: append an entry to `ATTENTION_CHECKS` **and** to the server
  migration seed (same key, prompt, options, correct value, probability).
  Keep the probability meaningful: 4 options ⇒ 0.25.
- Disable: set `active = false` on the server row; the client still renders
  its copy but the server ignores the answer (no response row is written).
- Previewing a form: the admin **Preview flow** also shows the Quick check,
  but preview answers never persist (see `docs/background-automation.md`).

---

## 5. Related documentation

- `docs/dataset-standards.md` — FAIR metadata and exports (attention data is
  part of every checkpoint).
- `docs/background-automation.md` — the automation suite this feature sits in.
- `docs/export-format.md` — `data/attention.csv` specification.
