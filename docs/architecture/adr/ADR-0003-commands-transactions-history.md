# ADR-0003 — Commands, transactions and history

**Status:** Accepted on 10/29/2026 · **Date:** 10/29/2026 · **Ref.:** 00 §8, §10, VE-05, VE-09; study §7

## Context

Every change must go through structured operations, reusable later by the AI/MCP, with consistent undo/redo and one slider = one logical action.

## Recommended decision

1. **Command** = `{ name, params: ZodSchema, apply(doc, params, ctx) → Result<Doc, CommandError> }`, pure and deterministic (`ctx` provides the registry and an id generator).
2. The document is **immutable**; only commands produce a new document.
3. **`EditorStore`** (plain TS, in `core`): `getState`, `subscribe`, `dispatch`, `begin/commit/cancel`, `undo/redo`, `load`, `markSaved`. React binding through `useSyncExternalStore`.
4. **Snapshot history**: entry `{ label, command, params, before, after }`; undo/redo restore `before`/`after`; structural sharing ⇒ low memory cost; configurable limit (100 entries).
5. **Transactions**: outside a transaction, each `dispatch` creates an entry; inside one, `dispatch`es update the preview without an entry, `commit` creates a single one (`before` = state at `begin`), `cancel` restores.
6. The **log** of applied commands (name + params) is kept in the entries: the basis of the traceability required in milestone 3.
7. The selection is outside the document and the history [O].

## Alternatives

- **Inverse commands**: minimal memory, but every command must provide a correct, tested inverse; more surface for errors.
- **Patches (Immer/JSON Patch)**: useful for collaboration or fine diffs; not required (collaboration out of scope). Upgrade possible without changing the command API.
- **State library (Zustand, Redux)**: brings nothing beyond a ~100-line store.

## Consequences

- Commands can be tested without UI (deliverable VE-B).
- The params schemas will serve as AI/MCP tool definitions in milestone 3.

## Open points

- [O] Selection restored by undo (comfort) or not (simplicity).
- [O] Coalescing text input: idle delay (500 ms recommended) vs blur only.
