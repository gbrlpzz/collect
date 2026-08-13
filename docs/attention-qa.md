# Attention verification

`collect` can include one low-complexity verification question in each observation. The server validates the answer and maintains an advisory contributor-level summary.

The mechanism is intended to help a research team interpret possible inattention. It is not an automatic exclusion rule, competence assessment, or substitute for protocol-specific data-quality review.

## End-to-end flow

```text
select configured check
  → shuffle options
  → render after at least two research fields
  → separate the synthetic answer from research values
  → commit the answer as provenance
  → validate against the server bank
  → record one idempotent result
  → update the advisory summary
```

## Check bank

The repository contains a default bank of four-option questions in:

- `src/data/attentionChecks.ts` for offline rendering;
- `supabase/migrations/20260812140000_attention_checks.sql` for server validation.

Each entry has a stable key, prompt, options, correct value, and blind-guess probability. Client and server entries must remain synchronized.

The default bank is illustrative rather than universally appropriate. Before deployment, review every question for:

- interface language and translation;
- expected literacy and numeracy;
- cultural and geographic assumptions;
- disability and accessibility implications;
- respondent age and education;
- the research protocol’s ethics and consent requirements.

A question can be simple without being population-neutral. Deployments should replace or disable unsuitable entries.

## Injection

- One check is selected per observation.
- The previous key is avoided when possible.
- Options are shuffled for each presentation.
- The check appears after at least two research fields.
- The reserved field key is `_attention`.
- The contributor sees the neutral label **Quick check**.

The administrator preview includes the same interaction, but preview responses are not persisted.

## Separation from research data

The selected option identifier encodes `checkKey:selectedValue`. Before the research payload is hashed and stored, `extractAttentionResponse()`:

1. removes `_attention` from the typed research values;
2. carries `checkKey` and `selectedValue` separately on the durable submission.

The prompt text is not copied into the observation payload, attention response row, or checkpoint data. The stable key remains in exports so a deployment can interpret the result against its documented bank.

## Server validation

`sync-submission`:

1. selects the active server-side check by key;
2. compares the selected value with `correct_value`;
3. writes one `attention_responses` row per submission;
4. sets `submissions.attention_failed`;
5. calls `recompute_attention_score()`.

The server does not trust a client-provided correctness flag. Retries are idempotent.

## Score

For checks with guess probability \(p\), the contributor-level score is:

\[
\text{score} =
\max\left(0,
\frac{\text{observed correct} - \text{expected by chance}}
{\text{total} - \text{expected by chance}}
\right)
\]

The stored value is clamped to 0–100. With four-option checks, \(p = 0.25\).

| Result             | Interpretation                                                                |
| ------------------ | ----------------------------------------------------------------------------- |
| No checks          | No score; displayed as unavailable                                            |
| 100                | Every recorded check was correct                                              |
| 0                  | Performance does not exceed the configured chance baseline, or falls below it |
| Intermediate value | Guess-adjusted proportion above chance                                        |

Small samples are unstable. The interface and exports therefore include the number of checks as well as the score. A single value must not be used to rank contributors or discard observations automatically.

## Visibility and export

- Contributors see their score and count in Profile with an explanation.
- Administrators can see the advisory summary while reviewing readiness.
- `data/attention.csv` contains per-submission results.
- `data/contributors.csv` contains aggregate score and count fields.
- `submissions.attention_failed` provides a direct record-level flag.

The application never changes, removes, or refuses a local observation because of an incorrect check. A missing or invalid response is advisory provenance rather than an ingestion gate.

## Invariants

1. Correctness is derived by the server.
2. `_attention` never remains in the research payload.
3. One response row exists per submission.
4. Retry cannot double-count a response.
5. The score is explanatory metadata, not an automatic decision.
6. Question suitability is a deployment responsibility.

## Configure the bank

To add or change a check:

1. create a new migration rather than editing an applied migration;
2. update the client bank with the same stable key and options;
3. set the correct value and probability explicitly;
4. add tests for rendering, stripping, and server interpretation;
5. document the deployment-specific validation and translation process.

To stop server interpretation of an existing check, set its `active` value to `false` through an ordered migration.

## Related documentation

- [Privacy and data handling](privacy.md)
- [Checkpoint export format](export-format.md)
- [Background automation](background-automation.md)
- [Architecture](architecture.md)
