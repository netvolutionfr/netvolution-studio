import type { ReactNode } from 'react';

export type Inline = {
  text: string;
  bold?: boolean | undefined;
  italic?: boolean | undefined;
  color?: string | undefined;
  href?: string | undefined;
};
export type TextProps = { paragraphs: Inline[][] };

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

const runs = (list: Inline[]) =>
  // biome-ignore lint/suspicious/noArrayIndexKey: runs have no identity and are rendered statically.
  list.map((run, i) => <Run key={i} run={run} />);

/** One paragraph: a <p> (as always); several: a <div> of paragraphs (ADR-0020). */
export default function Text(p: { className: string; props: TextProps; children?: ReactNode }) {
  const [first, ...rest] = p.props.paragraphs;
  if (!rest.length) return <p className={p.className}>{runs(first ?? [])}</p>;
  return (
    <div className={`${p.className} ns-text`}>
      {p.props.paragraphs.map((paragraph, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: paragraphs have no identity and are rendered statically.
        <p key={i}>{runs(paragraph)}</p>
      ))}
    </div>
  );
}
