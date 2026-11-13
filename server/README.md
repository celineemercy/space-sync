# space-sync API

NestJS 12 API for space-sync. It provides JWT authentication, room and facility queries, schedule-aware availability, permission document uploads, admin decisions, current-user reservations, cancellation, and a database-aware health endpoint.

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

The smoke test covers health, authentication, room listing, availability, multipart upload, concurrent conflict prevention, reservation listing, and cancellation. It cleans up its temporary pending request.

## Native development

Copy `.env.example` to `.env`, replace the local JWT secret and demo password, then run:

```bash
npm ci
npm run db:generate
npm run db:migrate
npm run db:seed
npm run start:dev
```

Set `DOCUMENT_STORAGE_DIR` to a private, persistent directory outside any public web root. The default for local development is `server/private-documents`. To provision an admin, build the server and set `ADMIN_EMAIL` and `ADMIN_PASSWORD` (at least 12 characters) for `npm run admin:provision`. No admin credentials are stored in the repository. Student requests require one PDF, JPG, or PNG file up to 10 MB. Pending requests expire at their start time, and stored files are removed after the 90-day retention period.

## Quality checks

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

Never commit `.env`, database credentials, JWT secrets, demo passwords, or production seed data.

## VPS deployment

Production hosting uses `deploy/docker-compose.vps.yml` with private PostgreSQL/API networks and Caddy-managed HTTPS. Follow `../docs/vps-deployment.md`; do not publish port 3000 or 5432 directly on the VPS.
