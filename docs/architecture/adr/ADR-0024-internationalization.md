# ADR-0024 — Internationalization: message catalogs, English by default

**Status:** Accepted on 11/03/2026 · **Date:** 11/03/2026 · **Ref.:** CLAUDE §4, §5 and §8, ADR-0005, ADR-0013, ADR-0014, ADR-0016

## Context

The repository has been public under the Apache-2.0 license since 11/03/2026. The Studio was designed in French: the code, identifiers and comments were already in English, but everything a user reads was in French and hard-coded.

Measurement on `main`:

| Area | Strings in French |
|---|---|
| Studio interface (`apps/studio/src`) | ~400: labels, `aria-label`, `title`, messages |
| Inspector and components (`packages/components`) | ~90: names of fields and components, section presets |
| Core (`packages/core`) | ~170: validation (including the messages of the zod schemas), checks before export, command catalog, system prompt of the AI |
| API (`apps/studio/dev-server`) | ~50: errors, simulated assistant |
| Astro export | ~20: generated README and comments, 404 page, redirects README |
| Hard-coded locale | `<html lang="fr">` (3 pages of the Studio), `toLocaleString('fr-FR')` (2 calls) |

The e2e tests find elements by their French accessible name (~350 selectors). Diagnostics already carry a stable `code` next to the `message` (`Diagnostic`, `Check`).

Two audiences to serve: the French designers who use the Studio today, and an international community that will read, test and translate it. Adding a language must not require changing the code.

## Decision

1. **English by default, French kept.** English is the reference language of the interface, the messages and the documentation for contributors. French remains a complete, maintained language. Any other language is a contribution.

2. **JSON catalogs, separate from the code.**
   - One file per language: `packages/core/src/i18n/locales/<language>.json` (`en.json` is the reference, `fr.json`…), shared by the Studio, the server and the export.
   - **i18next JSON format (v4)**: keys nested by domain (`shell.*`, `inspector.*`, `checks.*`, `commands.*`, `ai.*`, `api.*`, `content.*`), `{{name}}` interpolation, plurals by CLDR category suffix (`_zero`, `_one`, `_two`, `_few`, `_many`, `_other`). Collaborative translation platforms (Weblate, Crowdin) accept this format as is: a translator works without touching the code.
   - No HTML in messages. Formatting inside a sentence (link, bold) is composed in the code around separate messages.

3. **A home-made module, without dependencies** (`packages/core/src/i18n/index.ts`, around 50 lines, without React):
   - `t(key, params?)`: lookup in the active language, then in English; a key missing everywhere shows the key itself and raises an error in tests.
   - Plurals through `Intl.PluralRules`, dates and numbers through `Intl.DateTimeFormat` and `Intl.NumberFormat`, with the active language.
   - The catalogs are imported as JSON (`with { type: 'json' }`, understood by Node and Vite) from a `locales/index.ts` registry. **Adding a language = one JSON file and one line in this registry.** The list of languages offered to the user derives from it.
   - Keys typed from `en.json`: a key that does not exist is a typecheck error in the code.
   - The format being i18next's, moving to that library remains possible without retranslating, if a real need requires it (on-demand loading, richer formats).

4. **The core produces codes, the interface translates them.**
   - Validation, checks before export, command results and API errors return `{ code, params }`. The `message` disappears from the contracts, or becomes an English debugging aid.
   - The custom messages of the zod schemas become codes in the same way.
   - Future clients (AI, MCP server, CLI) receive stable codes and translate them themselves, or show English.

5. **Two distinct languages: the interface and the site.**
   - **Interface language**: per user. By default the browser's language if available, else English; changeable in the Studio and kept in the browser (`localStorage`). It sets `<html lang>` and date formatting. Nothing is stored on the server: the Studio has no accounts (ADR-0016).
   - **Site language**: `settings.lang`, already in the model. It sets everything that ends up in the site: default content of an inserted component, section presets, 404 page, generated accessible texts (`content.*`). A site language without a `content.*` catalog falls back to English.
   - A designer can therefore work in an English interface on a French site, and the other way around.

6. **Export.** The README, the generated comments and the redirects README are in English: they are for developers. The visible texts of the site follow the site language.

7. **AI assistant.** The system prompt is in English. It asks to answer in the interface language and to write content in the site language, both passed in the request. The quick actions ("Summarize this content"…) become catalog keys.

8. **User guide.** Starlight handles several languages natively: English at the root (`/guide/`), French under `/guide/fr/`. An untranslated page shows in English with a banner. `npm run guide:screenshots` produces the screenshots in each interface language.

