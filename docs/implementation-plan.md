# CampusSpace Step-by-Step Implementation Plan

## Document Status

This document is the implementation checklist for the CampusSpace MVP. It starts from the original documentation-only repository and ends with an installable Android APK that communicates with a reachable NestJS API.

## Current Implementation Status

As of 18 September 2026, the repository contains the Expo client, NestJS API, Prisma/PostgreSQL data layer, migrations, idempotent seed, Docker environment, automated unit checks, CI configuration, offline read cache, authenticated reservation flow, and EAS APK profile. The Docker-backed API has passed a live smoke test, including concurrent booking conflict protection.

The remaining release steps need project-owner resources that are intentionally not stored in this repository: an HTTPS deployment target and production database, an Expo account/EAS project, Android signing credentials managed by EAS, and an Android emulator or physical device for acceptance testing. Those steps are documented in Phases 12–14 and in `docs/testing-guide.md`.

## 1. Definition of Done

CampusSpace is ready for its course demonstration when all of the following are true:

- A student can sign in with a seeded demo account.
- The Android app can list rooms and show room details.
- A student can search by date, time, capacity, and facilities.
- Class schedules and confirmed reservations are excluded from availability.
- The backend prevents overlapping reservations, including concurrent requests.
- A student can view and cancel their own reservations.
- Room and reservation data can be read from SQLite when the API is temporarily unavailable.
- Booking and cancellation clearly require a network connection.
- Automated checks for the core backend rules and mobile states pass.
- The NestJS API is reachable through HTTPS for the APK build.
- A signed APK can be installed and used on an Android device or emulator.
- No secrets, `.env` files, credentials, signing keys, or generated builds are committed.

## 2. Delivery Rules

### Branch Workflow

Use one feature branch per phase or cohesive feature:

```bash
git switch dev
git pull --ff-only
git switch -c feature/<feature-name>
```

After completing and verifying the feature:

```bash
git add <intended-files-only>
git commit -m "<type>: <description>"
git push -u origin feature/<feature-name>
```

Open a pull request from `feature/<feature-name>` into `dev`. Do not merge incomplete work into `main`. A stable course release may later move from `dev` to `main` through a separate pull request.

### Commit Guidance

- `chore:` project configuration and tooling
- `feat:` user-visible behavior
- `fix:` defect correction
- `test:` automated tests
- `docs:` documentation
- `refactor:` internal change without behavior change

### Security Rules

- Commit `.env.example`, never `.env` or `.env.local`.
- Never store passwords, JWT secrets, database URLs, or signing credentials in source files.
- Treat every `EXPO_PUBLIC_*` value as public because it is included in the client bundle.
- Keep the Android keystore outside Git; allow EAS to manage it for the MVP.
- Inspect staged files before every commit with `git diff --cached`.

## 3. Required Development Tools

Install and confirm these tools before scaffolding:

- Git and a GitHub account
- Current Node.js LTS and npm
- Docker Desktop for local PostgreSQL, or a separately installed PostgreSQL server
- Android Studio, Android SDK, and an Android emulator
- Java/JDK version supported by the selected Expo SDK and Android tooling
- Postman or Bruno for manual API requests
- An Expo account for EAS Build

Record the working versions in the pull request that initializes the applications. Avoid pinning versions in this document because Expo, Node.js, and Android requirements change over time.

## 4. Phase 0 — Confirm Scope and Contracts

### Goal

Turn the architecture decisions into a small set of stable MVP contracts before generating application code.

### Steps

1. Review `README.md` and `docs/architecture-plan.md`.
2. Confirm that Android remains the demonstration platform.
3. Confirm `Asia/Jakarta` as the campus display timezone.
4. Keep these entities in the MVP: `User`, `Room`, `Facility`, `RoomFacility`, `ClassSchedule`, and `Reservation`.
5. Keep `CheckIn`, `RoomBlock`, and `Notification` outside the MVP.
6. Use seeded demo users instead of public registration.
7. Use `CONFIRMED` and `CANCELLED` as the initial reservation statuses.
8. Adopt `/api/v1` as the REST API prefix.
9. Reserve `com.celineemercy.campusspace` as the Android application ID. Change it before the first EAS build if a different permanent ID is required; do not change it after distribution begins.
10. Create a short pull-request checklist covering secrets, migrations, tests, and documentation.

