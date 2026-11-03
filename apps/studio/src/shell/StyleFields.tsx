import {
  type BackgroundImage,
  type DocNode,
  EMPTY_TOKENS,
  type Gradient,
  isPicture,
  isTokenRef,
  type Length,
  resolveStyle,
  type Shadow,
  type Site,
  STYLE_GROUPS,
  type StyleDecls,
  type StyleGroup,
  type StyleProperty,
  type TokenRef,
  type Tokens,
} from '@ns/core';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ChevronRight,
  type LucideIcon,
  Plus,
  RotateCcw,
  TextAlignCenter,
  TextAlignEnd,
  TextAlignJustify,
  TextAlignStart,
  Trash2,
} from 'lucide-react';
import { type ReactNode, useId } from 'react';
import { Button, IconButton, Segmented } from '../ui/index.ts';
import { Field, useTransaction } from './fields.tsx';
import { useStore } from './store.ts';

type Control =
  | { kind: 'length'; auto?: boolean; slider?: number }
  | { kind: 'select'; options: readonly (readonly [string | number, string])[] }
  | { kind: 'number'; min: number; max: number; step: number }
  | { kind: 'segmented'; options: readonly (readonly [string, string, LucideIcon])[] }
  | { kind: 'boolean' }
  | { kind: 'color' }
  | { kind: 'token'; tokens: 'textStyles' | 'fonts' }
  | { kind: 'translate' }
  | { kind: 'shadow' }
  | { kind: 'gradient' }
  | { kind: 'backgroundImage' };

const ALIGN = [
  ['stretch', 'Étirer'],
  ['start', 'Début'],
  ['center', 'Centre'],
  ['end', 'Fin'],
] as const;
const side = (prefix: string, auto?: boolean) => ({
  label: prefix,
  kind: 'length' as const,
  ...(auto ? { auto } : {}),
});

