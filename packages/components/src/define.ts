import type { ComponentDefinition, DocNode, RenderContext, ResponsiveStyle } from '@ns/core';
import type { z } from 'zod';

type Props = Record<string, unknown>;

/**
 * Types a definition from its props schema, so defaults, `resolve` and views
 * are checked against it. `viewPropsType` is type-only (never set): it carries
 * the props the view receives.
 */
export const defineComponent = <S extends z.ZodType<Props>, R extends Props = z.infer<S>>(
  def: Omit<ComponentDefinition, 'props' | 'defaults' | 'resolve'> & {
    props: S;
    defaults: { props: z.infer<S>; style?: ResponsiveStyle };
    resolve?: (props: z.infer<S>, ctx: RenderContext, node: DocNode) => R;
  },
) => def as typeof def & ComponentDefinition & { readonly viewPropsType?: R };
