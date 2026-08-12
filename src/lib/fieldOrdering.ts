import type { FieldDefinition } from "../types";

/**
 * Effort ranking for collection ordering: the most expensive questions come
 * first while the contributor's attention is fresh; the key identifier is
 * always first, before everything else.
 */
const EFFORT_RANK: Record<string, number> = {
  photo: 1,
  audio: 1,
  location: 2,
  repeatable_group: 3,
  long_text: 4,
  multiple_choice: 5,
  single_choice: 6,
  tri_state: 6,
  datetime: 7,
  date: 8,
  number: 9,
  short_text: 10,
};

const REFERENCE_KEY_PATTERN = /(^|_)(ref|reference|code|site_code|id)(_|$)/i;

/** A field the administrator marked as the key identifier. */
export function isKeyIdentifier(field: FieldDefinition): boolean {
  return field.config?.keyIdentifier === true || REFERENCE_KEY_PATTERN.test(field.key);
}

/**
 * Collection order:
 * 1. The key identifier always comes first (a reference-code field when the
 *    project has a reference layer; in open datasets the leading media field
 *    plays that role when no explicit identifier exists).
 * 2. Remaining fields are ordered by effort, highest first, with the schema
 *    order preserved within equal effort.
 */
export function orderFieldsForCollection(fields: FieldDefinition[]): FieldDefinition[] {
  const dataFields = fields.filter((field) => field.type !== "heading");
  const identifier = dataFields.find((field) => isKeyIdentifier(field));
  const mediaLead = identifier
    ? null
    : dataFields.find((field) => field.type === "photo" || field.type === "audio") ?? null;
  const lead = identifier ?? mediaLead;

  const rest = dataFields.filter((field) => field !== lead).sort((a, b) => {
    const rankA = EFFORT_RANK[a.type] ?? 99;
    const rankB = EFFORT_RANK[b.type] ?? 99;
    return rankA - rankB;
  });

  const ordered = lead ? [lead, ...rest] : rest;
  const position = new Map(ordered.map((field, index) => [field.id, index]));
  // Headings stay attached to the data field that follows them in the schema:
  // insert each heading right before its anchor in the new order.
  const headings: Array<{ field: FieldDefinition; anchor: number }> = [];
  for (const field of fields) {
    if (field.type !== "heading") continue;
    const following = fields.slice(fields.indexOf(field) + 1).find((candidate) => candidate.type !== "heading");
    const anchor = following && position.has(following.id) ? position.get(following.id)! : ordered.length;
    headings.push({ field, anchor });
  }
  const result: FieldDefinition[] = [...ordered];
  for (const { field, anchor } of headings.sort((a, b) => b.anchor - a.anchor)) {
    result.splice(anchor, 0, field);
  }
  return result;
}
