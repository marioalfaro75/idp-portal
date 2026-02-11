import { z } from 'zod';

export const createGitHubConnectionSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

export const dispatchWorkflowSchema = z.object({
  owner: z.string().min(1),
  repo: z.string().min(1),
  workflowId: z.number().int().positive(),
  ref: z.string().min(1),
  inputs: z.record(z.string(), z.string()).optional(),
});
