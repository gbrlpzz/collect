# collect — MVP implementation plan (living document)

Source of truth: `docs/spec.md` (67-section Field Data Collector spec). Status legend: ✅ done · 🟡 partial · ❌ missing · ➖ not applicable.

## Status summary

| Area                              | Status | Notes                                                                                            |
| --------------------------------- | ------ | ------------------------------------------------------------------------------------------------ |
| Local collector (M1)              | ✅     | atomic local commit, durable outbox, autosave, media, location                                   |
| Sync engine (M2)                  | ✅     | metadata→TUS media→finalization, idempotent, receipts, retry scheduler, lease                    |
| Team workflow (M3)                | ✅     | orgs, projects, invites, assignments, heartbeats, readiness, ping                                |
| Form builder (M4)                 | ✅     | typed fields, draft→immutable version publishing, semantic_uri hook                              |
| Exports (M5)                      | ✅     | checkpoints, JSONL/CSV/GeoJSON/media/manifest ZIP, recovery package                              |
| Recovery (M6)                     | ✅     | recovery mode on DB failure, stored-data recovery export, storage pressure                       |
| Field hardening (M7)              | ✅     | live E2E 20/20 + §54 test suites (23 tests)                                                      |
| License → Apache-2.0              | ✅     | LICENSE/NOTICE swapped, README rewritten, holder Gabriele Pizzi                                  |
| Backend security audit (G1–G7)    | ✅     | migration 20260810120000 + function hardening deployed                                           |
| Issue #18 privacy disclosure      | ✅     | "What collect records on this device" in project view                                            |
| §54 critical failure tests        | ✅     | 23 tests: ledger survival, lease, recovery, validation, sync sheet                               |
| Export-format docs + demo dataset | ✅     | docs/export-format.md + docs/demo-dataset                                                        |
| CI: Deno check for edge functions | ✅     | deno check + fmt in ci.yml                                                                       |
| Live E2E verification             | ✅     | 20/20 checks against lrqlrufwrytpwhgclmyo (create→TUS→confirm→finalize→heartbeat→checkpoint ZIP) |

## Spec coverage checklist

| §   | Requirement                             | Status | Evidence / gap |
| --- | --------------------------------------- | ------ | -------------- |
| 1   | Product definition                      | 🟡     | audit pending  |
| 2   | Core product promise                    | 🟡     | audit pending  |
| 3   | Product principles                      | 🟡     | audit pending  |
| 4   | Primary user roles                      | 🟡     | audit pending  |
| 5   | Product surfaces                        | 🟡     | audit pending  |
| 6   | Authentication and invitations          | 🟡     | audit pending  |
| 7   | Organization model                      | 🟡     | audit pending  |
| 8   | Project creation                        | 🟡     | audit pending  |
| 9   | Form/schema philosophy                  | 🟡     | audit pending  |
| 10  | MVP input types                         | 🟡     | audit pending  |
| 11  | Excluded form functionality             | 🟡     | audit pending  |
| 12  | Schema format                           | 🟡     | audit pending  |
| 13  | Schema versioning                       | 🟡     | audit pending  |
| 14  | Contributor home                        | 🟡     | audit pending  |
| 15  | Offline project preparation             | 🟡     | audit pending  |
| 16  | Observation experience                  | 🟡     | audit pending  |
| 17  | Draft autosave                          | 🟡     | audit pending  |
| 18  | Submission semantics                    | 🟡     | audit pending  |
| 19  | Submission identity                     | 🟡     | audit pending  |
| 20  | Local storage architecture              | 🟡     | audit pending  |
| 21  | Persistent storage                      | 🟡     | audit pending  |
| 22  | The outbox                              | 🟡     | audit pending  |
| 23  | Submission synchronization protocol     | 🟡     | audit pending  |
| 24  | Submission state machine                | 🟡     | audit pending  |
| 25  | Retry policy                            | 🟡     | audit pending  |
| 26  | Connectivity detection                  | 🟡     | audit pending  |
| 27  | App interruption handling               | 🟡     | audit pending  |
| 28  | Media policy                            | 🟡     | audit pending  |
| 29  | Media integrity                         | 🟡     | audit pending  |
| 30  | Location provenance                     | 🟡     | audit pending  |
| 31  | Device identity                         | 🟡     | audit pending  |
| 32  | Contributor sync interface              | 🟡     | audit pending  |
| 33  | Contributor completion                  | 🟡     | audit pending  |
| 34  | Device heartbeat                        | 🟡     | audit pending  |
| 35  | Admin project dashboard                 | 🟡     | audit pending  |
| 36  | Ping contributor                        | 🟡     | audit pending  |
| 37  | Export readiness                        | 🟡     | audit pending  |
| 38  | Checkpoint semantics                    | 🟡     | audit pending  |
| 39  | Export package                          | 🟡     | audit pending  |
| 40  | Recovery export                         | 🟡     | audit pending  |
| 41  | Backend architecture                    | 🟡     | audit pending  |
| 42  | Sovereignty / self-hosting              | 🟡     | audit pending  |
| 43  | Suggested frontend stack                | 🟡     | audit pending  |
| 44  | Service worker                          | 🟡     | audit pending  |
| 45  | Application updates                     | 🟡     | audit pending  |
| 46  | Database model                          | 🟡     | audit pending  |
| 47  | Authorization                           | 🟡     | audit pending  |
| 48  | Logging and privacy                     | 🟡     | audit pending  |
| 49  | Audit trail                             | 🟡     | audit pending  |
| 50  | Conflict philosophy                     | 🟡     | audit pending  |
| 51  | Editing submissions                     | 🟡     | audit pending  |
| 52  | Accessibility and field usability       | 🟡     | audit pending  |
| 53  | Performance targets                     | 🟡     | audit pending  |
| 54  | Critical failure tests                  | 🟡     | audit pending  |
| 55  | Multi-tab / duplicate worker protection | 🟡     | audit pending  |
| 56  | Error UX                                | 🟡     | audit pending  |
| 57  | Admin deletion rules                    | 🟡     | audit pending  |
| 58  | Closing a project                       | 🟡     | audit pending  |
| 59  | No AI in the collection path            | 🟡     | audit pending  |
| 60  | Future model-readiness                  | 🟡     | audit pending  |
| 61  | Future ontology compatibility           | 🟡     | audit pending  |
| 62  | Future backend compatibility            | 🟡     | audit pending  |
| 63  | Open-source requirements                | 🟡     | audit pending  |
| 64  | MVP non-goals                           | 🟡     | audit pending  |
| 65  | Build sequence                          | 🟡     | audit pending  |
| 66  | Definition of done                      | 🟡     | audit pending  |
| 67  | The final product standard              | 🟡     | audit pending  |

