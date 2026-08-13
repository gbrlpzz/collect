import { describe, expect, it } from "vitest";
import {
  formatCalendarDate,
  formatExactTime,
  formatRelativeTime,
} from "../src/lib/formatTime";

describe("human-readable time formatting", () => {
  it("uses localized relative status without losing the exact value", () => {
    const value = "2026-08-12T11:45:00Z";
    expect(formatRelativeTime(value, new Date("2026-08-12T12:00:00Z"))).toBe(
      "15 minutes ago",
    );
    expect(formatExactTime(value)).toBeTruthy();
    expect(formatCalendarDate(value)).toBeTruthy();
  });

  it("preserves already-readable non-date status copy", () => {
    expect(formatRelativeTime("No submissions yet")).toBe("No submissions yet");
  });
});
