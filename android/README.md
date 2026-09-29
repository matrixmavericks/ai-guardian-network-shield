# Refyn for Android

A Trusted Web Activity: the app opens `https://refyntech.us/login?app=android`
full-screen in Chrome, so every change to the website reaches the app without a
new release. Package name: `us.refyntech.app` (permanent on Google Play).

Inside the app the site hides sign-up, prices, checkout and upgrade prompts
(`src/lib/appShell.ts`), because Google Play only allows selling plans through
Play billing.

## Build

Needs JDK 17+ and the Android SDK (platform 36, build-tools 36).

```
gradlew bundleRelease     # app/build/outputs/bundle/release/app-release.aab  (upload to Play)
gradlew assembleRelease   # app/build/outputs/apk/release/app-release.apk     (install directly)
```

Release builds are signed with the upload key described by
`~/.refyn-android/keystore.properties` (or the file named in
`REFYN_KEYSTORE_PROPERTIES`). The key and its password are never committed.
Back that folder up: losing the upload key means asking Google to reset it.

If Gradle can't download dependencies because antivirus software inspects
HTTPS (for example Norton Web Shield), add
`-Djavax.net.ssl.trustStoreType=Windows-ROOT` to the command and to
`org.gradle.jvmargs` so Java trusts the same certificates as Windows.

## Releasing an update

Only needed for changes to the Android shell itself (icon, name, colours).
Bump `versionCode` and `versionName` in `app/build.gradle.kts`, build the
bundle and upload it to Play Console.

## Digital Asset Links

`public/.well-known/assetlinks.json` on the website proves the app and the
site belong together; without it Chrome shows a URL bar inside the app. It
must list the SHA-256 fingerprint of every key that signs the app:

- the upload key (already listed), used for APKs you install directly;
- the Play app signing key: after the first upload, copy its SHA-256 from
  Play Console > Test and release > App integrity > App signing and add it to
  the `sha256_cert_fingerprints` list.