9. **Automated checks.**
   - A test compares each catalog with `en.json`: missing keys, extra keys, different `{{…}}` parameters. It blocks for `fr` and warns for the other languages, so that a partial translation can be merged.
   - A test reports the keys of `en.json` that are no longer used.
   - The e2e tests run in English; a short scenario checks switching the language to French.

10. **Migration in batches**, each testable and demonstrable:
    1. this module, the language choice, `<html lang>` and dates; extraction of the interface strings with **French as the active language**, so that the e2e tests stay unchanged;
    2. codes in the core and the components, `content.*` catalog, AI prompt;
    3. export and English versions of the site templates written in code;
    4. switching the interface to English by default, with the e2e and unit tests updated;
    5. contributor documentation in English (README, CLAUDE.md, CONTRIBUTING, SECURITY, deployment, limitations, ADRs, specifications);
    6. bilingual guide.

    The demonstrations and the bench (`npm run demo`, `demo:site`, `demo:creative`, `test:fidelity`) stay green at each batch. Fixtures keep their French content: they are test data.

## Rejected alternatives

- **Translating into English without internationalizing**: less work right away, but the current users lose their language, and each new language would go over the whole code again.
- **i18next, react-intl or FormatJS right away**: proven, but they bring dependencies (and for react-intl, a coupling to React incompatible with the core) for a need covered by `Intl` and a few lines. Choosing i18next's format keeps that door open.
- **ICU MessageFormat** (`{count, plural, one {…} other {…}}`): more expressive, but needs a parser (a dependency) and stays less readable for an occasional translator. The measured needs (simple interpolation, a few plurals) do not justify its cost.
- **Catalogs in TypeScript**: direct typing, but unreadable for translation platforms and for translators who are not developers.
- **Keys = the English sentence** (gettext-style): no English file to maintain, but any correction of an English sentence invalidates every translation.
- **A single language for the interface and the site**: prevents the common case of an agency working in its language for a client who has another one.

## Consequences

- No user-facing text in the code: a review refuses a hard-coded string. CLAUDE.md states it as a rule.
- Every visible feature adds its keys to `en.json` and `fr.json`, as it updates the guide today.
- The contracts of the core change (`message` → `code` + `params`): the consumers (Studio, API, AI, demonstration scripts) are adapted in the same batch.
- The guide doubles in volume to maintain (about 18,000 words per language).
- The slice reports, studies and research (about 38,000 words) remain in French, moved to `docs/history/` with an index in English. They are translated only on request.
- The documentation and ADR files take English names in batch 5; the links are checked by `npm run check`.
- Known limitation: right-to-left languages are not supported. The Studio's CSS (logical properties, directional icons) will have to be audited before accepting one.
- Risk: a poor-quality or malicious community translation. Catalogs only contain text, without HTML, and go through a reviewed PR like the code.

## Addendum of 11/03/2026 — batch 1

- **Module** `packages/core/src/i18n/`: `t(key, params?, locale?)`, `getLocale`, `setLocale`, `formatDate`, `LOCALES`. The language is read at the first translation (choice kept in the browser, else the default language): a `t()` evaluated when a module loads (label tables) therefore already gets the right language, with no import order to respect. Outside a browser (server, tests), it is the default language.
- **Default language: French** until batch 4 (`DEFAULT_LOCALE` constant), which will switch to the browser's language, else English.
- **Changing the language**: an "Interface language" menu in the toolbar and on the Projects screen; the page reloads. Languages are named in their own language.
- **Missing key**: the key is shown, without a runtime error. Typing (unknown key = compile error) and the catalog tests play that role: French complete, no key unknown to English, same `{{…}}` parameters, no unused English key (a built key, `` t(`a.b.${x}`) ``, covers its whole prefix).
- **Scope**: the whole shell of the Studio (`apps/studio/src`), about 680 keys. Left for the next batches: the component and section definitions (`packages/components`), the messages of the core and the API, the prompt and instructions of the AI, the default content inserted into a site (header, footer, new page, redirect, list item) and the export. The id prefixes of new tokens (`couleur`, `police`, `espace`…) are kept so as not to change existing documents.
- **Format**: a few formattings inside a sentence (`<code>` around `.env`) were dropped rather than putting HTML in the messages.

## Addendum of 11/03/2026 — batch 2

