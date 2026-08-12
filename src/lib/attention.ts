import type { FieldDefinition } from "../types";
import {
  ATTENTION_CHECKS,
  ATTENTION_FIELD_KEY,
  shuffleOptions,
  type AttentionCheck,
} from "../data/attentionChecks";

export interface AttentionResponse {
  checkKey: string;
  selectedValue: string;
}

/**
 * Automatic attention verification: every observation gets ONE random check,
 * injected after the first couple of questions. The answer is collected as a
 * normal multiple-choice field, stripped from the research payload, and
 * recorded on the server where correctness is computed from the bank.
 */
export function pickAttentionCheck(excludeKeys: string[] = []): AttentionCheck {
  const available = ATTENTION_CHECKS.filter(
    (check) => !excludeKeys.includes(check.key),
  );
  const pool = available.length ? available : ATTENTION_CHECKS;
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * The synthetic field the collector renders. Options are shuffled per
 * presentation so a memorized position never helps.
 */
export function attentionFieldFor(check: AttentionCheck): FieldDefinition {
  return {
    id: `attention-${check.key}`,
    key: ATTENTION_FIELD_KEY,
    label: "Quick check",
    type: "single_choice",
    description: "One quick question to keep the record verifiable.",
    required: true,
    semantic_uri: null,
    config: {
      attentionCheckKey: check.key,
      guessProbability: check.guessProbability,
    },
    // Option ids embed "checkKey:value" so the collected answer is
    // self-describing when it reaches the submit builder.
    options: shuffleOptions(check).map((option) => ({
      id: `${check.key}:${option.value}`,
      value: option.value,
      label: option.label,
    })),
  };
}

/** Pull the answer out of the collected values; the payload stays clean. */
export function extractAttentionResponse(values: Record<string, unknown>): {
  values: Record<string, unknown>;
  response: AttentionResponse | null;
} {
  const raw = values[ATTENTION_FIELD_KEY];
  const cleaned = { ...values };
  delete cleaned[ATTENTION_FIELD_KEY];
  if (typeof raw !== "string" || !raw.includes(":"))
    return { values: cleaned, response: null };
  const separator = raw.indexOf(":");
  return {
    values: cleaned,
    response: {
      checkKey: raw.slice(0, separator),
      selectedValue: raw.slice(separator + 1),
    },
  };
}

/**
 * Human-readable attention score line. The server stores the score on a
 * 0-100 scale; a contributor with no checks yet has nothing to show.
 */
export function formatAttentionScore(
  score: number | null,
  total: number | null,
): string | null {
  if (score === null || total === null || total <= 0) return null;
  return `${Math.round(score)}/100 · ${total} checks`;
}

/**
 * Guess-adjusted attention score over a set of responses:
 * score = (correct - expected_by_chance) / (total - expected_by_chance),
 * clamped to [0,1]. 0 = indistinguishable from blind guessing.
 */
export function attentionScore(
  responses: Array<{ correct: boolean; guessProbability: number }>,
): number | null {
  if (!responses.length) return null;
  const total = responses.length;
  const observed = responses.filter((response) => response.correct).length;
  const expected = responses.reduce(
    (sum, response) => sum + response.guessProbability,
    0,
  );
  if (total - expected <= 0) return 1;
  return Math.max(0, Math.min(1, (observed - expected) / (total - expected)));
}
