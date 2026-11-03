# Milestone 2 — Site Builder

**Document:** `docs/specifications/02-site-builder.md`  
**Version:** 0.1  
**Depends on:** `00-foundations.md`, `01-visual-editor.md`

## 1. Goal

Extend the Visual Editor to create and export a complete multi-page showcase site.

The designer must be able to manage the structure, the visual identity, the resources and the navigation from a single application.

At the end of the milestone, the product must make it possible to build a real client site.

## 2. Functional scope

### SB-01 — Project management

Make it possible to:

- Create a project.
- Name it.
- Open it.
- Duplicate it.
- Delete it with confirmation.
- Save the changes.
- Set its language and its reference canonical URL.

Each project has a stable id.

Projects must be isolated in their storage, including their resources.

The development environment can stay single-user. The architecture must nevertheless allow accounts and organizations to be introduced later.

### SB-02 — Page management

Create a page management interface including:

- Adding.
- Renaming.
- Duplicating.
- Deleting.
- Reordering.
- Setting the home page.
- Managing slugs.
- Pages published or excluded from the export.
- Basic metadata.

The URL structure must be independent of the visible labels.

Changing a slug must signal the internal links concerned.

Do not automatically create a URL hierarchy from the menus: page structure and navigation structure are separate.

### SB-03 — Navigation

Create a menu editor.

Features:

- Several named menus.
- Items linked to a page.
- Items linked to an external URL.
- Custom labels.
- Reordering.
- Submenus with a limited depth in the first rendering.
- Active and current states.
- Responsive navigation.

A page can exist without being in a menu.

A page can appear in several menus.

Internal links must use page references rather than copied URLs.

### SB-04 — Header and footer

Make it possible to design shared compositions.

The header must accept in particular:

- Logo.
- Navigation.
- Buttons.
- Containers and compositions.
- Responsive variants.

The footer must accept:

- Text.
- Images.
- Links.
- Menus.
- Columns and standard components.

Changing a shared header or footer must apply to every page it is applied to.

The model must allow several variants, even if the first interface can be limited to one main header and footer.

### SB-05 — Design System

Create a global configuration space.

#### Colors

- Named colors.
- Main palette.
- Global variables.
- References from components.

#### Typography

- Font families.
- Heading styles.
- Body text.
- Weights.
- Sizes.
- Line heights.
- Letter spacing.
- Responsive variants.

#### Spacing

- Spacing scale.
- Reusable values.
- Custom values allowed.

#### Other tokens

- Radii.
- Shadows.
- Maximum widths.
- Breakpoints.

Changing a token must apply to the components that reference it.

Custom values must remain possible.

### SB-06 — Media library

Allow:

- Importing images.
- Importing valid, safe SVGs.
- Importing downloadable files.
- Organization and search.
- Preview.
- Metadata.
- Alternative text.
- Detection of missing resources.
- Reuse on several pages.

Components reference media by stable id.

The system must plan image optimization at export:

- Suitable formats.
- Appropriate dimensions.
- Responsive variants when relevant.
- Lazy loading for non-priority images.
- Original media preserved in the project data.

Handling of imported SVGs and files must follow an explicit security policy.

### SB-07 — Richer components

Extend the library to cover the usual needs of a showcase site:

- Logo.
- Navigation.
- Link list.
- Cards.
- Simple gallery.
- Embedded video.
- Icons.
- Call to action.
- Accessible accordion.
- Accessible tabs.

Interactive features must load only the JavaScript they need.

A form module can offer its appearance, but submitting to a backend is not required in this milestone.

### SB-08 — SEO and page settings

Each page must accept:

- SEO title.
- Meta description.
- Canonical.
- Indexing status.
- Sharing image.
- Relevant Open Graph data.

The export must generate:

- Sitemap.
- Robots.txt.
- Semantic HTML.
- Metadata.
- The necessary error pages, notably 404.

Redirects must be representable in the model and exportable as documented configuration compatible with the target, without claiming that a static file can enforce HTTP redirects on its own.

### SB-09 — Site preview

Make it possible to browse the whole site before exporting.

The preview must handle:

- Internal links.
- Menus.
- Shared pages.
- Header/footer.
- Global styles.
- Assets.
- Responsive behavior.

The user must be able to open a preview without the editing tools.

### SB-10 — Complete Astro export

The export must produce a standard Astro project with:

- Every exportable page.
- The components used.
- The design system.
- The navigation.
- The shared layouts.
- The media.
- The metadata.
- The sitemap and the necessary files.
- Pinned dependencies and versions.
- Installation documentation.

Plan two separate deliverables:

1. **Astro sources**, editable and buildable.
2. **Static build**, directly hostable.

Building or serving the site must not depend on a Netvolution service.

### SB-11 — Checks before export

Run at least:

- Model validation.
- Detection of broken internal links.
- Detection of missing media.
- Check of duplicate slugs.
- Check of essential metadata.
- Automatable accessibility checks.
- Checks of resources and dependencies.
- Astro build.

Distinguish blocking errors from warnings.

### SB-12 — Reversibility

The exported project must be understandable by a developer who knows Astro, without prior knowledge of the inner workings of Netvolution Studio.

Include:

- README.
- Build scripts.
- Tool versions.
- Media inventory.
- Documented structure.
- Deployment instructions for a standard web server.

The source document format must also be exportable for archiving and re-import into a compatible version of the Studio.

Arbitrary re-import of Astro code modified by a third party is not required.

## 3. Security and performance

The generated site:

- Must contain no administration interface.
- Must expose no editing API.
- Must not depend on any database to display static pages.
- Must embed no secret.
- Must not load unused libraries globally.
- Must work with JavaScript disabled for content and basic navigation.

Interactions that need JavaScript must degrade in a documented way.

The site must be testable with Lighthouse and automated accessibility tools.

Numeric performance thresholds will be defined on reference pages and a stable measurement environment, before validating the milestone.

## 4. Out of scope

- Multi-user editorial administration.
- Visitor authentication.
- E-commerce.
- Public database.
- Dynamic CMS-fed blog.
- Complete multilingual translation.
- Forms with an integrated backend.
- Automatic deployment to every host.
- Real-time collaboration.
- Complex animations.
- AI assistance.

## 5. Agentic development plan

### Batch SB-A — Site Model

Management of projects, pages, slugs and references.

### Batch SB-B — Navigation

Menus, internal links and navigation components.

### Batch SB-C — Shared Layouts

Headers, footers and shared compositions.

### Batch SB-D — Design System

Colors, typography, spacing and tokens.

### Batch SB-E — Assets

Media library, references and optimization.

### Batch SB-F — SEO & Validation

Metadata, SEO files, diagnostics and export rules.

### Batch SB-G — Full Site Export

Multi-page generation, static build, documentation and standalone tests.

## 6. End-of-milestone demonstration

Create a fictional showcase site including:

- Home.
- About.
- Services.
- Work.
- Contact.

The site must have:

- A shared visual identity.
- A responsive header.
- A shared footer.
- Working navigation.
- Several layouts.
- A gallery.
- Optimized media.
- SEO metadata.
- A 404 page.

Export the sources and the static build.

Build the sources in a clean environment, then serve the build without starting Netvolution Studio.

## 7. Definition of Done

- Creation of a multi-page site without touching code.
- Working navigation and links.
- Shared compositions.
- Working design system.
- Media library.
- Complete preview.
- Export checks.
- Standalone Astro build.
- Deployment documentation.
- Non-regression tests.
- Usable demonstration site.
