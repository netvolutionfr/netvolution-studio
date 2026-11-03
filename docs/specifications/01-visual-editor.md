# Milestone 1 — Visual Editor

**Document:** `docs/specifications/01-visual-editor.md`  
**Version:** 0.1  
**Depends on:** `00-foundations.md`

## 1. Goal

Develop a web editor able to create a structured HTML page from visual components and export it as a standalone Astro project.

At the end of this milestone, a designer must be able to:

1. Open a document.
2. Add and organize components.
3. Change their properties visually.
4. See the changes immediately.
5. Undo and redo their operations.
6. Save and reload their work.
7. Export an Astro project that builds.
8. Check the fidelity between the preview and the exported result.

## 2. Functional scope

### VE-01 — Editor interface

The application presents:

- Top bar: document name, save, undo/redo, preview, export.
- Left panel: component library and tree.
- Central canvas: visual representation of the page.
- Right panel: inspector of the properties of the selected component.
- Preview size selector.

Panels must scroll independently of the canvas.

The designer can change the main dimensions of their workspace.

**Acceptance:**
- The user selects a component from the canvas or the tree.
- The selection is synchronized between the panels.
- The inspector shows the appropriate properties.
- The site remains previewable without the editor's controls.

### VE-02 — Document model

Implement a tree of components that complies with the invariants of the foundations document.

It must handle:

- Unique ids.
- Component types.
- Properties.
- Allowed children.
- Styles.
- Minimal metadata.
- Schema version.

The model must not contain React elements, DOM references or non-serializable objects.

**Acceptance:**
- A document is validated before loading.
- Unknown references and types cause a controlled diagnostic.
- Serializing then deserializing preserves the document.
- Unsupported schema versions are refused explicitly.

### VE-03 — Component registry

Define a registration API including:

- Type id.
- Name and category.
- Allowed properties.
- Default values.
- Nesting rules.
- Inspector configuration.
- Rendering rules.
- Possible style or script dependencies.

It must be possible to extend the registry without changing the editor's fundamental components.

### VE-04 — First components

Implement:

| Component | Essential features |
|---|---|
| Container | Structure, width, background, margins, padding |
| Stack / Flex | Direction, alignment, distribution, gap |
| Grid | Columns, gap, placement of children |
| Heading | Semantic level, text, typography |
| Text | Paragraph and limited rich content |
| Image | Source, alt, dimensions, fit |
| Button | Label, link, appearance |
| Spacer / Divider | Spacing or separation |

Tatsu's familiar sections, rows and columns can be offered as container presets.

Structuring elements do not have to reproduce its strict hierarchy.

### VE-05 — Visual composition

Allow:

- Adding from the library.
- Selection.
- Deletion.
- Duplication.
- Reordering.
- Moving by drag and drop.
- Insertion into a compatible container.
- Copying and pasting components within the document.

Forbidden destinations must be signaled before the change.

Never allow a cycle in the tree.

Moves must keep the existing ids.

### VE-06 — Property inspector

The inspector is generated from the component schemas.

Initial control types:

- Text.
- Number.
- Boolean.
- Select.
- Color.
- Dimensions with a unit.
- Spacing.
- Typography.
- Alignment.
- Image picker.
- Link.

Organize the properties in groups:

- Content.
- Layout.
- Style.
- Advanced.

Common properties must be shared.

An invalid field must not corrupt the document.

### VE-07 — Update and preview

Changing a property visually updates the element concerned.

The canvas must use the real web rendering, ideally isolated from the interface.

The editor can add selection overlays, but they must not be part of the exported elements.

Rendering must use a contract shared with the exporter.

If the preview needs an Astro rendering service, the service must be documented, isolated and designed to avoid a full rebuild on every keystroke.

### VE-08 — Initial responsive

Offer:

- Desktop.
- Tablet.
- Mobile.
- Custom width.

Allow variants per breakpoint on at least:

- Spacing.
- Flex direction.
- Grid columns.
- Alignment.
- Font sizes.
- Visibility.

