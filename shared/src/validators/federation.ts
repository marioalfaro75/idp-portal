import { z } from 'zod';

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const oidcConfigSchema = z.object({
  issuerUrl: z.string().url(),
  clientId: z.string().min(1),
  clientSecret: z.string().min(1),
  scopes: z.string().optional(),
});

const samlConfigSchema = z.object({
  entryPoint: z.string().url(),
  issuer: z.string().min(1),
  cert: z.string().min(1),
  wantAuthnResponseSigned: z.boolean().optional(),
  signatureAlgorithm: z.string().optional(),
});

export const createFederationProviderSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(50).regex(slugRegex, 'Slug must be lowercase alphanumeric with hyphens'),
  protocol: z.enum(['oidc', 'saml']),
  providerType: z.enum(['azure-ad', 'google', 'okta', 'custom']),
  enabled: z.boolean(),
  autoCreateUsers: z.boolean(),
  defaultRoleId: z.string().uuid(),
  config: z.union([oidcConfigSchema, samlConfigSchema]),
}).refine(
  (data) => {
    if (data.protocol === 'oidc') return oidcConfigSchema.safeParse(data.config).success;
    if (data.protocol === 'saml') return samlConfigSchema.safeParse(data.config).success;
    return false;
  },
  { message: 'Config must match the selected protocol', path: ['config'] },
);

export const updateFederationProviderSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  slug: z.string().min(1).max(50).regex(slugRegex, 'Slug must be lowercase alphanumeric with hyphens').optional(),
  protocol: z.enum(['oidc', 'saml']).optional(),
  providerType: z.enum(['azure-ad', 'google', 'okta', 'custom']).optional(),
  enabled: z.boolean().optional(),
  autoCreateUsers: z.boolean().optional(),
  defaultRoleId: z.string().uuid().optional(),
  config: z.union([oidcConfigSchema, samlConfigSchema]).optional(),
});
