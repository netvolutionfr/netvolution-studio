# ADR-0013 — Services layer: catalog, batches and log

**Status:** Accepted on 10/30/2026 · **Date:** 10/30/2026 · **Ref.:** CS-09, CS-10, foundations §10, ADR-0003; milestone 3 study §4.5

## Context

AI assistance (slices 6 and 7) and future automations (MCP) must act on the site **through the same commands as the interface**, with:
- validation, explicit permissions, described effects, undo;
- preview of the changes, a readable diff;
- a log of the operations.

The model must never be changed by bypassing the business rules. The commands already exist: zod schemas, pure `apply`, full validation by `loadSite` after each command.

## Decision

1. **Catalog** (`core/services/catalog.ts`). Each command is described there as a tool:
   - `name`, `description` (in English since ADR-0024), `inputSchema` (JSON Schema produced by `z.toJSONSchema` from the zod schema of the parameters);
   - `permission`, `effects`, `undoable`, shape of the result and of the errors.

   The shape follows that of MCP tools. No MCP server is exposed (CS-10), but `GET /api/commands` publishes the catalog.
2. **Permissions**: `content` (texts, links, media of an element), `design` (styles, tokens, animations), `structure` (tree, components, menus, layouts), `pages` (pages, addresses, SEO, redirects), `site` (settings, media library). A caller receives a set of permissions: the Studio user has all of them, the AI assistant a subset.
3. **Atomic batches.** `runBatch(site, calls, ctx, permissions)` applies the calls to a **copy**. For each call, it checks that the command exists, that the permission is granted and that the parameters are valid, then applies the command and fully validates the site. On the first failure, the whole batch is refused with the index and the reason. The original site is never modified.
4. **Diff**: `diffSites(before, after)` lists:
   - the added and removed elements;
   - for each changed element, the changed properties and styles (with their breakpoint, before and after), and the other changes (children, parent, animations, instance link);
   - the changed site fields.

   `summarize` turns it into sentences, translated on display (ADR-0024).
5. **Application**: `store.applyBatch(calls, label, origin)` replays an accepted batch as **a single history entry**, hence a single undo.
6. **Log**: each history entry is recorded with the timestamp, the origin (`user` or `ai`), the label, the names of the commands and the **number** of changes, **never their content**. It is shown in the Studio (the "Operation log" panel).

## Alternatives

- **A "patch" format specific to the AI**, as JSON Patch on the document: it would bypass the business rules of the commands (nesting constraints, links, components) and duplicate validation.
- **An MCP server in this milestone**: out of scope (CS-10). The catalog already has its shape.

## Consequences

- A new command must declare its description, its permission and its effects. Typing enforces it: `META` is indexed by `CommandName`.
- The log computes a diff on each record (linear cost in the number of elements): to watch on very large sites.
