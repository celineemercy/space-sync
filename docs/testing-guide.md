# CampusSpace Testing and APK Readiness Guide

## What Docker Can and Cannot Test

Docker is useful for running the PostgreSQL database and NestJS API consistently. It also lets the project verify migrations, seed data, authentication, API behavior, and concurrent reservation protection.

Docker cannot emulate Android sensors, Android lifecycle behavior, SecureStore, SQLite on a device, touch interaction, or APK installation. Use an Android Studio emulator, Expo Go on a physical Android phone, or an installed APK for those checks.

## 1. Start the Local Backend

From the repository root:

```bash
copy .env.example .env
docker compose --profile full up -d --build
docker compose --profile full exec server npm run db:seed
docker compose --profile full ps
```

Expected services:

- `campus-space-db-1` is healthy on host port `5433`.
- `campus-space-server-1` is healthy on host port `3000`.
- `http://localhost:3000/api/v1/health` returns an OK response.

Before the first start, replace the placeholders in the ignored root `.env`. The local seed creates the demo login declared there. These credentials are for local course development only and must not be reused in production.

To view logs or stop the services:

```bash
docker compose --profile full logs -f server
docker compose --profile full down
```

Do not add `-v` to `down` unless you intentionally want to delete the local CampusSpace database volume.

## 2. Run Automated Checks

Backend:

```bash
cd server
npm ci
npm run typecheck
npm run lint
npm test
npm run build
npm run test:smoke
```

Mobile:

```bash
cd mobile
npm ci
npm run typecheck
npm run lint
npm test
npx expo-doctor
npx expo export --platform android
```

The export command validates that Metro can produce the Android JavaScript bundle. It does not create an installable APK.

## 3. Test on an Android Studio Emulator

1. Install Android Studio and its current Android SDK tools.
2. Create and start an Android Virtual Device.
3. Keep `mobile/.env` set to:

   ```dotenv
   EXPO_PUBLIC_API_URL=http://10.0.2.2:3000/api/v1
   ```

4. Start Docker as described above.
5. In `mobile/`, run `npm start` and press `a`.
6. Sign in, search rooms, create a reservation, view it, cancel it, and repeat a search.

`10.0.2.2` is the Android emulator route back to the development computer. `localhost` inside the emulator refers to the emulator itself.

## 4. Test on a Physical Android Phone with Expo Go

1. Connect the phone and computer to the same trusted network.
2. Find the computer's LAN IPv4 address with `ipconfig`.
3. Set `mobile/.env` to the computer address, for example:

   ```dotenv
   EXPO_PUBLIC_API_URL=http://192.168.1.20:3000/api/v1
   ```

4. Allow inbound TCP port 3000 only on the trusted/private network if Windows Firewall blocks it.
5. Run `npm start` in `mobile/` and scan the QR code using Expo Go.

Expo Go is the quickest functional test, but the final acceptance pass must use the signed APK because standalone builds can differ from Expo Go.

## 5. Manual Acceptance Checklist

- [ ] Login succeeds with the local demo account.
- [ ] Invalid credentials display a useful error.
- [ ] Room list and room details load.
- [ ] Capacity and facility filters work together.
- [ ] Busy rooms are excluded for overlapping class schedules or reservations.
- [ ] Adjacent time ranges are accepted.
- [ ] A valid reservation is confirmed and appears in My Reservations.
- [ ] An overlapping reservation is rejected.
- [ ] A reservation can be cancelled once and returns the room to availability.
- [ ] Cached rooms/reservations remain readable after temporarily stopping the API.
- [ ] Booking and cancellation clearly fail while offline instead of pretending to succeed.
- [ ] Keyboard, date/time pickers, loading states, empty states, and error states are usable.
- [ ] Text remains readable at larger Android font settings.

## 6. Build and Test the APK

A distributable APK needs an HTTPS API reachable from the phone. The local Docker URL will not work once the phone leaves the development network.

1. Deploy the server and PostgreSQL to a controlled host.
2. Run `prisma migrate deploy` and seed only intentional demo data.
3. Verify the HTTPS `/api/v1/health` endpoint and core API flow.
4. Log into the project owner's Expo account from `mobile/`:

   ```bash
   npx eas-cli@latest login
   ```

5. Link/configure EAS if it is not linked yet:

   ```bash
   npx eas-cli@latest build:configure --platform android
   ```

6. Set the preview environment's public API URL to the deployed HTTPS endpoint. It is public configuration, never a secret.
7. Verify configuration with `npx expo config --type public`.
8. Build the internal APK:

   ```bash
   npx eas-cli@latest build --platform android --profile apk
   ```

9. Download the completed APK outside the repository, install it on a clean device, and repeat the acceptance checklist with Metro stopped.

For a USB-connected device with Android platform tools installed:

```bash
adb install -r CampusSpace.apk
```

## 7. Release Evidence

Record the Git commit, EAS build ID and URL, APK checksum, device model, Android version, test date, API release URL, acceptance results, and known limitations. Never record passwords, JWTs, database credentials, or signing material.
