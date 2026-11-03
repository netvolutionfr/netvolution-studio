# ADR-0004 — MVP persistence

**Status:** Accepted on 10/29/2026, storage and media replaced by [ADR-0008](ADR-0008-per-project-persistence.md) · **Date:** 10/29/2026 · **Ref.:** VE-10, 00 §3.3; study §8

## Context

Milestone 1 requires validated JSON import/export and saving in a controlled development environment, without choosing a database. No silent loss.

## Recommended decision

1. **Port** `DocumentRepository { list(); load(id); save(doc, expectedRevision) → { revision } | conflict }` in `core/persistence`.
2. **Dev adapter**: Vite middleware (`configureServer` + `configurePreviewServer`) writing `data/documents/<id>.json` atomically (temporary file + `rename`); ids validated by a regex; resolved path checked under the root; listens on `127.0.0.1` only; revision check to avoid overwrites between tabs.
3. **Files**: JSON export (download) and import (`<input type=file>`) going through `loadDocument` (diagnostics shown).
4. **Failures**: persistent banner, document left "modified", retry, `beforeunload` guard.
5. `data/` excluded from git; `fixtures/` are versioned.

## Alternatives

- **localStorage / IndexedDB only**: no inspectable file, quotas, loss when the browser is cleaned; can serve as a backup draft [O].
- **File System Access API**: not available in every target browser (Firefox, Safari). Rejected as the main adapter.
- **Database (SQLite…)**: out of the scope of milestone 1.
- **Separate Node server**: one more process with no benefit as long as the middleware is enough.

## Consequences

- In milestone 1, the Studio is used locally through `npm run dev` / `npm run preview`; no Internet deployment.
- The final adapter (SQLite, CMS, object storage) will plug into the same port.

## Addendum (slice 4, 10/29/2026)

- Concurrency: ETag (SHA-256 of the file) with `If-Match` / `If-None-Match: *` instead of a revision number; 412 → overwrite only on explicit request.
- Anti-CSRF: `X-NS-Request` header required on writes + `Origin` check.
- Media: shared `data/media/` folder (random names) in milestone 1; per-project isolation in milestone 2.
- Details: `docs/history/reports/tranche-4.md`.

## Open points

- [O] Local IndexedDB draft as a complement.
- [O] Asset storage: under `data/documents/<id>/assets/` (recommended) or a shared library (milestone 2).
