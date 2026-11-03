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
  t,
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
  ['stretch', t('style.v.stretch')],
  ['start', t('style.v.start')],
  ['center', t('style.v.center')],
  ['end', t('style.v.end')],
] as const;
const side = (prefix: string, auto?: boolean) => ({
  label: prefix,
  kind: 'length' as const,
  ...(auto ? { auto } : {}),
});

/** Shared style controls (VE-06 "propriétés communes mutualisées"); labels are UI concerns. */
export const STYLE_FIELDS: { [K in StyleProperty]-?: { label: string } & Control } = {
  paddingTop: side(t('style.paddingTop')),
  paddingRight: side(t('style.paddingRight')),
  paddingBottom: side(t('style.paddingBottom')),
  paddingLeft: side(t('style.paddingLeft')),
  marginTop: side(t('style.marginTop'), true),
  marginRight: side(t('style.marginRight'), true),
  marginBottom: side(t('style.marginBottom'), true),
  marginLeft: side(t('style.marginLeft'), true),
  width: { label: t('style.width'), kind: 'length', auto: true, slider: 1600 },
  maxWidth: { label: t('style.maxWidth'), kind: 'length', slider: 1600 },
  height: { label: t('style.height'), kind: 'length', auto: true, slider: 800 },
  minHeight: { label: t('style.minHeight'), kind: 'length', slider: 800 },
  direction: {
    label: t('style.direction'),
    kind: 'segmented',
    options: [
      ['row', t('style.v.row'), ArrowRight],
      ['column', t('style.v.column'), ArrowDown],
      ['row-reverse', t('style.v.rowReverse'), ArrowLeft],
      ['column-reverse', t('style.v.columnReverse'), ArrowUp],
    ],
  },
  justify: {
    label: t('style.justify'),
    kind: 'select',
    options: [
      ['start', t('style.v.start')],
      ['center', t('style.v.center')],
      ['end', t('style.v.end')],
      ['space-between', t('style.v.spaceBetween')],
      ['space-around', t('style.v.spaceAround')],
      ['space-evenly', t('style.v.spaceEvenly')],
    ],
  },
  align: {
    label: t('style.align'),
    kind: 'select',
    options: [...ALIGN, ['baseline', t('style.v.baseline')]],
  },
  wrap: { label: t('style.wrap'), kind: 'boolean' },
  gap: { label: t('style.gap'), kind: 'length', slider: 160 },
  columns: { label: t('style.columns'), kind: 'number', min: 1, max: 12, step: 1 },
  grow: { label: t('style.grow'), kind: 'number', min: 0, max: 10, step: 1 },
  basis: { label: t('style.basis'), kind: 'length', auto: true },
  alignSelf: {
    label: t('style.alignSelf'),
    kind: 'select',
    options: [['auto', t('style.v.auto')], ...ALIGN],
  },
  textStyle: { label: t('style.textStyle'), kind: 'token', tokens: 'textStyles' },
  fontFamily: { label: t('style.fontFamily'), kind: 'token', tokens: 'fonts' },
  fontSize: { label: t('style.fontSize'), kind: 'length', slider: 120 },
  fontWeight: {
    label: t('style.fontWeight'),
    kind: 'select',
    options: [100, 200, 300, 400, 500, 600, 700, 800, 900].map((w) => [w, String(w)] as const),
  },
  lineHeight: { label: t('style.lineHeight'), kind: 'number', min: 0.5, max: 4, step: 0.05 },
  letterSpacing: { label: t('style.letterSpacing'), kind: 'length', slider: 20 },
  textTransform: {
    label: t('style.textTransform'),
    kind: 'select',
    options: [
      ['none', t('style.v.asTyped')],
      ['uppercase', t('style.v.uppercase')],
      ['lowercase', t('style.v.lowercase')],
      ['capitalize', t('style.v.capitalize')],
    ],
  },
  textGradient: { label: t('style.textGradient'), kind: 'gradient' },
  fontStyle: {
    label: t('style.fontStyle'),
    kind: 'select',
    options: [
      ['normal', t('style.v.normal')],
      ['italic', t('style.v.italic')],
    ],
  },
  textAlign: {
    label: t('style.textAlign'),
    kind: 'segmented',
    options: [
      ['start', t('style.v.start'), TextAlignStart],
      ['center', t('style.v.center'), TextAlignCenter],
      ['end', t('style.v.end'), TextAlignEnd],
      ['justify', t('style.v.justify'), TextAlignJustify],
    ],
  },
  color: { label: t('style.color'), kind: 'color' },
  backgroundColor: { label: t('style.backgroundColor'), kind: 'color' },
  gradient: { label: t('style.gradient'), kind: 'gradient' },
  backgroundImage: { label: t('style.backgroundImage'), kind: 'backgroundImage' },
  radius: { label: t('style.radius'), kind: 'length', slider: 80 },
  borderWidth: { label: t('style.borderWidth'), kind: 'length', slider: 20 },
  borderStyle: {
    label: t('style.borderStyle'),
    kind: 'select',
    options: [
      ['solid', t('style.v.solid')],
      ['dashed', t('style.v.dashed')],
      ['dotted', t('style.v.dotted')],
      ['double', t('style.v.double')],
      ['none', t('style.v.none')],
    ],
  },
  borderColor: { label: t('style.borderColor'), kind: 'color' },
  shadow: { label: t('style.shadow'), kind: 'shadow' },
  hidden: { label: t('style.hidden'), kind: 'boolean' },
  aspectRatio: {
    label: t('style.aspectRatio'),
    kind: 'select',
    options: [
      ['1/1', t('style.v.square')],
      ['4/3', '4:3'],
      ['3/2', '3:2'],
      ['16/9', '16:9'],
      ['21/9', '21:9'],
      ['3/4', t('style.v.portrait34')],
      ['2/3', t('style.v.portrait23')],
      ['9/16', t('style.v.portrait916')],
    ],
  },
  objectPosition: {
    label: t('style.objectPosition'),
    kind: 'select',
    options: [
      ['center', t('style.v.center')],
      ['top', t('style.v.top')],
      ['bottom', t('style.v.bottom')],
      ['left', t('style.v.left')],
      ['right', t('style.v.right')],
    ],
  },
  position: {
    label: t('style.position'),
    kind: 'select',
    options: [
      ['static', t('style.v.static')],
      ['relative', t('style.v.relative')],
      ['absolute', t('style.v.absolute')],
      ['sticky', t('style.v.sticky')],
    ],
  },
  top: side(t('style.v.top'), true),
  right: side(t('style.v.right'), true),
  bottom: side(t('style.v.bottom'), true),
  left: side(t('style.v.left'), true),
  zIndex: { label: t('style.zIndex'), kind: 'number', min: -10, max: 1000, step: 1 },
  overflow: {
    label: t('style.overflow'),
    kind: 'select',
    options: [
      ['visible', t('style.v.visible')],
      ['hidden', t('style.v.hidden')],
      ['clip', t('style.v.clip')],
      ['auto', t('style.v.scroll')],
    ],
  },
  translate: { label: t('style.translate'), kind: 'translate' },
  rotate: { label: t('style.rotate'), kind: 'number', min: -360, max: 360, step: 1 },
  scale: { label: t('style.scale'), kind: 'number', min: 0, max: 10, step: 0.05 },
};