### Exit Criteria

- The MVP boundaries in the README and architecture plan still agree.
- The timezone, API prefix, reservation statuses, and Android application ID are recorded.
- No advanced feature has entered the MVP without an explicit scope decision.

## 5. Phase 1 — Repository and Application Foundation

### Goal

Create the two TypeScript applications without introducing unnecessary monorepo tooling.

### Steps

1. Create `feature/project-foundation` from `dev`.
2. Scaffold the Expo application in `mobile/` using the current recommended TypeScript template with Expo Router.
3. Scaffold the NestJS application in `server/` with npm and without creating a nested Git repository.
4. Keep separate `package.json` and lock files in `mobile/` and `server/`.
5. Add a root `.gitignore` covering:
   - `node_modules/`
   - Expo and Metro caches
   - Nest build output such as `dist/`
   - coverage output
   - `.env` and `.env.*`, while allowing `.env.example`
   - native signing files such as `*.jks` and `*.keystore`
   - Android build outputs and downloaded APK/AAB files
   - IDE and operating-system files
6. Add a root `.editorconfig` for UTF-8, final newlines, and consistent indentation.
7. Add scripts inside each application for linting, type checking, tests, and production builds.
8. Add `mobile/.env.example` with:

   ```dotenv
   EXPO_PUBLIC_API_URL=http://10.0.2.2:3000/api/v1
   ```

9. Add `server/.env.example` with placeholders for:

   ```dotenv
   NODE_ENV=development
   PORT=3000
   DATABASE_URL=postgresql://USER:PASSWORD@localhost:5433/campus_space
   JWT_SECRET=replace-with-a-long-random-value
   JWT_EXPIRES_IN=1h
   CAMPUS_TIMEZONE=Asia/Jakarta
   SEED_DEMO_EMAIL=student@example.test
   SEED_DEMO_PASSWORD=replace-locally
   ```

10. Add short local-development instructions to each application directory without duplicating the architecture document.
11. Confirm generated files contain no nested `.git/`, credentials, or platform build artifacts before committing.

### Exit Criteria

- Both projects install from their committed lock files.
- Both projects pass their initial lint and TypeScript checks.
- Environment examples contain placeholders only.
- Starting either project does not require modifying committed configuration.

## 6. Phase 2 — PostgreSQL, Prisma, and Seed Data

### Goal

Create a reproducible local database with the complete MVP data model.

### Steps

1. Create `feature/database-foundation` from the updated `dev` branch.
2. Add a root or server-level Docker Compose configuration for local PostgreSQL.
3. Use a named Docker volume so database data survives container restarts.
4. Configure a health check for PostgreSQL and expose only the local development port.
5. Add Prisma and the PostgreSQL client to the server.
6. Initialize `server/prisma/schema.prisma`.
7. Model:
   - `User`: ID, unique normalized email, password hash, timestamps.
   - `Room`: ID, unique name/code, location, capacity, description, timestamps.
   - `Facility`: ID and unique name.
   - `RoomFacility`: composite room/facility relationship.
   - `ClassSchedule`: room, title, concrete UTC start/end, timestamps.
   - `Reservation`: user, room, UTC start/end, status, creation/update/cancellation timestamps.
8. Add indexes supporting:
   - reservation lookup by room and time
   - reservation lookup by user
   - class schedule lookup by room and time
   - room capacity filtering
9. Add database-level checks where practical so end time must be later than start time.
10. Create the first migration and commit the migration files.
11. Write an idempotent seed script that creates:
    - one demo student account using the password supplied through local environment configuration
    - at least six rooms with different capacities and locations
    - facilities such as projector, whiteboard, air conditioning, and power outlets
    - room/facility relationships
    - concrete class-schedule occurrences covering useful search cases
12. Do not log the demo password or resulting password hash.
13. Document database reset and reseed commands for development only.

### Exit Criteria

- A clean database can be migrated and seeded from documented commands.
- Re-running the seed does not create duplicate records.
- Prisma can read the seeded rooms, facilities, and schedules.
- All stored date/time values are UTC.

## 7. Phase 3 — Backend Foundation and Authentication

