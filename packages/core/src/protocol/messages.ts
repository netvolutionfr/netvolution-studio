import { z } from 'zod';
import { nodeIdSchema } from '../document/schema.ts';

/** Shell → canvas. The site is re-validated by the canvas (trust boundary); `pageId` is the page to render. */
export const shellMessageSchema = z.discriminatedUnion('type', [
  z.strictObject({
    type: z.literal('render'),
    doc: z.unknown(),
    pageId: z.string().max(64),
    mediaBase: z
      .string()
      .regex(/^\/media\/(?:[a-z0-9-]+\/)?$/)
      .optional(),
    /** Animations in the canvas (CS-07): off by default (edits do not replay them), on, or reduced motion. */
    motion: z.enum(['off', 'on', 'reduce']).optional(),
  }),
  /** Replays the animations of one element (inspector « Rejouer »). */
  z.strictObject({ type: z.literal('replay'), nodeId: nodeIdSchema, reduce: z.boolean() }),
]);
export type ShellMessage = z.infer<typeof shellMessageSchema>;

export const rectSchema = z.strictObject({
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
});
export type Rect = z.infer<typeof rectSchema>;

/** Canvas → shell, validated by the shell. Rects are relative to the canvas viewport. */
export const canvasMessageSchema = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('ready') }),
  z.strictObject({ type: z.literal('rendered') }),
  z.strictObject({
    type: z.literal('error'),
    diagnostics: z.array(
      z.strictObject({
        code: z.string(),
        message: z.string(),
        path: z.array(z.union([z.string(), z.number()])),
        nodeId: z.string().optional(),
      }),
    ),
  }),
  z.strictObject({ type: z.literal('layout'), rects: z.record(nodeIdSchema, rectSchema) }),
  z.strictObject({
    type: z.literal('pointer'),
    kind: z.enum(['click', 'hover']),
    nodeId: nodeIdSchema.nullable(),
  }),
  /** Editor shortcuts pressed while focus is inside the canvas. */
  z.strictObject({ type: z.literal('key'), key: z.string().max(20), mod: z.boolean(), shift: z.boolean() }),
]);
export type CanvasMessage = z.infer<typeof canvasMessageSchema>;
