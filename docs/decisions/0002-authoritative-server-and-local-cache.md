# ADR 0002: Keep Reservations Server-Authoritative

- Status: Accepted
- Date: 2026-09-18

## Context

The mobile app should remain useful during short network failures, but offline reservation writes can create conflicts that cannot be resolved safely on the device.

## Decision

PostgreSQL and the NestJS API are authoritative. SQLite caches rooms, facilities, and the latest reservation snapshot for reading. Booking and cancellation require an online API request and are never queued offline.

## Consequences

- The UI must mark cached data as stale.
- Offline mutation attempts show a retryable connection message.
- Tokens stay in SecureStore and never enter SQLite.