### Goal

Provide a secured, validated, versioned API foundation.

### Steps

1. Create `feature/backend-auth` from `dev`.
2. Add NestJS configuration loading and startup validation.
3. Fail startup when required server variables are missing or invalid.
4. Set the global API prefix to `/api/v1`.
5. Add global DTO validation that:
   - transforms known input types
   - rejects invalid values
   - strips or rejects unknown fields
6. Add a consistent API error response:

   ```ts
   type ApiError = {
     statusCode: number;
     code: string;
     message: string;
     details?: Record<string, unknown>;
   };
   ```

7. Add a shared Prisma module that opens and closes the client with the application lifecycle.
8. Add `GET /api/v1/health` for deployment health checks. It should verify the process is running and that PostgreSQL is reachable without exposing credentials.
9. Implement `POST /api/v1/auth/login`:
   - normalize the submitted email
   - locate the seeded user
   - verify the Argon2id password hash
   - return a signed, time-limited JWT and a safe user DTO
10. Add a JWT strategy and authentication guard.
11. Never include `passwordHash` in a response or application log.
12. Add rate limiting to the login endpoint if it can be completed without putting the MVP timeline at risk.
13. Configure development logging without authorization headers or request bodies containing passwords.

### Required Tests

- Successful login returns a token and safe user data.
- Invalid email/password returns the same generic authentication error.
- Invalid input returns `400`.
- Protected routes reject missing, malformed, and expired tokens.
- The health endpoint reports database failure safely.

### Exit Criteria

- A seeded student can sign in through an API client.
- The returned JWT grants access to a protected test route.
- Authentication secrets and password hashes never appear in responses.

## 8. Phase 4 — Room and Facility API

### Goal

Expose the read-only room catalog required by the mobile application.

### Steps

1. Create `feature/room-api` from `dev`.
2. Implement `RoomsModule` with controller, service, DTOs, and tests.
3. Implement `GET /api/v1/rooms` with optional:
   - `minCapacity`
   - comma-separated `facilityIds`
4. Apply all requested facilities as an AND condition, not an OR condition.
5. Add deterministic ordering by room name/code.
6. Implement `GET /api/v1/rooms/:roomId` with facilities included.
7. Return `404 ROOM_NOT_FOUND` for an unknown room.
8. Return DTOs rather than raw Prisma records.
9. Register static paths such as `/rooms/availability` before the parameterized `/:roomId` route, or isolate them in a controller arrangement that cannot conflict.

### Required Tests

- List all rooms.
- Filter by minimum capacity.
- Filter by one facility and multiple required facilities.
- Reject invalid capacity or facility input.
- Return details for a known room and `404` for an unknown room.

### Exit Criteria

- Authenticated requests receive stable room DTOs.
- Filters produce the expected seeded results.
- No password or unrelated database fields are exposed.

## 9. Phase 5 — Mobile Foundation and Authentication

### Goal

Create the mobile navigation, API client, secure session handling, and login experience.

### Steps

1. Create `feature/mobile-auth` from `dev`.
2. Configure Expo Router groups for authenticated and unauthenticated routes.
3. Configure application metadata:
   - name: `CampusSpace`
   - slug: `campus-space`
   - Android package: `com.celineemercy.campusspace`
   - portrait orientation unless the UI requires otherwise
4. Add TanStack Query and provide one query client at the application root.
5. Create one typed fetch wrapper that:
   - reads `EXPO_PUBLIC_API_URL`
   - adds the bearer token when available
   - parses the shared error shape
   - applies a request timeout
   - never logs the token
6. Treat `EXPO_PUBLIC_API_URL` as configuration, not a secret.
7. Use these development URLs:
   - Android emulator: `http://10.0.2.2:3000/api/v1`
   - physical device on the same network: the development computer's LAN IP
   - installable APK: a reachable HTTPS API URL
8. Add Expo SecureStore for the JWT.
9. Add a small authentication context exposing:
   - current user
   - session restoration state
   - sign-in
   - sign-out
10. Implement the login form with React Hook Form and Zod.
11. Show validation, loading, invalid-credential, network, and unexpected-error states.
12. Restore a stored session on startup and return to login if the token is invalid or expired.
13. Add an authenticated application shell with Search and My Reservations entry points.

