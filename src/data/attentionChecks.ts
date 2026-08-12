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

/**
 * The attention-check bank. MUST stay in sync with the server seed in
 * supabase/migrations/20260812140000_attention_checks.sql: the server only
 * trusts check_key + selected_value and computes correctness itself.
 * All questions are universally valid (never personal) and multiple choice
 * with four options, so the blind-guess probability is 25%.
 */
export const ATTENTION_CHECKS: AttentionCheck[] = [
  { key: "sky_color", prompt: "On a clear day, what color is the sky?", options: [{ value: "blue", label: "Blue" }, { value: "green", label: "Green" }, { value: "red", label: "Red" }, { value: "yellow", label: "Yellow" }], correctValue: "blue", guessProbability: 0.25 },
  { key: "triangle_sides", prompt: "How many sides does a triangle have?", options: [{ value: "two", label: "2" }, { value: "three", label: "3" }, { value: "four", label: "4" }, { value: "five", label: "5" }], correctValue: "three", guessProbability: 0.25 },
  { key: "add_two_two", prompt: "What is 2 + 2?", options: [{ value: "three", label: "3" }, { value: "four", label: "4" }, { value: "five", label: "5" }, { value: "six", label: "6" }], correctValue: "four", guessProbability: 0.25 },
  { key: "sun_rise", prompt: "In which direction does the sun rise?", options: [{ value: "west", label: "West" }, { value: "north", label: "North" }, { value: "east", label: "East" }, { value: "south", label: "South" }], correctValue: "east", guessProbability: 0.25 },
  { key: "which_fruit", prompt: "Which of these is a fruit?", options: [{ value: "carrot", label: "Carrot" }, { value: "apple", label: "Apple" }, { value: "potato", label: "Potato" }, { value: "onion", label: "Onion" }], correctValue: "apple", guessProbability: 0.25 },
  { key: "winter_month", prompt: "Which month falls in winter in the northern hemisphere?", options: [{ value: "july", label: "July" }, { value: "december", label: "December" }, { value: "may", label: "May" }, { value: "september", label: "September" }], correctValue: "december", guessProbability: 0.25 },
  { key: "water_boils", prompt: "At sea level, what is the boiling point of water in degrees Celsius?", options: [{ value: "50", label: "50°C" }, { value: "100", label: "100°C" }, { value: "150", label: "150°C" }, { value: "200", label: "200°C" }], correctValue: "100", guessProbability: 0.25 },
  { key: "week_days", prompt: "How many days are in a week?", options: [{ value: "five", label: "5" }, { value: "six", label: "6" }, { value: "seven", label: "7" }, { value: "eight", label: "8" }], correctValue: "seven", guessProbability: 0.25 },
  { key: "multiply_three_three", prompt: "What is 3 × 3?", options: [{ value: "six", label: "6" }, { value: "nine", label: "9" }, { value: "twelve", label: "12" }, { value: "fifteen", label: "15" }], correctValue: "nine", guessProbability: 0.25 },
  { key: "which_planet", prompt: "Which of these is a planet?", options: [{ value: "moon", label: "The Moon" }, { value: "sun", label: "The Sun" }, { value: "mars", label: "Mars" }, { value: "star", label: "A star" }], correctValue: "mars", guessProbability: 0.25 },
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
