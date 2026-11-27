# ADR-0027 — Device preview on the local network

**Status:** Accepted on 11/27/2026 (tried on an iPhone) · **Date:** 11/27/2026 · **Ref.:** CLAUDE §6, §8, ADR-0002, ADR-0016

## Context

Designers want to judge a site on real phones and tablets (Safari on iPhone, iPad), not only at a
narrow width in the canvas. The site preview (`preview.html`, SB-09) already shows the site as
exported, but it receives the editor's site over a `BroadcastChannel`: same browser only.

This only makes sense where the Studio runs on the designer's machine: the desktop application
(`desktop/`, ADR-0028). The hosted instance is behind nginx and a password.

## Decision

**A second HTTP server, started on demand from the Studio, serves the preview of one project to the
devices of the local network, live.**

- Enabled by `NS_LAN_PREVIEW=1` (set by the desktop application only); never in the container.
- **Start**: `POST /api/lan { projectId }` listens on `0.0.0.0` (free port) with a new random token
  (24 bytes), and returns the address `http://<private IPv4>:<port>/?t=<token>` and its QR code
  (SVG, `uqr`, MIT, no dependency, server side only). **Stop**: `DELETE /api/lan`; a new start
  changes the token and port.
- **Access**: the QR address puts the token in an `HttpOnly; SameSite=Lax` cookie and redirects to
  `preview.html#/<projectId>/`. Without the token: 403 on every path. `Strict` is not possible: the
  camera opens the address as a navigation from outside, and a `Strict` cookie is not sent on the
  redirect that follows. The LAN server only answers GET, so `Lax` exposes nothing more.
- **Read-only, one project**: `preview.html` and `/assets/*`, the project's media, its saved site
  (`GET /api/projects/<id>`), and `/api/live/<id>`. Nothing else: no project list, no mutation, no
  other project, no AI.
- **Live**: the editor sends its site (saved or not, at most every 250 ms) with
  `PUT /api/live/<id>`, validated like a save; the server keeps the latest in memory and pushes it as
  Server-Sent Events. The preview subscribes with `EventSource`; where the route does not exist, the
  404 closes the stream for good.

## Rejected alternatives

- **HTTPS on the local network**: no certificate a phone trusts without installing a profile. HTTP
  with a short-lived token is accepted: the content is a site meant to be published, on the user's
  own network, while they share it.
- **WebSocket**: SSE is enough for one direction, needs no dependency, and reconnects by itself.
- **Exposing the whole Studio on the network**: the API has no authentication (ADR-0015).
- **Editing from the phone** (selection, text in place): later, over the same channel.

## Consequences

- Anyone on the network holding the token can view the shared project until sharing stops.
- macOS asks once whether the application may accept incoming connections.
- Networks that isolate their clients (some guest Wi-Fi) prevent it; the address is shown for manual
  entry.
- No editing tools on the device; the canvas protocol (ADR-0002) is unchanged.
