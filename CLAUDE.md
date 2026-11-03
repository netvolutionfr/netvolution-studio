# CLAUDE.md — Netvolution Studio

> Standing instructions for agents working on Netvolution Studio (NS).
> Documentation, code, identifiers and APIs: English (ADR-0024). Conversations with the maintainer: French.
> The history (`docs/history/`) and the user guide (`docs/guide/`, until it becomes bilingual) remain in French.

## 1. Vision and goals

Netvolution Studio is a **modern visual CMS**, designed to create, manage and publish professional websites. It must offer the productivity of a page builder such as Tatsu, without depending on WordPress and without reproducing its complexity.

Product priorities:

1. **Security by design**: limit the exposure of the back office, reduce dependencies and injection opportunities, plan for strong authentication and explicit permissions.
2. **Structural performance**: static public sites by default, pre-rendered HTML, clean CSS, JavaScript only when needed; no CMS or database access to serve a static page.
3. **Simplicity and productivity**: an efficient visual designer, intuitive workflows, then editorial administration targeted by role.
4. **Scalability**: declarative components, structured business commands, future AI integrations, automations, API and MCP.
5. **Reversibility**: exportable sources, data and resources; sites usable outside Netvolution and documented for a third party.

Tatsu/Oshine are **functional and ergonomic references**, not mandatory dependencies. No migration of existing WordPress sites is planned in the current scope. Do not develop WordPress compatibility or a shortcode converter without an explicit request.

## 2. Scope and order of the milestones

The specifications are authoritative for their scope:

- `docs/specifications/00-foundations.md` — shared architecture and invariants.
- `docs/specifications/01-visual-editor.md` — **Milestone 1, delivered and validated**: visual editor of one page, JSON document, canvas, inspector, composition, saving and faithful Astro export. Review: `docs/history/reports/tranche-5.md`.
- `docs/specifications/02-site-builder.md` — **Milestone 2, delivered and validated**: projects and pages, menus, shared header/footer, design tokens, media library, responsive, SEO and export of a complete showcase site. Review: `docs/history/reports/jalon-2-tranche-8.md`; known limitations: `docs/limitations.md`.
- `docs/specifications/03-creative-studio.md` — **Milestone 3, delivered and validated**: reusable sections and components, site templates, advanced composition, declarative animations, services layer and AI assistance through structured commands with human approval. Review: `docs/history/reports/jalon-3-tranche-8.md`. Changes must not break the demonstrations or the bench (`npm run demo`, `npm run demo:site`, `npm run demo:creative`, `npm run test:fidelity`).
- `docs/history/research/TATSU-ANALYSE.md` — reference research, **non-normative** (if present).
- **Changes after milestone 3** (ADR-0017 to ADR-0024: decorative styles, imported fonts, fine typography, rich text, Gallery, Marquee, Carousel, custom CSS, internationalization). Limitations: `docs/limitations.md`.
- `docs/guide/` — **user guide** for designers (Astro Starlight, served by the Studio at `/guide/`). Every visible feature updates it (the chapter concerned, appendices A and B); its screenshots are regenerated with `npm run guide:screenshots`.
- `docs/history/research/essai-import-tatsu.md` — review of a **throwaway** trial converting a Tatsu site, to measure the gaps; it is not a migration feature (§1). The repository is public (Apache-2.0): no client content, name or address is versioned, nor the converter specific to a site.

**Do not implement the next milestones ahead of time.** Allow the minimal contracts and abstractions needed so as not to block their evolution.

The application must remain functional, testable and demonstrable at the end of each milestone.

### Out of scope of the three milestones

Complete multi-user editorial CMS, standalone client administration interface, real-time collaboration, e-commerce, marketplace, WordPress migration, automated multi-host publishing, public MCP server, advanced organization management, full shared hosting. These are possible evolutions, not features already acquired.

## 3. Technical decisions and assumptions

- **Main distribution: web application** usable in modern browsers on macOS, Windows and Linux, hosted as a private instance for the team (`studio.netvolution.fr`, ADR-0015, ADR-0016). No Tauri/Electron desktop client nor multi-tenant SaaS for now.
- **Main language: strict TypeScript**; **interface: modern React**.
- **Architecture: modular monolith**, without microservices or premature multiplication of packages.
- **Public site: Astro**, statically rendered by default and without depending on NS at runtime.
- **Model: structured, serializable and versioned document and site**, independent of React, Astro and any CMS.
- **CSS: modern standards** (Flexbox, Grid, variables, media/container queries), explicit responsive, design tokens.
- **Animations: declarative model**, native CSS / Web Animations API first, Motion as a candidate; GSAP subject to a license check before any integration.
- **Persistence: simple adapter for the prototype**; database, third-party CMS and final backend not decided.
- **Rust/WASM, Tauri/Electron, Payload**: future options, **no** dependency to introduce without a reasoned decision.

