import { activeBreakpoint, pagePath, t } from '@ns/core';
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
import { LanguageMenu } from './LanguageMenu.tsx';
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
  const bpLabel = bp === 'base' ? t('viewport.base') : doc.breakpoints.find((b) => b.id === bp)?.label;
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
        <IconButton
          label={t('toolbar.undo')}
          icon={Undo2}
          shortcut="⌘Z"
          onClick={store.undo}
          disabled={!canUndo}
        />
        <IconButton
          label={t('toolbar.redo')}
          icon={Redo2}
          shortcut="⇧⌘Z"
          onClick={store.redo}
          disabled={!canRedo}
        />
        <span className="toolbar-sep" />
        <Segmented
          label={t('viewport.label')}
          value={preset}
          options={VIEWPORTS.map((v) => ({
            value: v.id,
            label: t(`viewport.${v.id}`),
            icon: VIEWPORT_ICONS[v.id],
          }))}
          onChange={(id) => {
            const v = VIEWPORTS.find((x) => x.id === id);
            if (v) props.onWidth(v.width);
          }}
        />
        <label className="width-input">
          <span className="visually-hidden">{t('viewport.custom')}</span>
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
          <span className="visually-hidden">{t('viewport.editedBreakpoint')}</span>
          <strong>{bpLabel}</strong>
        </span>
      </div>
      <div className="toolbar-end">
        <IconButton
          label={t('toolbar.design')}
          icon={Palette}
          tooltip={t('toolbar.designTip')}
          aria-pressed={props.side === 'design'}
          onClick={() => props.onSide(props.side === 'design' ? 'inspector' : 'design')}
        />
        <IconButton
          label={t('toolbar.media')}
          icon={Images}
          tooltip={t('toolbar.mediaTip')}
          aria-pressed={props.side === 'media'}
          onClick={() => props.onSide(props.side === 'media' ? 'inspector' : 'media')}
        />
        <IconButton
          label={t('toolbar.menus')}
          icon={ListTree}
          tooltip={t('toolbar.menusTip')}
          aria-pressed={props.side === 'menus'}
          onClick={() => props.onSide(props.side === 'menus' ? 'inspector' : 'menus')}
        />
        <IconButton
          label={t('toolbar.assistant')}
          icon={Sparkles}
          tooltip={t('toolbar.assistantTip')}
          aria-pressed={props.side === 'assistant'}
          onClick={() => props.onSide(props.side === 'assistant' ? 'inspector' : 'assistant')}
        />
        <IconButton
          label={t('toolbar.journal')}
          icon={History}
          tooltip={t('toolbar.journalTip')}
          aria-pressed={props.side === 'journal'}
          onClick={() => props.onSide(props.side === 'journal' ? 'inspector' : 'journal')}
        />
        <IconButton
          label={t('toolbar.sitePreview')}
          icon={ExternalLink}
          tooltip={t('toolbar.sitePreviewTip')}
          onClick={() => {
            const slug = doc.pages.find((p) => p.id === pageId)?.slug ?? '';
            open(`./preview.html#/${doc.id}${pagePath(slug)}`, `ns-preview-${doc.id}`);
          }}
        />
        <IconButton
          label={t('toolbar.preview')}
          icon={Eye}
          tooltip={t('toolbar.previewTip')}
          aria-pressed={props.preview}
          onClick={() => props.onPreview(!props.preview)}
        />
        <IconButton
          label={t('toolbar.guide')}
          icon={CircleHelp}
          tooltip={t('toolbar.guideTip')}
          onClick={() => open('./guide/', 'ns-guide')}
        />
        <IconButton
          label={props.theme === 'dark' ? t('toolbar.lightTheme') : t('toolbar.darkTheme')}
          icon={props.theme === 'dark' ? Sun : Moon}
          onClick={() => props.onTheme(props.theme === 'dark' ? 'light' : 'dark')}
        />
        <LanguageMenu />
      </div>
      {error && (
        <div className="toasts toasts-editor">
          <div className="toast toast-error error" role="alert">
            <CircleAlert aria-hidden="true" size={16} />
            <span className="toast-text">{t('toolbar.refused', { message: error.message })}</span>
          </div>
        </div>
      )}
    </header>
  );
}
