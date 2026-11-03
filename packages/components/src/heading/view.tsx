import type { ReactNode } from 'react';

export type Inline = {
  text: string;
  bold?: boolean | undefined;
  italic?: boolean | undefined;
  color?: string | undefined;
  href?: string | undefined;
};
export type HeadingProps = { level: 1 | 2 | 3 | 4 | 5 | 6; runs: Inline[] };

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

export default function Heading(p: { className: string; props: HeadingProps; children?: ReactNode }) {
  const Tag = `h${p.props.level}` as const;
  return (
    <Tag className={p.className}>
      {p.props.runs.map((run, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: runs have no identity and are rendered statically.
        <Run key={i} run={run} />
      ))}
    </Tag>
  );
}
