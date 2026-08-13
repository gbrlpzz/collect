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
  selectionCheck("select_orange", { value: "orange", label: "Orange" }, [
    { value: "purple", label: "Purple" },
    { value: "brown", label: "Brown" },
    { value: "gray", label: "Gray" },
  ]),
  selectionCheck("select_seven", { value: "seven", label: "7" }, [
    { value: "six", label: "6" },
    { value: "eight", label: "8" },
    { value: "nine", label: "9" },
  ]),
  selectionCheck("select_triangle", { value: "triangle", label: "Triangle" }, [
    { value: "oval", label: "Oval" },
    { value: "diamond", label: "Diamond" },
    { value: "star", label: "Star" },
  ]),
  selectionCheck("select_river", { value: "river", label: "River" }, [
    { value: "road", label: "Road" },
    { value: "roof", label: "Roof" },
    { value: "room", label: "Room" },
  ]),
  selectionCheck("select_olive", { value: "olive", label: "Olive" }, [
    { value: "oak", label: "Oak" },
    { value: "pine", label: "Pine" },
    { value: "willow", label: "Willow" },
  ]),
  selectionCheck("select_friday", { value: "friday", label: "Friday" }, [
    { value: "wednesday", label: "Wednesday" },
    { value: "sunday", label: "Sunday" },
    { value: "monday", label: "Monday" },
  ]),
  selectionCheck("select_large", { value: "large", label: "Large" }, [
    { value: "small", label: "Small" },
    { value: "narrow", label: "Narrow" },
    { value: "short", label: "Short" },
  ]),
  selectionCheck("select_c", { value: "c", label: "C" }, [
    { value: "a", label: "A" },
    { value: "b", label: "B" },
    { value: "d", label: "D" },
  ]),
  selectionCheck("select_third", { value: "third", label: "Third" }, [
    { value: "first", label: "First" },
    { value: "second", label: "Second" },
    { value: "fourth", label: "Fourth" },
  ]),
  selectionCheck("select_left", { value: "left", label: "Left" }, [
    { value: "right", label: "Right" },
    { value: "up", label: "Up" },
    { value: "down", label: "Down" },
  ]),
  selectionCheck("select_closed", { value: "closed", label: "Closed" }, [
    { value: "open", label: "Open" },
    { value: "paused", label: "Paused" },
    { value: "unknown", label: "Unknown" },
  ]),
  selectionCheck("select_tree", { value: "tree", label: "Tree" }, [
    { value: "stone", label: "Stone" },
    { value: "water", label: "Water" },
    { value: "house", label: "House" },
  ]),
  selectionCheck("select_stone", { value: "stone", label: "Stone" }, [
    { value: "soil", label: "Soil" },
    { value: "sand", label: "Sand" },
    { value: "steel", label: "Steel" },
  ]),
  selectionCheck("select_water", { value: "water", label: "Water" }, [
    { value: "wood", label: "Wood" },
    { value: "window", label: "Window" },
    { value: "wall", label: "Wall" },
  ]),
  selectionCheck("select_house", { value: "house", label: "House" }, [
    { value: "field", label: "Field" },
    { value: "road", label: "Road" },
    { value: "river", label: "River" },
  ]),
  selectionCheck("select_zero", { value: "zero", label: "0" }, [
    { value: "one", label: "1" },
    { value: "five", label: "5" },
    { value: "ten", label: "10" },
  ]),
  selectionCheck("select_hexagon", { value: "hexagon", label: "Hexagon" }, [
    { value: "pentagon", label: "Pentagon" },
    { value: "octagon", label: "Octagon" },
    { value: "oval", label: "Oval" },
  ]),
  selectionCheck("select_white", { value: "white", label: "White" }, [
    { value: "black", label: "Black" },
    { value: "gray", label: "Gray" },
    { value: "beige", label: "Beige" },
  ]),
  selectionCheck("select_true", { value: "true", label: "True" }, [
    { value: "false", label: "False" },
    { value: "maybe", label: "Maybe" },
    { value: "unknown", label: "Unknown" },
  ]),
  selectionCheck("select_middle", { value: "middle", label: "Middle" }, [
    { value: "start", label: "Start" },
    { value: "end", label: "End" },
    { value: "edge", label: "Edge" },
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