/** Shared style controls (VE-06 "propriétés communes mutualisées"); labels are UI concerns. */
export const STYLE_FIELDS: { [K in StyleProperty]-?: { label: string } & Control } = {
  paddingTop: side('Padding haut'),
  paddingRight: side('Padding droite'),
  paddingBottom: side('Padding bas'),
  paddingLeft: side('Padding gauche'),
  marginTop: side('Marge haut', true),
  marginRight: side('Marge droite', true),
  marginBottom: side('Marge bas', true),
  marginLeft: side('Marge gauche', true),
  width: { label: 'Largeur', kind: 'length', auto: true, slider: 1600 },
  maxWidth: { label: 'Largeur max.', kind: 'length', slider: 1600 },
  height: { label: 'Hauteur', kind: 'length', auto: true, slider: 800 },
  minHeight: { label: 'Hauteur min.', kind: 'length', slider: 800 },
  direction: {
    label: 'Direction',
    kind: 'segmented',
    options: [
      ['row', 'Ligne', ArrowRight],
      ['column', 'Colonne', ArrowDown],
      ['row-reverse', 'Ligne inversée', ArrowLeft],
      ['column-reverse', 'Colonne inversée', ArrowUp],
    ],
  },
  justify: {
    label: 'Distribution',
    kind: 'select',
    options: [
      ['start', 'Début'],
      ['center', 'Centre'],
      ['end', 'Fin'],
      ['space-between', 'Espacé (entre)'],
      ['space-around', 'Espacé (autour)'],
      ['space-evenly', 'Espacé (égal)'],
    ],
  },
  align: { label: 'Alignement', kind: 'select', options: [...ALIGN, ['baseline', 'Ligne de base']] },
  wrap: { label: 'Retour à la ligne', kind: 'boolean' },
  gap: { label: 'Espacement (gap)', kind: 'length', slider: 160 },
  columns: { label: 'Colonnes', kind: 'number', min: 1, max: 12, step: 1 },
  grow: { label: 'Croissance (flex-grow)', kind: 'number', min: 0, max: 10, step: 1 },
  basis: { label: 'Base (flex-basis)', kind: 'length', auto: true },
  alignSelf: { label: 'Alignement propre', kind: 'select', options: [['auto', 'Auto'], ...ALIGN] },
  textStyle: { label: 'Style de texte', kind: 'token', tokens: 'textStyles' },
  fontFamily: { label: 'Police', kind: 'token', tokens: 'fonts' },
  fontSize: { label: 'Taille de police', kind: 'length', slider: 120 },
  fontWeight: {
    label: 'Graisse',
    kind: 'select',
    options: [100, 200, 300, 400, 500, 600, 700, 800, 900].map((w) => [w, String(w)] as const),
  },
  lineHeight: { label: 'Interligne', kind: 'number', min: 0.5, max: 4, step: 0.05 },
  letterSpacing: { label: 'Espacement des lettres', kind: 'length', slider: 20 },
  textTransform: {
    label: 'Casse',
    kind: 'select',
    options: [
      ['none', 'Telle que saisie'],
      ['uppercase', 'CAPITALES'],
      ['lowercase', 'minuscules'],
      ['capitalize', 'Initiales En Capitales'],
    ],
  },
  textGradient: { label: 'Texte en dégradé', kind: 'gradient' },
  fontStyle: {
    label: 'Style',
    kind: 'select',
    options: [
      ['normal', 'Normal'],
      ['italic', 'Italique'],
    ],
  },
  textAlign: {
    label: 'Alignement du texte',
    kind: 'segmented',
    options: [
      ['start', 'Début', TextAlignStart],
      ['center', 'Centre', TextAlignCenter],
      ['end', 'Fin', TextAlignEnd],
      ['justify', 'Justifié', TextAlignJustify],
    ],
  },
  color: { label: 'Couleur du texte', kind: 'color' },
  backgroundColor: { label: 'Couleur de fond', kind: 'color' },
  gradient: { label: 'Dégradé', kind: 'gradient' },
  backgroundImage: { label: 'Image de fond', kind: 'backgroundImage' },
  radius: { label: 'Arrondi', kind: 'length', slider: 80 },
  borderWidth: { label: 'Bordure', kind: 'length', slider: 20 },
  borderStyle: {
    label: 'Style de bordure',
    kind: 'select',
    options: [
      ['solid', 'Plein'],
      ['dashed', 'Tirets'],
      ['dotted', 'Pointillés'],
      ['double', 'Double'],
      ['none', 'Aucune'],
    ],
  },
  borderColor: { label: 'Couleur de bordure', kind: 'color' },
  shadow: { label: 'Ombre', kind: 'shadow' },
  hidden: { label: 'Masquer sur ce breakpoint', kind: 'boolean' },
  aspectRatio: {
    label: 'Proportions',
    kind: 'select',
    options: [
      ['1/1', 'Carré (1:1)'],
      ['4/3', '4:3'],
      ['3/2', '3:2'],
      ['16/9', '16:9'],
      ['21/9', '21:9'],
      ['3/4', 'Portrait 3:4'],
      ['2/3', 'Portrait 2:3'],
      ['9/16', 'Portrait 9:16'],
    ],
  },
  objectPosition: {
    label: 'Cadrage de l’image',
    kind: 'select',
    options: [
      ['center', 'Centre'],
      ['top', 'Haut'],
      ['bottom', 'Bas'],
      ['left', 'Gauche'],
      ['right', 'Droite'],
    ],
  },
  position: {
    label: 'Position',
    kind: 'select',
    options: [
      ['static', 'Dans le flux'],
      ['relative', 'Relative (repère pour les enfants)'],
      ['absolute', 'Absolue (dans le parent positionné)'],
      ['sticky', 'Collante (reste visible au défilement)'],
    ],
  },
  top: side('Haut', true),
  right: side('Droite', true),
  bottom: side('Bas', true),
  left: side('Gauche', true),
  zIndex: { label: 'Plan (z-index)', kind: 'number', min: -10, max: 1000, step: 1 },
  overflow: {
    label: 'Débordement',
    kind: 'select',
    options: [
      ['visible', 'Visible'],
      ['hidden', 'Masqué'],
      ['clip', 'Rogné'],
      ['auto', 'Défilement si besoin'],
    ],
  },
  translate: { label: 'Décalage', kind: 'translate' },
  rotate: { label: 'Rotation (°)', kind: 'number', min: -360, max: 360, step: 1 },
  scale: { label: 'Échelle', kind: 'number', min: 0, max: 10, step: 0.05 },
};

