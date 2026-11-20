# Security Review Notes

Review date: 13 November 2026

## Implemented controls

- Argon2id password hashing and time-limited JWT authentication.
- Startup validation for database URL, JWT secret length, port, environment, expiry, timezone, and optional CORS origins.
- DTO validation rejects unknown input fields.
- API errors avoid stack traces and credentials in client responses.
- Explicit 32 KB JSON body limit.
- Configurable CORS allow-list for browser clients.
- Global API rate limiting with a stricter login limit.
- Proxy-aware client IP handling and standard Helmet HTTP headers.
- Ownership checks for reservation cancellation.
- Server-side admin role checks, protected permission-file access, file signature and size validation, and timed file deletion.
- PostgreSQL row locking and a transactional conflict recheck before reservation creation.
- Secrets, signing files, local environment files, and APK/AAB artifacts are ignored by Git.
- The VPS Compose stack exposes only Caddy; PostgreSQL and the API remain on a private Docker network.
- Production containers use health checks, bounded JSON logs, least-privilege API capabilities, and a non-root API user.

## Dependency audit disposition

`npm audit fix` was run without `--force` on the server. `npm audit --omit=dev` reported zero production dependency vulnerabilities. The full server audit still reports three moderate advisories in Vitest development tooling. Expo dependencies need a separate audit before an APK release.

Recheck advisories before public deployment. Do not use `npm audit fix --force` without a deliberate framework migration and full regression test.

## Release requirements

- Replace every local/demo secret in the deployment secret manager.
- Set `CORS_ORIGIN` to the exact allowed web origins if a browser client is deployed.
- Terminate public traffic with HTTPS.
- Restrict database network access to the application/deployment environment.
- Add infrastructure-level login rate limiting before public exposure.
- Retain database backups and rotate any credential suspected of disclosure.
