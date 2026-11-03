import type { CSSProperties, ReactNode } from 'react';

export type Inline = {
  text: string;
  bold?: boolean | undefined;
  italic?: boolean | undefined;
  color?: string | undefined;
  href?: string | undefined;
};
export type MarqueeImage = {
  asset: string;
  src: string;
  width: number;
  height: number;
  alt: string;
  srcSet?: string;
};
export type MarqueeProps = {
  /** Labels of the pause button, in the site language. */
  text: { pause: string; resume: string };
  mode: 'texts' | 'images';
  texts: Inline[][];
  separator: string;
  images: MarqueeImage[];
  height: number;
  gap: number;
  duration: number;
  direction: 'left' | 'right';
};

function Run({ run }: { run: Inline }) {
  let node: ReactNode = run.text;
  if (run.bold) node = <strong>{node}</strong>;
  if (run.italic) node = <em>{node}</em>;
  // A validated hex color (ADR-0020), never free CSS.
  if (run.color) node = <span style={{ color: run.color }}>{node}</span>;
  if (run.href !== undefined) node = <a href={run.href}>{node}</a>;
  return node;
}

export default function Marquee(p: { className: string; props: MarqueeProps; children?: ReactNode }) {
  const { mode, text, texts, separator, images, height, gap, duration, direction } = p.props;
  // Validated numbers only, as CSS variables of the component's stylesheet.
  const style = {
    '--ns-marquee-duration': `${duration}s`,
    '--ns-marquee-gap': `${gap}px`,
    '--ns-marquee-height': `${height}px`,
  } as CSSProperties;
  const items = (copy: boolean) =>
    mode === 'images'
      ? images.map((im, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static items in order.
          <li key={i}>
            <img
              src={im.src}
              srcSet={im.srcSet}
              sizes={im.srcSet ? `${Math.ceil((height * im.width) / im.height)}px` : undefined}
              alt={copy ? '' : im.alt}
              width={im.width}
              height={im.height}
              loading="lazy"
              decoding="async"
            />
          </li>
        ))
      : texts.map((runs, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static items in order.
          <li key={i}>
            <span>
              {runs.map((run, j) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: runs have no identity.
                <Run key={j} run={run} />
              ))}
            </span>
            {separator && <span aria-hidden="true">{separator}</span>}
          </li>
        ));
  return (
    <div className={`${p.className} ns-marquee ns-marquee-${direction}`} data-ns-marquee="" style={style}>
      <button
        type="button"
        className="ns-marquee-toggle"
        aria-pressed="false"
        data-pause={text.pause}
        data-resume={text.resume}
        hidden
      >
        {text.pause}
      </button>
      <div className="ns-marquee-track">
        <ul className="ns-marquee-group">{items(false)}</ul>
        <ul className="ns-marquee-group" aria-hidden="true">
          {items(true)}
        </ul>
      </div>
    </div>
  );
}
