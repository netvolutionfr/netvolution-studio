# Netvolution Studio

**Netvolution Studio is a visual CMS to design professional showcase websites and publish them as standalone static sites.** Designers compose their pages with the mouse, as in a page builder; the Studio produces a standard Astro site, fast and secure, that can be hosted anywhere and no longer depends on the Studio once exported.

- **Visual editor**: component library, drag and drop, tree, inspector, tablet and mobile preview, undo/redo, copy and paste.
- **Complete site**: pages, menus, shared header and footer, design system (colors, typography, spacing), media library, SEO, redirects.
- **Creation**: reusable sections and components, site templates, accessible animations, rich text, gallery, marquee, carousel, controlled custom CSS.
- **AI assistant** (optional): proposes changes as commands, previewed and approved by the user (Anthropic or any OpenAI-compatible service, local ones included).
- **Export**: a readable, documented Astro project, and the static site ready to go online (HTML, CSS, optimized images, `sitemap.xml`, `robots.txt`, 404 page).
- **Languages**: interface in English and French, following the browser; the content the Studio writes into a site follows the site's language ([ADR-0024](docs/architecture/adr/ADR-0024-internationalization.md)). A new language is one JSON catalog.

The [user guide](docs/guide/index.md) walks designers through the Studio step by step, in English and [French](docs/guide/fr/index.md); the Studio also serves it at `/guide/`.

## Principles

- **Versioned JSON document** as the source of truth, independent of React, Astro and any CMS.
- **Faithful rendering**: the editor preview and the export use the same components and the same stylesheet; the difference is measured automatically.
- **Static sites by default**: pre-rendered HTML, no JavaScript shipped without need, no back office exposed with the site.
- **Security by design**: validated documents, typed styles, no arbitrary HTML or JavaScript; custom CSS is parsed and republished by the Studio, never inserted as typed (ADR-0023).
- **Reversibility**: the export is a standard Astro project, which builds without the Studio, and projects export as archives.

Tatsu (a WordPress page builder) is an ergonomic reference only; none of its code is reused or versioned.

## Project status

The three planned milestones are delivered and validated (10/30/2026): visual editor of a page, complete showcase site, then creativity and productivity (reuse, animations, AI). Changes followed (ADR-0017 to ADR-0024). Known limitations: [docs/limitations.md](docs/limitations.md).

Out of the current scope: accounts and roles in the Studio, real-time collaboration, editorial administration for the client, e-commerce, WordPress migration.

## Trying it locally

Requirements: Node.js 26 LTS (or 24 LTS) and npm 11.

```sh
git clone https://github.com/netvolutionfr/netvolution-studio.git
cd netvolution-studio
npm ci
npm run dev        # http://127.0.0.1:5173/
```

Projects are saved in `data/projects/`, exports in `exports/`. To enable the AI assistant, copy `.env.example` to `.env` and fill in the provider and its key.

## Installing the Studio on your machine or server

The production Studio is a single Node process: the compiled application and its API on one port, with the data in a folder.

> **The Studio has no authentication.** Anyone who reaches its port has full rights over the projects. Keep it listening on `127.0.0.1` and, for remote access, put it behind a proxy that provides HTTPS and proven authentication (nginx password, Authelia, Cloudflare Access…).

### With Docker (recommended)

```sh
docker build -t netvolution-studio .
docker run -d --name netvolution-studio --restart unless-stopped \
  -p 127.0.0.1:8080:8080 \
  -v "$PWD/data:/data" \
  --env-file .env \
  netvolution-studio
```

The Studio is at http://127.0.0.1:8080/. The `data/` folder holds the projects, media, templates and exports: that is what to back up. The container runs as the `node` user (uid 1000): the folder must belong to it. Remove `--env-file .env` if you do not use the AI assistant.

### Without Docker

```sh
npm ci
npm run build -w @ns/studio
NS_DATA_DIR=/path/to/data node --env-file-if-exists=.env apps/studio/server.ts
```

