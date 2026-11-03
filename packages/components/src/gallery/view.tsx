import type { ReactNode } from 'react';

export type GalleryImage = {
  asset: string;
  src: string;
  full: string;
  width: number;
  height: number;
  alt: string;
  caption: string;
  /** Responsive variants, added by the exported page (astro:assets); absent in the Studio. */
  srcSet?: string;
  sizes?: string;
};
export type GalleryProps = {
  layout: 'masonry' | 'tiles';
  ratio: string;
  lightbox: boolean;
  images: GalleryImage[];
};

export default function Gallery(p: { className: string; props: GalleryProps; children?: ReactNode }) {
  const { layout, ratio, lightbox, images } = p.props;
  if (!images.length)
    return <div aria-hidden="true" className={`ns-gallery ns-gallery-empty ${p.className}`} />;
  return (
    <div
      className={`ns-gallery ns-gallery-${layout} ns-gallery-r-${ratio} ${p.className}`}
      data-ns-gallery={lightbox ? '' : undefined}
    >
      {images.map((im, i) => {
        const img = (
          <img
            src={im.src}
            srcSet={im.srcSet}
            sizes={im.srcSet ? '(max-width: 767px) 100vw, 50vw' : undefined}
            alt={im.alt}
            width={im.width}
            height={im.height}
            loading="lazy"
            decoding="async"
          />
        );
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: the same image may appear twice; order is the identity.
          <figure className="ns-gallery-item" key={i}>
            {lightbox ? (
              <a className="ns-gallery-link" href={im.full}>
                {img}
              </a>
            ) : (
              img
            )}
            {im.caption && <figcaption>{im.caption}</figcaption>}
          </figure>
        );
      })}
    </div>
  );
}
