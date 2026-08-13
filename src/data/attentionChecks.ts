export interface AttentionOption {
  value: string;
  label: string;
}

export interface AttentionCheck {
  key: string;
  prompt: string;
  options: AttentionOption[];
  correctValue: string;
  guessProbability: number;
}

function selectionCheck(
  key: string,
  correct: AttentionOption,
  distractors: AttentionOption[],
): AttentionCheck {
  const options = [correct, ...distractors];
  if (options.length !== 4) {
    throw new Error(`Attention check ${key} must have exactly four options`);
  }
  return {
    key,
    prompt: `For this attention check, select “${correct.label}”.`,
    options,
    correctValue: correct.value,
    guessProbability: 1 / options.length,
  };
}

/**
 * A deliberately literal attention-check bank. The prompt and correct answer
 * are generated from the same option, which prevents question/answer drift.
 * Checks measure whether the instruction was read; they never depend on
 * geography, scientific knowledge, culture, season, or personal experience.
 *
 * This bank MUST stay synchronized with the active rows inserted by
 * 20260813073000_curate_attention_checks.sql. The server trusts only the key
 * and selected value and derives pass/fail independently.
 */
export const ATTENTION_CHECKS: AttentionCheck[] = [
  selectionCheck("select_blue", { value: "blue", label: "Blue" }, [
    { value: "green", label: "Green" },
    { value: "red", label: "Red" },
    { value: "yellow", label: "Yellow" },
  ]),
  selectionCheck("select_three", { value: "three", label: "3" }, [
    { value: "two", label: "2" },
    { value: "four", label: "4" },
    { value: "five", label: "5" },
  ]),
  selectionCheck("select_circle", { value: "circle", label: "Circle" }, [
    { value: "square", label: "Square" },
    { value: "triangle", label: "Triangle" },
    { value: "rectangle", label: "Rectangle" },
  ]),
  selectionCheck("select_field", { value: "field", label: "Field" }, [
    { value: "file", label: "File" },
    { value: "filled", label: "Filled" },
    { value: "find", label: "Find" },
  ]),
  selectionCheck("select_north", { value: "north", label: "North" }, [
    { value: "east", label: "East" },
    { value: "south", label: "South" },
    { value: "west", label: "West" },
  ]),
  selectionCheck("select_yes", { value: "yes", label: "Yes" }, [
    { value: "no", label: "No" },
    { value: "maybe", label: "Maybe" },
    { value: "unknown", label: "Unknown" },
  ]),
  selectionCheck("select_tuesday", { value: "tuesday", label: "Tuesday" }, [
    { value: "monday", label: "Monday" },
    { value: "thursday", label: "Thursday" },
    { value: "saturday", label: "Saturday" },
  ]),
  selectionCheck("select_small", { value: "small", label: "Small" }, [
    { value: "large", label: "Large" },
    { value: "wide", label: "Wide" },
    { value: "tall", label: "Tall" },
  ]),
  selectionCheck("select_b", { value: "b", label: "B" }, [
    { value: "a", label: "A" },
    { value: "c", label: "C" },
    { value: "d", label: "D" },
  ]),
  selectionCheck("select_second", { value: "second", label: "Second" }, [
    { value: "first", label: "First" },
    { value: "third", label: "Third" },
    { value: "fourth", label: "Fourth" },
  ]),
];

/** The synthetic payload key used for the attention answer. */
export const ATTENTION_FIELD_KEY = "_attention";

export function shuffleOptions(check: AttentionCheck): AttentionOption[] {
  const options = [...check.options];
  for (let i = options.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }
  return options;
}