## Multi-user pass (2026-08-11)

| Item                               | Status | Notes                                                                                                                                                                                                         |
| ---------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Invite-only accounts               | ✅     | `shouldCreateUser:false`; platform signups disabled; accounts via invites only                                                                                                                                |
| Administrator invitations          | ✅     | `send-admin-invite` function + adminBackend.inviteAdministrator (UI pending)                                                                                                                                  |
| Project-admin role invites         | ✅     | `send-project-invite` accepts role; `loadUserAdminAccess` includes project admins                                                                                                                             |
| Per-account local databases        | ✅     | IndexedDB scoped by user id; account switch reloads; isolation test                                                                                                                                           |
| Dual PWA identity                  | ✅     | `/` white contributor PWA · `/?role=admin` black Admin PWA; icons/manifests/apple-touch                                                                                                                       |
| Magic links return to deployed app | ✅     | `VITE_APP_URL` set locally + documented; Supabase project Auth config patched 2026-08-12 (`site_url` + redirect allow-list = `https://collect-tawny.vercel.app`); verified by reading a real magic-link email |
| App.tsx role entry + scope wiring  | ✅     | 78f8f06; deployed with the UI pass                                                                                                                                                                            |

## Auto-provenance pass (2026-08-12)

| Item                               | Status | Notes                                                                                                      |
| ---------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------- |
| Email-code sign-in (PWA bridge)    | ✅     | verifySignInCode + AuthScreen code UI (2a5de00); needs {{ .Token }} in the magic-link template             |
| Localhost link refusal             | ✅     | deployed; broken links can't be created from local instances                                               |
| Automatic location                 | ✅     | permission probe once per container; capture on collector open + silent refresh at submit                  |
| Environment provenance             | ✅     | device model (incl. iOS family), OS, browser, screen, orientation, connection, battery, timezone, language |
| Device columns + environment JSONB | ✅     | migration 20260811180000 applied; functions v6/v3/v4 deployed                                              |
| Legacy data migration              | ✅     | collect-local-v1 adopted into the first account's scoped DB after upgrade                                  |
| Media upload assurance             | ✅     | missing blob -> ACTION_REQUIRED; TUS resume; size verification at confirm                                  |
| Minimal UI contract                | ✅     | handed to UI agent: invisible provenance, problem-only prompts, location-off notice                        |

## Auth architecture: password + device-link (2026-08-12)

| Item                                         | Status | Notes                                                                                                        |
| -------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------ |
| Password sign-in (every container)           | ✅     | signInWithPassword; setPassword; solves iOS PWA/Safari double-login at the root                              |
| Device-link bridge                           | ✅     | requestDeviceLinkCode / linkDeviceSession; link-session function + private.session_link_codes migration live |
| Invite → set-password flow                   | 🟡     | App-side contract handed to UI agent (pendingPasswordRequired)                                               |
| AuthScreen password tab + device-link panels | 🟡     | UI agent in progress (contract delivered)                                                                    |
| Email codes                                  | ⚠️     | implemented; emails cannot carry {{ .Token }} on free tier (Pro/SMTP needed)                                 |

## Attention verification (2026-08-12)

| Item                           | Status | Notes                                                                                                 |
| ------------------------------ | ------ | ----------------------------------------------------------------------------------------------------- |
| Attention-check bank           | ✅     | 10 universally valid 4-option checks; client copy for offline; server validates                       |
| Random injection               | ✅     | Collector injects one check after the first two questions (f0d34c6); options shuffle per presentation |
| Binary filter flag             | ✅     | submissions.attention_failed; question text never stored (only check key + answer)                    |
| Score visibility               | ✅     | contributor (getMyProfile) + admin (readiness + exports)                                              |
| Guess-adjusted score           | ✅     | (correct − expected)/(total − expected), clamped; per-contributor on profile                          |
| Server recording               | ✅     | attention_responses (idempotent per submission) + recompute_attention_score                           |
| Visibility                     | ✅     | profile (contributor + admin), readiness data, exports (data/attention.csv + contributors.csv)        |
| Environment payload regression | ✅     | re-added observation.environment to sync payload                                                      |

## Gap work queue

_(filled from audits)_

## Verification

- [ ] `npm test` green
- [ ] `npm run build` green
- [ ] `git diff --check` clean
- [ ] End-to-end field scenario (spec §66) works against live deployment
- [ ] Deployment committed and pushed
