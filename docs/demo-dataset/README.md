# Synthetic demo dataset

Three synthetic observations for the demo schema (`schema-v1.json`, the
default project form: site code, building type/occupancy/condition, features,
date, people count, location, photos, notes).

- `schema-v1.json` — the published schema these rows validate against
- `submissions.jsonl` — canonical checkpoint format (see `docs/export-format.md`)

The rows exercise: required fields, single and multiple choice, tri-state
(yes/no/**unknown**), a number with unit, location provenance, photo metadata,
long text, and the **Other** free-text value (VA-003, "Chapel").
