export type CloudProvider = 'aws' | 'gcp' | 'azure';

export interface CloudConnection {
  id: string;
  name: string;
  provider: CloudProvider;
  status: 'connected' | 'error' | 'pending';
  accountIdentifier: string;
  createdById: string;
  createdBy?: { id: string; displayName: string };
  createdAt: string;
  updatedAt: string;
}

export interface CreateCloudConnectionRequest {
  name: string;
  provider: CloudProvider;
  credentials: AwsCredentials | GcpCredentials | AzureCredentials;
}

export interface UpdateCloudConnectionRequest {
  name?: string;
  credentials?: AwsCredentials | GcpCredentials | AzureCredentials;
}

export interface AwsCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
}

export interface GcpCredentials {
  projectId: string;
  serviceAccountKey: string;
}

export interface AzureCredentials {
  subscriptionId: string;
  tenantId: string;
  clientId: string;
  clientSecret: string;
}
