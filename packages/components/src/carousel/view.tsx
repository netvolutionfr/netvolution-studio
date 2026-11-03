import type { CSSProperties, ReactNode } from 'react';

export type CarouselImage = {
  asset: string;
  src: string;
  width: number;
  height: number;
  alt: string;
  caption: string;
  /** « 2 of 5 », in the site language. */
  position: string;
  /** Responsive variants, added by the exported page (astro:assets); absent in the Studio. */
  srcSet?: string;
};
export type CarouselProps = {
  label: string;
  /** Generated texts, in the site language. */
  text: { carousel: string; slide: string; prev: string; next: string; pause: string; play: string };
  ratio: string;
  gap: number;
  autoplay: boolean;
  interval: number;
  images: CarouselImage[];
};

export default function Carousel(p: { className: string; props: CarouselProps; children?: ReactNode }) {
  const { label, text, ratio, gap, autoplay, interval, images } = p.props;
  if (!images.length)
    return <div aria-hidden="true" className={`ns-carousel ns-carousel-empty ${p.className}`} />;
  const style = { '--ns-carousel-gap': `${gap}px` } as CSSProperties;
  return (
    <section
      className={`${p.className} ns-carousel ns-carousel-r-${ratio}`}
      aria-roledescription={text.carousel}
      aria-label={label}
      data-ns-carousel=""
      data-autoplay={autoplay ? interval : undefined}
      style={style}
    >
      {/* biome-ignore lint/a11y/noNoninteractiveTabindex: a scrollable region must be reachable by keyboard. */}
      <div className="ns-carousel-track" tabIndex={0}>
        {images.map((im, i) => (
          // biome-ignore lint/a11y/useSemanticElements: a slide is a figure grouped per the APG carousel pattern.
          <figure
            // biome-ignore lint/suspicious/noArrayIndexKey: the same image may appear twice; order is the identity.
            key={i}
            className="ns-carousel-slide"
            role="group"
            aria-roledescription={text.slide}
            aria-label={im.position}
          >
            <img
              src={im.src}
              srcSet={im.srcSet}
              sizes={im.srcSet ? '(max-width: 767px) 100vw, 60vw' : undefined}
              alt={im.alt}
              width={im.width}
              height={im.height}
              loading={i === 0 ? 'eager' : 'lazy'}
              decoding="async"
            />
            {im.caption && <figcaption>{im.caption}</figcaption>}
          </figure>
        ))}
      </div>
      <div className="ns-carousel-controls" hidden>
        <button type="button" className="ns-carousel-prev" aria-label={text.prev}>
          ‹
        </button>
        {autoplay && (
          <button
            type="button"
            className="ns-carousel-pause"
            aria-pressed="false"
            data-pause={text.pause}
            data-play={text.play}
          >
            {text.pause}
          </button>
        )}
        <button type="button" className="ns-carousel-next" aria-label={text.next}>
          ›
        </button>
      </div>
    </section>
  );
}