Values not set at a breakpoint inherit according to an explicit, documented rule.

The editor must not limit the number of possible breakpoints in the internal model, even if the interface only exposes a few.

### VE-09 — History and transactions

Implement:

- Undo.
- Redo.
- Grouping of continuous changes.
- History reset after loading.
- Indication of unsaved changes.

Dragging a slider must produce one logical transaction, not dozens of undo steps.

### VE-10 — Persistence

First storage adapter:

- JSON export of the document.
- Validated JSON import.
- Saving in a controlled development environment.

A minimal persistence backend or a browser storage mechanism can be used for the prototype.

The final choice of a database is out of scope.

Save failures must be visible and must never silently lose changes.

### VE-11 — Astro export

Produce a project including:

- `package.json`.
- Astro configuration.
- Pages.
- Needed components.
- CSS.
- Assets.
- Build instructions.

The generator can use shared Astro components, provided it produces understandable, standalone sources.

Do not include the editor's controls in the export.

**Acceptance criteria:**

- The project installs from the provided lockfile.
- The build command succeeds.
- An HTML page is generated.
- Styles and media are reachable.
- No access to the Studio is needed to display the page.
- The produced code does not need WordPress.

### VE-12 — Visual fidelity

Establish a set of reference documents including:

- Simple typography.
- Flex composition.
- Grid composition.
- Images.
- Spacing.
- Responsive variants.
- Nested components.

Compare the preview and the built page with identical viewport, browser, fonts and data.

Differences must be measured and documented.

## 3. Out of scope

- Managing several sites.
- Multi-page navigation.
- Editorial CMS.
- User accounts.
- Real-time collaboration.
- Shared history.
- Complex animations.
- Timeline.
- Generative AI.
- Third-party plugins.
- Dynamic forms.
- Publishing to a remote server.

## 4. Technical constraints

- Strict TypeScript.
- Modern React.
- Document model independent of React.
- Document validation at the boundaries.
- No uncontrolled direct mutation of the tree.
- Semantic HTML rendering.
- Typed, controlled styles.
- No arbitrary custom JavaScript in components.
- Documented dependencies.

## 5. Agentic development plan

### Batch VE-A — Initialization

- Project structure.
- TypeScript tooling.
- Lint and formatting.
- Unit tests.
- Development environment.
- First React application.

**Deliverable:** initial runnable application.

### Batch VE-B — Document Model

- Schemas.
- Types.
- Validation.
- Serialization.
- Elementary commands.
- Tests.

**Deliverable:** document engine testable without a graphical interface.

### Batch VE-C — Registry & Renderer

- Component contract.
- Initial registry.
- Fundamental components.
- Style engine.
- Reference rendering.

**Deliverable:** document displayed from JSON.

### Batch VE-D — Editor Shell

- Panels.
- Canvas.
- Selection.
- Tree.
- Initial inspector.

**Deliverable:** properties editable visually.

### Batch VE-E — Composition

- Insertion.
- Drag & drop.
- Duplication.
- Deletion.
- Undo/redo.
- Responsive.

**Deliverable:** a real editable page.

### Batch VE-F — Persistence & Export

- Save/load.
- Astro generation.
- Isolated build.
- Fidelity tests.

**Deliverable:** Astro page exported from the editor.

The batches are sequential as far as contracts go, but subtasks can run in parallel once the interfaces are stable.

## 6. End-of-milestone demonstration

Create a page including:

- A hero section.
- A heading and a paragraph.
- A button.
- An image.
- A grid of three cards.
- An adapted mobile layout.

Change its design, save, close/reload, then export.

Run the Astro project independently of the Studio.

## 7. Definition of Done

- Scenario demonstrable end to end.
- Standalone Astro export.
- Fundamental components working.
- Visual selection and manipulation.
- Reliable history.
- Save/load.
- Document model tests.
- Rendering and export tests.
- Basic accessibility checks.
- Documented limitations.
- Nothing blocking milestone 2.
