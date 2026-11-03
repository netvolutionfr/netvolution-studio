import { isPicture, MEDIA_PATH, t } from '@ns/core';
import { z } from 'zod';
import { defineComponent } from '../define.ts';
import { siteText } from '../rich.ts';

const RATIOS = ['1/1', '4/3', '3/2', '16/9', '3/4', '2/3'] as const;
const px = (value: number) => ({ value, unit: 'px' as const });

/**
 * Gallery (ADR-0021): a list of images in a mosaic (natural heights, CSS multi-column: no
 * JavaScript, reading order kept in the HTML) or in tiles (cropped to one ratio). Columns and gap
 * are the responsive style settings. With `lightbox`, each image links to its full size; the
 * island opens it in a dialog (previous, next, Escape), and without JavaScript the link opens the
 * image itself.
 */
export const gallery = defineComponent({
  type: 'gallery',
  version: 1,
  label: t('components.gallery.name'),
  category: 'media',
  props: z.strictObject({
    images: z
      .array(
        z.strictObject({
          assetId: z.string(),
          alt: z.string().max(300),
          caption: z.string().max(300).optional(),
        }),
      )
      .max(200),
    layout: z.enum(['masonry', 'tiles']),
    ratio: z.enum(RATIOS),
    lightbox: z.boolean(),
  }),
  defaults: {
    props: { images: [], layout: 'masonry', ratio: '4/3', lightbox: true },
    style: { base: { columns: 3, gap: px(16) }, tablet: { columns: 2 }, mobile: { columns: 1 } },
  },
  // Each item keeps its media id (`asset`): the export adds the responsive variants of raster images.
  resolve: (props, ctx) => ({
    layout: props.layout,
    text: {
      dialog: siteText(ctx)('content.gallery.dialog'),
      close: siteText(ctx)('content.gallery.close'),
      prev: siteText(ctx)('content.carousel.prev'),
      next: siteText(ctx)('content.carousel.next'),
    },
    ratio: props.ratio.replace('/', '-'),
    lightbox: props.lightbox,
    images: props.images.flatMap((im) => {
      const asset = ctx.site.assets[im.assetId];
      if (!isPicture(asset)) return [];
      const src = `${ctx.mediaBase ?? MEDIA_PATH}${asset.file}`;
      return [
        {
          asset: asset.id,
          src,
          full: src,
          width: asset.width,
          height: asset.height,
          alt: im.alt,
          caption: im.caption ?? '',
        },
      ];
    }),
  }),
  children: 'none',
  styleGroups: ['spacing', 'size', 'grid', 'item', 'visibility', 'position', 'effects'],
  fields: [
    {
      kind: 'assets',
      prop: 'images',
      label: t('components.gallery.fields.images'),
      accept: ['image', 'svg'],
    },
    {
      kind: 'select',
      prop: 'layout',
      label: t('components.gallery.fields.layout'),
      options: [
        { value: 'masonry', label: t('components.gallery.options.layout.masonry') },
        { value: 'tiles', label: t('components.gallery.options.layout.tiles') },
      ],
    },
    {
      kind: 'select',
      prop: 'ratio',
      label: t('components.gallery.fields.ratio'),
      options: RATIOS.map((r) => ({ value: r, label: r.replace('/', ':') })),
    },
    { kind: 'boolean', prop: 'lightbox', label: t('components.gallery.fields.lightbox') },
  ],
  island: true,
  css:
    '.ns-gallery{--ns-gap:16px;column-count:3;column-gap:var(--ns-gap)}' +
    '.ns-gallery-item{break-inside:avoid;margin:0 0 var(--ns-gap)}' +
    '.ns-gallery-item img{display:block;width:100%;height:auto}' +
    '.ns-gallery-link{display:block}' +
    '.ns-gallery-item figcaption{margin-top:8px;font-size:.875em}' +
    '.ns-gallery-tiles img{object-fit:cover}' +
    RATIOS.map((r) => `.ns-gallery-r-${r.replace('/', '-')} img{aspect-ratio:${r.replace('/', ' / ')}}`).join(
      '',
    ) +
    '.ns-gallery-empty{min-height:160px;background:repeating-linear-gradient(45deg,#f3f4f6 0 12px,#e5e7eb 12px 24px)}' +
    '.ns-lightbox{max-width:min(96vw,1600px);max-height:96vh;padding:0;border:0;background:transparent;overflow:visible}' +
    '.ns-lightbox::backdrop{background:rgba(0,0,0,.88)}' +
    '.ns-lightbox figure{margin:0;display:grid;justify-items:center;gap:12px}' +
    '.ns-lightbox img{max-width:min(96vw,1600px);max-height:86vh;width:auto;height:auto}' +
    '.ns-lightbox figcaption{color:#f3f4f6}' +
    '.ns-lightbox button{position:fixed;width:48px;height:48px;border:0;border-radius:50%;' +
    'background:rgba(255,255,255,.14);color:#fff;font-size:28px;line-height:1;cursor:pointer}' +
    '.ns-lightbox button:focus-visible{outline:2px solid #fff;outline-offset:2px}' +
    '.ns-lightbox-close{top:16px;right:16px}.ns-lightbox-prev{left:16px;top:50%}.ns-lightbox-next{right:16px;top:50%}',
  display: 'block',
  viewName: 'Gallery',
});
