# CampusSpace

CampusSpace is a campus room discovery and reservation app built for Android. Students can find suitable rooms, check schedule-aware availability, reserve a room, and manage their bookings.

## Features

- User authentication
- Room listing, details, and saved rooms
- Date, time, capacity, and facility filters
- Schedule-aware availability checks
- Reservation creation and cancellation
- Booking conflict prevention
- QR room scanning and local reminders
- Offline caching for important data

## Tech Stack

- **Mobile:** React Native, Expo, TypeScript, SQLite
- **API:** NestJS, TypeScript, Prisma
- **Database:** PostgreSQL
- **Development:** Docker Compose, Jest, Vitest

## Project Structure

```text
space-sync/
├── mobile/    # Expo mobile app and web preview
├── server/    # NestJS API, Prisma schema, and migrations
├── deploy/    # VPS deployment configuration
├── docs/      # Architecture, testing, and deployment guides
└── docker-compose.yml
```

## Quick Start

1. Copy the environment template and replace its placeholder values:

   ```powershell
   Copy-Item .env.example .env
   ```

2. Start PostgreSQL, the API, and the web preview:

   ```bash
   docker compose --profile full up -d --build
   docker compose --profile full exec server npm run db:seed
   ```

3. Open the web preview at `http://localhost:8081`.

For Android development, start the services above, then run:

```bash
cd mobile
npm ci
npm start
```

## Quality Checks

Run these commands in both `mobile/` and `server/`:

```bash
npm ci
npm run typecheck
npm run lint
npm test
```

The server also supports `npm run build` and `npm run test:smoke`.

## Documentation

- [Testing and APK readiness](docs/testing-guide.md)
- [Architecture](docs/architecture-plan.md)
- [State management](docs/state-management.md)
- [Local data persistence](docs/local-data-persistence.md)
- [VPS deployment](docs/vps-deployment.md)
- [Implementation plan](docs/implementation-plan.md)

## Status

The MVP is under active development. The mobile app, API, database migrations, automated checks, local Docker environment, and deployment configuration are implemented. A signed APK and final physical-device acceptance testing still require the project owner's Expo and hosting accounts.
