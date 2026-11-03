import type { ReactNode } from 'react';

export type Inline = {
  text: string;
  bold?: boolean | undefined;
  italic?: boolean | undefined;
  color?: string | undefined;
  href?: string | undefined;
};
export type ListProps = { ordered: boolean; marker: string; items: Inline[][] };

/** Line breaks are `\n` in the text: rendered as <br>. */
function Lines({ text }: { text: string }) {
  // biome-ignore lint/suspicious/noArrayIndexKey: static lines of a text.
  return text.split('\n').flatMap((line, i) => (i > 0 ? [<br key={i} />, line] : [line]));
}

function Run({ run }: { run: Inline }) {
  let node: ReactNode = <Lines text={run.text} />;
  if (run.bold) node = <strong>{node}</strong>;
  if (run.italic) node = <em>{node}</em>;
  // A validated hex color (ADR-0020), never free CSS.
  if (run.color) node = <span style={{ color: run.color }}>{node}</span>;
  if (run.href !== undefined) node = <a href={run.href}>{node}</a>;
  return node;
}

export default function List(p: { className: string; props: ListProps; children?: ReactNode }) {
  const Tag = p.props.ordered ? 'ol' : 'ul';
  return (
    // Safari drops the list semantics of `list-style: none`: role="list" restores them.
    <Tag
      className={`${p.className} ns-list ns-list-${p.props.marker}`}
      role={p.props.marker === 'none' ? 'list' : undefined}
    >
      {p.props.items.map((runs, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: items have no identity and are rendered statically.
        <li key={i}>
          {runs.map((run, j) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: runs have no identity and are rendered statically.
            <Run key={j} run={run} />
          ))}
        </li>
      ))}
    </Tag>
  );
}
