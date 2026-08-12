import type { FieldDefinition, FieldType } from "../types";

export type EditableFieldType = Exclude<FieldType, "heading">;

const choice = (id: string, value: string, label: string) => ({
  id,
  value,
  label,
});

export const schemaFieldTypes: EditableFieldType[] = [
  "short_text",
  "long_text",
  "number",
  "single_choice",
  "multiple_choice",
  "tri_state",
  "date",
  "datetime",
  "location",
  "photo",
  "audio",
  "repeatable_group",
];

export function createFieldForType(
  type: EditableFieldType,
  index: number,
): FieldDefinition {
  const id = crypto.randomUUID();
  const field: FieldDefinition = {
    id,
    key: `field_${index}`,
    label: "New field",
    type,
    semantic_uri: null,
  };

  if (type === "single_choice" || type === "multiple_choice") {
    field.options = [
      choice(`${id}-option-1`, "option_1", "Option 1"),
      choice(`${id}-option-2`, "option_2", "Option 2"),
      choice(`${id}-other`, "other", "Other"),
    ];
  }

  if (type === "number") field.config = { integer: false };
  if (type === "photo" || type === "audio")
    field.config = { minCount: 0, maxCount: 1, multiple: false };
  if (type === "repeatable_group")
    field.children = [createFieldForType("short_text", 1)];

  return field;
}

export function fieldWithType(
  field: FieldDefinition,
  type: EditableFieldType,
): FieldDefinition {
  const next = { ...field, type };

  if (
    (type === "single_choice" || type === "multiple_choice") &&
    !next.options?.length
  ) {
    next.options = createFieldForType(type, 1).options;
  }
  if (type === "repeatable_group" && !next.children?.length) {
    next.children = [createFieldForType("short_text", 1)];
  }
  if ((type === "photo" || type === "audio") && !next.config) {
    next.config = { minCount: 0, maxCount: 1, multiple: false };
  }
  if (type === "number" && !next.config) {
    next.config = { integer: false };
  }

  return next;
}

export function cloneFieldDefinitions(
  fields: FieldDefinition[],
): FieldDefinition[] {
  return fields.map((field) => ({
    ...field,
    id: crypto.randomUUID(),
    options: field.options?.map((option) => ({
      ...option,
      id: crypto.randomUUID(),
    })),
    children: field.children
      ? cloneFieldDefinitions(field.children)
      : undefined,
  }));
}
