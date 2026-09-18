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

## APK profile

`eas.json` contains an internal-distribution `apk` profile. After deploying the API over HTTPS and linking an Expo account, build with:

```bash
npx eas-cli@latest build --platform android --profile apk
```

Do not commit `.env`, Expo credentials, signing keys, downloaded APKs, or AAB files.
