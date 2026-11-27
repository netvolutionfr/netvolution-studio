# Desktop application (Tauri)

The **unchanged** Studio server packaged as a desktop application (ADR-0028).

- `src-tauri/src/main.rs` starts the bundled Node on `apps/studio/server.ts`, on a free port of
  `127.0.0.1`, with the data in the application's data folder. The window then loads that address.
  The page gets no Tauri IPC. The device preview on the local network is enabled (ADR-0027).
- `stage.ts` builds the Studio and stages the server like the Docker runtime image, without the
  UI-only packages, and copies the running Node as the sidecar binary.
- `resolve-ns.mjs`: the bundle drops the workspace symlinks, so a Node hook resolves `@ns/*`.
- `src-tauri/Entitlements.plist`: the JIT entitlements V8 needs under the macOS hardened runtime.

## Building locally

Requirements: Node of `.nvmrc`, Rust (stable), and on Linux the WebKitGTK packages listed in
`.github/workflows/desktop.yaml`.

```sh
npm ci              # at the repository root
cd desktop
npm ci
npm run dev         # stage + tauri dev
npm run build       # stage + installers in src-tauri/target/release/bundle
```

## Releases

Pushing a version tag (`v*`) runs `.github/workflows/desktop.yaml`. It creates a **draft** release
and uploads the installers for macOS (Apple Silicon), Windows (x64) and Linux (x64). Check the release,
then publish it by hand. A manual run of the workflow only builds the installers, as workflow
artifacts.

macOS signing and notarization use these repository secrets. Without them, the build is not signed.

| Secret | Content |
|---|---|
| `APPLE_CERTIFICATE` | The **Developer ID Application** certificate and its key, as a `.p12` file, in base64 (`openssl base64 -A -in cert.p12`) |
| `APPLE_CERTIFICATE_PASSWORD` | The password of the `.p12` export |
| `APPLE_API_KEY` | The key ID of an App Store Connect API key (Users and Access > Integrations, "Developer" access) |
| `APPLE_API_ISSUER` | The issuer ID shown above the keys table |
| `APPLE_API_KEY_P8` | The content of the downloaded `AuthKey_<key ID>.p8` file |

## Known gaps

- Static build of an export: it needs Node and npm installed on the machine.
- AI assistant: no screen to enter a key yet.
- No automatic update. Windows and Linux are not signed, and not tried yet.
