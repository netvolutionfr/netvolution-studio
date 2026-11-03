import { z } from 'zod';

/** Site, page, layout, menu and project-local ids. */
export const entityIdSchema = z.string().regex(/^[a-z0-9][a-z0-9-]{0,63}$/);
