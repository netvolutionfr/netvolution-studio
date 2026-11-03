# Netvolution Studio — Foundations and architecture

**Document:** `docs/specifications/00-foundations.md`  
**Version:** 0.1  
**Status:** Initial specification  
**Product:** Netvolution Studio (NS)

## 1. Vision

Netvolution Studio is a web platform to design, manage and publish websites.

It aims to gradually replace WordPress, Oshine and Tatsu for Netvolution's new projects, without forcing the migration of existing sites.

The product must let a designer create a site visually, a client later manage its content, and an operator publish the site on independent infrastructure.

Its fundamental goals are:

1. **Productivity:** let a graphic designer create professional sites quickly.
2. **Security:** reduce public exposure, vulnerable dependencies and configuration errors.
3. **Performance:** generate light sites, static by default.
4. **Simplicity:** present the relevant features according to roles.
5. **Scalability:** gradually integrate AI, automations, API and MCP.
6. **Reversibility:** guarantee that sites can be run outside Netvolution Studio.

The Tatsu experience serves as an ergonomic reference, but neither its code nor its architecture are mandatory dependencies.

## 2. Scope of the first three milestones

### Milestone 1 — Visual Editor

Create and edit a page visually, save its structured document and produce a faithful Astro page.

### Milestone 2 — Site Builder

Create a complete showcase site: pages, menus, header/footer, media, design system, responsive and standalone Astro export.

### Milestone 3 — Creative Studio

Speed up and enrich design with libraries of compositions, animations and AI assistance.

### Later evolutions

- Multi-user editorial CMS.
- Self-service administration by the client.
- Strong authentication and advanced rights management.
- Publishing workflows.
- Connections to third-party services.
- Production API and MCP server.
- Multi-tenant deployment and operations.
- Simultaneous collaboration.

The architecture must make these evolutions easier, but they must not be developed prematurely.

## 3. Architectural principles

### 3.1 Web application

The main interface runs in a modern browser on macOS, Windows and Linux.

Preferred technologies:

- TypeScript in strict mode.
- React for the interface.
- Astro as the first publishing target.
- HTML, CSS and JavaScript standards.

A desktop distribution remains possible, but is not included in the first three milestones.

### 3.2 Modular monolith

Prefer a modular monolith over a microservices architecture.

Responsibilities must be isolated by explicit contracts:

- Site model.
- Document model.
- Component registry.
- Layout and style engine.
- Visual editor.
- Media management.
- Rendering and export.
- Persistence.
- Automation.

Splitting into packages should only happen when it brings a concrete separation.

### 3.3 CMS independence

The document model must depend neither on WordPress, nor on Payload, nor on any other CMS.

It must be possible to edit and build a site without an external CMS.

Future CMSs and content services will be integrated through adapters.

### 3.4 Document model as the source of truth

Design documents are structured, versioned data.

The generated HTML is not their main storage format.

The model must distinguish:

- The site definition.
- The structure and properties of the pages.
- Editorial content.
- Resources.
- The design system.
- References to components.

Separating presentation and content must be possible, without imposing a complex CMS at the first milestone.

### 3.5 Static publishing by default

Exported sites are pre-rendered with Astro.

A static public site must not need any access to the CMS, its database or its administration interface.

Dynamic features will later have to be explicit and isolated.

### 3.6 Reversibility

An export must build and run independently of the Studio.

It must contain the necessary sources, resources, configurations and instructions.

Dependencies on Netvolution's private runtime are forbidden for the public execution of exported sites.

Do not promise that visual editing is preserved in a third-party tool: reversibility first guarantees a standalone, documented technical project.

## 4. Logical architecture

```text
Studio Web
   |
   +-- Site Manager
   +-- Visual Editor
   +-- Component Inspector
   +-- Design System
   +-- Asset Manager
   |
   v
Application Core
   |
   +-- Site Model
   +-- Document Model
   +-- Component Registry
   +-- Commands / Transactions
   +-- History / Validation
   |
   +-- Rendering Contract
   +-- Persistence Port
   +-- Content Binding Contract
   |
   v
Astro Adapter
   |
   +-- Preview
   +-- Static Build
   +-- Project Export
```

Preview rendering and exported rendering must share the same definitions and rules as much as possible.

A component must not need two diverging business implementations.

## 5. Initial document model

The final format must be designed and validated during milestone 1.

Proposed conceptual structure:

