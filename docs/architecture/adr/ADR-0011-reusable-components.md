# ADR-0011 — Reusable sections and components

**Status:** Accepted on 10/30/2026 · **Date:** 10/30/2026 · **Ref.:** CS-01, CS-03, ADR-0007; milestone 3 study §4.1

## Context

CS-01 asks for a library of sections (hero, features, testimonials, pricing, team, gallery, CTA, contact…). Each section has an id, a name, a category, a description, a thumbnail, a document definition, parameters and a version, and inserting creates an independent copy by default.

CS-03 adds instances linked to a shared definition:
- controlled propagation of changes;
- incompatibilities signaled;
- no circular dependency.

Milestone 2 already has two close mechanisms:
- presets, static trees copied on insertion;
- shared layouts, roots of the node table reused by several pages.

## Decision

1. **Definitions**: `site.symbols?: Symbol[]`, an optional v2 field (no migration).
   - Shape: `Symbol = { id, name, category, description, version, rootId, params: Param[] }`.
   - The definition is a root of the node table, like a layout, editable like a page.
   - `Param = { id, label, nodePath, prop }` exposes a property of a node of the definition, located by its path of indices from the root (stable between copies).
2. **Expanded instances.** An instance is an ordinary copy of the subtree, with new ids. Its root carries `instance: { symbolId, version, overrides: Record<paramId, value> }`. Rendering, the canvas, the CSS, the islands, the export and the bench do not change.
3. **Versions and controlled propagation.**
   - **New version**: changing the definition increments `version`.
   - **Signaling**: `checkSite` reports the instances that are behind.
   - **Update**: `updateInstances { symbolId, instances? }` rebuilds each instance from the definition and reapplies its overrides. The diff is previewed, and the update is one undoable transaction.
   - **Incompatibilities**: an overridden parameter that disappeared, or whose value is no longer valid for the component, is not applied. It is reported, and the instance keeps its version until the user confirms.
4. **Detach**: `detachInstance` removes `instance`; the copy becomes free. Changing an instance outside its parameters remains possible, but `checkSite` reports it ("modified locally, will be overwritten by the update").
5. **No cycle.** `loadSite` refuses:
   - a definition that contains, directly or indirectly, an instance of itself (graph of the symbols);
   - an instance whose definition is missing.
6. **Library sections**: symbols outside the project, with the same shape and nodes as `NodeTemplate`.
   - **Origin**: either built into the registry (`components/src/sections.ts`, which replaces and extends the presets), or saved from a project ("Save as section" on a selection).
   - **Insertion**: independent copy by default; "insert linked" first creates the definition in the site if it is not there, then an instance.
7. **Thumbnails: real, scaled-down rendering.** The section is rendered in a miniature iframe with the views, CSS and tokens of the current site, then scaled with CSS. No image is stored.

## Alternatives

- **Live references** (an `instance` node resolved at render time): rejected.
  - The whole rendering chain would have to handle the indirection: CSS per node, unique HTML ids (tabs), islands, export.
  - Propagation would be implicit and immediate, so not "controlled".
- **Thumbnails as stored images**: rejected. They would have to be regenerated whenever the section or the tokens change, and stored with it.

## Consequences

- The document grows by one copy per instance; the measurement on the demonstration site will be done in slice 8.
- The presets of milestone 2 become built-in sections: the library has a single mechanism.
- Overrides are limited to the declared parameters. Making another property configurable requires a new version of the definition.
