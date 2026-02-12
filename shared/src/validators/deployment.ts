import { z } from 'zod';

export const createDeploymentSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  templateId: z.string().min(1),
  cloudConnectionId: z.string().min(1),
  variables: z.record(z.string(), z.string()),
  executionMethod: z.enum(['local', 'github']).default('local'),
  githubRepo: z.string().optional(),
  githubWorkflowId: z.string().optional(),
  githubRef: z.string().optional(),
}).refine(
  (data) => data.executionMethod !== 'github' || (data.githubRepo && data.githubWorkflowId),
  { message: 'GitHub repo and workflow are required for GitHub execution', path: ['githubRepo'] },
);
