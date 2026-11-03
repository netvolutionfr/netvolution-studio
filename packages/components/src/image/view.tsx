import type { ReactNode } from 'react';

export type ImageProps = {
  src: string | null;
  alt: string;
  width: number | null;
  height: number | null;
  fit: 'cover' | 'contain';
  loading: 'lazy' | 'eager';
  /** Responsive variants, added by the exported page (astro:assets); absent in the Studio. */
  srcSet?: string;
  sizes?: string;
  href: string | null;
  caption: string;
};

export default function Image(p: { className: string; props: ImageProps; children?: ReactNode }) {
  const { src, alt, width, height, fit, loading, srcSet, sizes, href, caption } = p.props;
  if (!src) return <div aria-hidden="true" className={`ns-image ns-image-empty ${p.className}`} />;
  const img = (
    <img
      className={`ns-image ns-image-${fit} ${p.className}`}
      src={src}
      srcSet={srcSet}
      sizes={sizes}
      alt={alt}
      width={width ?? undefined}
      height={height ?? undefined}
      loading={loading}
      fetchPriority={loading === 'eager' ? 'high' : undefined}
      decoding="async"
    />
  );
  const linked = href ? (
    <a className="ns-image-link" href={href}>
      {img}
    </a>
  ) : (
    img
  );
  if (!caption) return linked;
  return (
    <figure className="ns-figure">
      {linked}
      <figcaption>{caption}</figcaption>
    </figure>
  );
}
