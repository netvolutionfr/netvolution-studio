# Security

## Reporting a vulnerability

Do not open a public issue. Use GitHub's private reporting: **Security** tab of the repository → **Report a vulnerability**. We acknowledge receipt and tell you what happens next.

## Before hosting the Studio

The Studio has no authentication: anyone who reaches it has full rights over the projects. Put it behind a proxy that provides HTTPS and proven authentication, and keep its port on `127.0.0.1` (see [deploy/README.md](deploy/README.md) and [docs/limitations.md](docs/limitations.md)).

Exported sites are static and do not depend on the Studio.
