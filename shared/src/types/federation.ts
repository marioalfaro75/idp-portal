export type FederationProtocol = 'oidc' | 'saml';
export type FederationProviderType = 'azure-ad' | 'google' | 'okta' | 'custom';

export interface OidcConfig {
  issuerUrl: string;
  clientId: string;
  clientSecret: string;
  scopes?: string;
}

export interface SamlConfig {
  entryPoint: string;
  issuer: string;
  cert: string;
  wantAuthnResponseSigned?: boolean;
  signatureAlgorithm?: string;
}

export type FederationConfig = OidcConfig | SamlConfig;

/** Public shape returned to unauthenticated users (login page) */
export interface FederationProviderPublic {
  slug: string;
  name: string;
  protocol: FederationProtocol;
  providerType: FederationProviderType;
}

/** Admin shape (no decrypted secrets) */
export interface FederationProviderAdmin {
  id: string;
  name: string;
  slug: string;
  protocol: FederationProtocol;
  providerType: FederationProviderType;
  enabled: boolean;
  autoCreateUsers: boolean;
  defaultRoleId: string;
  defaultRoleName: string;
  createdAt: string;
  updatedAt: string;
}

/** Admin shape with decrypted config for editing */
export interface FederationProviderDetail extends FederationProviderAdmin {
  config: FederationConfig;
}

export interface CreateFederationProviderRequest {
  name: string;
  slug: string;
  protocol: FederationProtocol;
  providerType: FederationProviderType;
  enabled: boolean;
  autoCreateUsers: boolean;
  defaultRoleId: string;
  config: FederationConfig;
}

export interface UpdateFederationProviderRequest {
  name?: string;
  slug?: string;
  protocol?: FederationProtocol;
  providerType?: FederationProviderType;
  enabled?: boolean;
  autoCreateUsers?: boolean;
  defaultRoleId?: string;
  config?: FederationConfig;
}
