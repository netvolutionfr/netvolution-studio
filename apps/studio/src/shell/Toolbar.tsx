import { activeBreakpoint, pagePath } from '@ns/core';
import {
  CircleAlert,
  CircleHelp,
  ExternalLink,
  Eye,
  History,
  Images,
  ListTree,
  Monitor,
  Moon,
  Palette,
  Redo2,
  Smartphone,
  Sparkles,
  Sun,
  Tablet,
  Undo2,
} from 'lucide-react';
import { IconButton, Segmented } from '../ui/index.ts';
import type { SidePanel } from './App.tsx';
import { DocumentBar } from './DocumentBar.tsx';
import { useEditor, useStore } from './store.ts';
import { MAX_WIDTH, MIN_WIDTH, VIEWPORTS } from './viewport.ts';

const VIEWPORT_ICONS = { desktop: Monitor, tablet: Tablet, mobile: Smartphone } as const;

export function Toolbar(props: {
  width: number;
  onWidth: (w: number) => void;
  preview: boolean;
  onPreview: (on: boolean) => void;
  side: SidePanel;
  onSide: (side: SidePanel) => void;
  theme: 'dark' | 'light';
  onTheme: (t: 'dark' | 'light') => void;
}) {
  const store = useStore();
  const doc = useEditor((s) => s.doc);
  const pageId = useEditor((s) => s.pageId);
  const canUndo = useEditor((s) => s.past.length > 0 || s.transaction !== null);
  const canRedo = useEditor((s) => s.future.length > 0);
  const error = useEditor((s) => s.lastError);
  const bp = activeBreakpoint(doc, props.width);
  const bpLabel = bp === 'base' ? 'Base (desktop)' : doc.breakpoints.find((b) => b.id === bp)?.label;
  const preset = VIEWPORTS.find((v) => v.width === props.width)?.id;

  return (
    <header className="toolbar">
      <div className="toolbar-start">
        <span className="brand" aria-hidden="true">
          NS
        </span>
        <DocumentBar />
      </div>
      <div className="toolbar-center">
        <IconButton label="Annuler" icon={Undo2} shortcut="⌘Z" onClick={store.undo} disabled={!canUndo} />
        <IconButton label="Rétablir" icon={Redo2} shortcut="⇧⌘Z" onClick={store.redo} disabled={!canRedo} />
        <span className="toolbar-sep" />
        <Segmented
          label="Largeur d'aperçu"
          value={preset}
          options={VIEWPORTS.map((v) => ({ value: v.id, label: v.label, icon: VIEWPORT_ICONS[v.id] }))}
          onChange={(id) => {
            const v = VIEWPORTS.find((x) => x.id === id);
            if (v) props.onWidth(v.width);
          }}
        />
        <label className="width-input">
          <span className="visually-hidden">Largeur personnalisée en pixels</span>
          <input
            type="number"
            min={MIN_WIDTH}
            max={MAX_WIDTH}
            value={props.width}
            onChange={(e) => {
              const w = e.target.valueAsNumber;
              if (w >= MIN_WIDTH && w <= MAX_WIDTH) props.onWidth(w);
            }}
          />
          <span aria-hidden="true">px</span>
        </label>
        <span className="breakpoint">
          <span className="visually-hidden">Breakpoint édité : </span>
          <strong>{bpLabel}</strong>
        </span>
      </div>
      <div className="toolbar-end">
        <IconButton
          label="Design system"
          icon={Palette}
          tooltip="Couleurs, tailles, polices et styles de texte du site"
          aria-pressed={props.side === 'design'}
          onClick={() => props.onSide(props.side === 'design' ? 'inspector' : 'design')}
        />
        <IconButton
          label="Médiathèque"
          icon={Images}
          tooltip="Images, SVG et fichiers du projet"
          aria-pressed={props.side === 'media'}
          onClick={() => props.onSide(props.side === 'media' ? 'inspector' : 'media')}
        />
        <IconButton
          label="Menus"
          icon={ListTree}
          tooltip="Menus de navigation du site"
          aria-pressed={props.side === 'menus'}
          onClick={() => props.onSide(props.side === 'menus' ? 'inspector' : 'menus')}
        />
        <IconButton
          label="Assistant IA"
          icon={Sparkles}
          tooltip="Propositions de l’IA, toujours soumises à votre validation"
          aria-pressed={props.side === 'assistant'}
          onClick={() => props.onSide(props.side === 'assistant' ? 'inspector' : 'assistant')}
        />
        <IconButton
          label="Journal des opérations"
          icon={History}
          tooltip="Opérations de la session (vous et l’IA)"
          aria-pressed={props.side === 'journal'}
          onClick={() => props.onSide(props.side === 'journal' ? 'inspector' : 'journal')}
        />
        <IconButton
          label="Aperçu du site"
          icon={ExternalLink}
          tooltip="Naviguer dans le site, sans les outils d’édition (nouvel onglet)"
          onClick={() => {
            const slug = doc.pages.find((p) => p.id === pageId)?.slug ?? '';
            open(`./preview.html#/${doc.id}${pagePath(slug)}`, `ns-preview-${doc.id}`);
          }}
        />
        <IconButton
          label="Aperçu"
          icon={Eye}
          tooltip="Aperçu sans les contrôles de l’éditeur"
          aria-pressed={props.preview}
          onClick={() => props.onPreview(!props.preview)}
        />
        <IconButton
          label="Guide d’utilisation"
          icon={CircleHelp}
          tooltip="Guide d’utilisation du Studio (nouvel onglet)"
          onClick={() => open('./guide/', 'ns-guide')}
        />
        <IconButton
          label={props.theme === 'dark' ? 'Thème clair' : 'Thème sombre'}
          icon={props.theme === 'dark' ? Sun : Moon}
          onClick={() => props.onTheme(props.theme === 'dark' ? 'light' : 'dark')}
        />
      </div>
      {error && (
        <div className="toasts toasts-editor">
          <div className="toast toast-error error" role="alert">
            <CircleAlert aria-hidden="true" size={16} />
            <span className="toast-text">Refusé : {error.message}</span>
          </div>
        </div>
      )}
    </header>
  );
}
