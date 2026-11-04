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
  /** Starts editing a text in place (ADR-0025); the canvas answers `editCommit` or `editCancel`. */
  z.strictObject({ type: z.literal('edit'), nodeId: nodeIdSchema }),
  /** Ends the edit in progress, keeping the text (page, breakpoint or preview change). */
  z.strictObject({ type: z.literal('editEnd') }),
  /** Scrolls the page while something is dragged near the top or bottom of the canvas (lot ED-E). */
  z.strictObject({ type: z.literal('scrollBy'), dy: z.number().min(-200).max(200) }),
  /** Formats the selection of the text being edited (lot ED-B); `value`: a `#rrggbb` color or a link href. */
  z.strictObject({
    type: z.literal('editFormat'),
    command: z.enum(['bold', 'italic', 'unlink', 'removeFormat', 'color', 'link']),
    value: z.string().max(2000).optional(),
  }),
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
    kind: z.enum(['click', 'dblclick', 'hover']),
    nodeId: nodeIdSchema.nullable(),
  }),
  /** Editor shortcuts pressed while focus is inside the canvas. */
  z.strictObject({
    type: z.literal('key'),
    key: z.string().max(20),
    mod: z.boolean(),
    shift: z.boolean(),
    alt: z.boolean().optional(),
  }),
  /** Text edited in place: plain text or rich runs, validated by the command like an inspector input. */
  z.strictObject({ type: z.literal('editCommit'), nodeId: nodeIdSchema, value: z.unknown() }),
  z.strictObject({ type: z.literal('editCancel'), nodeId: nodeIdSchema }),
  /**
   * Element grabbed in the canvas (lot ED-D): the frame keeps the pointer and forwards the gesture,
   * in canvas viewport coordinates; `nodeId` is the pressed node, sent with `start`.
   */
  z.strictObject({
    type: z.literal('drag'),
    phase: z.enum(['start', 'move', 'end', 'cancel']),
    nodeId: nodeIdSchema.optional(),
    x: z.number(),
    y: z.number(),
  }),
]);
export type CanvasMessage = z.infer<typeof canvasMessageSchema>;
