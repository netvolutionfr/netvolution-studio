import { registry } from '@ns/components';
import {
  type DocNode,
  instanceStatus,
  instancesOf,
  newNodeId,
  nodeAtPath,
  runBatch,
  SYMBOL_CATEGORIES,
  type SymbolCategory,
  summarize,
} from '@ns/core';
import { Component, Link2Off, Pencil, RefreshCw, Trash2, Upload } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button, IconButton } from '../ui/index.ts';
import { TextField } from './fields.tsx';
import { PropFields } from './PropFields.tsx';
import { ReviewDialog } from './Review.tsx';
import { CATEGORY_LABELS } from './SectionLibrary.tsx';
import { Section } from './StyleFields.tsx';
import { useEditor, useStore } from './store.ts';

type Store = ReturnType<typeof useStore>;

/** Pending review of an instance update: the dry run's diff, applied as one undo step if accepted. */
type Pending = { symbolId: string; ids?: string[] | undefined; lines: string[]; notice?: string | undefined };

function dryRun(store: Store, symbolId: string, ids?: string[]): Pending {
  const params = { symbolId, ...(ids ? { ids } : {}) };
  const r = runBatch(store.getState().doc, [{ name: 'updateInstances', params }], {
    registry,
    newId: newNodeId,
  });
  return r.ok
    ? { symbolId, ids, lines: summarize(r.diff), notice: r.results[0]?.notice }
    : { symbolId, ids, lines: [r.error.message] };
}

function UpdateReview({ pending, onClose }: { pending: Pending; onClose: () => void }) {
  const store = useStore();
  return (
    <ReviewDialog
      title="Mettre à jour les instances"
      lines={pending.lines}
      notice={pending.notice}
      acceptLabel="Mettre à jour"
      onAccept={() =>
        store.applyBatch(
          [
            {
              name: 'updateInstances',
              params: { symbolId: pending.symbolId, ...(pending.ids ? { ids: pending.ids } : {}) },
            },
          ],
          'Mettre à jour les instances',
        )
      }
      onClose={onClose}
    />
  );
}

/** Inspector part of a linked instance (CS-03): its parameters, version and actions. */
export function InstancePanel({ node }: { node: DocNode }) {
  const store = useStore();
  const doc = useEditor((s) => s.doc);
  const status = instanceStatus(doc, node.id, registry);
  const [pending, setPending] = useState<Pending | null>(null);
  if (!node.instance) return null;
  if (!status)
    return (
      <Section title="Composant partagé">
        <p className="field-error">Définition introuvable : {node.instance.symbolId}</p>
      </Section>
    );
  const { symbol } = status;
  return (
    <Section title={`Composant « ${symbol.name} »`}>
      <p
        className={
          status.outdated || status.modified
            ? 'hint instance-status instance-status-warn'
            : 'hint instance-status'
        }
      >
        Version {node.instance.version}
        {status.outdated ? ` — version ${symbol.version} disponible` : ' (à jour)'}
        {status.modified &&
          ' — modifiée hors de ses paramètres : ces changements seront écrasés à la mise à jour.'}
      </p>
      {symbol.params.map((param) => {
        const target = nodeAtPath(doc, node.id, param.path);
        const field = target && registry.get(target.type)?.fields.find((f) => f.prop === param.prop);
        if (!target || !field) return null;
        return (
          <PropFields
            key={param.id}
            node={target}
            fields={[{ ...field, label: param.label }]}
            onSet={(_prop, value, label) =>
              store.dispatch('setOverride', { id: node.id, paramId: param.id, value }, label)
            }
          />
        );
      })}
      <div className="inspector-actions" role="toolbar" aria-label="Actions sur l'instance">
        <Button
          size="sm"
          icon={RefreshCw}
          disabled={!status.outdated && !status.modified}
          onClick={() => setPending(dryRun(store, symbol.id, [node.id]))}
        >
          Mettre à jour
        </Button>
        <IconButton
          size="sm"
          icon={Link2Off}
          label="Détacher (copie indépendante)"
          onClick={() => store.dispatch('detachInstance', { id: node.id }, 'Détacher l’instance')}
        />
        <IconButton
          size="sm"
          icon={Pencil}
          label="Modifier le composant"
          onClick={() => store.setPage(symbol.id)}
        />
      </div>
      {pending && <UpdateReview pending={pending} onClose={() => setPending(null)} />}
    </Section>
  );
}

