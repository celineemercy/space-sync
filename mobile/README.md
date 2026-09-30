# CampusSpace Mobile

Expo SDK 57 / React Native Android client for CampusSpace. The app provides demo-account login, room search and filters, availability checks, room details, reservation creation, reservation cancellation, SecureStore authentication, and SQLite-backed cached reads.

## Local setup

```bash
copy .env.example .env
npm ci
npm run typecheck
npm run lint
npm test
```

Start the database and API from the repository root first:

```bash
docker compose --profile full up -d --build
docker compose --profile full exec server npm run db:seed
```

Then start Expo:

```bash
npm start
```

The committed example uses `http://10.0.2.2:3000/api/v1`, which is the Android emulator alias for the host computer. A physical Android device must use the computer's LAN IP instead, such as `http://192.168.1.20:3000/api/v1`; the phone and computer must be on the same network and the firewall must allow port 3000.

## Testing choices

- Android Studio emulator: press `a` in the Expo terminal after an emulator is running.
- Physical phone with Expo Go: scan Expo's QR code and use the computer's LAN IP in `.env`.
- Automated checks: `npm run typecheck`, `npm run lint`, and `npm test`.
- Native bundle validation: `npx expo export --platform android`.

Docker runs the API and PostgreSQL, but it does not replace an Android emulator or phone. See `../docs/testing-guide.md` for the complete workflow.

## Docker web preview

The `full` Compose profile also builds a browser preview of the mobile UI. From
the repository root, start the stack and seed the demo data:

```bash
docker compose --profile full up -d --build
docker compose --profile full exec server npm run db:seed
```

Open `http://localhost:8081`. The browser build uses web-only local storage
adapters for the native SecureStore and SQLite-backed cache. It is useful for UI
and workflow checks, but an Android emulator or APK is still required for final
native acceptance testing.

The web bundle calls `http://localhost:3000/api/v1` by default. Override the
build-time browser URL or host port in the root `.env` when needed:

```dotenv
MOBILE_WEB_API_URL=http://localhost:3000/api/v1
MOBILE_WEB_PORT=8081
```

## APK profile

`eas.json` contains an internal-distribution `apk` profile. After deploying the API over HTTPS and linking an Expo account, build with:

```bash
npx eas-cli@latest build --platform android --profile apk
```

Do not commit `.env`, Expo credentials, signing keys, downloaded APKs, or AAB files.
