# CampusSpace API

NestJS 12 API for CampusSpace. It provides JWT authentication, room and facility queries, schedule-aware availability, transactional reservation creation, current-user reservations, cancellation, and a database-aware health endpoint.

## Recommended local setup with Docker

From the repository root:

```bash
copy .env.example .env
docker compose --profile full up -d --build
docker compose --profile full exec server npm run db:seed
docker compose --profile full ps
```

The API is available at `http://localhost:3000/api/v1`; PostgreSQL is exposed on host port `5433` to avoid common conflicts with an existing PostgreSQL installation.

Run the live API smoke test from this directory:

```bash
npm ci
npm run test:smoke
```

The smoke test covers health, authentication, room listing, availability, concurrent conflict prevention, reservation listing, and cancellation. It cleans up its temporary confirmed reservation.

## Native development

Copy `.env.example` to `.env`, replace the local JWT secret and demo password, then run:

```bash
npm ci
npm run db:generate
npm run db:migrate
npm run db:seed
npm run start:dev
```

## Quality checks

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

Never commit `.env`, database credentials, JWT secrets, demo passwords, or production seed data.
