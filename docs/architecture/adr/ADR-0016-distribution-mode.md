# ADR-0016 — Distribution mode: hosted web application, private instance

**Status:** Accepted on 10/30/2026 · **Date:** 10/30/2026 · **Ref.:** CLAUDE §3, §8 and §12, ADR-0014, ADR-0015

## Context

We need to choose how the team uses the Studio day to day. Three possibilities:
- a desktop application (Electron, or Tauri);
- an application hosted for the team;
- a SaaS open to clients or third parties.

Needs expressed on 10/30/2026:
- **only the Netvolution team**;
- **two users**;
- **no offline need**.

## Decision

**Hosted web application, as a single private instance**: `studio.netvolution.fr`, a Docker container behind nginx (HTTPS, password), deployed by GitHub Actions (ADR-0015). No desktop application, no multi-tenant SaaS.

Planned evolutions, each subject to a new decision:
1. **One instance per client**, if clients must edit their site: the same Docker image, with a domain, a data folder and passwords of their own. It needs little code and isolates clients strongly.
2. **Multi-tenant SaaS**, only if the volume justifies it: accounts, organizations, roles, quotas, database, audit. A milestone of its own, out of scope today (CLAUDE §2).

## Alternatives

- **Electron or Tauri**: rejected.
  - The export runs `npm ci` and `astro build`, which would require shipping Node and npm on each machine.
  - The AI keys must stay on the server (CS-11).
  - The application would have to be signed and notarized, delivered for three systems and its updates managed.
  - The only benefit, offline work, is not requested. The option stays open later, by packaging the same application and the same API.
- **Multi-tenant SaaS right away**: rejected. Authentication, roles and data isolation are disproportionate for two users.

## Consequences

- No accounts or roles in the Studio. The two users each have an nginx password (bcrypt) and full rights.
- An update ships with each version tag (`v*`), after approval: a single version in service. (Since the repository was opened under Apache-2.0 on 11/03/2026; before that, on each push to `main`.)
- Availability and backups: those of the web4 server.
- To revisit if clients or other users must access the Studio, or if an offline need appears.