type SectionSpec = { title: string; groups: StyleGroup[] };
const SECTIONS: SectionSpec[] = [
  { title: 'Mise en page', groups: ['flex', 'grid', 'item', 'size'] },
  { title: 'Espacements', groups: ['spacing'] },
  { title: 'Style', groups: ['typography', 'background', 'media'] },
  { title: 'Position et effets', groups: ['position', 'effects'] },
  { title: 'Avancé', groups: ['visibility'] },
];

/** Collapsible inspector section (native details/summary: keyboard and screen readers for free). */
export function Section(props: { title: string; children: ReactNode }) {
  return (
    <details className="ui-section" open>
      <summary>
        <ChevronRight aria-hidden="true" size={14} />
        {props.title}
      </summary>
      <div className="ui-section-body">{props.children}</div>
    </details>
  );
}

export function StyleSections(props: {
  doc: Site;
  node: DocNode;
  groups: readonly StyleGroup[];
  breakpoint: string;
  /** Content components show Style (typography) before Layout. */
  styleFirst: boolean;
  children?: ReactNode;
}) {
  const allowed = new Set(props.groups);
  const [layout, spacing, style, position, advanced] = SECTIONS as [
    SectionSpec,
    SectionSpec,
    SectionSpec,
    SectionSpec,
    SectionSpec,
  ];
  const sections = props.styleFirst ? [style, layout, spacing, position, advanced] : SECTIONS;
  return (
    <>
      {sections.map(({ title, groups }) => {
        const keys = [
          ...new Set(
            groups.filter((g) => allowed.has(g)).flatMap((g) => STYLE_GROUPS[g] as readonly StyleProperty[]),
          ),
        ];
        if (!keys.length && title !== 'Avancé') return null;
        return (
          <Section key={title} title={title}>
            <div className={title === 'Espacements' ? 'spacing-grid' : 'field-list'}>
              {keys.map((k) => (
                <StyleRow
                  key={`${props.node.id}-${k}`}
                  doc={props.doc}
                  node={props.node}
                  breakpoint={props.breakpoint}
                  prop={k}
                />
              ))}
            </div>
            {title === 'Avancé' && props.children}
          </Section>
        );
      })}
    </>
  );
}

