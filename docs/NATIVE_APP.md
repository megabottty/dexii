# Dexii native apps (iOS + Android) with Capacitor

The Angular web app is wrapped by [Capacitor](https://capacitorjs.com) so the
same build can ship to the App Store and Google Play. The web app and PWA are
unchanged; the native shell loads the built bundle from `dist/dexii/browser`
and talks to the hosted API at `https://dexii.onrender.com/api`
(see `NATIVE_API_BASE` in `src/app/core/config/api-config.ts`).

Project layout:

| Path | What it is |
| --- | --- |
| `capacitor.config.ts` | App id `com.dexii.app`, app name, plugin options |
| `ios/` | Xcode project (`ios/App/App.xcodeproj`) |
| `android/` | Android Studio / Gradle project |
| `src/app/core/services/push-notifications.service.ts` | Registers the device for push and sends the token to the server |
| `server/src/services/pushService.js` | Sends pushes via APNs (iOS) and Firebase Cloud Messaging (Android) |

## Everyday workflow

```bash
npm run cap:sync      # build Angular + copy into ios/ and android/
npm run cap:ios       # same, then open Xcode
npm run cap:android   # same, then open Android Studio
```

Run `npm run cap:sync` after every web change you want in the native apps.
Node 22.12+ is required by the Angular CLI (use `nvm use 22.22.0`).

## One-time setup

### Accounts

- Apple Developer Program: https://developer.apple.com/programs/ (99 USD / year)
- Google Play Console: https://play.google.com/console (25 USD one-time)
- Firebase project (free): https://console.firebase.google.com — needed for
  Android push. Add an Android app with package name `com.dexii.app`.

### iOS (Xcode)

1. Run `npm run cap:ios`. Xcode must be fully installed and selected once:
   `sudo xcode-select -s /Applications/Xcode.app/Contents/Developer`.
2. Select the **App** target → **Signing & Capabilities**:
   - Pick your Team and let Xcode manage signing. Bundle id is `com.dexii.app`.
   - Click **+ Capability** and add **Push Notifications**.
   - Click **+ Capability** and add **Background Modes**, tick
     **Remote notifications** (Info.plist already lists it).
3. Build to a real iPhone. Push does not work in the Simulator.

### iOS push credentials (APNs key)

1. In the Apple developer portal go to **Certificates, Identifiers & Profiles → Keys**.
2. Create a key with **Apple Push Notifications service (APNs)** enabled.
   Download the `.p8` file (you can only download it once) and note the
   **Key ID** and your **Team ID** (top right of the portal).
3. In Render → the `dexii` service → **Environment**, set:
   - `APNS_KEY` = the full contents of the `.p8` file
   - `APNS_KEY_ID` = the Key ID
   - `APNS_TEAM_ID` = your Team ID
   - `APNS_BUNDLE_ID` = `com.dexii.app` (already in `render.yaml`)
   - `APNS_PRODUCTION` = `true` for TestFlight / App Store, `false` while
     testing a build installed directly from Xcode.

### Android (Android Studio)

1. Install Android Studio and run `npm run cap:android`.
2. In Firebase, download `google-services.json` for the Android app and put it
   at `android/app/google-services.json` (git-ignored). Gradle picks it up
   automatically.
3. Build to a device or emulator with Google Play services.

### Android push credentials (Firebase service account)

1. Firebase console → **Project settings → Service accounts → Generate new private key**.
2. In Render set `FIREBASE_SERVICE_ACCOUNT` to the contents of that JSON file
   (raw JSON or base64 both work).

The server logs at boot which providers are configured, e.g.
`Push: APNs provider ready.` If neither is configured the app still works,
you just don't get pushes.

## Web Push (works today, no App Store needed)

Browsers and the installed PWA get notifications through Web Push, which is
already live and needs no configuration:

- VAPID keys are generated on first boot and kept in the `AppConfig`
  collection (override with `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY`). Set
  `VAPID_SUBJECT` to a `mailto:` you own if you like.
- Users turn it on from the banner on the Tea feed or in Settings →
  Notifications. iPhone requires Dexii to be added to the Home Screen first
  (iOS 16.4+), and the app must be opened from that icon.
- Subscriptions are stored on the user (`webPushSubscriptions`), routed with
  the same copy as the feed, and pruned when a browser reports them gone.
- The Angular service worker (`ngsw-worker.js`) displays the notification and
  opens the right screen on tap. It only runs in production builds.

## How push works

1. When a signed-in, unlocked user opens the native app, the app asks for
   notification permission and registers with APNs / FCM.
2. The device token is sent to `POST /api/notifications/push-token` and stored
   on the user (`pushTokens`). Logging out removes it.
3. Every call to `createNotification` on the server (friend requests, crush
   shares, invite accepted, journal prompts) also sends a push to all of the
   recipient's devices with the same wording the feed uses. Tapping the push
   opens the relevant screen. Invalid tokens are pruned automatically.

## Shipping

- **iOS**: Xcode → **Product → Archive** → **Distribute App** → App Store
  Connect. Create the app record at https://appstoreconnect.apple.com with the
  same bundle id, upload screenshots, a privacy policy URL, and submit. Use
  TestFlight first to try it on friends' phones.
- **Android**: Android Studio → **Build → Generate Signed Bundle** (.aab),
  upload in the Play Console. Keep the signing keystore somewhere safe.
- Bump `MARKETING_VERSION` / `CURRENT_PROJECT_VERSION` (Xcode) and
  `versionName` / `versionCode` (`android/app/build.gradle`) for every release.

## PWABuilder later?

Still possible: the manifest and service worker are untouched, so
https://www.pwabuilder.com can package `https://dexii.onrender.com` at any time.
