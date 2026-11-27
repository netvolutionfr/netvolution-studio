# ADR-0028 — Desktop application: Tauri with the Studio server as a Node sidecar

**Status:** Accepted on 11/27/2026 · **Date:** 11/27/2026 · **Ref.:** CLAUDE §1, §3, §8, §12, ADR-0014, ADR-0015, ADR-0016, ADR-0027 · **Partly supersedes:** ADR-0016

## Context

ADR-0016 chose a hosted web application for two users, and rejected a desktop application. The target
has changed: the Studio is meant for designers, not technicians. For them, cloning a repository or
running a Docker container is out of reach. They expect an application to download and open. The
device preview (ADR-0027) also needs the Studio on the designer's own machine, on the same network as
their phone.

The three objections of ADR-0016 still hold, and each gets an answer here: the export's static build
(`npm`), the AI keys, signing and delivering for three systems.

## Decision

**A Tauri 2 application (`desktop/`) runs the unchanged Studio server, `apps/studio/server.ts`, with a
bundled Node, and shows it in the system webview.** The hosted instance (ADR-0015) stays available
from the same sources.

- **Shell** (`desktop/src-tauri/src/main.rs`, Rust): picks a free port on `127.0.0.1`, starts Node
  with the data in the application's data folder, then points the window at the server. The page
  gets no Tauri IPC: the interface talks to its API over HTTP, as in the browser. The server's
  existing protections still apply (allowed hosts, `X-NS-Request` header).
- **Node** comes from the official build of `.nvmrc` (installed by `actions/setup-node` in CI) and is
  copied as the sidecar. On macOS it is signed with the JIT entitlements V8 needs under the hardened
  runtime (`desktop/src-tauri/Entitlements.plist`); without them, Node crashes.
- **Server files** are staged like the Docker runtime image (`desktop/stage.ts`). The bundle drops
  symbolic links, so a Node resolution hook (`desktop/resolve-ns.mjs`) maps `@ns/*` to `packages/`.
- **Releases**: a version tag (`v*`) builds macOS (Apple Silicon), Windows (x64) and Linux (x64) in
  GitHub Actions (`.github/workflows/desktop.yaml`) and uploads the installers to a draft release.
  The release is published by hand. The same tag deploys the hosted instance.
- **Signing**: macOS is signed (Developer ID) and notarized when the Apple secrets exist. Windows and
  Linux are not signed for now.

## Rejected alternatives

- **Electron**: it ships its own Chromium (about 120 MB more), for the same Node server.
- **An interface rewritten in Rust (egui)**: it would duplicate the document model, the commands and
  the rendering, which must stay shared with the export (ADR-0002). egui is also weaker for a
  designers' tool (text input, accessibility, drag and drop).
- **Node single executable (SEA)**: the server reads its sources, templates and fonts from disk, and
  the export copies component sources. A single executable would not remove those files.

## Consequences

- Size: about 165 MB installed, 51 MB to download on macOS. Node accounts for 117 MB of it.
- **Static build of an export**: it runs `npm ci` and `astro build`, so it still needs Node and npm
  installed on the machine. The Astro sources export works without them.
- **AI keys**: they stay on the server side, in the Node process of the application. There is no
  settings screen for them yet: the assistant is unavailable in the desktop application.
- **No automatic update** yet: each version is downloaded from the releases page.
- Each user has their own projects. They share them through the project archive (SB-12).
- **Not tried yet**: Windows and Linux. The code paths specific to them are the `--import` URL, the
  hidden console window and the `npm` launch through `npm_execpath`.
