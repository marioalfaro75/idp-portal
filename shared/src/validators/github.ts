import { z } from 'zod';

export const saveGitHubAppConfigSchema = z.object({
  appId: z.string().min(1, 'App ID is required'),
  installationId: z.string().min(1, 'Installation ID is required'),
  privateKey: z.string().min(1, 'Private key is required'),
});

export const dispatchWorkflowSchema = z.object({
  owner: z.string().min(1),
  repo: z.string().min(1),
  workflowId: z.number().int().positive(),
  ref: z.string().min(1),
  inputs: z.record(z.string(), z.string()).optional(),
});

export const createRepoSchema = z.object({
  name: z.string().min(1).max(100).regex(/^[a-zA-Z0-9._-]+$/, 'Invalid repo name'),
  description: z.string().max(500).optional(),
  isPrivate: z.boolean(),
});
