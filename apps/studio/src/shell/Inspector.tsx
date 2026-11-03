import { registry } from '@ns/components';
import { activeBreakpoint, nodeClass, parentOf, t } from '@ns/core';
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
      <aside className="panel inspector" aria-label={t('inspector.title')}>
        <h2 className="panel-title">{t('inspector.title')}</h2>
        <p className="hint">
          <MousePointer2 aria-hidden="true" size={14} strokeWidth={1.5} /> {t('inspector.empty')}
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
  const bpLabel =
    bp === 'base' ? t('viewport.base') : (doc.breakpoints.find((b) => b.id === bp)?.label ?? bp);
  const BpIcon = BP_ICONS[bp] ?? Monitor;
  const move = (to: number, label: string) =>
    parent && store.dispatch('moveNode', { id, parentId: parent.id, index: to }, label);

  return (
    <aside className="panel inspector" aria-label={t('inspector.title')}>
      <header className="inspector-head">
        <Icon aria-hidden="true" size={16} strokeWidth={1.75} className="inspector-icon" />
        <div className="inspector-title">
          <h2>{def?.label ?? node.type}</h2>
          {node.name && <span className="inspector-name">{node.name}</span>}
        </div>
      </header>
      <div className="inspector-actions" role="toolbar" aria-label={t('inspector.actions')}>
        <IconButton
          size="sm"
          label={t('inspector.moveUp')}
          icon={ArrowUp}
          disabled={!parent || index <= 0}
          onClick={() => move(index - 1, t('inspector.moveUp'))}
        />
        <IconButton
          size="sm"
          label={t('inspector.moveDown')}
          icon={ArrowDown}
          disabled={!parent || index >= (parent?.children.length ?? 0) - 1}
          onClick={() => move(index + 1, t('inspector.moveDown'))}
        />
        <span className="toolbar-sep" />
        <IconButton
          size="sm"
          label={t('inspector.duplicate')}
          icon={CopyPlus}
          shortcut="⌘D"
          disabled={!parent}
          onClick={() => store.dispatch('duplicateNode', { id }, t('inspector.duplicate'))}
        />
        <IconButton
          size="sm"
          label={t('inspector.copy')}
          icon={Copy}
          shortcut="⌘C"
          disabled={!parent}
          onClick={() => copy(store)}
        />
        <IconButton
          size="sm"
          label={t('inspector.cut')}
          icon={Scissors}
          shortcut="⌘X"
          disabled={!parent}
          onClick={() => cut(store)}
        />
        <IconButton
          size="sm"
          label={t('inspector.paste')}
          icon={ClipboardPaste}
          shortcut="⌘V"
          tooltip={t('inspector.pasteTip')}
          onClick={() => paste(store)}
        />
        <CreateSymbolButton nodeId={id} disabled={!parent || node.instance !== undefined} />
        <span className="toolbar-sep" />
        <IconButton
          size="sm"
          label={t('inspector.remove')}
          icon={Trash2}
          shortcut="⌫"
          variant="danger"
          disabled={!parent}
          onClick={() => store.dispatch('removeNode', { id }, t('inspector.remove'))}
        />
      </div>

      <InstancePanel node={node} />
      {def && def.fields.length > 0 && (
        <Section title={t('inspector.content')}>
          <PropFields node={node} fields={def.fields} />
        </Section>
      )}

      <p className="bp-note">
        <BpIcon aria-hidden="true" size={14} strokeWidth={1.75} />
        {t('inspector.stylesFor')}
        <strong>{bpLabel}</strong>
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
          label={t('inspector.layerName')}
          value={node.name ?? ''}
          onChange={(name) => store.dispatch('renameNode', { id, name }, t('inspector.rename'))}
        />
        <TextField
          key={`${id}-classes`}
          label={t('inspector.classes')}
          value={(node.classes ?? []).join(' ')}
          onChange={(v) =>
            store.dispatch(
              'setNodeClasses',
              { id, classes: v.split(/\s+/).filter(Boolean) },
              t('inspector.classesDone'),
            )
          }
        />
        <p className="hint">
          {t('inspector.classesHint')}
          <code>{nodeClass(id)}</code>
        </p>
      </StyleSections>
      <AnimationSection node={node} />
    </aside>
  );
}
