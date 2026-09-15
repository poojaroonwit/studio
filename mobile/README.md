# Hrive Native Mobile

This workspace packages the existing Hrive / OBSI People Employee Self Service experience as native iOS and Android applications with Capacitor.

## Product model

The native apps do not duplicate ESS screens. They open the same production Hrive application at `https://people.outborn.co/employee-portal`, so authentication, permissions, APIs, localization, and ESS features stay shared with the web and PWA products.

Native application identity:

- App name: `Hrive`
- Bundle / application id: `co.outborn.people`
- Initial route: `/employee-portal`
- Platforms: iOS and Android
- Cleartext HTTP: disabled
- Android mixed content: disabled

## Prepare native projects

Requirements:

- Node.js 22+
- Xcode for iOS development
- Android Studio / Android SDK for Android development

From this directory:

```bash
npm install
npm run native:prepare
```

`native:prepare` creates the native `ios/` and `android/` projects when missing and then runs `cap sync`. The generated platform projects are intentionally not committed; they are reproducible from the versioned Capacitor configuration and this workspace.

Open the projects with:

```bash
npm run native:open:ios
npm run native:open:android
```

Run Capacitor diagnostics with:

```bash
npm run native:doctor
```

## Release notes

App Store and Play Store signing identities, provisioning profiles, store listing metadata, screenshots, privacy disclosures, and production signing secrets must be supplied through the release environment rather than committed to the repository.

Any ESS feature added to the shared Hrive routes becomes available in the native apps without a second UI implementation. Native-only device capabilities should be added as Capacitor plugins only when the capability cannot be provided by the shared web application.
