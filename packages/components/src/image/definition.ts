import { isPicture, linkHref, linkSchema, MEDIA_PATH, type MessageKey, t } from '@ns/core';
import { z } from 'zod';
import { defineComponent } from '../define.ts';

export const image = defineComponent({
  type: 'image',
  version: 1,
  label: t('components.image.name'),
  category: 'media',
  props: z
    .strictObject({
      assetId: z.string().nullable(),
      alt: z.string().max(300),
      decorative: z.boolean(),
      fit: z.enum(['cover', 'contain']),
      loading: z.enum(['lazy', 'eager']),
      /** Optional link around the image (logo, gallery) and caption (<figure>); absent in older sites. */
      link: linkSchema.nullable().optional(),
      caption: z.string().max(300).optional(),
    })
    .refine((p) => !p.assetId || p.decorative || p.alt.trim().length > 0, {
      message: 'schema.imageAlt' satisfies MessageKey,
      path: ['alt'],
    }),
  defaults: {
    props: {
      assetId: null,
      alt: '',
      decorative: false,
      fit: 'cover',
      loading: 'lazy',
      link: null,
      caption: '',
    },
  },
  // Asset id → media URL and intrinsic size (prevents layout shift); decorative images get alt="".
  resolve: (props, { site, mediaBase = MEDIA_PATH, basePath }) => {
    const found = props.assetId ? site.assets[props.assetId] : undefined;
    // Only images and SVGs are accepted (checked by loadSite); SVGs are only ever rendered through <img>.
    const asset = isPicture(found) ? found : undefined;
    return {
      src: asset ? `${mediaBase}${asset.file}` : null,
      alt: props.decorative ? '' : props.alt,
      width: asset?.width ?? null,
      height: asset?.height ?? null,
      fit: props.fit,
      loading: props.loading,
      href: props.link ? linkHref(props.link, site, basePath, mediaBase) : null,
      caption: props.caption ?? '',
    };
  },
  children: 'none',
  styleGroups: ['spacing', 'size', 'item', 'background', 'visibility', 'position', 'effects', 'media'],
  fields: [
    { kind: 'asset', prop: 'assetId', label: t('components.image.fields.assetId'), accept: ['image', 'svg'] },
    { kind: 'text', prop: 'alt', label: t('components.image.fields.alt') },
    { kind: 'text', prop: 'caption', label: t('components.image.fields.caption') },
    { kind: 'link', prop: 'link', label: t('components.image.fields.link'), optional: true },
    { kind: 'boolean', prop: 'decorative', label: t('components.image.fields.decorative') },
    {
      kind: 'select',
      prop: 'fit',
      label: t('components.image.fields.fit'),
      options: [
        { value: 'cover', label: t('components.image.options.fit.cover') },
        { value: 'contain', label: t('components.image.options.fit.contain') },
      ],
    },
    {
      kind: 'select',
      prop: 'loading',
      label: t('components.image.fields.loading'),
      options: [
        { value: 'lazy', label: t('components.image.options.loading.lazy') },
        { value: 'eager', label: t('components.image.options.loading.eager') },
      ],
    },
  ],
  display: 'block',
  css:
    // min-width:0: as a flex item, an image must not impose its intrinsic width (overflow).
    '.ns-image{display:block;max-width:100%;min-width:0;height:auto}.ns-image-cover{object-fit:cover}' +
    '.ns-image-contain{object-fit:contain}.ns-image-empty{min-height:160px;background-color:#e5e7eb}' +
    '.ns-figure{margin:0}.ns-figure figcaption{margin-top:8px;font-size:.875em;color:#4b5563}.ns-image-link{display:block}',
  viewName: 'Image',
});