### Required Tests

- Login validation blocks malformed input.
- Successful login stores the token in SecureStore and opens the authenticated area.
- Failed login displays a safe message.
- Sign-out clears the token and cached private data.
- Expired or rejected authentication returns the user to login.

### Exit Criteria

- A seeded account can sign in from the emulator.
- The token is absent from AsyncStorage and SQLite.
- Restarting the app restores a valid session.

## 10. Phase 6 — Room Discovery UI

### Goal

Allow students to browse rooms, view details, and select search criteria.

### Steps

1. Create `feature/room-discovery` from `dev`.
2. Define mobile DTO types for room summaries, room details, and facilities.
3. Implement a room list query and loading skeleton.
4. Implement reusable room cards showing name, location, capacity, and key facilities.
5. Add explicit empty, error, and retry states.
6. Implement the room detail screen.
7. Add date, start-time, and end-time controls using the campus timezone.
8. Add minimum-capacity and multi-facility filters.
9. Validate that start time is before end time before sending a request.
10. Convert selected `Asia/Jakarta` local date/time values to ISO 8601 UTC timestamps at the API boundary.
11. Preserve search criteria when navigating to room details and back.
12. Make touch targets, labels, contrast, and text scaling suitable for Android accessibility.

### Required Tests

- Room list loading, success, empty, and error states.
- Capacity and facility filter state.
- Invalid time ranges.
- Local-time-to-UTC conversion around day boundaries.
- Room detail navigation and back-navigation state preservation.

### Exit Criteria

- Students can browse seeded rooms and see accurate details.
- Search input cannot submit an invalid interval.
- The API receives UTC timestamps matching the chosen campus time.

## 11. Phase 7 — Schedule-Aware Availability

### Goal

Return only rooms that meet the requested filters and have no blocking interval.

### Steps

1. Create `feature/room-availability` from `dev`.
2. Implement `GET /api/v1/rooms/availability` with:
   - required `startsAt` and `endsAt`
   - optional `minCapacity`
   - optional comma-separated `facilityIds`
3. Reject missing, invalid, or non-increasing time ranges.
4. Query rooms whose capacity and facilities match.
5. Exclude rooms with an overlapping `ClassSchedule`.
6. Exclude rooms with an overlapping `CONFIRMED` reservation.
7. Use the shared overlap rule:

   ```text
   requestedStart < existingEnd
   AND
   requestedEnd > existingStart
   ```

8. Do not treat `CANCELLED` reservations as blockers.
9. Return enough room summary data to render results without a second request.
10. Connect the mobile search form to the availability endpoint.
11. Display the active time and filters above the result list.
12. Provide a useful empty state that suggests changing time, capacity, or facilities.

### Required Tests

- No filters beyond time.
- Capacity and one/multiple facility filters.
- Partial overlap, contained interval, and containing interval.
- Exact boundary adjacency, which must remain available.
- Class schedule conflict.
- Confirmed reservation conflict.
- Cancelled reservation ignored.

### Exit Criteria

- Seeded conflict cases produce the expected availability results.
- Adjacent bookings are allowed.
- The mobile UI clearly identifies the interval being searched.

## 12. Phase 8 — Conflict-Safe Reservation Creation

### Goal

Create reservations while preventing double booking under concurrent requests.

### Steps

1. Create `feature/reservation-creation` from `dev`.
2. Implement `POST /api/v1/reservations` with `roomId`, `startsAt`, and `endsAt` only.
3. Derive `userId` from the authenticated JWT; never accept it from the request body.
4. Validate the room and time range before opening a transaction.
5. Inside one database transaction:
   - lock the selected room row
   - recheck overlapping class schedules
   - recheck overlapping `CONFIRMED` reservations
   - insert the new `CONFIRMED` reservation only when no conflict exists
6. Return `409 RESERVATION_CONFLICT` when availability changed after search.
7. Return `201` with a reservation DTO after a successful commit.
8. Add a confirmation step in the mobile app that shows room, campus-local date, start time, and end time.
9. Disable duplicate submissions while the request is pending.
10. On success, invalidate availability and personal-reservation queries.
11. On `409`, preserve the search criteria, explain the conflict, and offer to refresh results.

