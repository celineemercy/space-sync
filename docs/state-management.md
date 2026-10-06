# State Management Implementation and Reviewer Guide

Last verified: 6 October 2026 (Asia/Jakarta)

## Scope and framework equivalence

The assignment mentions Flutter and Riverpod as an example. This repository is
an Expo/React Native application, so the implementation uses the equivalent
responsibility split below:

| Flutter/Riverpod concept | CampusSpace implementation |
| --- | --- |
| `ConsumerWidget` / page | Expo Router screen components |
| `Notifier` / provider | TanStack Query hooks in `queries.ts` |
| Use case | Functions in `use-cases.ts` |
| Repository | Interfaces and implementations in `repository.ts` |
| `AsyncValue` states | `isLoading`, `data`, `error`, `isFetching`, and `isPending` |

Two state-managed features are covered:

1. Room discovery and availability search.
2. Reservation listing, creation, and cancellation.

## Reviewer: where the state-management code lives

### Feature 1 — room discovery

- Widget/UI: `mobile/src/app/(app)/(tabs)/search.tsx`
- Room detail and booking UI: `mobile/src/app/(app)/room/[id].tsx`
- Query/controller hooks: `mobile/src/features/rooms/queries.ts`
- Use cases: `mobile/src/features/rooms/use-cases.ts`
- Repository contract and API/cache adapter:
  `mobile/src/features/rooms/repository.ts`
- Widget tests: `mobile/src/features/rooms/search-screen.test.tsx`

Flow:

1. The screen calls `useRooms()` and `useAvailabilitySearch()`.
2. The hooks map TanStack Query state to the UI and call only use cases.
3. Use cases coordinate online requests and the offline-cache fallback.
4. The repository owns API URL construction and cache data-source calls.
5. The widget renders exactly one list state: loading, error/retry, empty, or
   loaded data.

The availability form validates that the end time is after the start time and
that capacity is a positive whole number before calling the mutation. While the
mutation is pending, `AppButton` sets both `disabled` and the accessibility
`busy` state, preventing a second submission.

### Feature 2 — reservations

- Widget/UI: `mobile/src/app/(app)/(tabs)/reservations.tsx`
- Query/controller hooks: `mobile/src/features/reservations/queries.ts`
- Use cases: `mobile/src/features/reservations/use-cases.ts`
- Repository contract and API/cache adapter:
  `mobile/src/features/reservations/repository.ts`
- Widget tests:
  `mobile/src/features/reservations/reservations-screen.test.tsx`

Flow:

1. The screen calls `useReservations()` and `useCancelReservation()`.
2. The list query calls `loadReservations`; mutations call the create or cancel
   use case.
3. The use case decides whether cached reservations may be returned after a
   network failure.
4. The repository performs the REST request and cache read/write.
5. Successful mutations invalidate both room and reservation query keys so the
   next UI state cannot display stale availability.

Cancellation uses a confirmation dialog. During submission, both the dialog
and the matching reservation action are disabled and show a loading indicator.

## Required UI states

| Required condition | Room discovery | Reservations | Automated evidence |
| --- | --- | --- | --- |
| Initial loading | `Loading campus rooms...` | `Loading your reservations...` | Widget tests |
| Loaded data | Room cards | Reservation cards | Widget tests |
| Empty state | `No rooms found` | Empty Upcoming/Cancelled messages | Widget tests + web preview |
| Error + Retry | Error message and `Try again` calling `refetch()` | Error message and `Try again` calling `refetch()` | Widget tests |
| Form validation | Time interval and positive integer capacity | Booking requires a selected valid interval | Widget test + web preview |
| Submit loading | Availability button becomes busy/disabled | Booking/cancellation controls become busy/disabled | Widget tests |

The reusable loading and retry presentation is implemented in
`mobile/src/components/ui/async-state.tsx`. The double-submit protection is in
`mobile/src/components/ui/app-button.tsx`.

## Verification results

Run from `mobile/`:

```text
npm test -- --runInBand
npm run typecheck
npm run lint
```

Result on 6 October 2026:

```text
Test Suites: 4 passed, 4 total
Tests:       21 passed, 21 total
TypeScript:  passed
ESLint:      passed
```

The Docker web preview was also run against the seeded NestJS/PostgreSQL stack.
The following visual states were manually exercised and captured during the
review session:

- loaded room data;
- initial room loading after login;
- invalid capacity (`0`) with inline validation message;
- empty availability result using capacity `999`.

For a submission outside this Codex conversation, export the attached evidence
screenshots or repeat the steps in `docs/testing-guide.md` and attach a short
screen recording. Do not include demo passwords, tokens, or `.env` contents.

## AI assistance disclosure

### Prompt supplied to Codex

```text
Adapt the Flutter/Riverpod state-management assignment to this existing React
Native + TanStack Query project. Implement two features with initial loading,
loaded data, empty state, error with retry, form validation, and submit loading
that prevents double tap. Separate widgets, query/notifier orchestration, use
cases, and repositories. Add widget tests for the main states, document the
result with screenshot/video evidence, explain the state-management flow to the
reviewer, and commit each logical change separately.
```

Codex was used to generate the repository/use-case boilerplate, reusable async
state component, widget-test scaffolding, and this reviewer guide.

### Code reviewed and corrected during implementation

The following checks were performed rather than accepting generated code
without review:

- confirmed API calls were removed from query hooks and moved to repositories;
- preserved the existing SQLite/localStorage offline fallback behavior;
- confirmed room and reservation query invalidation after mutations;
- connected each Retry button to the correct TanStack Query `refetch()`;
- verified pending buttons expose `disabled` and accessibility `busy` states;
- retained the rule that editing any search input clears stale search results;
- ran Jest, TypeScript, ESLint, Docker build, seed, and live browser checks.

The student submitting the assignment should read the listed files and add
their own explanation during the review. AI-generated documentation does not
replace the student's responsibility to understand the data flow.

## Commit history for this task

- `ad2dbbe` — separate query hooks from use cases and repositories.
- `9b92d2f` — add explicit loading, empty, error/retry, and pending UI states.
- `0ec84da` — cover primary states and double-submit protection with tests.
- Documentation is committed separately so the implementation history remains
  reviewable.