function StyleRow(props: { doc: Site; node: DocNode; breakpoint: string; prop: StyleProperty }) {
  const store = useStore();
  const id = useId();
  const { node, breakpoint, prop } = props;
  const spec = STYLE_FIELDS[prop];
  const tx = useTransaction(spec.label);
  const resolved = resolveStyle(props.doc, node.id, breakpoint);
  const value = resolved[prop];
  const tokens = props.doc.tokens ?? EMPTY_TOKENS;
  const own = node.style[breakpoint]?.[prop] !== undefined;
  // Values that do nothing alone bring their companion when none applies yet: a border width its
  // solid style, a sticky position its top offset.
  const companion = (v: unknown): StyleDecls =>
    prop === 'borderWidth' && resolved.borderStyle === undefined
      ? { borderStyle: 'solid' }
      : prop === 'position' && v === 'sticky' && resolved.top === undefined
        ? { top: { value: 0, unit: 'px' } }
        : {};
  const set = (v: StyleDecls[StyleProperty]) =>
    store.dispatch(
      'updateNodeStyle',
      { id: node.id, breakpoint, set: { [prop]: v, ...companion(v) } as StyleDecls },
      spec.label,
    );
  const state = own ? 'own' : value !== undefined ? 'inherited' : undefined;
  const reset = own ? (
    <IconButton
      size="sm"
      icon={RotateCcw}
      label={`Réinitialiser ${spec.label}`}
      tooltip="Revenir à la valeur héritée"
      className="field-reset"
      onClick={() =>
        store.dispatch(
          'updateNodeStyle',
          { id: node.id, breakpoint, unset: [prop] },
          `Réinitialiser ${spec.label}`,
        )
      }
    />
  ) : null;
  const row = { label: spec.label, state, action: reset } as const;

  switch (spec.kind) {
    case 'length':
      return (
        <Field {...row}>
          <LengthControl
            label={spec.label}
            value={value as Length | 'auto' | TokenRef | undefined}
            sizes={tokens.sizes}
            auto={spec.auto === true}
            slider={spec.slider}
            onChange={set}
            tx={tx}
          />
        </Field>
      );
    case 'select':
      return (
        <Field {...row} htmlFor={id}>
          <select
            id={id}
            value={value === undefined ? '' : String(value)}
            onChange={(e) => {
              const option = spec.options.find(([v]) => String(v) === e.target.value);
              if (option) set(option[0] as StyleDecls[StyleProperty]);
            }}
          >
            {value === undefined && <option value="">—</option>}
            {spec.options.map(([v, label]) => (
              <option key={String(v)} value={String(v)}>
                {label}
              </option>
            ))}
          </select>
        </Field>
      );
    case 'segmented':
      return (
        <Field {...row}>
          <Segmented
            size="sm"
            label={spec.label}
            value={value === undefined ? undefined : String(value)}
            options={spec.options.map(([v, label, icon]) => ({ value: v, label, icon }))}
            onChange={(v) => set(v as StyleDecls[StyleProperty])}
          />
        </Field>
      );
    case 'number':
      return (
        <Field {...row} htmlFor={id}>
          <input
            id={id}
            type="number"
            min={spec.min}
            max={spec.max}
            step={spec.step}
            value={typeof value === 'number' ? value : ''}
            onChange={(e) => {
              if (Number.isNaN(e.target.valueAsNumber)) return;
              tx.edit();
              set(e.target.valueAsNumber);
            }}
            onBlur={tx.end}
          />
        </Field>
      );
    case 'boolean':
      return (
        <div className="field field-boolean">
          <label className="field-check">
            <input type="checkbox" checked={value === true} onChange={(e) => set(e.target.checked)} />
            {spec.label}
          </label>
          {reset}
        </div>
      );
    case 'translate': {
      const t = value as { x: Length; y: Length } | undefined;
      const set2 = (axis: 'x' | 'y', n: number) => {
        if (Number.isNaN(n)) return;
        tx.edit();
        const current = t ?? { x: { value: 0, unit: 'px' as const }, y: { value: 0, unit: 'px' as const } };
        set({ ...current, [axis]: { value: n, unit: 'px' } });
      };
      return (
        <Field {...row}>
          <span className="length">
            {(['x', 'y'] as const).map((axis) => (
              <input
                key={axis}
                type="number"
                aria-label={`${spec.label} ${axis.toUpperCase()} (px)`}
                placeholder={axis.toUpperCase()}
                value={t?.[axis].value ?? ''}
                onChange={(e) => set2(axis, e.target.valueAsNumber)}
                onBlur={tx.end}
              />
            ))}
          </span>
        </Field>
      );
    }
    case 'gradient':
      return (
        <Field {...row} stack>
          <GradientControl value={value as Gradient | 'none' | undefined} onChange={set} tx={tx} />
        </Field>
      );
    case 'backgroundImage':
      return (
        <Field {...row} stack>
          <BackgroundImageControl
            value={value as BackgroundImage | 'none' | undefined}
            assets={props.doc.assets}
            onChange={set}
          />
        </Field>
      );
    case 'shadow':
      return (
        <Field {...row} stack>
          <ShadowControl value={value as Shadow | 'none' | undefined} onChange={set} tx={tx} />
        </Field>
      );
    case 'token':
      return (
        <Field {...row} htmlFor={id}>
          <select
            id={id}
            value={isTokenRef(value) ? value.token : ''}
            onChange={(e) =>
              e.target.value
                ? set({ token: e.target.value })
                : store.dispatch('updateNodeStyle', { id: node.id, breakpoint, unset: [prop] }, spec.label)
            }
          >
            <option value="">—</option>
            {Object.entries(tokens[spec.tokens]).map(([tid, t]) => (
              <option key={tid} value={tid}>
                {t.label}
              </option>
            ))}
          </select>
        </Field>
      );
    case 'color': {
      const ref = isTokenRef(value) ? tokens.colors[value.token] : undefined;
      return (
        <Field {...row} htmlFor={id}>
          <span className="color">
            <input
              id={id}
              type="color"
              value={toHex6(ref?.value ?? (value as string | undefined))}
              onInput={(e) => {
                tx.edit();
                set((e.target as HTMLInputElement).value);
              }}
              onChange={tx.end}
              onBlur={tx.end}
            />
            <select
              aria-label={`${spec.label} (token)`}
              value={isTokenRef(value) ? value.token : ''}
              onChange={(e) =>
                set(e.target.value ? { token: e.target.value } : (ref?.value ?? toHex6(undefined)))
              }
            >
              <option value="">{isTokenRef(value) || !value ? 'Personnalisée' : String(value)}</option>
              {Object.entries(tokens.colors).map(([tid, t]) => (
                <option key={tid} value={tid}>
                  {t.label}
                </option>
              ))}
            </select>
          </span>
        </Field>
      );
    }
  }
}

