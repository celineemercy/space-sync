# Implementation plan for GitHub issue #1

## Scope

The issue contains **12 entries: 7 bugs and 5 features**, although the request mentions 13. Track the 12 written entries. Bug 4 and Feature 2 overlap and should be implemented together. API request logging, room-list offline fallback, and the Search offline banner already exist; extend those paths.

## Phase 1 — Data correctness and privacy

1. **Saved rooms (Bugs 1–2).** Scope native SQLite rows and web storage to the signed-in user. Pass user ID through the repository and hooks for every read and mutation. Migrate the current native table without exposing legacy unowned notes to another account. Return the same friendly duplicate error on native and web, including concurrent inserts. Test duplicate saves, A → B → A account switching, and migration.
2. **Reservation lifecycle (Bug 5).** Expire pending requests at `endsAt`, and use that same bound when an admin approves or rejects. Test before start, during the booking window, and after end.
3. **Availability (Bug 6).** Share one overlap predicate between availability search and reservation creation. Pending and confirmed reservations block overlapping windows; terminal states do not. Preserve the room lock. Test search/create agreement and concurrent requests at the start boundary.
4. **Campus time (Bug 7).** Convert picker wall time to a Jakarta instant in one helper. Update default search range and all call sites. Test with device zones Jakarta, Makassar, and a non-Indonesian zone, including day boundaries.

## Phase 2 — UI state and accessibility

5. **Reservation clock (Bug 3).** Refresh `now` every minute and when the app resumes; clean up the timer. Test a card moving from Upcoming to Completed while mounted.
6. **Dialog errors (Bug 4, Feature 2).** Add an accessible `error` prop to `ConfirmationDialog`. Wire booking, cancellation, saved-room deletion, and admin-decision errors. Keep dialogs open for retry and reset old errors on reopen. Test failed booking and cancellation.
7. **Saved-room search (Feature 4).** Search code, name, location, and note; sort by recent, code, or capacity; show result count and a no-matches state. Test each filter and sort while offline.
8. **Accessibility (Feature 5).** Summarize room, time, and status on each reservation card while keeping controls accessible. Describe the camera viewfinder and group facility chips. Verify component accessible names and check TalkBack or VoiceOver on device.

## Phase 3 — Offline behavior and diagnostics

9. **Offline rooms and availability (Feature 3).** Retain existing room-list fallback. Add stale metadata and a banner to room detail. Cache availability per normalized query, including empty results; return only matching cached results on failure. Require fresh server confirmation before booking from stale results. Test offline list/detail, query isolation, empty results, and sign-out.
10. **Runtime logging (Feature 1).** Build on existing API method/route/status/duration/error-code logs. Add a production-safe sink, global JS error handler, and navigation transition events. Log intentional recovery from swallowed errors. Exclude credentials, tokens, notes, document data, and full query strings. Test a failed booking log and preservation of existing fatal-error handling.

## Verification and issue handoff

1. Run mobile and server type checks, lint, relevant tests, full suites, and a live booking smoke test. Manually verify native and web flows, offline views, and assistive technology where available.
2. Review migration behavior and logs for cross-account data exposure. Record any checks that require a device and could not be run.
3. Commit and push verified changes, linking the commit or PR to issue #1.
4. Comment on issue #1 with a numbered mapping of all 12 entries to changes, test evidence, and any limitations. Ask the reporter to review.
5. Close the issue only after all 12 written entries meet their acceptance criteria and the comment is posted. Track a thirteenth item separately if one is supplied.
