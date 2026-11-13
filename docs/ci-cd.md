# space-sync CI/CD

## What runs

| Workflow | Trigger | Result |
| --- | --- | --- |
| `CI` | Pull request to `dev`, or push to `dev` | Installs locked dependencies, checks types and lint, runs tests, migrates and seeds PostgreSQL, exercises the live API, and exports the Android bundle. |
| `Deploy VPS` | Manual dispatch from `dev`; optionally after successful `CI` on a `dev` push | Deploys the exact tested commit to the VPS and checks public HTTPS health. |
| `Build Android APK` | Manual dispatch from `dev` | Rechecks the mobile app and waits for a signed EAS preview APK build. The artifact is available from the EAS build link in the workflow log. |

Automatic VPS deployment is **off** until the repository variable `AUTO_DEPLOY_VPS` is set to `true`. Production deployments use the `vps-production` GitHub environment, so configure required reviewers there before enabling automatic deployment. A newer `dev` commit cannot silently replace the commit a deployment job was asked to deploy.

## One-time GitHub setup

1. Resolve any GitHub account billing hold that prevents Actions jobs from starting. Confirm `CI` can run on a push or pull request.
2. Create the `vps-production` and `android-preview` environments under **Settings → Environments**. Restrict both to the `dev` branch. For `vps-production`, add a required reviewer if production changes need approval.
3. Add these `vps-production` environment values:

   | Type | Name | Value |
   | --- | --- | --- |
   | Variable | `VPS_API_DOMAIN` | Public API hostname only, for example `api.space-sync.example.com`. |
   | Secret | `VPS_HOST` | VPS hostname or IP. |
   | Secret | `VPS_USER` | Non-root deployment user. |
   | Secret | `VPS_APP_PATH` | Absolute checkout path, for example `/opt/space-sync`. |
   | Secret | `VPS_SSH_PRIVATE_KEY` | Dedicated deployment private key. |
   | Secret | `VPS_KNOWN_HOSTS` | Verified SSH host-key line for the VPS. |

   Install the matching public key for `VPS_USER` on the VPS. Keep `deploy/.env.vps` on the VPS with mode `600`; it is never copied into GitHub Actions. Follow [VPS deployment](vps-deployment.md) for the initial server and database setup.
4. Add `EXPO_TOKEN` as an `android-preview` environment secret. The Expo project ID and `apk` profile are already in `mobile/app.json` and `mobile/eas.json`. Create an EAS `preview` environment variable named `EXPO_PUBLIC_API_URL` with the public HTTPS API base URL. Expo requires one successful interactive Android build to finish signing-credential setup before a non-interactive CI build can work.
5. Run **Actions → Deploy VPS → Run workflow** on `dev` for the first deployment. After the manual deployment and health check succeed, set repository variable `AUTO_DEPLOY_VPS=true` if every passing push to `dev` should deploy through the protected environment.
6. Run **Actions → Build Android APK → Run workflow** on `dev` when a new test APK is needed. Install it on a physical Android device and verify document selection, PDF/image preview, and approval before distribution.

## Local validation

From the repository root, run the server and mobile checks in their directories:

```bash
cd server && npm ci && npm run db:generate && npm run typecheck && npm run lint && npm test && npm run build
cd ../mobile && npm ci && npm run typecheck && npm run lint && npm test && EXPO_PUBLIC_API_URL=https://example.invalid/api/v1 npx expo export --platform android
```

The live API smoke test additionally needs PostgreSQL, committed migrations, seeded demo data, and a running API. CI provides these automatically. `Build Android APK` does not publish to Google Play; the `apk` profile is for internal testing.
