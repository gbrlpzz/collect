import { describe, expect, it } from "vitest";
import {
  cloneFieldDefinitions,
  createFieldForType,
  fieldWithType,
} from "../src/lib/schema";
import type { FieldDefinition } from "../src/types";

describe("schema utilities", () => {
  it("creates editable fields with type-specific defaults", () => {
    const choiceField = createFieldForType("single_choice", 2);
    const mediaField = createFieldForType("photo", 3);
    const repeatableField = createFieldForType("repeatable_group", 4);

    expect(choiceField.key).toBe("field_2");
    expect(choiceField.options).toHaveLength(3);
    expect(mediaField.config).toEqual({
      minCount: 0,
      maxCount: 1,
      multiple: false,
    });
    expect(repeatableField.children).toHaveLength(1);
    expect(repeatableField.children?.[0].type).toBe("short_text");
  });

  it("adds only the defaults needed by a changed field type", () => {
    const field: FieldDefinition = {
      id: "field-1",
      key: "condition",
      label: "Condition",
      type: "short_text",
    };

    const choiceField = fieldWithType(field, "single_choice");
    const numberField = fieldWithType(field, "number");

    expect(choiceField.id).toBe(field.id);
    expect(choiceField.options).toHaveLength(3);
    expect(numberField.config).toEqual({ integer: false });
  });

  it("clones nested fields without sharing identity or options", () => {
    const original = createFieldForType("repeatable_group", 1);
    const [clone] = cloneFieldDefinitions([original]);

    expect(clone.id).not.toBe(original.id);
    expect(clone.children?.[0].id).not.toBe(original.children?.[0].id);
    expect(clone.children?.[0]).not.toBe(original.children?.[0]);
  });
});
