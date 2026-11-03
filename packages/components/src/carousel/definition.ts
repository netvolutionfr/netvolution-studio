import { isPicture, MEDIA_PATH } from '@ns/core';
import { z } from 'zod';
import { defineComponent } from '../define.ts';

const RATIOS = ['auto', '1/1', '4/3', '3/2', '16/9', '3/4'] as const;
const perView = z.number().int().min(1).max(6);

/**
 * Carousel (ADR-0022): a horizontal track with scroll snapping, usable without JavaScript (swipe,
 * scrollbar, arrow keys once focused). The island adds previous/next buttons and, if enabled, an
 * autoplay that stops on hover, focus or the pause button, and never runs with reduced motion.
 * Images per view are set per breakpoint (tablet and mobile inherit when empty).
 */
export const carousel = defineComponent({
  type: 'carousel',
  version: 1,
  label: 'Carrousel',
  category: 'media',
  props: z.strictObject({
    label: z.string().min(1).max(120),
    images: z
      .array(
        z.strictObject({
          assetId: z.string(),
          alt: z.string().max(300),
          caption: z.string().max(300).optional(),
        }),
      )
      .max(100),
    ratio: z.enum(RATIOS),
    perView,
    perViewTablet: perView.nullable(),
    perViewMobile: perView.nullable(),
    gap: z.number().int().min(0).max(200),
    autoplay: z.boolean(),
    interval: z.number().int().min(3).max(30),
  }),
  defaults: {
    props: {
      label: 'Carrousel',
      images: [],
      ratio: '4/3',
      perView: 1,
      perViewTablet: null,
      perViewMobile: null,
      gap: 16,
      autoplay: false,
      interval: 6,
    },
  },
  resolve: (props, { site, mediaBase = MEDIA_PATH }) => ({
    label: props.label,
    ratio: props.ratio.replace('/', '-'),
    gap: props.gap,
    autoplay: props.autoplay,
    interval: props.interval,
    images: props.images.flatMap((im) => {
      const asset = site.assets[im.assetId];
      if (!isPicture(asset)) return [];
      return [
        {
          asset: asset.id,
          src: `${mediaBase}${asset.file}`,
          width: asset.width,
          height: asset.height,
          alt: im.alt,
          caption: im.caption ?? '',
        },
      ];
    }),
  }),
  children: 'none',
  styleGroups: ['spacing', 'size', 'item', 'visibility', 'position', 'effects'],
  fields: [
    { kind: 'assets', prop: 'images', label: 'Images', accept: ['image', 'svg'] },
    { kind: 'text', prop: 'label', label: 'Nom accessible (« Nos réalisations »…)' },
    {
      kind: 'select',
      prop: 'ratio',
      label: 'Proportion des images',
      options: RATIOS.map((r) => ({ value: r, label: r === 'auto' ? 'D’origine' : r.replace('/', ':') })),
    },
    { kind: 'number', prop: 'perView', label: 'Images visibles (ordinateur)', min: 1, max: 6, step: 1 },
    {
      kind: 'number',
      prop: 'perViewTablet',
      label: 'Images visibles (tablette, vide : comme ordinateur)',
      min: 1,
      max: 6,
      step: 1,
    },
    {
      kind: 'number',
      prop: 'perViewMobile',
      label: 'Images visibles (mobile, vide : comme tablette)',
      min: 1,
      max: 6,
      step: 1,
    },
    { kind: 'number', prop: 'gap', label: 'Espacement (px)', min: 0, max: 200, step: 4 },
    { kind: 'boolean', prop: 'autoplay', label: 'Défilement automatique (avec bouton pause)' },
    { kind: 'number', prop: 'interval', label: 'Intervalle (secondes)', min: 3, max: 30, step: 1 },
  ],
  island: true,
  breakpointCss: (props, selector, breakpoint) => {
    const n =
      breakpoint === 'base'
        ? props.perView
        : breakpoint === 'tablet'
          ? props.perViewTablet
          : breakpoint === 'mobile'
            ? props.perViewMobile
            : null;
    return typeof n === 'number' ? `${selector}{--ns-per-view:${n}}` : '';
  },
  css:
    '.ns-carousel{--ns-per-view:1;position:relative}' +
    '.ns-carousel-track{display:grid;grid-auto-flow:column;gap:var(--ns-carousel-gap);' +
    'grid-auto-columns:calc((100% - (var(--ns-per-view) - 1) * var(--ns-carousel-gap)) / var(--ns-per-view));' +
    'overflow-x:auto;scroll-snap-type:x mandatory;scroll-behavior:smooth;overscroll-behavior-x:contain}' +
    '.ns-carousel-track:focus-visible{outline:2px solid currentColor;outline-offset:2px}' +
    '.ns-carousel-slide{margin:0;scroll-snap-align:start;min-width:0}' +
    '.ns-carousel-slide img{display:block;width:100%;height:auto}' +
    RATIOS.filter((r) => r !== 'auto')
      .map(
        (r) =>
          `.ns-carousel-r-${r.replace('/', '-')} img{aspect-ratio:${r.replace('/', ' / ')};object-fit:cover}`,
      )
      .join('') +
    '.ns-carousel-slide figcaption{margin-top:8px;font-size:.875em}' +
    '.ns-carousel-controls{display:flex;justify-content:center;gap:8px;margin-top:12px}' +
    '.ns-carousel-controls[hidden],.ns-carousel-controls [hidden]{display:none}' +
    '.ns-carousel-controls button{min-width:44px;height:44px;padding:0 12px;border:1px solid currentColor;border-radius:999px;' +
    'background-color:transparent;color:inherit;font:inherit;cursor:pointer}' +
    '.ns-carousel-empty{min-height:160px;background:repeating-linear-gradient(45deg,#f3f4f6 0 12px,#e5e7eb 12px 24px)}' +
    '@media (prefers-reduced-motion:reduce){.ns-carousel-track{scroll-behavior:auto}}',
  display: 'block',
  viewName: 'Carousel',
});
