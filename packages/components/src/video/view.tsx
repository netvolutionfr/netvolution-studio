import type { ReactNode } from 'react';

export type VideoProps = { title: string; empty: string; href: string | null; embed: string | null };

/** Façade: a link to the video; the island replaces it with the player on click. */
export default function Video(p: { className: string; props: VideoProps; children?: ReactNode }) {
  const { title, empty, href, embed } = p.props;
  return (
    <div className={`ns-video ${p.className}`} data-ns-video={embed ?? undefined}>
      {href ? (
        <a className="ns-video-link" href={href}>
          <span className="ns-video-play" aria-hidden="true">
            ▶
          </span>
          <span className="ns-video-title">{title}</span>
        </a>
      ) : (
        <p className="ns-video-empty">{empty}</p>
      )}
    </div>
  );
}