### Required Tests

- Successful reservation.
- Unknown room and invalid interval.
- Class schedule conflict.
- Existing confirmed-reservation conflict.
- Adjacent reservation accepted.
- Duplicate tap does not create duplicate client requests.
- Two concurrent API requests for the same room/time result in one success and one `409`.

### Exit Criteria

- The search-to-confirmation flow works end to end.
- Concurrency tests demonstrate that double booking is prevented by the backend.
- The mobile client never shows a failed reservation as confirmed.

## 13. Phase 9 — My Reservations and Cancellation

### Goal

Let students review and cancel their own active reservations.

### Steps

1. Create `feature/my-reservations` from `dev`.
2. Implement `GET /api/v1/reservations/mine`.
3. Order upcoming confirmed reservations first, followed by relevant history.
4. Include room summary data so the mobile list does not require one request per reservation.
5. Implement `PATCH /api/v1/reservations/:reservationId/cancel`.
6. Use an atomic conditional update that matches reservation ID, authenticated user ID, and `CONFIRMED` status.
7. Return:
   - `404` when the reservation does not exist
   - `403` when it belongs to another user
   - a stable conflict/error when it is already cancelled
8. Record `cancelledAt`; do not delete the row.
9. Add upcoming and cancelled sections to the mobile screen.
10. Require a confirmation dialog before cancellation.
11. After cancellation, invalidate personal reservations and room availability.

### Required Tests

- List only the authenticated user's reservations.
- Cancel an owned confirmed reservation.
- Reject cancellation by another user.
- Handle already-cancelled reservations.
- Confirm cancelled reservations no longer block availability.

### Exit Criteria

- The authenticated user can see and cancel only their reservations.
- Cancellation is reflected in availability without restarting the application.

## 14. Phase 10 — SQLite Cache and Network Failure Handling

### Goal

Provide useful read behavior during temporary network failures without pretending offline writes succeeded.

### Steps

1. Create `feature/local-cache` from `dev`.
2. Add `expo-sqlite` and a versioned local migration mechanism.
3. Create cache tables for:
   - rooms
   - facilities
   - room/facility relationships
   - the current user's latest reservation snapshot
   - cache metadata and update timestamps
4. Write cache adapters behind interfaces so screens do not execute SQL directly.
5. After successful room or reservation queries, update SQLite in a transaction.
6. When a read fails because of connectivity, load cached records and mark the UI as stale/offline.
7. Display the cache timestamp when useful.
8. Never cache passwords or JWTs in SQLite.
9. Never insert a speculative reservation into the authoritative list.
10. When offline booking or cancellation is attempted, explain that a connection is required and offer retry.
11. Clear user-specific cached reservations on sign-out while retaining public room data.
12. Handle local schema migration failure by rebuilding only the cache, never server data.

### Required Tests

- Successful API response updates the cache.
- Cached room data appears after a simulated read failure.
- Cached reservations are separated by signed-in user.
- Sign-out clears private cached data.
- Offline mutation attempts do not create false success states.
- Cache migration and rebuild behavior.

### Exit Criteria

- Core room information remains viewable during a temporary outage.
- Stale data is visibly identified.
- All reservation mutations remain server-authoritative.

## 15. Phase 11 — Quality, Security, and Release Hardening

### Goal

Make the integrated MVP reliable enough for an APK demonstration.

### Steps

1. Create `feature/release-hardening` from `dev`.
2. Run linting, TypeScript checks, unit tests, integration tests, and end-to-end API tests from clean installs.
3. Add CI for pull requests into `dev`:
   - install from lock files
   - lint and type-check both applications
   - run backend and mobile tests
   - start a PostgreSQL service for database integration tests
4. Add a backend production build check.
5. Validate all environment variables at startup/build time.
6. Confirm production logs exclude passwords, JWTs, authorization headers, and database credentials.
7. Confirm API errors do not expose stack traces in production.
8. Review dependency security reports and resolve relevant production issues.
9. Add sensible request limits and JSON body-size limits.
10. Verify accessibility labels, touch targets, keyboard behavior, empty states, and text scaling.
11. Replace placeholder launcher icon, adaptive icon, splash assets, and application name.
12. Confirm the application has no unnecessary Android permissions.
13. Test the full acceptance matrix using clean seeded data.
14. Record known limitations instead of hiding them.

