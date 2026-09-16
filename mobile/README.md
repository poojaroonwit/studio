# Hrive Native Mobile

Hrive packages the shared OBSI People / Employee Self Service experience as native iOS and Android apps with Capacitor. Business logic, authentication, permissions, localization, and ESS screens remain shared with `people.outborn.co`; native code supplies device capabilities and store packaging.

## Native identity

- App name: `Hrive`
- Bundle/application id: `co.outborn.people`
- Initial route: `https://people.outborn.co/employee-portal`
- Custom link scheme: `hrive://`
- Universal/App Link host: `people.outborn.co`
- Platforms: iOS + Android
- Cleartext HTTP and Android mixed content: disabled
- Production WebView debugging: disabled

## Implemented native capabilities

- Push registration and notification tap routing
- FCM HTTP v1 delivery for Android and APNs HTTP/2 delivery for iOS
- Apple Universal Links, Android App Links, and `hrive://` fallback links
- Face ID / Touch ID / Android biometric or device-credential lock
- Keychain / Android Keystore-backed secure storage
- Secure offline mutation queue with automatic replay after reconnect/resume
- Native connectivity state
- Camera/photo picker, document/file writes, native share sheet, external browser
- Haptics and local notifications
- Native splash screen, status bar, keyboard resizing, safe area support, Android back handling
- Generated native icons and light/dark splash assets from the Hrive product icon
- Native version/build-number synchronization
- iOS and Android compile gates on pull requests
- Signed Google Play and App Store Connect/TestFlight release workflow
- Stable public Android debug APK for BrowserStack/App Live and other cloud-device testing

## Cloud-device Android build

Every successful native Android build uploads `hrive-latest.apk` as a GitHub Actions artifact. After a successful build on `dev`, CI also publishes/replaces the APK on the fixed `hrive-android-latest` prerelease.

Stable public APK URL:

```text
https://github.com/poojaroonwit/studio/releases/download/hrive-android-latest/hrive-latest.apk
```

This URL is intended for BrowserStack App Live, Appetize-compatible APK import, QA devices, and other cloud-device test systems that can fetch a public APK URL. It is a debug/testing build; production distribution continues through the signed Google Play release workflow.

## Prepare native projects

Requirements:

- Node.js 22+
- Java 21 + Android SDK for Android development
- Xcode for iOS development

```bash
cd mobile
npm install
npm run native:prepare
```

`native:prepare` creates `ios/` and `android/` when missing, syncs all plugins, generates icons/splashes, and applies platform hardening/configuration. The generated platform trees are intentionally reproducible and are not committed.

Open or run:

```bash
npm run native:open:ios
npm run native:open:android
npm run native:run:ios
npm run native:run:android
npm run native:doctor
```

## Server environment for native push and verified links

Android push:

- `FIREBASE_SERVICE_ACCOUNT_JSON` or `FIREBASE_SERVICE_ACCOUNT_JSON_BASE64`
- `GOOGLE_SERVICES_JSON_BASE64` for generated Android app builds

Apple push:

- `APPLE_TEAM_ID`
- `APPLE_APNS_KEY_ID`
- `APPLE_APNS_PRIVATE_KEY` or `APPLE_APNS_PRIVATE_KEY_BASE64`
- `APPLE_APNS_TOPIC` (defaults to `co.outborn.people`)
- `APPLE_APNS_ENVIRONMENT=production` in production

Verified links:

- `ANDROID_APP_LINK_SHA256_CERT_FINGERPRINTS` — comma-separated release certificate fingerprints
- `APPLE_TEAM_ID`

Without push-provider credentials, Hrive continues to create normal in-app notifications; native delivery is skipped safely.

## Store release secrets

The `Native store release` GitHub Actions workflow is manual and validates secrets before building.

Android:

- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`
- `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`
- `GOOGLE_SERVICES_JSON_BASE64`

Apple:

- `APPLE_TEAM_ID`
- `APPLE_DISTRIBUTION_CERTIFICATE_BASE64`
- `APPLE_DISTRIBUTION_CERTIFICATE_PASSWORD`
- `APPLE_PROVISIONING_PROFILE_BASE64`
- `APPLE_PROVISIONING_PROFILE_NAME`
- `APPLE_BUILD_KEYCHAIN_PASSWORD` (optional; CI can generate a temporary password)
- `APP_STORE_CONNECT_API_KEY_ID`
- `APP_STORE_CONNECT_ISSUER_ID`
- `APP_STORE_CONNECT_API_KEY_BASE64`

Signing credentials, APNs keys, Firebase credentials, provisioning profiles, and App Store Connect keys must never be committed to source control.

## Release flow

1. Merge changes after the web quality gates and the `Native mobile` Android/iOS compile gates are green.
2. Configure the release secrets above.
3. Ensure the app records for `co.outborn.people` exist in App Store Connect and Google Play Console.
4. Run **Native store release** and select iOS, Android, or both.
5. Android uploads the signed AAB to the selected Play track. iOS uploads the signed IPA to App Store Connect/TestFlight.
6. Complete store privacy declarations, screenshots, pricing/availability, and review submission in the store consoles when required.

The repository automates the build and upload path; Apple/Google account ownership, legal agreements, and review approval remain external platform requirements.
