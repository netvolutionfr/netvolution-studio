import { type Diagnostic, loadSite } from '../document/load.ts';
import { editedRoot, type Site } from '../document/schema.ts';
import type { Registry } from '../registry/registry.ts';
import { type Call, countChanges, diffSites, runBatch } from '../services/batch.ts';
import type { Permission } from '../services/catalog.ts';
import {
  type CommandContext,
  type CommandError,
  type CommandName,
  type CommandParams,
  type CommandResult,
  commands,
  newNodeId,
} from './commands.ts';

export type JournalEntry = { name: CommandName; params: unknown };
/**
 * Operation journal (CS-09, ADR-0013): every recorded change, with its origin. No content: command
 * names and counts only, so it can be kept and shown without exposing the site's texts.
 */
export type JournalRecord = {
  at: string;
  origin: 'user' | 'ai';
  label: string;
  commands: string[];
  changes: string;
};
export type HistoryEntry = {
  label: string;
  commands: JournalEntry[];
  before: Site;
  after: Site;
};

export type EditorState = {
  doc: Site;
  /** Page or layout being edited, and its root node (derived). Falls back to the home page. */
  pageId: string;
  rootId: string;
  selection: string | null;
  past: HistoryEntry[];
  future: HistoryEntry[];
  /** Open transaction: dispatches update the preview, `commit` records one history entry. */
  transaction: { label: string; before: Site; commands: JournalEntry[] } | null;
  savedDoc: Site;
  dirty: boolean;
  lastError: CommandError | null;
  journal: JournalRecord[];
};

const HISTORY_LIMIT = 100;
const JOURNAL_LIMIT = 500;