const UNITS = ['px', 'rem', 'em', '%', 'vw', 'vh'] as const;

function LengthControl(props: {
  label: string;
  value: Length | 'auto' | TokenRef | undefined;
  sizes: Tokens['sizes'];
  auto: boolean;
  slider: number | undefined;
  onChange: (v: Length | 'auto' | TokenRef) => void;
  tx: { edit: () => void; end: () => void };
}) {
  const { tx } = props;
  const ref = isTokenRef(props.value) ? props.value : undefined;
  // A token shows its base value; editing the number switches back to a custom value.
  const value = ref ? props.sizes[ref.token]?.value.base : props.value;
  const length = value && value !== 'auto' && !isTokenRef(value) ? value : undefined;
  const unit = length?.unit ?? 'px';
  const change = (n: number) => {
    if (Number.isNaN(n)) return;
    tx.edit();
    props.onChange({ value: n, unit });
  };
  return (
    <span className="length">
      {props.slider && unit === 'px' && value !== 'auto' && (
        <input
          type="range"
          aria-label={props.label}
          min={0}
          max={props.slider}
          value={length?.value ?? 0}
          onPointerDown={tx.edit}
          onPointerUp={tx.end}
          onBlur={tx.end}
          onChange={(e) => change(e.target.valueAsNumber)}
        />
      )}
      <input
        type="number"
        aria-label={`${props.label} (valeur)`}
        step={unit === 'px' || unit === '%' ? 1 : 0.1}
        disabled={value === 'auto' || ref !== undefined}
        value={length?.value ?? ''}
        onChange={(e) => change(e.target.valueAsNumber)}
        onBlur={tx.end}
      />
      <select
        aria-label={`${props.label} (unité)`}
        value={ref ? `token:${ref.token}` : value === 'auto' ? 'auto' : unit}
        onChange={(e) => {
          const v = e.target.value;
          if (v === 'auto') props.onChange('auto');
          else if (v.startsWith('token:')) props.onChange({ token: v.slice(6) });
          else props.onChange({ value: length?.value ?? 0, unit: v as Length['unit'] });
        }}
      >
        {UNITS.map((u) => (
          <option key={u}>{u}</option>
        ))}
        {props.auto && <option value="auto">auto</option>}
        {Object.keys(props.sizes).length > 0 && (
          <optgroup label="Tokens">
            {Object.entries(props.sizes).map(([tid, t]) => (
              <option key={tid} value={`token:${tid}`}>
                {t.label}
              </option>
            ))}
          </optgroup>
        )}
      </select>
    </span>
  );
}

