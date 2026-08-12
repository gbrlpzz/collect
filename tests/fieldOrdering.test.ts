import { describe, it, expect } from "vitest";
import { orderFieldsForCollection } from "../src/lib/fieldOrdering";
import type { FieldDefinition } from "../src/types";

const f = (id: string, key: string, type: FieldDefinition["type"], extra: Partial<FieldDefinition> = {}): FieldDefinition => ({
  id, key, label: key, type, semantic_uri: null, config: {}, ...extra,
});

describe("collection field ordering", () => {
  it("keeps the key identifier first and orders the rest by effort (highest first)", () => {
    const fields = [
      f("n1", "people_count", "number"),
      f("p1", "site_photos", "photo"),
      f("s1", "site_code", "short_text", { config: { keyIdentifier: true } }),
      f("l1", "notes", "long_text"),
    ];
    const ordered = orderFieldsForCollection(fields);
    expect(ordered.map((x) => x.key)).toEqual(["site_code", "site_photos", "notes", "people_count"]);
  });

  it("leads with media in open datasets (no explicit identifier)", () => {
    const fields = [
      f("n1", "people_count", "number"),
      f("a1", "audio_clip", "audio"),
      f("l1", "notes", "long_text"),
    ];
    const ordered = orderFieldsForCollection(fields);
    expect(ordered.map((x) => x.key)).toEqual(["audio_clip", "notes", "people_count"]);
  });

  it("leads with the reference code when a reference layer exists", () => {
    const fields = [
      f("p1", "site_photos", "photo"),
      f("r1", "ref_code", "short_text"),
      f("n1", "people_count", "number"),
    ];
    const ordered = orderFieldsForCollection(fields);
    expect(ordered[0].key).toBe("ref_code");
  });

  it("keeps headings attached to their following field", () => {
    const fields = [
      f("h1", "site_section", "heading"),
      f("s1", "site_code", "short_text", { config: { keyIdentifier: true } }),
      f("h2", "notes_section", "heading"),
      f("n1", "notes", "long_text"),
    ];
    const ordered = orderFieldsForCollection(fields);
    // Headings lead their section; the identifier stays the first data field.
    expect(ordered.map((x) => x.type === "heading" ? `H:${x.key}` : x.key)).toEqual([
      "H:site_section",
      "site_code",
      "H:notes_section",
      "notes",
    ]);
  });
});
