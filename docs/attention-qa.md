# Attention verification

`collect` embeds one simple instruction check into each observation. The server validates the answer, records an explicit pass/fail result, and maintains an advisory quality score for each contributor.

This mechanism helps research teams detect inattentive responses. It is **not** an automated filter or exclusion rule. It never discards research observations.

---

## Workflow

```text
Select random check from local bank
  → Shuffle option order
  → Insert after a random research field
  → Contributor answers question
  → Strip synthetic field from research payload
  → Commit check key and selected answer to IndexedDB
  → Server verifies answer against authoritative bank
  → Server updates contributor advisory score atomically
```

---

## Question bank design

The default question bank contains 30 four-choice questions stored in:

- `src/data/attentionChecks.ts` (offline client bank).
- `supabase/migrations/20260812140000_attention_checks.sql` (server validation table).

Each check contains a stable key, prompt, option list, correct value, and guess probability ($p = 0.25$).

Example check:

> "For this attention check, select **Blue**."
> Options: `[Red, Blue, Green, Yellow]`

The default bank uses direct selection instructions rather than knowledge questions. It avoids assumptions about culture, education, or scientific background.

---

## Separation from research data

The attention check is provenance metadata, not scientific data:

1. The client reserves the field key `_attention`.
2. Before hashing or persisting the research payload, `extractAttentionResponse()` strips `_attention` from the dataset.
3. The durable submission stores only the stable `checkKey` and `selectedValue`.
4. Check prompt text is never stored in observation rows.

---

## Server validation and scoring

The `sync-submission` Edge Function:

1. Retrieves the active check by key from PostgreSQL.
2. Compares the submitted answer with `correct_value`.
3. Inserts an idempotent record into `public.attention_responses`.
4. Sets `submissions.attention_failed` (`true` if incorrect, `false` if correct).
5. Invokes `recompute_attention_score()` to recalculate the contributor's score.

### Chance-adjusted scoring formula

The contributor score adjusts for blind guessing:

\[
\text{score} = \max\left(0, \frac{\text{observed correct} - \text{expected by chance}}{\text{total checks} - \text{expected by chance}}\right) \times 100
\]

With 4 options ($p = 0.25$):

| Result           | Meaning                                                      |
| :--------------- | :----------------------------------------------------------- |
| **No checks**    | Displayed as unavailable (`null`).                           |
| **100**          | All attention checks answered correctly.                     |
| **0**            | Accuracy is at or below the random chance baseline ($25\%$). |
| **Intermediate** | Normalized accuracy above chance.                            |

---

## Data visibility and exports

- **Contributors**: View their aggregate score and total checks in **Profile**.
- **Administrators**: View advisory summaries in the readiness dashboard.
- **Export packages**:
  - `data/attention.csv`: Per-submission audit log (`submission_id`, `check_key`, `selected_value`, `passed`).
  - `data/contributors.csv`: Contributor summaries (`attention_score`, `attention_checks_total`, `attention_correct_total`).

---

## Technical invariants

1. **Server authority**: The server derives correctness against its own table; client claims are ignored.
2. **Payload isolation**: Attention answers never pollute the research payload or data dictionary.
3. **Idempotency**: Retried submissions cannot duplicate score contributions.
4. **Advisory status**: Attention failures never block ingestion or delete observations.

---

## Related documentation

- [Privacy and data handling](privacy.md)
- [Checkpoint export format](export-format.md)
- [Background automation](background-automation.md)
- [Architecture](architecture.md)