const SHADOWS: [string, string, Shadow][] = [
  ['soft', 'Douce', { x: px(0), y: px(1), blur: px(3), spread: px(0), color: '#0000001a' }],
  ['medium', 'Moyenne', { x: px(0), y: px(4), blur: px(12), spread: px(-2), color: '#00000026' }],
  ['strong', 'Forte', { x: px(0), y: px(12), blur: px(32), spread: px(-4), color: '#00000040' }],
];
function px(value: number): Length {
  return { value, unit: 'px' };
}

/** Box shadow: presets, then offsets, blur, spread, color with opacity, inset (ADR-0017). */
function ShadowControl(props: {
  value: Shadow | 'none' | undefined;
  onChange: (v: Shadow | 'none') => void;
  tx: { edit: () => void; end: () => void };
}) {
  const { value, onChange, tx } = props;
  const shadow = typeof value === 'object' ? value : undefined;
  const preset =
    value === 'none'
      ? 'none'
      : (SHADOWS.find(([, , s]) => JSON.stringify(s) === JSON.stringify(value))?.[0] ??
        (shadow ? 'custom' : ''));
  const edit = (patch: Partial<Shadow>) => {
    if (!shadow) return;
    tx.edit();
    onChange({ ...shadow, ...patch });
  };
  const alpha = shadow && shadow.color.length === 9 ? parseInt(shadow.color.slice(7), 16) : 255;
  const number = (label: string, key: 'x' | 'y' | 'blur' | 'spread', min?: number) => (
    <label className="shadow-field">
      <span>{label}</span>
      <input
        type="number"
        min={min}
        value={shadow?.[key].value ?? ''}
        onChange={(e) => {
          const n = e.target.valueAsNumber;
          if (!Number.isNaN(n) && (min === undefined || n >= min)) edit({ [key]: px(n) });
        }}
        onBlur={tx.end}
      />
    </label>
  );
  return (
    <div className="shadow">
      <select
        aria-label="Ombre"
        value={preset}
        onChange={(e) => {
          const v = e.target.value;
          if (v === 'none') onChange('none');
          else if (v === 'custom') onChange(shadow ?? (SHADOWS[0] as [string, string, Shadow])[2]);
          else {
            const found = SHADOWS.find(([id]) => id === v);
            if (found) onChange(found[2]);
          }
        }}
      >
        {preset === '' && <option value="">—</option>}
        <option value="none">Aucune</option>
        {SHADOWS.map(([id, label]) => (
          <option key={id} value={id}>
            {label}
          </option>
        ))}
        <option value="custom">Personnalisée</option>
      </select>
      {shadow && (
        <div className="shadow-grid">
          {number('X (px)', 'x')}
          {number('Y (px)', 'y')}
          {number('Flou (px)', 'blur', 0)}
          {number('Étendue (px)', 'spread')}
          <label className="shadow-field">
            <span>Couleur</span>
            <input
              type="color"
              value={shadow.color.slice(0, 7)}
              onInput={(e) =>
                edit({ color: `${(e.target as HTMLInputElement).value}${shadow.color.slice(7)}` })
              }
              onChange={tx.end}
              onBlur={tx.end}
            />
          </label>
          <label className="shadow-field">
            <span>Opacité (%)</span>
            <input
              type="number"
              min={0}
              max={100}
              value={Math.round((alpha / 255) * 100)}
              onChange={(e) => {
                const n = e.target.valueAsNumber;
                if (Number.isNaN(n) || n < 0 || n > 100) return;
                const hex = Math.round((n / 100) * 255)
                  .toString(16)
                  .padStart(2, '0');
                edit({ color: `${shadow.color.slice(0, 7)}${hex}` });
              }}
              onBlur={tx.end}
            />
          </label>
          <label className="field-check">
            <input
              type="checkbox"
              checked={shadow.inset === true}
              onChange={(e) => onChange({ ...shadow, inset: e.target.checked || undefined })}
            />
            Intérieure
          </label>
        </div>
      )}
    </div>
  );
}

