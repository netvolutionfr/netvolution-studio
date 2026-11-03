import { type MessageKey, t } from '@ns/core';
import { z } from 'zod';
import { defineComponent } from '../define.ts';
import { siteText } from '../rich.ts';

const YOUTUBE =
  /^https:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})(?:[&?#][^\s<>"]*)?$/;
const VIMEO = /^https:\/\/(?:www\.)?vimeo\.com\/(\d{1,12})(?:[/?#][^\s<>"]*)?$/;

/** Provider and id of a whitelisted video URL; the embed URL is built here, never taken from the document. */
function source(url: string) {
  const yt = YOUTUBE.exec(url)?.[1];
  if (yt)
    return {
      href: `https://www.youtube.com/watch?v=${yt}`,
      embed: `https://www.youtube-nocookie.com/embed/${yt}?autoplay=1`,
    };
  const vimeo = VIMEO.exec(url)?.[1];
  if (vimeo)
    return {
      href: `https://vimeo.com/${vimeo}`,
      embed: `https://player.vimeo.com/video/${vimeo}?autoplay=1&dnt=1`,
    };
  return null;
}

/**
 * Embedded video (SB-07): YouTube or Vimeo behind a façade. Nothing is loaded from the provider
 * until a click; the island then swaps in the player. Without JavaScript the façade is a link to
 * the video page.
 */
export const video = defineComponent({
  type: 'video',
  version: 1,
  label: t('components.video.name'),
  category: 'media',
  props: z.strictObject({
    url: z.string().refine((u) => u === '' || source(u) !== null, 'schema.videoUrl' satisfies MessageKey),
    title: z.string().min(1).max(200),
  }),
  defaults: { props: { url: '', title: 'content.video.title' } },
  resolve: (props, ctx) => ({
    title: props.title,
    empty: siteText(ctx)('content.video.empty', { title: props.title }),
    ...(source(props.url) ?? { href: null, embed: null }),
  }),
  children: 'none',
  styleGroups: ['spacing', 'size', 'item', 'visibility', 'position', 'effects'],
  fields: [
    { kind: 'text', prop: 'url', label: t('components.video.fields.url') },
    { kind: 'text', prop: 'title', label: t('components.video.fields.title') },
  ],
  display: 'block',
  island: true,
  css:
    '.ns-video{position:relative;aspect-ratio:16/9;background:#111827;color:#fff;border-radius:8px;overflow:hidden}' +
    '.ns-video-link,.ns-video-empty{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;' +
    'justify-content:center;gap:12px;color:inherit;text-decoration:none;padding:16px;text-align:center}' +
    '.ns-video-play{display:grid;place-items:center;width:64px;height:64px;border-radius:50%;background:rgba(255,255,255,.18);font-size:24px}' +
    '.ns-video-link:hover .ns-video-play,.ns-video-link:focus-visible .ns-video-play{background:rgba(255,255,255,.32)}' +
    '.ns-video iframe{position:absolute;inset:0;width:100%;height:100%;border:0}',
  viewName: 'Video',
});
