import { isPicture, MEDIA_PATH, t } from '@ns/core';
import { z } from 'zod';
import { defineComponent } from '../define.ts';
import { resolveRuns, runsSchema, siteText } from '../rich.ts';

/**
 * Marquee (ADR-0022): texts or images scrolling in a loop, in CSS only. The content is rendered
 * twice for a seamless loop, the copy hidden from assistive technologies. It pauses on hover and
 * focus; the island shows a pause button (WCAG 2.2.2). With reduced motion it stands still and wraps.
 */
export const marquee = defineComponent({
  type: 'marquee',
  version: 1,
  label: t('components.marquee.name'),
  category: 'content',
  props: z.strictObject({
    mode: z.enum(['texts', 'images']),
    texts: z.array(runsSchema).min(1).max(30),
    separator: z.string().max(8),
    images: z
      .array(
        z.strictObject({
          assetId: z.string(),
          alt: z.string().max(300),
          caption: z.string().max(300).optional(),
        }),
      )
      .max(50),
    height: z.number().int().min(16).max(400),
    gap: z.number().int().min(0).max(400),
    duration: z.number().int().min(5).max(300),
    direction: z.enum(['left', 'right']),
  }),
  defaults: {
    props: {
      mode: 'texts',
      texts: [
        [{ text: 'content.marquee.identity' }],
        [{ text: 'content.marquee.web' }],
        [{ text: 'content.marquee.print' }],
        [{ text: 'content.marquee.motion' }],
      ],
      separator: '•',
      images: [],
      height: 64,
      gap: 48,
      duration: 30,
      direction: 'left',
    },
  },
  resolve: (props, ctx) => ({
    mode: props.mode,
    text: { pause: siteText(ctx)('content.marquee.pause'), resume: siteText(ctx)('content.marquee.resume') },
    texts: props.texts.map((runs) => resolveRuns(runs, ctx)),
    separator: props.separator,
    images: props.images.flatMap((im) => {
      const asset = ctx.site.assets[im.assetId];
      if (!isPicture(asset)) return [];
      return [
        {
          asset: asset.id,
          src: `${ctx.mediaBase ?? MEDIA_PATH}${asset.file}`,
          width: asset.width,
          height: asset.height,
          alt: im.alt,
        },
      ];
    }),
    height: props.height,
    gap: props.gap,
    duration: props.duration,
    direction: props.direction,
  }),
  children: 'none',
  styleGroups: ['spacing', 'size', 'item', 'typography', 'background', 'visibility', 'position', 'effects'],
  fields: [
    {
      kind: 'select',
      prop: 'mode',
      label: t('components.marquee.fields.mode'),
      options: [
        { value: 'texts', label: t('components.marquee.options.mode.texts') },
        { value: 'images', label: t('components.marquee.options.mode.images') },
      ],
    },
    { kind: 'richTextList', prop: 'texts', label: t('components.marquee.fields.texts') },
    { kind: 'text', prop: 'separator', label: t('components.marquee.fields.separator') },
    {
      kind: 'assets',
      prop: 'images',
      label: t('components.marquee.fields.images'),
      accept: ['image', 'svg'],
    },
    {
      kind: 'number',
      prop: 'height',
      label: t('components.marquee.fields.height'),
      min: 16,
      max: 400,
      step: 4,
    },
    { kind: 'number', prop: 'gap', label: t('components.marquee.fields.gap'), min: 0, max: 400, step: 4 },
    {
      kind: 'number',
      prop: 'duration',
      label: t('components.marquee.fields.duration'),
      min: 5,
      max: 300,
      step: 1,
    },
    {
      kind: 'select',
      prop: 'direction',
      label: t('components.marquee.fields.direction'),
      options: [
        { value: 'left', label: t('components.marquee.options.direction.left') },
        { value: 'right', label: t('components.marquee.options.direction.right') },
      ],
    },
  ],
  island: true,
  css:
    '.ns-marquee{position:relative;overflow:hidden}' +
    '.ns-marquee-track{display:flex;width:max-content;animation:ns-marquee var(--ns-marquee-duration) linear infinite}' +
    '.ns-marquee-right .ns-marquee-track{animation-direction:reverse}' +
    '.ns-marquee-group{display:flex;align-items:center;gap:var(--ns-marquee-gap);padding:0 var(--ns-marquee-gap) 0 0;margin:0;list-style:none}' +
    '.ns-marquee-group li{display:flex;align-items:center;gap:var(--ns-marquee-gap);white-space:nowrap}' +
    '.ns-marquee-group img{display:block;height:var(--ns-marquee-height);width:auto;max-width:none}' +
    '@keyframes ns-marquee{to{transform:translateX(-50%)}}' +
    '.ns-marquee:hover .ns-marquee-track,.ns-marquee:focus-within .ns-marquee-track,.ns-marquee-paused .ns-marquee-track{animation-play-state:paused}' +
    '.ns-marquee-toggle{position:absolute;right:8px;bottom:8px;z-index:1;padding:4px 10px;border:0;border-radius:999px;' +
    'background-color:rgba(0,0,0,.6);color:#fff;font:inherit;font-size:12px;cursor:pointer}' +
    '.ns-marquee-toggle[hidden]{display:none}' +
    '@media (prefers-reduced-motion:reduce){.ns-marquee-track{animation:none;width:auto}' +
    '.ns-marquee-group{flex-wrap:wrap;row-gap:12px}.ns-marquee-group[aria-hidden]{display:none}.ns-marquee-toggle{display:none}}',
  display: 'block',
  viewName: 'Marquee',
});
