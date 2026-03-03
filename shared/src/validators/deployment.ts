import { z } from 'zod';

export const createDeploymentSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name must be at most 100 characters').regex(/^[\w\s\-_.()]+$/, 'Name contains invalid characters'),
  templateId: z.string().min(1),
  cloudConnectionId: z.string().min(1),
  variables: z.record(z.string().max(100), z.string().max(10_000))
    .refine(v => Object.keys(v).length <= 100, { message: 'Too many variables (max 100)' }),
  scanOutput: z.string().optional(),
  executionMethod: z.enum(['local', 'github']).default('local'),
  githubRepo: z.string().optional(),
  githubWorkflowId: z.string().optional(),
  githubRef: z.string().optional(),
}).refine(
  (data) => data.executionMethod !== 'github' || (data.githubRepo && data.githubWorkflowId),
  { message: 'GitHub repo and workflow are required for GitHub execution', path: ['githubRepo'] },
);
