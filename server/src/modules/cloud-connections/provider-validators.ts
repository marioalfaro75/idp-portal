import type { AwsCredentials, GcpCredentials, AzureCredentials } from '@idp/shared';

export async function validateAwsCredentials(creds: AwsCredentials): Promise<{ valid: boolean; message: string; accountId: string }> {
  // In production, you'd use AWS SDK: new STSClient({}).send(new GetCallerIdentityCommand({}))
  // For now, validate format
  if (!creds.accessKeyId.match(/^AK[A-Z0-9]{18,}$/i)) {
    return { valid: false, message: 'Invalid AWS Access Key ID format', accountId: '' };
  }
  return { valid: true, message: 'AWS credentials validated (format check)', accountId: creds.accessKeyId.slice(0, 8) + '...' };
}

export async function validateGcpCredentials(creds: GcpCredentials): Promise<{ valid: boolean; message: string; accountId: string }> {
  try {
    // Validate service account key is valid JSON
    JSON.parse(creds.serviceAccountKey);
    return { valid: true, message: 'GCP credentials validated (format check)', accountId: creds.projectId };
  } catch {
    return { valid: false, message: 'Invalid service account key JSON', accountId: '' };
  }
}

export async function validateAzureCredentials(creds: AzureCredentials): Promise<{ valid: boolean; message: string; accountId: string }> {
  // Validate UUID format for subscription ID
  if (!creds.subscriptionId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
    return { valid: false, message: 'Invalid Azure Subscription ID format', accountId: '' };
  }
  return { valid: true, message: 'Azure credentials validated (format check)', accountId: creds.subscriptionId.slice(0, 8) + '...' };
}

export async function validateCredentials(provider: string, credentials: Record<string, unknown>): Promise<{ valid: boolean; message: string; accountId: string }> {
  switch (provider) {
    case 'aws': return validateAwsCredentials(credentials as unknown as AwsCredentials);
    case 'gcp': return validateGcpCredentials(credentials as unknown as GcpCredentials);
    case 'azure': return validateAzureCredentials(credentials as unknown as AzureCredentials);
    default: return { valid: false, message: `Unknown provider: ${provider}`, accountId: '' };
  }
}
