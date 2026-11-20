# ADR 0004: Split Infrastructure and Device Testing

- Status: Accepted
- Date: 2026-09-18

## Context

Docker can reproduce server infrastructure but does not provide a practical Android user-interface test environment for this course project.

## Decision

Use Docker Compose for PostgreSQL and optional production-style NestJS execution. Use Jest/Vitest for automated logic tests and Android Studio Emulator, Expo Go, or a physical Android device for interactive mobile testing. Use EAS Build for the signed APK.

## Consequences

- Backend integration tests can run against a disposable PostgreSQL instance.
- Mobile native behavior must still be verified on Android.
- Developers without a local JDK can use Expo Go during development and EAS cloud builds for the APK.
