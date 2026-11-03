import { isPicture, linkHref, linkSchema, MEDIA_PATH } from '@ns/core';
import { z } from 'zod';
import { defineComponent } from '../define.ts';

export const image = defineComponent({
  type: 'image',
  version: 1,
  label: 'Image',
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
      message: 'Texte alternatif obligatoire (ou image décorative)',
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
    { kind: 'asset', prop: 'assetId', label: 'Image', accept: ['image', 'svg'] },
    { kind: 'text', prop: 'alt', label: 'Texte alternatif' },
    { kind: 'text', prop: 'caption', label: 'Légende (facultative)' },
    { kind: 'link', prop: 'link', label: 'Lien', optional: true },
    { kind: 'boolean', prop: 'decorative', label: 'Image décorative (ignorée par les lecteurs d’écran)' },
    {
      kind: 'select',
      prop: 'fit',
      label: 'Ajustement',
      options: [
        { value: 'cover', label: 'Remplir (recadrer)' },
        { value: 'contain', label: 'Contenir' },
      ],
    },
    {
      kind: 'select',
      prop: 'loading',
      label: 'Chargement',
      options: [
        { value: 'lazy', label: 'Différé (hors écran)' },
        { value: 'eager', label: 'Immédiat (image principale)' },
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