```json
{
  "schemaVersion": 1,
  "site": {
    "id": "site-example",
    "name": "Example"
  },
  "design": {
    "tokens": {}
  },
  "pages": [
    {
      "id": "page-home",
      "slug": "/",
      "title": "Home",
      "root": {
        "id": "root-1",
        "type": "container",
        "props": {},
        "children": []
      }
    }
  ],
  "navigation": [],
  "assets": []
}
```

This model is an illustration, not yet a final contractual schema.

### Mandatory invariants

- Stable, unique id for each element.
- Explicit component type.
- Properties validated by a schema.
- Controlled hierarchical composition.
- Versioned format.
- Lossless serialization and deserialization.
- Migrations planned between versions.
- Media references independent of physical URLs.
- No arbitrary JavaScript code run from the document.
- Explicit validation errors.

## 6. Layout and styles

The model must use the modern capabilities of CSS:

- Flexbox.
- CSS Grid.
- CSS variables.
- Media queries.
- Container queries when relevant.
- Modern units and logical properties.

The interface must offer structured composition by default, without forbidding more original compositions.

Responsive properties must have a predictable inheritance mechanism.

Global styles must rely on design tokens.

## 7. Editor architecture

The editor consists of:

- A canvas representing the site.
- A tree of the elements.
- A property inspector.
- A component library.
- A toolbar.
- History management.
- A save and export interface.

Selection and editing tools must not change the content of the published site.

The canvas must reproduce the real rendering, but the design controls must stay separate from it.

Prefer an isolated preview, notably through an iframe, with a typed communication protocol if needed.

## 8. State management

Distinguish:

- Persistent document state.
- Temporary interface state.
- Selection state.
- Transactional state of changes.
- Undo/redo history.
- Persistence state.

Changes must go through structured operations.

Examples:

- `insertNode`
- `moveNode`
- `updateNodeProps`
- `removeNode`
- `duplicateNode`
- `updateDesignTokens`
- `createPage`

These operations will later be a natural integration point for automations and AI.

## 9. Security and isolation

### From the first milestones

- Validation of imported documents.
- Protection against injection of unauthorized HTML or JavaScript.
- No free execution of scripts from component properties.
- Isolation of untrusted previews.
- Protection of paths and files during export.
- Checking of software dependencies.
- No private key or secret in the generated projects.
- A CSP policy suited to exported sites, when applicable.
- Secure handling of media files.

### For the future CMS

Plan the concepts needed for:

- Identities and users.
- Fine-grained permissions.
- Passkeys/WebAuthn.
- MFA.
- Secure sessions.
- Audit.
- Multi-tenant isolation.
- Human approval of publications.

Do not develop a home-made authentication mechanism.

If V0.1 is deployed on the Internet before a proven authentication is integrated, restrict its access to an internal or protected environment.

## 10. AI and automation

AI is a future cross-cutting capability.

From the start:

- Expose structured business operations.
- Define validation schemas for the inputs.
- Separate the permissions of operations.
- Plan transactions and undo.
- Ensure the traceability of transformations.

AI must not change the internal structures of the document model directly, bypassing the business rules.

The implementation of AI models and providers must not be coupled to the core of the Studio.

## 11. Technical validation

Plan:

- Unit tests of the models and commands.
- Document validation tests.
- Serialization tests.
- Migration tests.
- Rendering tests.
- Visual tests.
- Navigation and export tests.
- Automated accessibility tests.
- Build tests of the exported Astro projects.
- Security tests of untrusted inputs.

The export must be tested in a clean directory, without depending on the monorepo.

## 12. Rules for development agents

1. Do not develop a feature outside the current milestone without explicit agreement.
2. Start by checking the existing contracts and dependencies.
3. Propose an ADR for any structuring architectural choice.
4. Produce tests matching the acceptance criteria.
5. Do not pass off a temporary prototype as a stabilized architecture.
6. Do not add a major dependency without justification.
7. Do not introduce indispensable external services without necessity.
8. Do not change the document model without planning its compatibility.
9. Keep the ability to build and demonstrate at each increment.
10. Document incomplete features and limitations explicitly.

## 13. Global definition of done

A milestone is done when:

- Its functional scenarios work.
- The acceptance criteria are verified.
- The automatable tests are present.
- The documentation matches the real behavior.
- The main security risks have been examined.
- The export works in the intended environment.
- No dependency on the next milestone is needed to demonstrate the result.

The delivery must come with a reproducible demonstration and a list of known limitations.
