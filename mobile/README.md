# Hrive ESS native mobile

This directory contains the native iOS and Android client for Hrive Employee Self Service. It is an Expo / React Native shell around the existing secured Hrive ESS experience, so mobile uses the same APIs, authorization rules, localization, and ESS business logic as the web product.

## Runtime behavior

- Opens directly at `/employee-portal`.
- Provides native bottom navigation for Home, Attendance, Leave, Pay, and the remaining ESS tools.
- Marks the embedded web session as `HriveNative/1.0`; Hrive then suppresses browser-only PWA/service-worker UI and the duplicate web bottom navigation.
- Keeps Hrive, Outborn Account, and configured authentication hosts inside the WebView so OIDC can complete without losing cookies.
- Opens unrelated external links in the device browser.
- Supports `hrive://...` deep links plus verified HTTPS links for `https://people.outborn.co/employee-portal` and `/ess/*`.
- Supports Android hardware back, iOS back-forward gestures, iOS pull-to-refresh, loading state, and retry after network/server failures.

## Local development

```bash
cd mobile
npm install
npm start
```

Run on a native simulator/device with:

```bash
npm run ios
npm run android
```

The production ESS server is used by default. Override it for development with:

```bash
EXPO_PUBLIC_HRIVE_BASE_URL=https://your-hrive-host.example.com npm start
```

If authentication uses additional hosts, provide a comma-separated allowlist:

```bash
EXPO_PUBLIC_HRIVE_AUTH_HOSTS=account.outborn.co,login.microsoftonline.com npm start
```

## Store builds

The stable application identifiers are:

- iOS bundle ID: `co.outborn.hrive`
- Android package: `co.outborn.hrive`
- Custom scheme: `hrive://`

`eas.json` includes preview and production build profiles. After the Expo/EAS project and signing credentials are connected, production binaries can be created with:

```bash
npx eas-cli build --platform ios --profile production
npx eas-cli build --platform android --profile production
```

## Universal / app links

Hrive serves the required association documents from:

- `/.well-known/apple-app-site-association`
- `/.well-known/assetlinks.json`

Configure these deployment variables before store release:

- `HRIVE_IOS_TEAM_ID` — Apple Developer Team ID.
- `HRIVE_ANDROID_CERT_SHA256_FINGERPRINT` — one or more comma-separated SHA-256 signing-certificate fingerprints used by the Android release.

Without those signing identifiers, the app still supports the `hrive://` custom scheme, but operating-system verified HTTPS links will not be claimed by the installed application.

## Architecture rule

`scripts/native-mobile-regression-checks.cjs` verifies that every current `/ess/*` page is represented in native navigation and that native/web shell markers stay aligned. This guard runs in the main quality workflow.
