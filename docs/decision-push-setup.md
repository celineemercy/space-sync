# Reservation decision push notifications

Issue #9 remains open until a configured native build receives both approved and rejected reservation notifications. Mocked tickets and receipts are not proof of device delivery.

## Configure delivery

1. Apply the server migrations with `npm run db:migrate:deploy` before starting this version of the API. The migration adds nullable `User.pushToken` and `User.pushTokenExpiresAt` fields and a unique token index.
2. Use the existing Expo project `a097d55a-63f0-46ad-9620-37d5be6dc660`. For Android, register `com.celineemercy.spacesync` in Firebase, download its `google-services.json`, and supply its path through the `GOOGLE_SERVICES_JSON` environment variable. In EAS, use a file environment variable in the preview and production environments. Do not commit credentials.
3. Enable FCM v1, create the Firebase service account credentials, and upload them through `eas credentials --platform android` for this project. The service account and Android app configuration must belong to the same Firebase project.
4. For iOS, configure APNs credentials for `com.celineemercy.spacesync` through EAS using the owning Apple Developer account.
5. Set `EXPO_PUBLIC_API_URL` to the reachable HTTPS API. If Expo enhanced push security is enabled, configure the server's optional `EXPO_ACCESS_TOKEN` through its secret environment settings.
6. Build/install a native APK with the existing `apk` EAS profile, or a configured native iOS build. Android Expo Go does not support remote push. A compatible Android emulator requires Google Play services.

## Validate before closing #9

1. Sign in as a student and grant notification permission. Check that authenticated `POST /auth/push-token` succeeds; never publish the token or JWT.
2. Submit a reservation and put the app in the background. Approve it with a separate admin session. Confirm the device receives room name, campus time, and CONFIRMED status.
3. Repeat with rejection and confirm REJECTED status arrives.
4. Repeat with the app foregrounded. Deny notification permission and confirm login/booking still work normally.
5. Sign out while online and confirm authenticated `DELETE /auth/push-token` clears that registration. Approving another request must not send to the signed-out device. Switch accounts on the same device and verify notifications go only to the current account.
6. Record the tested commit, native build ID, platform/device, test date, and observed approval/rejection delivery in the issue. Then post the completion comment, close #9, merge its PR into `dev`, and delete the branch.

## Lifecycle and limitations

- One active Expo token is stored per user. The latest registered device replaces the previous one. A device token is reassigned away from its previous account atomically.
- Registration expires with its JWT. Restored/current sessions register again; native token rotation refreshes the registration. Old sessions cannot remove a replacement registration with a different token or expiry.
- Logout always clears local state and reminders. Remote deregistration is best effort when offline or after JWT expiration; expired registrations are never sent to. Notifications already handed to FCM/APNs cannot be recalled.
- Push sends happen after the reservation decision commits. Failures cannot undo the decision. Requests time out after five seconds and transient errors retry at most twice. Invalid tokens are cleared conditionally so a newer registration survives.
- Expo receipts are checked after 15 minutes, with one later retry for unavailable receipts. Receipt timers are in-process and do not survive an API restart; durable delivery/outbox tracking is outside this issue's scope. Operational logs distinguish send/ticket/receipt failures without exposing tokens.
- A receipt accepted by FCM/APNs still does not establish that a device displayed it. Actual delivery remains the acceptance gate.

References: [Expo setup](https://docs.expo.dev/push-notifications/push-notifications-setup/), [Expo delivery and receipt handling](https://docs.expo.dev/push-notifications/sending-notifications/), [SDK 57 notifications](https://docs.expo.dev/versions/v57.0.0/sdk/notifications/).
