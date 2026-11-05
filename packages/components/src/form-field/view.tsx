import type { ReactNode } from 'react';

export type FormFieldProps = {
  id: string;
  label: string;
  name: string;
  type: 'text' | 'email' | 'tel' | 'textarea' | 'checkbox' | 'select';
  required: boolean;
  placeholder: string;
  options: string[];
  autocomplete: string | undefined;
  /** First line of a list without placeholder. */
  choose: string;
};

/** The label is tied to the control; `required` is announced by the control, the star is visual. */
export default function FormField(p: { className: string; props: FormFieldProps; children?: ReactNode }) {
  const { id, label, name, type, required, placeholder, options, autocomplete, choose } = p.props;
  const text = (
    <label htmlFor={id}>
      {label}
      {required && <span aria-hidden="true"> *</span>}
    </label>
  );
  if (type === 'checkbox')
    return (
      <div className={`ns-field ns-field-checkbox ${p.className}`}>
        <input type="checkbox" id={id} name={name} value="oui" required={required} />
        {text}
      </div>
    );
  const common = { id, name, required, autoComplete: autocomplete };
  return (
    <div className={`ns-field ${p.className}`}>
      {text}
      {type === 'textarea' ? (
        <textarea {...common} rows={5} placeholder={placeholder || undefined} />
      ) : type === 'select' ? (
        <select {...common} defaultValue="">
          <option value="">{placeholder || choose}</option>
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      ) : (
        <input {...common} type={type} placeholder={placeholder || undefined} />
      )}
    </div>
  );
}
