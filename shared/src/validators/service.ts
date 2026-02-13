import { z } from 'zod';

export const createServiceSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .regex(/^[a-zA-Z0-9 -]+$/, 'Name can only contain letters, numbers, spaces, and hyphens'),
  templateId: z.string().min(1, 'Template is required'),
  parameters: z.record(z.string()).default({}),
});

export const triggerWorkflowSchema = z.object({
  workflowName: z.string().optional(),
});
