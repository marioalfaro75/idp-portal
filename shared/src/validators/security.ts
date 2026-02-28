import { z } from 'zod';

export const securityScanRequestSchema = z.object({
  templateId: z.string().min(1),
  variables: z.record(z.string(), z.string()).optional(),
});

export const securityConfigSchema = z.object({
  enabled: z.boolean().optional(),
  enforcement: z.enum(['blocking', 'advisory']).optional(),
  severityThreshold: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO']).optional(),
  opaPolicy: z.string().optional(),
});
