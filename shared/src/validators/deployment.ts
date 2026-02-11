import { z } from 'zod';

export const createDeploymentSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  templateId: z.string().min(1),
  cloudConnectionId: z.string().min(1),
  variables: z.record(z.string(), z.string()),
});