### Exit Criteria

- CI passes on the proposed release commit.
- All Definition of Done user flows pass on an Android emulator.
- No high-severity known defect blocks login, search, booking, listing, or cancellation.
- No secret or generated binary is staged in Git.

## 16. Phase 12 — Deploy the Release API

### Goal

Provide the HTTPS backend required by an APK installed outside the development computer.

### Steps

1. Provision a managed PostgreSQL database and a Node.js-capable application host.
2. Configure the host to build the NestJS server and start the compiled application.
3. Configure production environment values in the host's secret manager:
   - `NODE_ENV=production`
   - `PORT` supplied by the host
   - production `DATABASE_URL`
   - a new high-entropy `JWT_SECRET`
   - `JWT_EXPIRES_IN`
   - `CAMPUS_TIMEZONE=Asia/Jakarta`
   - controlled seed credentials only if production demo seeding is intentionally enabled
4. Run `prisma migrate deploy` as the release migration step.
5. Seed only intentional course-demo data; never overwrite existing production data on each deployment.
6. Expose the NestJS process through HTTPS.
7. Verify `/api/v1/health` reports a healthy database connection.
8. Verify login, room listing, availability, reservation creation, listing, and cancellation against the hosted API.
9. Record the final base URL, for example:

   ```text
   https://api.example.com/api/v1
   ```

10. Configure database backups or snapshots appropriate for the chosen host.
11. Keep deployment credentials out of GitHub issues, pull requests, screenshots, and mobile configuration.

### Exit Criteria

- The API is reachable over HTTPS from a physical Android device using mobile data or an unrelated network.
- Database migrations are current.
- The health endpoint and all core flows work against the release database.
- The public API URL contains no secret value.

## 17. Phase 13 — Configure EAS for an Installable APK

### Goal

Configure a signed internal-distribution APK that uses the hosted API.

### Steps

1. Create an Expo account and install or invoke the current EAS CLI. Using `npx eas-cli@latest` avoids requiring a permanent global installation.
2. From `mobile/`, authenticate:

   ```bash
   npx eas-cli@latest login
   ```

3. Configure the Expo project for Android EAS Build:

   ```bash
   npx eas-cli@latest build:configure --platform android
   ```

4. Confirm `app.json` or `app.config.ts` contains:
   - `name`: `CampusSpace`
   - `slug`: `campus-space`
   - semantic application version
   - Android package: `com.celineemercy.campusspace`
   - final icon, adaptive icon, and splash configuration
5. Use EAS-managed Android signing credentials for the MVP. Do not download or commit the keystore.
6. Configure the public API URL for the EAS `preview` environment:

   ```bash
   npx eas-cli@latest env:set --name EXPO_PUBLIC_API_URL --value https://api.example.com/api/v1 --environment preview --visibility plaintext
   ```

7. Do not place secrets in `EXPO_PUBLIC_API_URL`; all `EXPO_PUBLIC_*` variables are readable in the built application.
8. Configure `mobile/eas.json` with an APK profile:

   ```json
   {
     "cli": {
       "appVersionSource": "remote"
     },
     "build": {
       "apk": {
         "distribution": "internal",
         "environment": "preview",
         "android": {
           "buildType": "apk"
         }
       },
       "production": {
         "environment": "production",
         "android": {
           "buildType": "app-bundle"
         }
       }
     }
   }
   ```

9. Keep the `production` AAB profile for a possible future Play Store release, but use the `apk` profile for direct installation.
10. Verify the configured EAS environment values:

    ```bash
    npx eas-cli@latest env:list --environment preview
    ```

11. Confirm the resolved application configuration before building:

    ```bash
    npx expo config --type public
    ```

12. Commit the safe EAS configuration files, but never commit `.env`, local credentials, or build artifacts.

### Exit Criteria

- The EAS project is linked to the correct Expo account.
- The Android package ID is final.
- The APK profile explicitly uses `android.buildType: "apk"`.
- The preview environment contains the correct HTTPS API URL.
- Icons, version, and display name are final for the course release.

## 18. Phase 14 — Build, Install, and Verify the APK

### Goal