| Variable | Role | Default |
|---|---|---|
| `HOST` | Listening address | `127.0.0.1` |
| `PORT` | Port | `8080` |
| `NS_DATA_DIR` | Projects, media, templates, AI log | `data/` in the repository |
| `NS_EXPORTS_DIR` | Generated exports | `<NS_DATA_DIR>/exports` |
| `NS_AI_*`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY` | AI assistant | disabled (see `.env.example`) |

### On a server

Run the Studio as above, on `127.0.0.1`, then expose it through a reverse proxy. nginx example:

```nginx
server {
    listen 443 ssl;
    server_name studio.example.org;
    # ssl_certificate … (Let's Encrypt)

    auth_basic "Netvolution Studio";
    auth_basic_user_file /etc/nginx/htpasswd/studio;   # one user per person (bcrypt)
    client_max_body_size 200m;                          # project archive imports

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 600s;                        # static site build
    }
}
```

- With Docker, keep the published port on `127.0.0.1`: Docker publishes its ports bypassing most firewalls.
- Building the static site runs `npm ci` in the export: the server must reach the npm registry.
- One user at a time per project: a concurrent save is refused, not merged.
- Automatic deployment from GitHub (GHCR image, SSH, approval on a version tag): see [deploy/README.md](deploy/README.md) and [ADR-0015](docs/architecture/adr/ADR-0015-docker-hosting.md).

## Putting an exported site online

The Studio does not publish the site itself: it exports files, which you upload to any host. Nothing runs on the server and no link to the Studio remains. The details, for designers, are in the guide's [publishing chapter](docs/guide/11-publish-and-deliver.md).

1. **Export**: in the Studio, **⋯** menu > **Export site (Astro)…**, tick **Also build the static site**, then **Export**. Fix the blocking errors of the checks before export first.
2. **Download** the static site archive (`.tar.gz`) and extract it. It contains the site ready to serve: HTML, CSS, images, `sitemap.xml`, `robots.txt`, `404.html`.
3. **Upload the content** of the static folder (the files, not the folder) **to the root** of a domain or subdomain, not into a subfolder:

| Hosting | Upload | 404 page |
|---|---|---|
| Shared hosting (Apache) | FTP/SFTP into `www`, `public_html` or `htdocs` | `.htaccess`: `ErrorDocument 404 /404.html` |
| Netlify, Cloudflare Pages | Drag the folder into the deployment interface | Automatic |
| nginx | Copy into the site's `root` | `error_page 404 /404.html;` |
| Any static file server | Copy the files | Depends on the server |

4. **Redirects**: an internal redirect already exists in the static site as a forwarding page. For a real 301 redirect, and for redirects to another site, add the configuration provided in the **Astro sources**, `redirects/` folder (`.htaccess`, `_redirects` or `nginx.conf`).
5. **Update**: export again, then replace **all** the online files, after deleting the old content (otherwise a deleted page would stay reachable).

The **Astro sources** archive is for a developer who wants to take the site over without the Studio: `npm ci && npm run build` produces the same site in `dist/`. Its `README.md` describes the pages, the tokens and the media. Once edited by hand, these sources cannot be imported back into the Studio.

A document can also be exported from the command line:

```sh
npm run export -- fixtures/grid.json ../site-grid
cd ../site-grid && npm ci && npm run build      # static site in dist/
```

## Development

```sh
npm run check              # typecheck + lint + unit tests (documentation links included)
npm run test:fidelity      # fidelity bench preview ↔ export; report in test-results/
npm run test:e2e           # end-to-end checks of the shell
npm run demo               # milestone 1 demonstration (page edited, exported)
npm run demo:site          # milestone 2 demonstration (five-page showcase site)
npm run demo:creative      # milestone 3 demonstration (simulated AI)
npm run templates:check    # creates, exports, builds and checks each site template
npm run guide:screenshots  # replays the guide's tutorial and regenerates its screenshots
npm run fonts:catalog      # regenerates the catalog of free fonts (ADR-0018)
npm run templates:build    # regenerates the templates written in code (templates/*.ts), in every language
npm run dev -w @ns/guide   # user guide alone, on http://127.0.0.1:4321/guide/
```

The fidelity bench and the end-to-end tests need `npx playwright install chromium-headless-shell` once. The CI tests Node 26 and 24. To contribute, see [CONTRIBUTING.md](CONTRIBUTING.md).

```text
apps/studio/            web application (Vite + React): shell, canvas, preview; server.ts for production
apps/guide/             user guide (Astro Starlight); sources in docs/guide/
packages/core/          document model, validation, registry, styles and CSS, protocol, i18n — no React
packages/components/    components: schemas and pure React views, shared by preview and export
packages/export-astro/  generator of a standalone Astro project, template with lockfile, CLI
templates/              built-in site templates, and their translations
fonts/                  catalog of free fonts, with their licenses
fixtures/               reference documents (starter pages, fidelity bench)
tests/                  fidelity bench, end-to-end scenarios (Playwright), documentation checks
deploy/                 automated deployment (GitHub Actions, Docker, nginx)
docs/                   guide, specifications, architecture, ADRs and history
prototypes/             throwaway prototypes
```

## Documentation

- [User guide](docs/guide/index.md) ([French](docs/guide/fr/index.md)) · [Known limitations](docs/limitations.md)
- Specifications: [Foundations](docs/specifications/00-foundations.md) · [Milestone 1](docs/specifications/01-visual-editor.md) · [Milestone 2](docs/specifications/02-site-builder.md) · [Milestone 3](docs/specifications/03-creative-studio.md)
- [Architecture decisions (ADRs)](docs/architecture/adr/) · [Studio design system](docs/ui/README.md)
- [History](docs/history/README.md): milestone reports, architecture studies and research (French)

## License

[Apache License 2.0](LICENSE) — see also [NOTICE](NOTICE). The fonts of `fonts/files/` each keep their license (SIL OFL 1.1, or Apache 2.0 for Roboto), whose text is in `fonts/licenses/`. The license does not grant the right to use the name "Netvolution".

To report a security vulnerability, see [SECURITY.md](SECURITY.md).