These orientations do not replace an ADR for structuring choices; do not present open options as definitively chosen.

## 4. Separation of concerns

Preserve the following boundaries, even when they live in a single application:

- `Site Model`: projects, pages, URLs, menus, shared layouts, settings.
- `Document Model`: tree of the components of a page and their properties.
- `Component Registry`: schemas, nesting constraints, default values, editable properties and rendering capabilities.
- `Editor Core`: commands, transactions, validation, selection, undo/redo history.
- `Visual Editor`: canvas, tree, inspector and interactions; does not own the business model.
- `Design System`: tokens and reusable styles.
- `Assets`: stable references and media processing.
- `Rendering / Astro Export`: rendering, generation and compilation, without depending on the editor's controls.
- `Persistence / Content Adapters`: contracts allowing an evolution towards editorial management without coupling the document to a CMS.

**Do not confuse the document source of truth with external editorial content.** Future CMS data can be linked to components without being systematically copied into the composition.

## 5. Model invariants

- Versioned JSON (`schemaVersion`), validated on input and before export.
- Stable, unique ids; explicit component types.
- Typed props, explicit composition constraints, no non-serializable DOM/React reference.
- Abstract media references, independent of hosting paths.
- Structured business commands (`insertNode`, `moveNode`, `updateNodeProps`, `removeNode`, etc.), used by the UI and by the AI.
- Document migrations documented when a format changes.
- No user-facing text hard-coded in the Studio: it goes through `t()` and the catalogs of `packages/core/src/i18n/locales/` (`en.json` is the reference, `fr.json` complete; ADR-0024). The core and the server return `Message`s (key and parameters, `msg()`), translated on display by `tm()`; content written into a site uses `content.*` keys, translated into the site language. The export's developer files are in English; the templates written in code are translated through `templates/translations/` (French text → translated text, complete, checked by the tests).
- No arbitrary execution of HTML/JS from documents. The only hand-written CSS is the project stylesheet (ADR-0023): always checked by `checkCustomCss` and published from the parser's output (`@layer ns-custom`, above the generated styles in `@layer ns`), never inserted as typed.
- Transactional changes, consistent undo/redo; dragging a slider is one logical action.

The exported HTML is **not** the main persistence format.

## 6. Rendering, canvas and export

Fidelity between preview and export is a first-order architectural risk. **Validate the rendering strategy before developing many components.** Do not assume that a React version and an Astro version will be identical by nature.

- Test rendering with the same viewport, the same fonts, the same resources and the same data.
- Share rules and definitions when possible; avoid diverging business implementations.
- Keep editing overlays out of the DOM and the public assets.
- The export does not minify CSS (`cssMinify: false`): the minifier rewrote values that the fidelity bench compares.
- An island that changes the initial markup (tabs, marquee, carousel) also runs in the canvas (`canvasIslands`), so that its DOM matches the export.
- The canvas declares the site's language (`<html lang>`), not the interface's.
- Prefer an isolated canvas (iframe when relevant) and a typed exchange protocol.
- Do not rebuild the whole page on every keystroke if an incremental mechanism is possible.
- The Astro export must provide **understandable sources, pinned dependencies, media and a README**, and build in a clean environment, without any private NS service.
- For a complete site (milestone 2), also provide a static build that can be hosted independently.

Reversibility does not mean automatically re-importing Astro sources modified by a third party.

## 7. Design experience

The editor must stay accessible to designers who do not program: direct selection, tree, drag and drop, declarative inspector, inline editing when relevant, shortcuts, undo/redo, responsive previews, templates.

Take inspiration from Tatsu for familiarity, from Figma/Webstudio for manipulations and constraints; do not necessarily reproduce `Section > Row > Column > Module` as the internal hierarchy. Offer the usual compositions as Flex/Grid container presets.

Never sacrifice HTML semantics, accessibility or responsive behavior to unlimited positioning freedom.

## 8. Security and confidentiality

