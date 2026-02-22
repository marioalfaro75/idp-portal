import { z } from 'zod';

export const updateTemplateTagsSchema = z.object({
  tags: z.array(z.string().min(1).max(50)).max(20),
});
