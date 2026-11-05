import { type MessageKey, t } from '@ns/core';
import { z } from 'zod';
import { defineComponent } from '../define.ts';
import { fieldNameSchema } from '../form-field/definition.ts';

/**
 * Contact form (ADR-0026): a native `<form method="post">` sent to an address chosen by the user (a
 * form service, or the host's or agency's script). No JavaScript; the destination handles the data.
 * The address and the hidden fields are public, in the page's code.
 */
export const form = defineComponent({
  type: 'form',
  version: 1,
  label: t('components.form.name'),
  category: 'content',
  props: z.strictObject({
    /** Empty until set: the check before export blocks it (`form-no-action`). HTTPS only. */
    action: z.union([
      z.literal(''),
      z
        .string()
        .max(2000)
        .regex(/^https:\/\/[^\s<>"'`]+$/, 'schema.formAction' satisfies MessageKey),
    ]),
    submitLabel: z.string().min(1).max(60),
    /** Fields some services require (access key, subject, redirection), sent as they are. */
    hidden: z.array(z.strictObject({ name: fieldNameSchema, value: z.string().max(500) })).max(10),
  }),
  defaults: {
    props: { action: '', submitLabel: 'content.form.submit', hidden: [] },
    style: { base: { gap: { value: 16, unit: 'px' } } },
  },
  children: ['form-field', 'text', 'heading', 'stack', 'grid'],
  styleGroups: [
    'spacing',
    'size',
    'flex',
    'item',
    'typography',
    'background',
    'visibility',
    'position',
    'effects',
  ],
  fields: [
    {
      kind: 'text',
      prop: 'action',
      label: t('components.form.fields.action'),
      hint: t('components.form.hints.action'),
    },
    { kind: 'text', prop: 'submitLabel', label: t('components.form.fields.submitLabel') },
    {
      kind: 'keyValues',
      prop: 'hidden',
      label: t('components.form.fields.hidden'),
      hint: t('components.form.hints.hidden'),
    },
  ],
  inline: { prop: 'submitLabel', selector: '.ns-{id} > .ns-form-submit' },
  display: 'flex',
  // The submit button looks like a primary Button, without depending on its CSS being emitted.
  css:
    '.ns-form{display:flex;flex-direction:column}' +
    '.ns-form-submit{align-self:start;padding:12px 20px;border:2px solid transparent;border-radius:8px;' +
    'background-color:#3b5bdb;color:#ffffff;font:inherit;font-weight:600;line-height:1.2;cursor:pointer}',
  viewName: 'Form',
});
