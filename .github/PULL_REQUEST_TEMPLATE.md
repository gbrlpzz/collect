## Summary

<!-- Describe the problem solved or capability introduced. -->

## Invariant & trust boundary impact

<!--
Explain how this change preserves collect's core invariants:
- Local durability: records and media commit to IndexedDB before showing 'Saved on this device'.
- Receipts: SYNCED is only set on verified server finalization receipt.
- Immutability: published schema versions and finalized evidence are not mutated.
- Security & RLS: server-side authorization remains the source of truth.
-->

## Verification

<!--
List verification performed:
- [ ] npm run check (formatting, doc links, unit/a11y tests, typecheck, build)
- [ ] deno check supabase/functions/**/*.ts
- [ ] git diff --check
- [ ] Added failure-oriented or behavioral tests for new logic
- [ ] Verified at a mobile viewport (touch targets, keyboard-aware layout, accessibility)
-->

## Documentation

<!--
List updated documentation (spec, architecture, flows, deployment, export format, etc.):
-->
