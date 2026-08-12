import { describe, it, expect } from "vitest";
import { ATTENTION_CHECKS } from "../src/data/attentionChecks";
import { attentionFieldFor, attentionScore, extractAttentionResponse, pickAttentionCheck } from "../src/lib/attention";

describe("attention verification", () => {
  it("bank questions are universally valid multiple choice with a 25% guess probability", () => {
    expect(ATTENTION_CHECKS.length).toBeGreaterThanOrEqual(8);
    for (const check of ATTENTION_CHECKS) {
      expect(check.options.length).toBe(4);
      expect(check.guessProbability).toBe(0.25);
      expect(check.options.some((option) => option.value === check.correctValue)).toBe(true);
    }
  });

  it("picks a random check and can avoid repeats", () => {
    const first = pickAttentionCheck();
    const second = pickAttentionCheck([first.key]);
    expect(first.key).not.toBe(second.key);
    expect(ATTENTION_CHECKS.some((check) => check.key === first.key)).toBe(true);
  });

  it("builds a single-choice field with shuffled options and embeds the check key", () => {
    const check = ATTENTION_CHECKS[0];
    const field = attentionFieldFor(check);
    expect(field.type).toBe("single_choice");
    expect(field.config?.attentionCheckKey).toBe(check.key);
    expect(field.options).toHaveLength(4);
    // option ids embed "checkKey:value" so the answer is self-describing
    expect(field.options!.map((option) => option.id)).toEqual(
      check.options.map((option) => `${check.key}:${option.value}`),
    );
  });

  it("extracts the answer and keeps the payload clean", () => {
    const values = { site_code: "VA-001", _attention: "sky_color:blue" };
    const { values: cleaned, response } = extractAttentionResponse(values);
    expect(response).toEqual({ checkKey: "sky_color", selectedValue: "blue" });
    expect(cleaned).toEqual({ site_code: "VA-001" });
    expect("_attention" in cleaned).toBe(false);
    expect(extractAttentionResponse({ site_code: "VA-001" }).response).toBeNull();
  });

  it("scores blind guessing at zero and perfect attention at one", () => {
    const guess = Array.from({ length: 8 }, () => ({ correct: false, guessProbability: 0.25 }));
    expect(attentionScore(guess)).toBe(0);
    const perfect = Array.from({ length: 8 }, () => ({ correct: true, guessProbability: 0.25 }));
    expect(attentionScore(perfect)).toBe(1);
    // 2 of 8 correct = indistinguishable from chance
    const chance = [
      { correct: true, guessProbability: 0.25 },
      { correct: true, guessProbability: 0.25 },
      ...Array.from({ length: 6 }, () => ({ correct: false, guessProbability: 0.25 })),
    ];
    expect(attentionScore(chance)).toBeCloseTo(0, 5);
    expect(attentionScore([])).toBeNull();
  });
});