- Validate every imported document and file; filter HTML, SVG and URLs according to their context.
- Do not let a document freely execute JavaScript, nor inject arbitrary scripts into the preview or the export.
- Separate the administration interface from the public site; no secret in the build or in the exported sources.
- Secure file paths, archives and media access; no directory traversal.
- Reduce dependencies, monitor their licenses and patches.
- Do not invent a home-made authentication system. For an Internet deployment before the product has authentication, use a proven external access protection.
- Prepare roles, permissions, passkeys/WebAuthn, audit and client isolation conceptually, **without developing them in the MVP**.
- AI/MCP operations must apply the same rights, validations and audits as human actions; sensitive publishing requires explicit approval.

## 9. Quality of the produced sites

- Semantic HTML, keyboard accessibility, visible focus, media alternatives.
- Robust responsive behavior, no content hidden or inaccessible by default.
- Respect `prefers-reduced-motion` for effects.
- SEO metadata, URLs, sitemap, robots, links and 404 at milestone 2.
- JavaScript limited to the interactive components used; navigation and basic content accessible without JS.
- Reproducible performance tests; define thresholds on reference pages and environments, do not invent numeric guarantees.

## 10. Agentic working method

Before each slice:

1. Read this file and the relevant specifications.
2. Examine the existing code and contracts; do not create a duplicate abstraction.
3. Check the active milestone and define a bounded task.
4. Identify the files and interfaces touched, the risks and the acceptance tests.
5. For a structuring or uncertain decision, write an ADR with alternatives and trade-offs.
6. Implement the smallest testable vertical increment.
7. Run the relevant tests, lint/typecheck and build; never report a test as run when it was not.
8. Summarize the changes, limitations and open points.

### Agent concurrency

- Stabilize contracts before parallel work.
- Split tasks by module/file and avoid simultaneous changes to the same contract.
- Do not change a central schema or a shared API without flagging the impacted consumers.
- Do not refactor outside the task without justification.
- Document provisional choices and the debt introduced explicitly.

### Priority documentation and ADRs

- `ADR-0001`: versioned document and components.
- `ADR-0002`: faithful preview ↔ Astro rendering strategy (**priority**).
- `ADR-0003`: commands, transactions and history.
- `ADR-0004`: MVP persistence.
- `ADR-0005`: monorepo organization.

ADRs accepted since: `ADR-0006` (Studio design system), `ADR-0007` (site model v2), `ADR-0008` (per-project
persistence), `ADR-0009` (design tokens), `ADR-0010` (media library and images), `ADR-0011` (reusable components),
`ADR-0012` (declarative animations), `ADR-0013` (services and command batches), `ADR-0014` (AI providers and
confidentiality), `ADR-0015` (Docker hosting behind nginx), `ADR-0016` (distribution: hosted web application,
private instance), `ADR-0017` (decorative styles: borders, shadows, gradients, background images), `ADR-0018`
(imported fonts and catalog of free fonts), `ADR-0019` (fine typography, sticky elements, line breaks), `ADR-0020`
(rich text: paragraphs, color, rich headings, gradient), `ADR-0021` (masonry gallery and lightbox), `ADR-0022`
(marquee and carousel), `ADR-0023` (custom CSS: project stylesheet and classes), `ADR-0024` (internationalization:
message catalogs, English by default, French kept); "JavaScript islands" addendum of `ADR-0002`.

Record ADRs in `docs/architecture/adr/`, in English, with English file names. `npm run check` verifies the relative
links of the documentation.

## 11. Milestone completion criteria

### Milestone 1 — Editable page

Canvas, tree, inspector, fundamental components, initial responsive, commands/undo-redo, importable/exportable document, Astro generation. Demonstrate a hero + text + button + image + grid page, edited, saved and exported; build outside the NS repository and check rendering fidelity.

### Milestone 2 — Complete showcase site

Projects, pages, slugs, menus, header/footer, design tokens, media, responsive navigation, SEO metadata, link validation, multi-page Astro export and static build. Demonstrate a five-page showcase site, previewable, exported and served independently.

### Milestone 3 — Creativity and productivity

Sections/templates, reusable instances, advanced composition, declarative and accessible animations, first AI transformations through typed commands, preview of the differences and human approval. Demonstrate the milestone 2 site enriched then exported without any runtime dependency on the Studio.

**Shared Definition of Done:** complete working scenario, relevant automated tests, verified build, up-to-date documentation, known risks and limitations stated, no need for a feature of the next milestone to validate the result.

## 12. Guiding principle

**First build the smallest studio able to produce a real standalone showcase site.** Preserve the capabilities needed for a future secure editorial CMS and AI assistance, without building an overengineered machine now or locking clients into a Netvolution runtime.
