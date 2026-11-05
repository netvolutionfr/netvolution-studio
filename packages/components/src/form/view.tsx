import type { ReactNode } from 'react';

export type FormProps = { action: string; submitLabel: string; hidden: { name: string; value: string }[] };

/** A native form: it works without JavaScript; the destination decides the page shown after sending. */
export default function Form(p: { className: string; props: FormProps; children?: ReactNode }) {
  return (
    <form className={`ns-form ${p.className}`} method="post" action={p.props.action || undefined}>
      {p.props.hidden.map((h) => (
        <input key={h.name} type="hidden" name={h.name} value={h.value} />
      ))}
      {p.children}
      <button type="submit" className="ns-form-submit">
        {p.props.submitLabel}
      </button>
    </form>
  );
}
