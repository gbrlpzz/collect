import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { ATTENTION_CHECKS } from "../src/data/attentionChecks";
import {
  attentionFieldFor,
  attentionScore,
  extractAttentionResponse,
  formatAttentionScore,
  pickAttentionCheck,
} from "../src/lib/attention";

describe("attention verification", () => {
  it("keeps every prompt and answer internally consistent", () => {
    expect(ATTENTION_CHECKS.length).toBeGreaterThanOrEqual(8);
    expect(new Set(ATTENTION_CHECKS.map((check) => check.key)).size).toBe(
      ATTENTION_CHECKS.length,
    );
    for (const check of ATTENTION_CHECKS) {
      expect(check.options.length).toBe(4);
      expect(check.guessProbability).toBe(0.25);
      expect(new Set(check.options.map((option) => option.value)).size).toBe(4);
      expect(new Set(check.options.map((option) => option.label)).size).toBe(4);
      const correctOptions = check.options.filter(
        (option) => option.value === check.correctValue,
      );
      expect(correctOptions).toHaveLength(1);
      expect(check.prompt).toContain(`“${correctOptions[0].label}”`);
    }
  });

  it("keeps the client bank synchronized with the server migration", () => {
    const migration = readFileSync(
      new URL(
        "../supabase/migrations/20260813073000_curate_attention_checks.sql",
        import.meta.url,
      ),
      "utf8",
    );
    for (const check of ATTENTION_CHECKS) {
      const correct = check.options.find(
        (option) => option.value === check.correctValue,
      )!;
      expect(migration).toContain(`'${check.key}'`);
      expect(migration).toContain(check.prompt);
      expect(migration).toContain(
        `{"value":"${correct.value}","label":"${correct.label}"}`,
      );
    }
  });

  it("picks a random check and can avoid repeats", () => {
    const first = pickAttentionCheck();
    const second = pickAttentionCheck([first.key]);
    expect(first.key).not.toBe(second.key);
    expect(ATTENTION_CHECKS.some((check) => check.key === first.key)).toBe(
      true,
    );
  });

  it("builds a single-choice field with shuffled options and embeds the check key", () => {
    const check = ATTENTION_CHECKS[0];
    const field = attentionFieldFor(check);
    expect(field.type).toBe("single_choice");
    expect(field.label).toBe(check.prompt);
    expect(field.config?.attentionCheckKey).toBe(check.key);
    expect(field.config?.attentionCheck).toBe(true);
    expect(field.options).toHaveLength(4);
    // option ids embed "checkKey:value" so the answer is self-describing;
    // the presentation order is shuffled, so compare as sets.
    expect(field.options!.map((option) => option.id).sort()).toEqual(
      check.options.map((option) => `${check.key}:${option.value}`).sort(),
    );
  });

  it("extracts the answer and keeps the payload clean", () => {
    const values = { site_code: "VA-001", _attention: "select_blue:blue" };
    const { values: cleaned, response } = extractAttentionResponse(values);
    expect(response).toEqual({
      checkKey: "select_blue",
      selectedValue: "blue",
    });
    expect(cleaned).toEqual({ site_code: "VA-001" });
    expect("_attention" in cleaned).toBe(false);
    expect(
      extractAttentionResponse({ site_code: "VA-001" }).response,
    ).toBeNull();
  });

  it("formats the attention score for the account menu and readiness list", () => {
    expect(formatAttentionScore(92.4, 24)).toBe("92/100 · 24 checks");
    expect(formatAttentionScore(0, 1)).toBe("0/100 · 1 checks");
    expect(formatAttentionScore(null, 24)).toBeNull();
    expect(formatAttentionScore(80, null)).toBeNull();
    expect(formatAttentionScore(80, 0)).toBeNull();
  });

  it("scores blind guessing at zero and perfect attention at one", () => {
    const guess = Array.from({ length: 8 }, () => ({
      correct: false,
      guessProbability: 0.25,
    }));
    expect(attentionScore(guess)).toBe(0);
    const perfect = Array.from({ length: 8 }, () => ({
      correct: true,
      guessProbability: 0.25,
    }));
    expect(attentionScore(perfect)).toBe(1);
    // 2 of 8 correct = indistinguishable from chance
    const chance = [
      { correct: true, guessProbability: 0.25 },
      { correct: true, guessProbability: 0.25 },
      ...Array.from({ length: 6 }, () => ({
        correct: false,
        guessProbability: 0.25,
      })),
    ];
    expect(attentionScore(chance)).toBeCloseTo(0, 5);
    expect(attentionScore([])).toBeNull();
  });
});