const hexAlpha = (color: string) => (color.length === 9 ? parseInt(color.slice(7), 16) : 255);
const withAlpha = (color: string, percent: number) =>
  `${color.slice(0, 7)}${Math.round((percent / 100) * 255)
    .toString(16)
    .padStart(2, '0')}`;

const GRADIENTS: [string, string, Gradient][] = [
  [
    'veil',
    'Voile sombre (sur une image)',
    {
      kind: 'linear',
      angle: 180,
      stops: [
        { color: '#00000033', at: 0 },
        { color: '#000000b3', at: 100 },
      ],
    },
  ],
  [
    'linear',
    'Linéaire',
    {
      kind: 'linear',
      angle: 135,
      stops: [
        { color: '#4a63e8', at: 0 },
        { color: '#0f766e', at: 100 },
      ],
    },
  ],
  [
    'radial',
    'Radial',
    {
      kind: 'radial',
      angle: 0,
      stops: [
        { color: '#ffffff', at: 0 },
        { color: '#e5e7eb', at: 100 },
      ],
    },
  ],
];

/** Gradient (ADR-0017): presets, then kind, angle and 2 to 4 color stops with opacity. */
function GradientControl(props: {
  value: Gradient | 'none' | undefined;
  onChange: (v: Gradient | 'none') => void;
  tx: { edit: () => void; end: () => void };
}) {
  const { value, onChange, tx } = props;
  const gradient = typeof value === 'object' ? value : undefined;
  const edit = (next: Gradient) => {
    tx.edit();
    onChange(next);
  };
  const setStop = (i: number, patch: Partial<Gradient['stops'][number]>) =>
    gradient &&
    edit({ ...gradient, stops: gradient.stops.map((s, j) => (j === i ? { ...s, ...patch } : s)) });
  return (
    <div className="shadow">
      <select
        aria-label="Dégradé"
        value={value === 'none' ? 'none' : gradient ? gradient.kind : ''}
        onChange={(e) => {
          const v = e.target.value;
          if (v === 'none') return onChange('none');
          const preset = GRADIENTS.find(([id]) => id === v)?.[2];
          if (preset) onChange(preset);
          else if (gradient && (v === 'linear' || v === 'radial')) onChange({ ...gradient, kind: v });
        }}
      >
        {!value && <option value="">—</option>}
        <option value="none">Aucun</option>
        {gradient && (
          <option value={gradient.kind}>{gradient.kind === 'linear' ? 'Linéaire' : 'Radial'}</option>
        )}
        {GRADIENTS.filter(([id]) => id !== gradient?.kind).map(([id, label]) => (
          <option key={id} value={id}>
            {label}
          </option>
        ))}
      </select>
      {gradient && (
        <>
          <div
            className="gradient-preview"
            aria-hidden="true"
            style={{
              backgroundImage: `${gradient.kind}-gradient(${gradient.kind === 'linear' ? `${gradient.angle}deg` : 'circle'},${gradient.stops.map((s) => `${s.color} ${s.at}%`).join(',')})`,
            }}
          />
          {gradient.kind === 'linear' && (
            <label className="shadow-field">
              <span>Angle (°)</span>
              <input
                type="number"
                min={0}
                max={360}
                value={gradient.angle}
                onChange={(e) => {
                  const n = e.target.valueAsNumber;
                  if (Number.isInteger(n) && n >= 0 && n <= 360) edit({ ...gradient, angle: n });
                }}
                onBlur={tx.end}
              />
            </label>
          )}
          {gradient.stops.map((stop, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: stops are edited in place, in order.
            <div className="gradient-stop" key={i}>
              <input
                type="color"
                aria-label={`Couleur ${i + 1}`}
                value={stop.color.slice(0, 7)}
                onInput={(e) =>
                  setStop(i, { color: `${(e.target as HTMLInputElement).value}${stop.color.slice(7)}` })
                }
                onChange={tx.end}
                onBlur={tx.end}
              />
              <label className="shadow-field">
                <span>Opacité (%)</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={Math.round((hexAlpha(stop.color) / 255) * 100)}
                  onChange={(e) => {
                    const n = e.target.valueAsNumber;
                    if (n >= 0 && n <= 100) setStop(i, { color: withAlpha(stop.color, n) });
                  }}
                  onBlur={tx.end}
                />
              </label>
              <label className="shadow-field">
                <span>Position (%)</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={stop.at}
                  onChange={(e) => {
                    const n = e.target.valueAsNumber;
                    if (Number.isInteger(n) && n >= 0 && n <= 100) setStop(i, { at: n });
                  }}
                  onBlur={tx.end}
                />
              </label>
              <IconButton
                size="sm"
                icon={Trash2}
                label={`Retirer la couleur ${i + 1}`}
                disabled={gradient.stops.length <= 2}
                onClick={() => onChange({ ...gradient, stops: gradient.stops.filter((_, j) => j !== i) })}
              />
            </div>
          ))}
          {gradient.stops.length < 4 && (
            <Button
              size="sm"
              icon={Plus}
              onClick={() =>
                onChange({
                  ...gradient,
                  stops: [...gradient.stops, { color: gradient.stops.at(-1)?.color ?? '#000000', at: 100 }],
                })
              }
            >
              Ajouter une couleur
            </Button>
          )}
        </>
      )}
    </div>
  );
}

