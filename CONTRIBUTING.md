# Contributing to Netvolution Studio

Thank you for your interest. Issues and pull requests are welcome, in English or French.

## Before you start

- Read [CLAUDE.md](CLAUDE.md): it states the vision, the boundaries between modules and the invariants of the model. It applies to human contributors as much as to agents.
- For a new feature or a structuring change, open an issue first. A decision that shapes the architecture is recorded as an ADR in [docs/architecture/adr/](docs/architecture/adr/), with the alternatives considered.
- Security issues are not reported publicly: see [SECURITY.md](SECURITY.md).

## Setting up

Node.js 26 LTS (or 24 LTS) and npm 11.

```sh
npm ci
npm run dev                                   # http://127.0.0.1:5173/
npx playwright install chromium-headless-shell  # once, for the browser tests
```

## Checks

Every pull request must pass `npm run check` (typecheck, Biome lint and format, unit tests, documentation links); the CI runs it on Node 26 and 24. Depending on what you change, also run:

| You changed | Run |
|---|---|
| The shell, the canvas, a component | `npm run test:e2e` |
| Rendering, styles, a component's view or island | `npm run test:fidelity` (preview ↔ export must stay identical) |
| Commands, the site model, the export | `npm run demo`, `npm run demo:site`, `npm run demo:creative` |
| A site template (`templates/*.ts`) | `npm run templates:build`, then `npm run templates:check` |
| Something visible in the Studio | the user guide (`docs/guide/`) and `npm run guide:screenshots` |

Do not report a check as passing when it was not run.

## Conventions

- **TypeScript strict**, React for the interface, no new dependency without a reason (and a license check).
- **English** for code, identifiers, comments, documentation and ADRs. Commit messages may be in English or French.
- **No hard-coded user-facing text**: interface strings go through `t('key')` and the catalogs of `packages/core/src/i18n/locales/`; the core returns `Message`s (`msg()`); text written into a site uses `content.*` keys (ADR-0024). Add each new key to `en.json` and `fr.json`.
- **Commands** for every change to a document, so that undo/redo, the AI and future automations go through the same validation.
- **No client content** in the repository: no real names, addresses or texts of clients, in code, fixtures or tests.
- Small, focused pull requests; describe what was tested.

## Translations

The interface is translated through JSON catalogs in the i18next v4 format: nested keys, `{{name}}` interpolation, plural suffixes (`_one`, `_other`…).

- **Adding a language**: copy `packages/core/src/i18n/locales/en.json` to `<code>.json`, translate the values, and add one line to `locales/index.ts`. A partial catalog is accepted: missing keys fall back to English. The tests check that no key is unknown to English and that the `{{parameters}}` match.
- **Site templates**: a template written in code gets a new language through `templates/translations/<template>.<code>.json` (French text → translation), built by `npm run templates:build`. The build fails while a text is missing.
- Not supported yet: right-to-left languages.

## License

By contributing, you agree that your contribution is licensed under the [Apache License 2.0](LICENSE), like the rest of the project.