/** Framework-free editor store: the only write path to the document. Bind with `useSyncExternalStore`. */
export function createEditorStore(initial: Site, registry: Registry) {
  const ctx: CommandContext = { registry, newId: newNodeId };
  const fresh = (doc: Site): EditorState => ({
    doc,
    ...onPage(doc, doc.settings.homePageId),
    selection: null,
    past: [],
    future: [],
    transaction: null,
    savedDoc: doc,
    dirty: false,
    lastError: null,
    journal: [],
  });
  let state = fresh(initial);
  const listeners = new Set<() => void>();

  const set = (patch: Partial<EditorState>) => {
    const next = { ...state, ...patch };
    Object.assign(next, onPage(next.doc, next.pageId));
    if (next.selection && !next.doc.nodes[next.selection]) next.selection = null;
    next.dirty = next.doc !== next.savedDoc;
    state = next;
    for (const l of listeners) l();
  };

  const log = (
    label: string,
    commands: string[],
    before: Site,
    after: Site,
    origin: JournalRecord['origin'] = 'user',
  ) =>
    [
      ...state.journal,
      {
        at: new Date().toISOString(),
        origin,
        label,
        commands,
        changes: countChanges(diffSites(before, after)),
      },
    ].slice(-JOURNAL_LIMIT);
  const record = (entry: HistoryEntry, origin: JournalRecord['origin'] = 'user') => ({
    past: [...state.past, entry].slice(-HISTORY_LIMIT),
    future: [],
    journal: log(
      entry.label,
      entry.commands.map((c) => c.name),
      entry.before,
      entry.after,
      origin,
    ),
  });

  function dispatch<N extends CommandName>(
    name: N,
    params: CommandParams<N>,
    label: string = name,
  ): CommandResult {
    const command = commands[name];
    const parsed = command.params.safeParse(params);
    let result: CommandResult = parsed.success
      ? (command.apply as (d: Site, p: unknown, c: CommandContext) => CommandResult)(
          state.doc,
          parsed.data,
          ctx,
        )
      : {
          ok: false,
          error: { code: 'invalid', message: parsed.error.issues.map((i) => i.message).join('; ') },
        };
    // ponytail: full validation after every command; switch to incremental checks if profiling shows a cost.
    if (result.ok) {
      const check = loadSite(result.doc, registry);
      if (!check.ok) result = { ok: false, error: { code: 'invalid', message: describe(check.diagnostics) } };
    }
    if (!result.ok) {
      set({ lastError: result.error });
      return result;
    }
    const entry: JournalEntry = { name, params: parsed.data };
    if (state.transaction) {
      set({
        doc: result.doc,
        transaction: { ...state.transaction, commands: [...state.transaction.commands, entry] },
        lastError: null,
      });
    } else {
      set({
        doc: result.doc,
        ...record({ label, commands: [entry], before: state.doc, after: result.doc }),
        lastError: null,
      });
    }
    if (result.page) set({ pageId: result.page, selection: null });
    if (result.created?.[0]) set({ selection: result.created[0] });
    return result;
  }

  function commit() {
    const tx = state.transaction;
    if (!tx) return;
    if (tx.before === state.doc) return set({ transaction: null });
    set({
      transaction: null,
      ...record({ label: tx.label, commands: tx.commands, before: tx.before, after: state.doc }),
    });
  }

  return {
    getState: () => state,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    dispatch,
    begin(label: string) {
      commit();
      set({ transaction: { label, before: state.doc, commands: [] } });
    },
    commit,
    cancel() {
      const tx = state.transaction;
      if (tx) set({ doc: tx.before, transaction: null });
    },
    undo() {
      commit();
      const entry = state.past.at(-1);
      if (entry) set({ doc: entry.before, past: state.past.slice(0, -1), future: [entry, ...state.future] });
    },
    redo() {
      commit();
      const entry = state.future[0];
      if (entry) set({ doc: entry.after, past: [...state.past, entry], future: state.future.slice(1) });
    },
    /**
     * Applies a batch atomically (`runBatch`) as one history entry; refused batches change nothing.
     * `origin` is recorded in the journal (the AI assistant passes 'ai').
     */
    applyBatch(
      calls: readonly Call[],
      label: string,
      origin: JournalRecord['origin'] = 'user',
      permissions?: ReadonlySet<Permission>,
    ) {
      commit();
      const result = runBatch(state.doc, calls, ctx, permissions);
      if (!result.ok) {
        set({ lastError: result.error });
        return result;
      }
      const commands = calls.map((c) => ({ name: c.name as CommandName, params: c.params }));
      set({
        doc: result.site,
        ...record({ label, commands, before: state.doc, after: result.site }, origin),
        lastError: null,
      });
      return result;
    },
    /** Shows another page or layout; selection is cleared (not part of the history). */
    setPage(pageId: string) {
      if (pageId !== state.pageId && editedRoot(state.doc, pageId)) set({ pageId, selection: null });
    },
    select(id: string | null) {
      set({ selection: id && state.doc.nodes[id] ? id : null });
    },
    /** Replaces the document and resets history (VE-09). */
    load(doc: Site) {
      state = fresh(doc);
      for (const l of listeners) l();
    },
    /** Marks `doc` (the snapshot actually written, default: current) as saved. */
    markSaved(doc: Site = state.doc) {
      set({ savedDoc: doc });
    },
    /** Loads a document that has never been saved (template copy, import): dirty from the start. */
    loadUnsaved(doc: Site) {
      state = { ...fresh(doc), savedDoc: { ...doc }, dirty: true };
      for (const l of listeners) l();
    },
  };
}

export type EditorStore = ReturnType<typeof createEditorStore>;

/** `pageId` (a page or a layout) if it exists, else the home page. */
function onPage(doc: Site, pageId: string) {
  const root = editedRoot(doc, pageId);
  if (root) return { pageId, rootId: root };
  const home = doc.pages.find((p) => p.id === doc.settings.homePageId) ?? doc.pages[0];
  return { pageId: home?.id ?? pageId, rootId: home?.rootId ?? '' };
}

const describe = (diagnostics: Diagnostic[]) => diagnostics.map((d) => d.message).join('; ');
