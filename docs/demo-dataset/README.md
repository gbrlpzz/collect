# Synthetic checkpoint example

This directory contains three synthetic observations for the example schema.
It demonstrates the canonical JSONL representation without exposing research
or contributor data.

- `schema-v1.json` — published schema used to interpret the rows
- `submissions.jsonl` — canonical checkpoint records; see
  [Checkpoint export format](../export-format.md)

The rows cover required fields, single and multiple choice, tri-state values,
a number with a unit, location provenance, photo metadata, long text, and an
**Other** value with associated free text.
