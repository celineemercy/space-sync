# Security Review Notes

Review date: 18 September 2026

## Implemented controls

- Argon2id password hashing and time-limited JWT authentication.
- Startup validation for database URL, JWT secret length, port, environment, expiry, timezone, and optional CORS origins.
- DTO validation rejects unknown input fields.
- API errors avoid stack traces and credentials in client responses.
- Explicit 32 KB JSON body limit.
- Configurable CORS allow-list for browser clients.
- Ownership checks for reservation cancellation.
- PostgreSQL row locking and a transactional conflict recheck before reservation creation.
- Secrets, signing files, local environment files, and APK/AAB artifacts are ignored by Git.

## Dependency audit disposition

`npm audit fix` was run without `--force`. Remaining advisories require incompatible framework changes according to npm's proposed remediation, so they were not forced:

- Prisma CLI currently brings `deepmerge-ts` and `mysql2` advisories. CampusSpace supplies static, operator-controlled Prisma configuration and uses PostgreSQL rather than MySQL. The affected packages are migration/tooling dependencies, not request parsers exposed by application endpoints.
- Expo tooling currently brings moderate advisories through URI/configuration build dependencies. They are upstream Expo toolchain dependencies; forcing npm's suggested versions would downgrade outside Expo SDK 57's supported dependency set.

These advisories should be rechecked whenever a compatible Prisma 7 or Expo SDK 57 patch is published and before a public deployment. Do not use `npm audit fix --force` without a deliberate framework migration and full regression test.

## Release requirements

- Replace every local/demo secret in the deployment secret manager.
- Set `CORS_ORIGIN` to the exact allowed web origins if a browser client is deployed.
- Terminate public traffic with HTTPS.
- Restrict database network access to the application/deployment environment.
- Add infrastructure-level login rate limiting before public exposure.
- Retain database backups and rotate any credential suspected of disclosure.
