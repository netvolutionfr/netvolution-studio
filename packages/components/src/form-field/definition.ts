import { type MessageKey, t } from '@ns/core';
import { z } from 'zod';
import { defineComponent } from '../define.ts';
import { siteText } from '../rich.ts';

/** Name sent to the form's destination. */
export const fieldNameSchema = z
  .string()
  .regex(/^[a-zA-Z][a-zA-Z0-9_-]{0,63}$/, 'schema.fieldName' satisfies MessageKey);

const TYPES = ['text', 'email', 'tel', 'textarea', 'checkbox', 'select'] as const;
/** Browser autofill from the type, or from usual names. */
const autocomplete = (type: string, name: string) =>
  type === 'email'
    ? 'email'
    : type === 'tel'
      ? 'tel'
      : /^(nom|name|fullname)$/i.test(name)
        ? 'name'
        : undefined;

/** A field of a Form (ADR-0026): its label and a native control, validated by the browser. */
export const formField = defineComponent({
  type: 'form-field',
  version: 1,
  label: t('components.formField.name'),
  category: 'content',
  props: z.strictObject({
    label: z.string().min(1).max(200),
    name: fieldNameSchema,
    type: z.enum(TYPES),
    required: z.boolean(),
    /** '' = none; not shown by check boxes and lists. */
    placeholder: z.string().max(200),
    /** Choices of a list (`select`); the check before export requires at least one. */
    options: z.array(z.string().min(1).max(200)).max(30),
  }),
  defaults: {
    props: {
      label: 'content.form.name',
      name: 'content.form.nameField',
      type: 'text',
      required: false,
      placeholder: '',
      options: [],
    },
  },
  resolve: (props, ctx, node) => ({
    ...props,
    id: `ns-${node.id}-input`,
    autocomplete: autocomplete(props.type, props.name),
    // First line of a list without placeholder, in the site's language (ADR-0024).
    choose: siteText(ctx)('content.form.choose'),
  }),
  children: 'none',
  styleGroups: ['spacing', 'size', 'item', 'typography', 'visibility', 'position', 'effects'],
  fields: [
    { kind: 'text', prop: 'label', label: t('components.formField.fields.label') },
    {
      kind: 'select',
      prop: 'type',
      label: t('components.formField.fields.type'),
      options: TYPES.map((value) => ({ value, label: t(`components.formField.options.type.${value}`) })),
    },
    {
      kind: 'text',
      prop: 'name',
      label: t('components.formField.fields.name'),
      follows: 'label',
      hint: t('components.formField.hints.name'),
    },
    { kind: 'boolean', prop: 'required', label: t('components.formField.fields.required') },
    { kind: 'text', prop: 'placeholder', label: t('components.formField.fields.placeholder') },
    {
      kind: 'stringList',
      prop: 'options',
      label: t('components.formField.fields.options'),
      when: { prop: 'type', equals: 'select' },
    },
  ],
  inline: { prop: 'label', selector: '.ns-{id} > label' },
  display: 'flex',
  css:
    '.ns-field{display:flex;flex-direction:column;gap:6px}' +
    '.ns-field>input,.ns-field>textarea,.ns-field>select{font:inherit;color:inherit;padding:10px 12px;' +
    'border:1px solid #9aa1ad;border-radius:6px;background-color:#ffffff}' +
    '.ns-field-checkbox{flex-direction:row;align-items:flex-start;gap:8px}' +
    '.ns-field-checkbox>input{margin-top:.25em}',
  viewName: 'FormField',
});
