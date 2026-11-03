import { type ReactNode, useEffect, useId, useState } from 'react';
import { useStore } from './store.ts';

/** Opens a transaction on the first edit; `end` records it as one undo step. */
export function useTransaction(label: string) {
  const store = useStore();
  return {
    edit: () => {
      if (!store.getState().transaction) store.begin(label);
    },
    end: () => store.commit(),
  };
}

/**
 * Inspector row: label column + control (dense), or stacked for wide
 * controls. `state` shows whether a style value is set on this breakpoint
 * (dot, with a text alternative) and `action` hosts e.g. a reset button.
 */
export function Field(props: {
  label: string;
  htmlFor?: string;
  stack?: boolean;
  state?: 'own' | 'inherited' | undefined;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={props.stack ? 'field field-stack' : 'field'}>
      <span className="field-label">
        {props.state && (
          <span
            role="img"
            className={`state-dot state-${props.state}`}
            aria-label={props.state === 'own' ? 'Défini sur ce breakpoint' : 'Valeur héritée'}
            title={props.state === 'own' ? 'Défini sur ce breakpoint' : 'Valeur héritée'}
          />
        )}
        {props.htmlFor ? <label htmlFor={props.htmlFor}>{props.label}</label> : <span>{props.label}</span>}
      </span>
      <div className="field-control">
        {props.children}
        {props.action}
      </div>
    </div>
  );
}

/**
 * Text input with a local draft: an invalid value is flagged and never reaches
 * the document; the field resynchronizes on blur.
 */
export function TextField(props: {
  label: string;
  value: string;
  multiline?: boolean;
  onChange: (v: string) => { ok: boolean };
}) {
  const id = useId();
  const tx = useTransaction(props.label);
  const [draft, setDraft] = useState(props.value);
  const [invalid, setInvalid] = useState(false);
  useEffect(() => setDraft(props.value), [props.value]);
  const end = () => {
    tx.end();
    setDraft(props.value);
    setInvalid(false);
  };
  const common = {
    id,
    value: draft,
    'aria-invalid': invalid,
    'aria-describedby': invalid ? `${id}-error` : undefined,
    onBlur: end,
    onChange: (e: { target: { value: string } }) => {
      tx.edit();
      setDraft(e.target.value);
      setInvalid(!props.onChange(e.target.value).ok);
    },
  };
  return (
    <Field label={props.label} htmlFor={id} stack>
      {props.multiline ? (
        <textarea {...common} rows={3} />
      ) : (
        <input {...common} onKeyDown={(e) => e.key === 'Enter' && end()} />
      )}
      {invalid && (
        <span id={`${id}-error`} className="field-error">
          Valeur refusée, le document n'est pas modifié.
        </span>
      )}
    </Field>
  );
}