/** Settings of the shared component being edited (nothing selected): metadata, versions, propagation. */
export function SymbolSettings() {
  const store = useStore();
  const doc = useEditor((s) => s.doc);
  const id = useEditor((s) => s.pageId);
  const symbol = doc.symbols?.find((x) => x.id === id);
  const [pending, setPending] = useState<Pending | null>(null);
  if (!symbol) return null;
  const instances = instancesOf(doc, symbol.id);
  const outdated = instances.filter((n) => (n.instance?.version ?? 0) < symbol.version).length;
  const set = (patch: Record<string, unknown>, label: string) =>
    store.dispatch('updateSymbol', { id: symbol.id, ...patch }, label);
  return (
    <Section title="Composant partagé">
      <p className="hint">
        Version {symbol.version} · {instances.length} instance(s)
        {outdated ? `, dont ${outdated} en retard` : ''}. Les modifications faites ici ne touchent les
        instances qu’après « Publier » puis « Mettre à jour ».
      </p>
      <TextField label="Nom" value={symbol.name} onChange={(name) => set({ name }, 'Nom du composant')} />
      <TextField
        label="Description"
        value={symbol.description}
        onChange={(description) => set({ description }, 'Description du composant')}
      />
      <label className="field field-stack">
        <span className="field-label">Catégorie</span>
        <select
          value={symbol.category}
          onChange={(e) => set({ category: e.target.value }, 'Catégorie du composant')}
        >
          {SYMBOL_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
      </label>
      <p className="hint">
        Paramètres modifiables dans chaque instance :{' '}
        {symbol.params.map((p) => p.label).join(' ; ') || 'aucun'}.
      </p>
      <div className="inspector-actions" role="toolbar" aria-label="Actions sur le composant">
        <Button
          size="sm"
          icon={Upload}
          onClick={() =>
            store.dispatch('publishSymbol', { id: symbol.id }, `Publier la version ${symbol.version + 1}`)
          }
        >
          Publier la version {symbol.version + 1}
        </Button>
        <Button
          size="sm"
          icon={RefreshCw}
          disabled={!outdated}
          onClick={() => setPending(dryRun(store, symbol.id))}
        >
          Mettre à jour les instances
        </Button>
        <IconButton
          size="sm"
          variant="danger"
          icon={Trash2}
          label="Supprimer le composant"
          onClick={() =>
            confirm(`Supprimer le composant « ${symbol.name} » ?`) &&
            store.dispatch('removeSymbol', { id: symbol.id }, 'Supprimer le composant')
          }
        />
      </div>
      {pending && <UpdateReview pending={pending} onClose={() => setPending(null)} />}
    </Section>
  );
}

/** « Créer un composant » from the selected element: name, category, description. */
export function CreateSymbolButton({ nodeId, disabled }: { nodeId: string; disabled: boolean }) {
  const store = useStore();
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<SymbolCategory>('elements');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (open) dialog.current?.showModal();
  }, [open]);
  return (
    <>
      <IconButton
        size="sm"
        label="Créer un composant réutilisable"
        icon={Component}
        disabled={disabled}
        tooltip="Enregistrer comme composant (section réutilisable, liée)"
        onClick={() => {
          setName(store.getState().doc.nodes[nodeId]?.name ?? '');
          setError(null);
          setOpen(true);
        }}
      />
      {open && (
        <dialog
          ref={dialog}
          className="ui-dialog"
          aria-labelledby="symbol-title"
          onClose={() => setOpen(false)}
        >
          <form
            method="dialog"
            onSubmit={(e) => {
              const r = store.dispatch(
                'createSymbol',
                { nodeId, name, category, description },
                'Créer un composant',
              );
              if (!r.ok) {
                e.preventDefault();
                setError(r.error.message);
              }
            }}
          >
            <h2 id="symbol-title">Créer un composant</h2>
            <p className="hint">
              L’élément devient la première instance ; le composant apparaît dans la bibliothèque (Sections).
            </p>
            <label className="field field-stack">
              <span className="field-label">Nom</span>
              <input required value={name} maxLength={120} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="field field-stack">
              <span className="field-label">Catégorie</span>
              <select value={category} onChange={(e) => setCategory(e.target.value as SymbolCategory)}>
                {SYMBOL_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABELS[c]}
                  </option>
                ))}
              </select>
            </label>
            <label className="field field-stack">
              <span className="field-label">Description</span>
              <input value={description} maxLength={300} onChange={(e) => setDescription(e.target.value)} />
            </label>
            {error && (
              <p className="field-error" role="alert">
                {error}
              </p>
            )}
            <div className="dialog-actions">
              <Button type="button" onClick={() => dialog.current?.close()}>
                Annuler
              </Button>
              <Button type="submit" variant="primary">
                Créer
              </Button>
            </div>
          </form>
        </dialog>
      )}
    </>
  );
}
