# Deploying Netvolution Studio (Docker, nginx, GitHub Actions)

Decisions and risks: [ADR-0015](../docs/architecture/adr/ADR-0015-docker-hosting.md) (hosting), [ADR-0016](../docs/architecture/adr/ADR-0016-distribution-mode.md) (private instance for the team).

```text
Browser ──HTTPS + password──▶ nginx ──127.0.0.1:3010──▶ netvolution-studio container ──▶ ./data volume
GitHub (version tag) ─▶ checks ─▶ image ghcr.io/<owner>/<repo>:<commit> ─▶ SSH ─▶ docker compose up
```

## 1. Once, on the server

The Studio runs under a dedicated account, member of the `docker` group, which is also the SSH user of the deployment.

| Item | Location (example) |
|---|---|
| Deployment folder (`DEPLOY_PATH`) | `/srv/studio` (`compose.yaml` copied by the workflow) |
| Data (projects, media, exports) | `<DEPLOY_PATH>/data`, owned by uid 1000 (the container's "node") |
| Studio secrets (AI assistant, see `.env.example`) | `<DEPLOY_PATH>/.env`, mode 600, never versioned |
| Internal port | `127.0.0.1:3010` (`NS_PORT` in the `.env` to change it) |
| nginx virtual host | HTTPS proxy to `127.0.0.1:3010`, with `auth_basic` (or an authentication portal) |
| Certificate | Let's Encrypt (certbot) |
| Passwords (one user per person) | `htpasswd` file read by the virtual host |

Adding a user (bcrypt, password typed at the keyboard, no nginx reload needed):

```sh
printf "firstname:%s\n" "$(mkpasswd -m bcrypt)" >> /path/to/htpasswd
```

Ban repeated password attempts (401) with a tool such as CrowdSec or fail2ban.

The published port must stay on `127.0.0.1`: Docker publishes its ports through DNAT, which an nftables or iptables firewall filtering the `input` chain does not see.

## 2. Once, in GitHub (Settings → Secrets and variables → Actions)

| Name | Type | Value |
|---|---|---|
| `SSH_HOST` | secret | server name |
| `SSH_USER` | secret | deployment account (member of the `docker` group) |
| `SSH_PRIVATE_KEY` | secret | private key dedicated to deployment (public key in the server's `~/.ssh/authorized_keys`) |
| `SSH_FINGERPRINT` | secret | fingerprint of the server's **ECDSA** host key, checked on every connection: `ssh <server> ssh-keygen -lf /etc/ssh/ssh_host_ecdsa_key.pub \| cut -d' ' -f2` (form `SHA256:…`). Not the ED25519 key: the SSH client (Go) of the appleboy actions negotiates ECDSA first, and the ED25519 fingerprint fails with "host key fingerprint mismatch" |
| `GHCR_TOKEN` | secret | GitHub token with only the `read:packages` permission (if the image is private) |
| `DEPLOY_PATH` | variable | deployment folder on the server; without this variable, the deployment job is skipped |

Also create the **`production`** environment (Settings → Environments). It can require an approval before each deployment.

Recommended in Settings:
- **Code security**: enable *Dependabot alerts* and *Dependabot security updates*;
- **Branches**: protect `main` by requiring the `check (26)` and `check (24)` checks before merging.

## Supply-chain security and Node versions

- **Node 26 LTS** (active since 10/28/2026) in the image, with its version and checksum (`sha256`) pinned in the `Dockerfile`.
- **Alpine patches**: applied on every build (`apk upgrade`).
- **CI on Node 26 and 24** (maintenance LTS, development machines), always at the latest patch (`check-latest`).
- **Audit of runtime dependencies**: `npm audit --omit=dev --audit-level=high` blocks the pipeline on a high or critical vulnerability.
- **Dependabot** (`.github/dependabot.yml`) proposes updates every week, tested by the CI before merging:
  - GitHub actions;
  - the Node image;
  - npm dependencies.
- **GitHub actions pinned by commit**, with the version in a comment: a moved tag cannot inject code.
- **Least privilege**: `contents: read` by default, `packages: write` only to publish the image, Git token not kept after checkout.
- **Image**: published with its provenance and software bill of materials (SBOM).
- **Deployment**:
  - SSH host key checked;
  - read-only GHCR token, logged out after use;
  - deployments serialized.
- **End of life**: Node 24 leaves support in April 2028 and Node 26 in April 2029. Move to the next LTS when Dependabot proposes it, once the CI passes.

## 3. Check, build, release a version

1. **check**: `npm ci`, typecheck, lint, unit tests, on every pull request and every push.
2. **build-and-push** (push to `main` or `v*` tag): Docker image pushed to GHCR, tagged with the commit hash, `latest` for `main` and the version number for a tag.
3. **deploy** (`v*` tags only): waits for approval on the `production` environment, then copies `compose.yaml` to the server and runs `docker compose pull && up -d` with the image **of that commit**. The job fails if the container is not healthy within a minute.

The repository is public: a merge into `main`, even by a contributor, never goes to production. To ship:

```sh
git switch main && git pull
git tag -a v1.2.0 -m "v1.2.0" && git push origin v1.2.0
```

then approve the deployment (Actions tab → the tag's run → *Review deployments*).

The `production` environment requires the maintainer's approval and only accepts `v*` tags (Settings → Environments).

## Operations

- **Roll back**: rerun the workflow on the wanted tag (Actions → the deployment workflow → *Run workflow*, choose the tag), or on the server `cd "$DEPLOY_PATH" && IMAGE_TAG=<commit hash> docker compose up -d`.
- **Logs**: `docker logs -f netvolution-studio`. AI calls, without content, in `data/ai-log.jsonl`.
- **Backups**: the `data/` folder (projects, media, templates, exports, trash), to include in the server backups. Exports can be regenerated and may be excluded (`data/exports/`).
- **Getting an export**: download links (.tar.gz) in the Studio's export dialog.
- **Updating the image's dependencies**: rebuilt on every push; the Node base image is pinned in the `Dockerfile`.

## Limits

- No accounts in the Studio: protection comes **only** from nginx, and anyone logged in has full rights. A portal with two-factor authentication (Authelia, Cloudflare Access…) is advised beyond a few trusted users.
- One user at a time per project: a concurrent save is refused (conflict), not merged.
- Export with a static build needs access to the npm registry from the container and takes up to a few minutes.
