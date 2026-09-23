# CampusSpace VPS Deployment Guide

This guide deploys the CampusSpace prototype API to one Ubuntu VPS with Docker Compose. PostgreSQL is private, the NestJS API is private, and Caddy is the only public container. Caddy obtains and renews TLS certificates automatically.

## 1. Deployment Topology

```text
Android APK
    |
    | HTTPS :443
    v
Caddy reverse proxy
    |
    | private Docker network :3000
    v
NestJS API
    |
    | private Docker network :5432
    v
PostgreSQL 17
```

Only these VPS ports are public:

- `22/tcp` for SSH
- `80/tcp` for ACME certificate validation and HTTPS redirects
- `443/tcp` and `443/udp` for HTTPS/HTTP3

PostgreSQL and the NestJS port are not published to the internet.

## 2. VPS and DNS Prerequisites

Recommended prototype VPS:

- Ubuntu 24.04 LTS
- 2 vCPU
- 2 GB RAM
- 20 GB or more SSD storage
- A static public IPv4 address

Create an `A` record such as `api.campusspace.example.com` pointing to the VPS IPv4 address. Add an `AAAA` record only when IPv6 is configured and reachable. Wait for DNS resolution before the first deployment so Caddy can obtain a certificate.

## 3. Bootstrap Ubuntu

Connect through SSH, install Git if necessary, and clone the repository:

```bash
sudo apt-get update
sudo apt-get install -y git
sudo mkdir -p /opt/campus-space
sudo chown "$USER":"$USER" /opt/campus-space
git clone https://github.com/celineemercy/space-sync.git /opt/campus-space
cd /opt/campus-space
git switch dev
```

Review and run the provided bootstrap script:

```bash
sudo ./deploy/scripts/bootstrap-ubuntu.sh
```

It installs Docker Engine and the Compose plugin from Docker's official Ubuntu repository, enables Docker at boot, and configures UFW for SSH and HTTPS. It does not open PostgreSQL. Sign out and back in after the script adds the login account to the `docker` group.

## 4. Configure Production Secrets

Create the ignored VPS environment file:

```bash
cd /opt/campus-space
cp deploy/.env.vps.example deploy/.env.vps
chmod 600 deploy/.env.vps
```

Generate URL-safe random values:

```bash
openssl rand -hex 32
openssl rand -hex 48
openssl rand -hex 24
```

Use the first value as `POSTGRES_PASSWORD`, the second as `JWT_SECRET`, and the third or another unique value as `SEED_DEMO_PASSWORD`. A hexadecimal database password can be copied directly into `DATABASE_URL` without URL encoding.

Edit `deploy/.env.vps`:

```dotenv
API_DOMAIN=api.campusspace.example.com
TLS_EMAIL=operator@example.com

POSTGRES_DB=campus_space
POSTGRES_USER=campus_space
POSTGRES_PASSWORD=<generated-database-password>
DATABASE_URL=postgresql://campus_space:<same-database-password>@db:5432/campus_space?schema=public

JWT_SECRET=<generated-jwt-secret>
JWT_EXPIRES_IN=1h
CAMPUS_TIMEZONE=Asia/Jakarta
CORS_ORIGIN=

SEED_DEMO_EMAIL=student@example.test
SEED_DEMO_PASSWORD=<unique-demo-password>
BACKUP_RETENTION_DAYS=14
```

`CORS_ORIGIN` may remain empty for the Android-only prototype. If a browser client is added, set it to the exact allowed origin. Never commit `deploy/.env.vps`.

## 5. First Deployment

Run:

```bash
cd /opt/campus-space
./deploy/scripts/deploy.sh
```

The script performs these actions in order:

1. Validates the environment file and rejects placeholders.
2. Builds the API image.
3. Starts private PostgreSQL and waits for health.
4. Applies committed Prisma migrations.
5. Starts the API and waits for health.
6. Starts Caddy and verifies the public HTTPS health endpoint.

Inspect status and logs when needed:

```bash
docker compose --env-file deploy/.env.vps -f deploy/docker-compose.vps.yml ps
docker compose --env-file deploy/.env.vps -f deploy/docker-compose.vps.yml logs -f --tail 100 server proxy
```

