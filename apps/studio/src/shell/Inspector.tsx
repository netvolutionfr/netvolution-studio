import { registry } from '@ns/components';
import { activeBreakpoint, nodeClass, parentOf } from '@ns/core';
import {
  ArrowDown,
  ArrowUp,
  ClipboardPaste,
  Copy,
  CopyPlus,
  Monitor,
  MousePointer2,
  Scissors,
  Smartphone,
  Tablet,
  Trash2,
} from 'lucide-react';
import { IconButton, typeIcon } from '../ui/index.ts';
import { AnimationSection } from './AnimationFields.tsx';
import { copy, cut, paste } from './clipboard.ts';
import { TextField } from './fields.tsx';
import { LayoutSettings, PageSettings } from './Pages.tsx';
import { PropFields } from './PropFields.tsx';
import { Section, StyleSections } from './StyleFields.tsx';
import { CreateSymbolButton, InstancePanel, SymbolSettings } from './Symbols.tsx';
import { useEditor, useStore } from './store.ts';

const BP_ICONS: Record<string, typeof Monitor> = { base: Monitor, tablet: Tablet, mobile: Smartphone };

/** Inspector generated from the registry: content fields per component, shared style controls per group. */
export function Inspector({ width }: { width: number }) {
  const store = useStore();
  const doc = useEditor((s) => s.doc);
  const id = useEditor((s) => s.selection);
  const node = id ? doc.nodes[id] : undefined;
  if (!id || !node) {
    return (
      <aside className="panel inspector" aria-label="Inspecteur">
        <h2 className="panel-title">Inspecteur</h2>
        <p className="hint">
          <MousePointer2 aria-hidden="true" size={14} strokeWidth={1.5} /> Sélectionnez un élément dans le
          canvas ou l'arborescence pour le modifier.
        </p>
        <PageSettings />
        <LayoutSettings />
        <SymbolSettings />
      </aside>
    );
  }
  const def = registry.get(node.type);
  const Icon = typeIcon(node.type);
  const parent = parentOf(doc, id);
  const index = parent?.children.indexOf(id) ?? -1;
  const bp = activeBreakpoint(doc, width);
  const bpLabel = bp === 'base' ? 'Base (desktop)' : (doc.breakpoints.find((b) => b.id === bp)?.label ?? bp);
  const BpIcon = BP_ICONS[bp] ?? Monitor;
  const move = (to: number, label: string) =>
    parent && store.dispatch('moveNode', { id, parentId: parent.id, index: to }, label);

  return (
    <aside className="panel inspector" aria-label="Inspecteur">
      <header className="inspector-head">
        <Icon aria-hidden="true" size={16} strokeWidth={1.75} className="inspector-icon" />
        <div className="inspector-title">
          <h2>{def?.label ?? node.type}</h2>
          {node.name && <span className="inspector-name">{node.name}</span>}
        </div>
      </header>
      <div className="inspector-actions" role="toolbar" aria-label="Actions sur l'élément">
        <IconButton
          size="sm"
          label="Monter"
          icon={ArrowUp}
          disabled={!parent || index <= 0}
          onClick={() => move(index - 1, 'Monter')}
        />
        <IconButton
          size="sm"
          label="Descendre"
          icon={ArrowDown}
          disabled={!parent || index >= (parent?.children.length ?? 0) - 1}
          onClick={() => move(index + 1, 'Descendre')}
        />
        <span className="toolbar-sep" />
        <IconButton
          size="sm"
          label="Dupliquer"
          icon={CopyPlus}
          shortcut="⌘D"
          disabled={!parent}
          onClick={() => store.dispatch('duplicateNode', { id }, 'Dupliquer')}
        />
        <IconButton
          size="sm"
          label="Copier"
          icon={Copy}
          shortcut="⌘C"
          disabled={!parent}
          onClick={() => copy(store)}
        />
        <IconButton
          size="sm"
          label="Couper"
          icon={Scissors}
          shortcut="⌘X"
          disabled={!parent}
          onClick={() => cut(store)}
        />
        <IconButton
          size="sm"
          label="Coller"
          icon={ClipboardPaste}
          shortcut="⌘V"
          tooltip="Coller dans la sélection ou après elle"
          onClick={() => paste(store)}
        />
        <CreateSymbolButton nodeId={id} disabled={!parent || node.instance !== undefined} />
        <span className="toolbar-sep" />
        <IconButton
          size="sm"
          label="Supprimer"
          icon={Trash2}
          shortcut="⌫"
          variant="danger"
          disabled={!parent}
          onClick={() => store.dispatch('removeNode', { id }, 'Supprimer')}
        />
      </div>

      <InstancePanel node={node} />
      {def && def.fields.length > 0 && (
        <Section title="Contenu">
          <PropFields node={node} fields={def.fields} />
        </Section>
      )}

      <p className="bp-note">
        <BpIcon aria-hidden="true" size={14} strokeWidth={1.75} />
        Styles appliqués à : <strong>{bpLabel}</strong>
      </p>
      <StyleSections
        doc={doc}
        node={node}
        groups={def?.styleGroups ?? []}
        breakpoint={bp}
        styleFirst={def?.category === 'content'}
      >
        <TextField
          key={`${id}-name`}
          label="Nom dans l'arborescence"
          value={node.name ?? ''}
          onChange={(name) => store.dispatch('renameNode', { id, name }, 'Renommer')}
        />
        <TextField
          key={`${id}-classes`}
          label="Classes CSS (séparées par des espaces)"
          value={(node.classes ?? []).join(' ')}
          onChange={(v) =>
            store.dispatch('setNodeClasses', { id, classes: v.split(/\s+/).filter(Boolean) }, 'Classes CSS')
          }
        />
        <p className="hint">
          Pour la feuille « CSS du projet » (Système de design). Classe interne : <code>{nodeClass(id)}</code>
        </p>
      </StyleSections>
      <AnimationSection node={node} />
    </aside>
  );
}