Produce the signed APK and prove it works outside the development environment.

### Steps

1. Tag or record the exact Git commit selected for the APK candidate.
2. Confirm the working tree is clean and the candidate commit exists on `origin/dev`.
3. Run the complete release checks from clean dependency installs.
4. Start the cloud APK build from `mobile/`:

   ```bash
   npx eas-cli@latest build --platform android --profile apk
   ```

5. Save the EAS build URL and build ID in the release notes.
6. Download the completed artifact from the EAS build page or with the supported EAS download command.
7. Keep the downloaded APK outside Git-tracked source directories.
8. Install on an emulator or connected device, for example:

   ```bash
   adb install -r CampusSpace.apk
   ```

9. Test a clean installation with no Metro bundler or development server running.
10. Execute the release acceptance checklist:
    - launch without crashing
    - sign in with a demo account
    - view room list and details
    - search availability with capacity and facility filters
    - create a valid reservation
    - receive a clear conflict response for an overlapping reservation
    - view the new reservation
    - cancel the reservation
    - confirm cancellation changes availability
    - verify cached read behavior during a temporary network outage
    - verify booking remains unavailable while offline
11. Repeat the critical flow on at least one physical Android device if available.
12. Check application name, icon, splash, version, layout, network security, and accessibility on the installed build.
13. Record device model, Android version, commit hash, build ID, test date, and known limitations.
14. If a defect is found, fix it on a feature branch, merge into `dev`, and create a new EAS build. Do not replace release evidence with an untracked local patch.

### Exit Criteria

- EAS reports a successful Android APK build.
- The APK installs and launches without Expo Go or Metro.
- The installed app communicates with the HTTPS release API.
- Every core acceptance scenario passes on the release candidate.
- The APK build ID and source commit are recorded.

## 19. Release Handoff Checklist

Use this checklist before presenting or sharing the APK:

- [ ] Source commit is pushed to `origin/dev`.
- [ ] Working tree is clean.
- [ ] CI and release checks pass.
- [ ] Database migration status is current.
- [ ] Demo data and accounts are intentional.
- [ ] Hosted API health check is successful.
- [ ] APK uses the HTTPS release API URL.
- [ ] APK package ID, name, icon, and version are correct.
- [ ] EAS signing credentials are retained safely by the project owner.
- [ ] APK installs on a clean Android environment.
- [ ] Login, search, booking, conflict prevention, listing, and cancellation pass.
- [ ] Offline read behavior and online-only mutation behavior are clear.
- [ ] No secrets or binaries are committed.
- [ ] Build ID, commit hash, test evidence, and known limitations are documented.
- [ ] The APK is clearly described as an internal/course build, not a Play Store release.

## 20. Suggested Course Schedule

| Meeting | Primary outcome | Related phase |
| --- | --- | --- |
| 1 | Scope, contracts, repository foundations | 0–1 |
| 2 | PostgreSQL, Prisma schema, migrations, seed | 2 |
| 3 | Backend foundation and authentication | 3 |
| 4 | Room/facility API and mobile authentication | 4–5 |
| 5 | Room list, details, and search controls | 6 |
| 6 | Availability API and filters | 7 |
| 7 | Transactional reservation creation | 8 |
| 8 | My Reservations and cancellation | 9 |
| 9 | SQLite cache and network handling | 10 |
| 10 | Integration, automated tests, and CI | 11 |
| 11 | Hosted API and EAS configuration | 12–13 |
| 12 | APK build, device verification, and demonstration | 14 |

If the schedule slips, reduce visual polish and cache sophistication first. Do not remove backend conflict validation, authentication boundaries, or the end-to-end reservation flow.

## 21. Official Build References

- [Create your first EAS build](https://docs.expo.dev/build/setup/)
- [Build APKs for Android devices and emulators](https://docs.expo.dev/build-reference/apk/)
- [Configure EAS Build with `eas.json`](https://docs.expo.dev/build/eas-json/)
- [Manage EAS environment variables](https://docs.expo.dev/eas/environment-variables/manage/)
- [Expo environment variables](https://docs.expo.dev/guides/environment-variables/)

An APK is appropriate for direct installation on a device or emulator. A future Google Play release should use the production AAB profile instead.
