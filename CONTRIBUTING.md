# Contributing to collect

Thank you for improving `collect`. This repository treats field data as evidence: changes must preserve local durability, explicit receipt semantics, immutable interpretation, and portable exports.

## Before you start

Read:

1. [Repository overview](README.md)
2. [Architecture](docs/architecture.md)
3. [Product specification](docs/spec.md)
4. [Agent guidance](AGENTS.md)
5. [Code of Conduct](CODE_OF_CONDUCT.md)
6. The document for the subsystem you plan to change

For security vulnerabilities, see the [Security policy](SECURITY.md). Do not report vulnerabilities in public issues or pull requests.

Open an issue or draft pull request early for changes to the synchronization protocol, database model, export format, consent model, or schema compatibility.

## Development environment

Requirements:

- Node.js 22
- npm
- Deno 2
- Supabase CLI for local or remote backend work

```bash
npm ci
npm run dev
```

The unconfigured app opens an interface preview. It does not verify synchronization, authorization, database migrations, or server receipts.

## Required verification

```bash
npm run check
deno check supabase/functions/**/*.ts
git diff --check
```

`npm run check` runs format checks, Vitest, client typechecking, and a production build. Add focused tests for every behavioral change. Persistence and synchronization changes require failure-oriented coverage for interruption, duplicate execution, stale writes, or partial completion.

## Change rules

- Generate stable identifiers before network work.
- Commit submissions, media, and outbox operations before showing a local receipt.
- Set `SYNCED` only after validating a matching server finalization receipt.
- Do not use `navigator.onLine` as proof of server reachability.
- Do not depend on background execution for correctness.
- Do not mutate published schemas or finalized evidence.
- Do not log research payloads, coordinates, media URLs, or credentials.
- Keep service-role credentials inside Edge Functions.
- Add a new ordered migration for database changes; never rewrite an applied migration.
- Update documentation, examples, and export specifications in the same pull request as behavior changes.

## Interface changes

Follow [Interface baseline](docs/design.md):

- preserve the capture-first mobile hierarchy;
- keep the primary action reachable above the software keyboard;
- use semantic HTML and shared accessible primitives;
- maintain 44-point minimum interaction regions;
- support keyboard navigation, VoiceOver, reduced motion, increased contrast, and text scaling;
- hide supporting detail through progressive disclosure without hiding errors or required decisions.

Run the automated accessibility tests and verify the affected flow at a mobile viewport.

## Pull requests

A pull request should explain:

- the user or operator problem;
- the relevant invariant or trust boundary;
- the chosen behavior and alternatives considered;
- migration or compatibility impact;
- verification performed;
- documentation updated.

Keep commits scoped and avoid unrelated reformatting. Use conventional, concise technical English in code, comments, and documentation.