The expected public endpoint is:

```text
https://api.campusspace.example.com/api/v1/health
```

## 6. Seed Demo Data Intentionally

Seeding never runs automatically. After the first successful deployment, run it once when course-demo data is wanted:

```bash
./deploy/scripts/seed-demo.sh
```

The seed is idempotent, but it updates the controlled demo account password and reference data from the current VPS environment. Do not use course-demo credentials for a public production service.

## 7. Backups and Restore

Create a compressed logical backup:

```bash
./deploy/scripts/backup.sh
```

Backups are stored under the ignored `deploy/backups/` directory with owner-only permissions. Files older than `BACKUP_RETENTION_DAYS` are removed. Copy backups to encrypted offsite storage; a backup on the same VPS does not protect against VPS loss.

Example daily cron entry for the deployment user:

```cron
15 2 * * * /opt/campus-space/deploy/scripts/backup.sh >> /opt/campus-space/deploy/backups/backup.log 2>&1
```

Restore is deliberately guarded and accepts only files inside `deploy/backups/`:

```bash
./deploy/scripts/restore.sh --confirm deploy/backups/campus-space-YYYYMMDDTHHMMSSZ.sql.gz
```

Take a fresh backup before a restore. Restore replaces database objects represented in the dump and restarts the API afterward.

## 8. Manual Updates

Deploy only committed code from `dev`:

```bash
cd /opt/campus-space
git status --short
git fetch origin dev
git switch dev
git pull --ff-only origin dev
./deploy/scripts/deploy.sh
```

The deployment script applies forward database migrations. Database migrations are not automatically rolled back when application code is rolled back.

For an application-only rollback, locate a known-good commit, switch to it, and run the deployment script again. Confirm that its Prisma schema remains compatible with already-applied migrations:

```bash
git log --oneline -10
git switch --detach <known-good-commit>
./deploy/scripts/deploy.sh
```

Return to normal updates afterward with `git switch dev`.

## 9. Optional GitHub Deployment Workflow

The `Deploy VPS` workflow is manual and runs only from `dev`. Create a protected GitHub environment named `vps-production`, optionally require reviewer approval, and configure:

Environment variable:

- `VPS_API_DOMAIN`: domain only, such as `api.campusspace.example.com`

Environment secrets:

- `VPS_HOST`: VPS hostname or IP
- `VPS_USER`: non-root deployment account
- `VPS_APP_PATH`: `/opt/campus-space`
- `VPS_SSH_PRIVATE_KEY`: dedicated deployment private key
- `VPS_KNOWN_HOSTS`: verified output from `ssh-keyscan` collected over a trusted channel

Add the matching public key to the deployment user's `~/.ssh/authorized_keys`. The workflow refuses to overwrite a dirty VPS checkout, fast-forwards `dev`, runs the deployment script, and confirms the public health endpoint.

## 10. Connect the Android Build

The APK must use the public HTTPS API, not `localhost`, `10.0.2.2`, or a private LAN address. From `mobile/`, after authenticating with the project owner's Expo account:

```bash
npx eas-cli@latest env:set \
  --name EXPO_PUBLIC_API_URL \
  --value https://api.campusspace.example.com/api/v1 \
  --environment preview \
  --visibility plaintext
```

The API URL is public application configuration and must never contain credentials. The existing `apk` profile in `mobile/eas.json` is ready for a later EAS build.

## 11. Operational Checklist

- [ ] DNS points to the VPS.
- [ ] SSH key authentication works and password login is disabled after confirming key access.
- [ ] UFW exposes only SSH, HTTP, and HTTPS.
- [ ] `deploy/.env.vps` is mode `600` and is not tracked by Git.
- [ ] PostgreSQL has no published host port.
- [ ] HTTPS health check succeeds.
- [ ] Demo seeding was intentional.
- [ ] A backup was created and copied offsite.
- [ ] Restore procedure has been rehearsed using non-production data.
- [ ] GitHub deployment environment requires approval when appropriate.
- [ ] EAS preview uses the public HTTPS API URL.
