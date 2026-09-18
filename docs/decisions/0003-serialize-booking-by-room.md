# ADR 0003: Serialize Booking Attempts by Room

- Status: Accepted
- Date: 2026-09-18

## Context

Two users can search the same available room and submit overlapping reservations concurrently. A client-side check or an ordinary read-then-insert sequence cannot prevent both requests from succeeding.

## Decision

Create reservations inside a PostgreSQL transaction. Lock the selected room row, recheck class schedules and confirmed reservations using the overlap rule, then insert only if the room remains available.

## Consequences

- Booking requests for different rooms may proceed concurrently.
- Competing requests for the same room are serialized.
- Concurrency integration tests must prove that exactly one overlapping request succeeds.
