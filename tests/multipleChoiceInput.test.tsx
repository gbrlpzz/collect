// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import * as React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { FieldRenderer } from "../src/components/FieldRenderer";
import type { FieldDefinition, FormValue } from "../src/types";

const multipleChoiceField: FieldDefinition = {
  id: "field-features",
  key: "visible_features",
  label: "Visible features",
  type: "multiple_choice",
  description: "Select every feature visible.",
  options: [
    { id: "feature-stone", value: "stone", label: "Stonework" },
    { id: "feature-timber", value: "timber", label: "Timber" },
    { id: "feature-tile", value: "tile", label: "Tile roof" },
    { id: "feature-other", value: "other", label: "Other" },
  ],
};

describe("Multiple choice input resilience", () => {
  it("renders options and toggles items by option ID", () => {
    let currentValue: FormValue = ["feature-stone"];
    const handleChange = vi.fn((val: FormValue) => {
      currentValue = val;
    });

    const { rerender } = render(
      <FieldRenderer
        field={multipleChoiceField}
        value={currentValue}
        onChange={handleChange}
        onCaptureLocation={vi.fn()}
        onAddPhoto={vi.fn()}
      />,
    );

    const stoneBtn = screen.getByRole("button", { name: /stonework/i });
    const timberBtn = screen.getByRole("button", { name: /timber/i });

    expect(stoneBtn.getAttribute("aria-pressed")).toBe("true");
    expect(timberBtn.getAttribute("aria-pressed")).toBe("false");

    // Click timber to add
    fireEvent.click(timberBtn);
    expect(handleChange).toHaveBeenCalledWith([
      "feature-stone",
      "feature-timber",
    ]);

    // Rerender with next value
    rerender(
      <FieldRenderer
        field={multipleChoiceField}
        value={["feature-stone", "feature-timber"]}
        onChange={handleChange}
        onCaptureLocation={vi.fn()}
        onAddPhoto={vi.fn()}
      />,
    );
    expect(
      screen
        .getByRole("button", { name: /timber/i })
        .getAttribute("aria-pressed"),
    ).toBe("true");

    // Click stone to remove
    fireEvent.click(stoneBtn);
    expect(handleChange).toHaveBeenCalledWith(["feature-timber"]);
  });

  it("handles values stored as option.value instead of option.id", () => {
    const handleChange = vi.fn();
    render(
      <FieldRenderer
        field={multipleChoiceField}
        value={["stone", "tile"]}
        onChange={handleChange}
        onCaptureLocation={vi.fn()}
        onAddPhoto={vi.fn()}
      />,
    );

    const stoneBtn = screen.getByRole("button", { name: /stonework/i });
    const tileBtn = screen.getByRole("button", { name: /tile roof/i });
    const timberBtn = screen.getByRole("button", { name: /timber/i });

    expect(stoneBtn.getAttribute("aria-pressed")).toBe("true");
    expect(tileBtn.getAttribute("aria-pressed")).toBe("true");
    expect(timberBtn.getAttribute("aria-pressed")).toBe("false");

    // Toggle stone off - should remove both representations
    fireEvent.click(stoneBtn);
    expect(handleChange).toHaveBeenCalledWith(["tile"]);
  });

  it("handles wrapped record values and 'Other' text input", () => {
    let currentValue: FormValue = {
      value: ["feature-stone", "feature-other"],
      otherText: "Brick chimney",
    };
    const handleChange = vi.fn((val: FormValue) => {
      currentValue = val;
    });

    render(
      <FieldRenderer
        field={multipleChoiceField}
        value={currentValue}
        onChange={handleChange}
        onCaptureLocation={vi.fn()}
        onAddPhoto={vi.fn()}
      />,
    );

    const otherBtn = screen.getByRole("button", { name: /^other$/i });
    expect(otherBtn.getAttribute("aria-pressed")).toBe("true");

    // SAFETY: screen.getByLabelText returns HTMLInputElement for test.
    const otherInput = screen.getByLabelText(
      "Specify other",
    ) as HTMLInputElement;
    expect(otherInput.value).toBe("Brick chimney");

    // Type in other input
    fireEvent.change(otherInput, { target: { value: "Solar inverter" } });
    expect(handleChange).toHaveBeenCalledWith({
      value: ["feature-stone", "feature-other"],
      otherText: "Solar inverter",
    });

    // Clear other input
    const clearBtn = screen.getByRole("button", { name: /clear other value/i });
    fireEvent.click(clearBtn);
    expect(handleChange).toHaveBeenCalledWith({
      value: ["feature-stone", "feature-other"],
      otherText: "",
    });
  });

  it("handles string and comma-separated string inputs gracefully", () => {
    const handleChange = vi.fn();
    render(
      <FieldRenderer
        field={multipleChoiceField}
        value="feature-stone, feature-tile"
        onChange={handleChange}
        onCaptureLocation={vi.fn()}
        onAddPhoto={vi.fn()}
      />,
    );

    expect(
      screen
        .getByRole("button", { name: /stonework/i })
        .getAttribute("aria-pressed"),
    ).toBe("true");
    expect(
      screen
        .getByRole("button", { name: /tile roof/i })
        .getAttribute("aria-pressed"),
    ).toBe("true");
    expect(
      screen
        .getByRole("button", { name: /timber/i })
        .getAttribute("aria-pressed"),
    ).toBe("false");
  });
});
