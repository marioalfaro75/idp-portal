import { z } from 'zod';

const awsCredentialsSchema = z.object({
  accessKeyId: z.string().min(1),
  secretAccessKey: z.string().min(1),
  region: z.string().min(1),
});

const gcpCredentialsSchema = z.object({
  projectId: z.string().min(1),
  serviceAccountKey: z.string().min(1),
});

const azureCredentialsSchema = z.object({
  subscriptionId: z.string().min(1),
  tenantId: z.string().min(1),
  clientId: z.string().min(1),
  clientSecret: z.string().min(1),
});

export const createCloudConnectionSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  provider: z.enum(['aws', 'gcp', 'azure']),
  credentials: z.union([awsCredentialsSchema, gcpCredentialsSchema, azureCredentialsSchema]),
});

export const updateCloudConnectionSchema = z.object({
  name: z.string().min(2).optional(),
  credentials: z.union([awsCredentialsSchema, gcpCredentialsSchema, azureCredentialsSchema]).optional(),
});