type SectionSpec = { title: string; groups: StyleGroup[] };
const SECTIONS: SectionSpec[] = [
  { title: t('style.sections.layout'), groups: ['flex', 'grid', 'item', 'size'] },
  { title: t('style.sections.spacing'), groups: ['spacing'] },
  { title: t('style.sections.style'), groups: ['typography', 'background', 'media'] },
  { title: t('style.sections.position'), groups: ['position', 'effects'] },
  { title: t('style.sections.advanced'), groups: ['visibility'] },
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
        const advanced = groups.includes('visibility');
        if (!keys.length && !advanced) return null;
        return (
          <Section key={title} title={title}>
            <div className={groups.includes('spacing') ? 'spacing-grid' : 'field-list'}>
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
            {advanced && props.children}
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
      label={t('style.reset', { label: spec.label })}
      tooltip={t('style.resetTip')}
      className="field-reset"
      onClick={() =>
        store.dispatch(
          'updateNodeStyle',
          { id: node.id, breakpoint, unset: [prop] },
          t('style.reset', { label: spec.label }),
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
            {Object.entries(tokens[spec.tokens]).map(([tid, token]) => (
              <option key={tid} value={tid}>
                {token.label}
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
              <option value="">{isTokenRef(value) || !value ? t('style.custom') : String(value)}</option>
              {Object.entries(tokens.colors).map(([tid, token]) => (
                <option key={tid} value={tid}>
                  {token.label}
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
        aria-label={t('style.unit', { label: props.label })}
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
          <optgroup label={t('style.tokens')}>
            {Object.entries(props.sizes).map(([tid, token]) => (
              <option key={tid} value={`token:${tid}`}>
                {token.label}
              </option>
            ))}
          </optgroup>
        )}
      </select>
    </span>
  );
}

const SHADOWS: [string, string, Shadow][] = [
  ['soft', t('style.shadows.soft'), { x: px(0), y: px(1), blur: px(3), spread: px(0), color: '#0000001a' }],
  [
    'medium',
    t('style.shadows.medium'),
    { x: px(0), y: px(4), blur: px(12), spread: px(-2), color: '#00000026' },
  ],
  [
    'strong',
    t('style.shadows.strong'),
    { x: px(0), y: px(12), blur: px(32), spread: px(-4), color: '#00000040' },
  ],
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
        aria-label={t('style.shadow')}
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
        <option value="none">{t('style.v.none')}</option>
        {SHADOWS.map(([id, label]) => (
          <option key={id} value={id}>
            {label}
          </option>
        ))}
        <option value="custom">{t('style.custom')}</option>
      </select>
      {shadow && (
        <div className="shadow-grid">
          {number('X (px)', 'x')}
          {number('Y (px)', 'y')}
          {number(t('style.blur'), 'blur', 0)}
          {number(t('style.spread'), 'spread')}
          <label className="shadow-field">
            <span>{t('style.shadowColor')}</span>
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
            <span>{t('style.opacity')}</span>
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
            {t('style.inset')}
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
    t('style.gradients.veil'),
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
    t('style.gradients.linear'),
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
    t('style.gradients.radial'),
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
        aria-label={t('style.gradient')}
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
        <option value="none">{t('style.noneMasc')}</option>
        {gradient && <option value={gradient.kind}>{t(`style.gradients.${gradient.kind}`)}</option>}
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
              <span>{t('style.angle')}</span>
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
                aria-label={t('style.stopColor', { n: i + 1 })}
                value={stop.color.slice(0, 7)}
                onInput={(e) =>
                  setStop(i, { color: `${(e.target as HTMLInputElement).value}${stop.color.slice(7)}` })
                }
                onChange={tx.end}
                onBlur={tx.end}
              />
              <label className="shadow-field">
                <span>{t('style.opacity')}</span>
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
                <span>{t('style.stopPosition')}</span>
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
                label={t('style.removeStop', { n: i + 1 })}
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
              {t('style.addStop')}
            </Button>
          )}
        </>
      )}
    </div>
  );
}

const SIZES = [
  ['cover', t('style.sizes.cover')],
  ['contain', t('style.sizes.contain')],
  ['auto', t('style.sizes.auto')],
] as const;
const POSITIONS = [
  ['center', t('style.v.center')],
  ['top', t('style.v.top')],
  ['bottom', t('style.v.bottom')],
  ['left', t('style.v.left')],
  ['right', t('style.v.right')],
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
        aria-label={t('style.backgroundImage')}
        value={value === 'none' ? 'none' : (image?.asset ?? '')}
        onChange={(e) => {
          const v = e.target.value;
          if (v === 'none') onChange('none');
          else if (v) onChange({ size: 'cover', position: 'center', ...image, asset: v });
        }}
      >
        {!value && <option value="">—</option>}
        <option value="none">{t('style.v.none')}</option>
        {pictures.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name || a.file}
          </option>
        ))}
      </select>
      {pictures.length === 0 && <p className="hint">{t('style.importFirst')}</p>}
      {image && (
        <div className="shadow-grid">
          <label className="shadow-field">
            <span>{t('style.fit')}</span>
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
            <span>{t('style.position')}</span>
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