const SIZES = [
  ['cover', 'Couvrir (recadrer)'],
  ['contain', 'Contenir (image entière)'],
  ['auto', 'Taille d’origine'],
] as const;
const POSITIONS = [
  ['center', 'Centre'],
  ['top', 'Haut'],
  ['bottom', 'Bas'],
  ['left', 'Gauche'],
  ['right', 'Droite'],
] as const;

/** Background image (ADR-0017): an image of the media library, its fit and its position. */
function BackgroundImageControl(props: {
  value: BackgroundImage | 'none' | undefined;
  assets: Site['assets'];
  onChange: (v: BackgroundImage | 'none') => void;
}) {
  const { value, onChange } = props;
  const image = typeof value === 'object' ? value : undefined;
  const pictures = Object.values(props.assets).filter(isPicture);
  return (
    <div className="shadow">
      <select
        aria-label="Image de fond"
        value={value === 'none' ? 'none' : (image?.asset ?? '')}
        onChange={(e) => {
          const v = e.target.value;
          if (v === 'none') onChange('none');
          else if (v) onChange({ size: 'cover', position: 'center', ...image, asset: v });
        }}
      >
        {!value && <option value="">—</option>}
        <option value="none">Aucune</option>
        {pictures.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name || a.file}
          </option>
        ))}
      </select>
      {pictures.length === 0 && <p className="hint">Importez d’abord l’image dans la médiathèque.</p>}
      {image && (
        <div className="shadow-grid">
          <label className="shadow-field">
            <span>Ajustement</span>
            <select
              value={image.size}
              onChange={(e) => onChange({ ...image, size: e.target.value as BackgroundImage['size'] })}
            >
              {SIZES.map(([v, label]) => (
                <option key={v} value={v}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="shadow-field">
            <span>Position</span>
            <select
              value={image.position}
              onChange={(e) =>
                onChange({ ...image, position: e.target.value as BackgroundImage['position'] })
              }
            >
              {POSITIONS.map(([v, label]) => (
                <option key={v} value={v}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
    </div>
  );
}

function toHex6(v: string | undefined) {
  if (!v) return '#000000';
  if (v.length === 4) return `#${[...v.slice(1)].map((c) => c + c).join('')}`;
  return v.slice(0, 7);
}
