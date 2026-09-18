# ADR 0001: Use a Modular Monolith with a REST API

- Status: Accepted
- Date: 2026-09-18

## Context

CampusSpace must deliver a complete mobile reservation flow within a 12-meeting course. Independent services would add deployment, observability, and consistency work without helping the MVP.

## Decision

Use one NestJS application organized into authentication, rooms, availability, and reservations modules. The Expo client communicates with it through a versioned JSON REST API under `/api/v1`.

## Consequences

- Business boundaries remain explicit without requiring distributed infrastructure.
- The backend and database can be deployed together for the course demonstration.
- A future module may be extracted only when its scaling or ownership needs justify it.
