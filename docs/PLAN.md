# collect — MVP implementation plan (living document)

Source of truth: `docs/spec.md` (67-section Field Data Collector spec). Status legend: ✅ done · 🟡 partial · ❌ missing · ➖ not applicable.

## Status summary

| Area | Status | Notes |
|---|---|---|
| Local collector (M1) | ✅ | atomic local commit, durable outbox, autosave, media, location |
| Sync engine (M2) | ✅ | metadata→TUS media→finalization, idempotent, receipts, retry scheduler, lease |
| Team workflow (M3) | ✅ | orgs, projects, invites, assignments, heartbeats, readiness, ping |
| Form builder (M4) | ✅ | typed fields, draft→immutable version publishing, semantic_uri hook |
| Exports (M5) | ✅ | checkpoints, JSONL/CSV/GeoJSON/media/manifest ZIP, recovery package |
| Recovery (M6) | ✅ | recovery mode on DB failure, stored-data recovery export, storage pressure |
| Field hardening (M7) | 🟡 | live E2E + §54 test suite in progress |
| License → Apache-2.0 | ✅ | LICENSE/NOTICE swapped, README rewritten, holder Gabriele Pizzi |
| Backend security audit (G1–G7) | ✅ | migration 20260810120000 + function hardening deployed |
| Issue #18 privacy disclosure | ✅ | "What collect records on this device" in project view |
| §54 critical failure tests | 🟡 | IDB integration + component suites in progress |
| Export-format docs + demo dataset | 🟡 | export-format.md pending |
| CI: Deno check for edge functions | 🟡 | pending |
| Live E2E verification | 🟡 | pending |

## Spec coverage checklist

| § | Requirement | Status | Evidence / gap |
|---|---|---|---|
| 1 | Product definition | 🟡 | audit pending |
| 2 | Core product promise | 🟡 | audit pending |
| 3 | Product principles | 🟡 | audit pending |
| 4 | Primary user roles | 🟡 | audit pending |
| 5 | Product surfaces | 🟡 | audit pending |
| 6 | Authentication and invitations | 🟡 | audit pending |
| 7 | Organization model | 🟡 | audit pending |
| 8 | Project creation | 🟡 | audit pending |
| 9 | Form/schema philosophy | 🟡 | audit pending |
| 10 | MVP input types | 🟡 | audit pending |
| 11 | Excluded form functionality | 🟡 | audit pending |
| 12 | Schema format | 🟡 | audit pending |
| 13 | Schema versioning | 🟡 | audit pending |
| 14 | Contributor home | 🟡 | audit pending |
| 15 | Offline project preparation | 🟡 | audit pending |
| 16 | Observation experience | 🟡 | audit pending |
| 17 | Draft autosave | 🟡 | audit pending |
| 18 | Submission semantics | 🟡 | audit pending |
| 19 | Submission identity | 🟡 | audit pending |
| 20 | Local storage architecture | 🟡 | audit pending |
| 21 | Persistent storage | 🟡 | audit pending |
| 22 | The outbox | 🟡 | audit pending |
| 23 | Submission synchronization protocol | 🟡 | audit pending |
| 24 | Submission state machine | 🟡 | audit pending |
| 25 | Retry policy | 🟡 | audit pending |
| 26 | Connectivity detection | 🟡 | audit pending |
| 27 | App interruption handling | 🟡 | audit pending |
| 28 | Media policy | 🟡 | audit pending |
| 29 | Media integrity | 🟡 | audit pending |
| 30 | Location provenance | 🟡 | audit pending |
| 31 | Device identity | 🟡 | audit pending |
| 32 | Contributor sync interface | 🟡 | audit pending |
| 33 | Contributor completion | 🟡 | audit pending |
| 34 | Device heartbeat | 🟡 | audit pending |
| 35 | Admin project dashboard | 🟡 | audit pending |
| 36 | Ping contributor | 🟡 | audit pending |
| 37 | Export readiness | 🟡 | audit pending |
| 38 | Checkpoint semantics | 🟡 | audit pending |
| 39 | Export package | 🟡 | audit pending |
| 40 | Recovery export | 🟡 | audit pending |
| 41 | Backend architecture | 🟡 | audit pending |
| 42 | Sovereignty / self-hosting | 🟡 | audit pending |
| 43 | Suggested frontend stack | 🟡 | audit pending |
| 44 | Service worker | 🟡 | audit pending |
| 45 | Application updates | 🟡 | audit pending |
| 46 | Database model | 🟡 | audit pending |
| 47 | Authorization | 🟡 | audit pending |
| 48 | Logging and privacy | 🟡 | audit pending |
| 49 | Audit trail | 🟡 | audit pending |
| 50 | Conflict philosophy | 🟡 | audit pending |
| 51 | Editing submissions | 🟡 | audit pending |
| 52 | Accessibility and field usability | 🟡 | audit pending |
| 53 | Performance targets | 🟡 | audit pending |
| 54 | Critical failure tests | 🟡 | audit pending |
| 55 | Multi-tab / duplicate worker protection | 🟡 | audit pending |
| 56 | Error UX | 🟡 | audit pending |
| 57 | Admin deletion rules | 🟡 | audit pending |
| 58 | Closing a project | 🟡 | audit pending |
| 59 | No AI in the collection path | 🟡 | audit pending |
| 60 | Future model-readiness | 🟡 | audit pending |
| 61 | Future ontology compatibility | 🟡 | audit pending |
| 62 | Future backend compatibility | 🟡 | audit pending |
| 63 | Open-source requirements | 🟡 | audit pending |
| 64 | MVP non-goals | 🟡 | audit pending |
| 65 | Build sequence | 🟡 | audit pending |
| 66 | Definition of done | 🟡 | audit pending |
| 67 | The final product standard | 🟡 | audit pending |

## Gap work queue

_(filled from audits)_

## Verification

- [ ] `npm test` green
- [ ] `npm run build` green
- [ ] `git diff --check` clean
- [ ] End-to-end field scenario (spec §66) works against live deployment
- [ ] Deployment committed and pushed