- **Core messages**: `Diagnostic`, `Check`, `CommandError`, command notices (`notice`), custom CSS issues, the summary of a batch (`summarize`) and the log carry a `Message` (`{ key, params }`, created by `msg()`) instead of a sentence. The interface translates it with `tm()`. A parameter can itself be a `Message`, or a list of messages (joined by "; "). The existing `code`s do not change.
- **Server**: the API errors (`HttpError`) and those of the assistant (`AiError.detail`, `AiStatus.reason`) are `Message`s, sent as JSON and translated by the Studio. The `message` of an `AiError` remains a debugging aid, in English.
- **Zod schemas**: a custom message is a catalog key (`'schema.slug' satisfies MessageKey`); `issueMessage` translates it, and keeps a message of zod's own (in English) as is.
- **Site language**: `contentLocale(settings.lang)` chooses the catalog (`fr-FR` → `fr`, a language without a catalog → `en`). The default values of components and the sections of the library stay data: their texts and layer names are `content.*` keys (or a `contentRef` with parameters), translated on insertion (`buildTree`, `localizeContent`). The texts the views write into the site (carousel, gallery, marquee, empty video) are translated at render time (`siteText`) and passed to the islands through `data-*` attributes: preview and export stay identical.
- **Component labels** (names, fields, options, icons) and names and descriptions of the sections: interface language, through `t()` in the definition.
- **AI assistant**: system prompt in English; the context passes the site language and the interface language (`interfaceLang`), and asks to answer in it. The quick actions are `ai.tasks.*` keys. The descriptions of the commands (tools of the AI, future MCP clients) are written in English in the code, without a catalog: they are for programs.
- **Plurals**: the "element(s)" forms of the core messages became real plurals.
- About 1,170 keys in total.

## Addendum of 11/03/2026 — batch 3

- **Export**: `README.md`, `MEDIA.md`, `redirects/README.md`, the comments of the generated files and the command-line messages are in English, written directly in the code (they are for developers). The 404 page is generated in the site language (`content.notFound.*`).
- **Templates written in code**: the source stays in French (`templates/*.ts`). A version in another language is produced by `translateSpec(spec, lang, dictionary)`: the dictionary `templates/translations/<id>.<lang>.json` maps each French text to its translation (contents, layer names, titles, addresses and descriptions of the pages, menus, media, tokens). A text missing from the dictionary makes the build fail: a translation cannot stay partial without anyone noticing. `npm run templates:build` writes `templates/<id>-<lang>.json`; a test checks that these files are up to date.
- The chosen format (source text → translation, rather than one key per text) keeps the source of the templates readable; it also suits translation platforms (simple JSON format). Trade-off: correcting a French sentence requires carrying the correction over to the key of each dictionary, which the test reports.
- **Template list**: the API returns the language of each template; the Projects screen shows it when it differs from the interface's (`Intl.DisplayNames`).
- Atelier Nord (JSON archive, not written in code) and the starter pages (`fixtures/`) remain in French.

## Addendum of 11/03/2026 — batch 4

- **Default interface language**: the choice kept in the browser, else the first browser language that has a catalog (`navigator.languages`, `fr-CA` → `fr`), else English (`browserLocale`, `getLocale`). The Studio's pages declare `lang="en"` before the script sets the real language.
- **Canvas**: the canvas's `<html lang>` follows the language of the **site**, like the preview and the export, not that of the interface. The fidelity bench caught the difference (`-webkit-locale`, which affects hyphenation and quotes).
- **Unit tests**: in English, the default language outside a browser.
- **Departure from decision 9 (e2e tests in English)**: the end-to-end scenarios, the demonstrations and the guide screenshots open a browser set to French (`locale: 'fr-FR'`) and keep their French selectors (~350). Rewriting them in English would add no coverage: the completeness and consistency of the catalogs are checked by the unit tests, and the guide stays in French until batch 6. One scenario checks the default language (English, German and French browsers) and the batch 1 scenario checks switching to English. To revisit in batch 6, if the screenshots of the English guide need scenarios in English.

## Addendum of 11/03/2026 — batch 5

- **In English**: README, CLAUDE.md, a new CONTRIBUTING.md, SECURITY.md, `deploy/README.md`, `docs/limitations.md`, the specifications, the Studio design system (`docs/ui/README.md`), the 24 ADRs, the README of the prototype, and the comments of the configuration files (Dockerfile, compose, workflow, Dependabot, `.env.example`, `.gitignore`).
- **English file names** for the ADRs (`ADR-0001-versioned-document-and-components.md`…); the references were updated across the repository.
- **History**: the slice reports, the architecture studies and the research (Tatsu analysis, feasibility study, import trial) moved to `docs/history/` (`reports/`, `studies/`, `research/`, `tatsu/`) and stay in French, with an English index (`docs/history/README.md`).
- **Links checked**: `tests/docs.test.ts`, run by `npm run check`, fails on a relative Markdown link to a missing file.
- CLAUDE.md now states the languages: documentation, code and APIs in English; conversations with the maintainer in French; history and guide in French.
