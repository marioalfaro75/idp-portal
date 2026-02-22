import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts';
import { GoogleAuth } from 'google-auth-library';
import type { AwsCredentials, GcpCredentials, AzureCredentials } from '@idp/shared';

type ValidationResult = { valid: boolean; message: string; accountId: string };

export async function validateAwsCredentials(creds: AwsCredentials): Promise<ValidationResult> {
  try {
    const client = new STSClient({
      region: 'us-east-1',
      credentials: {
        accessKeyId: creds.accessKeyId,
        secretAccessKey: creds.secretAccessKey,
      },
    });
    const identity = await client.send(new GetCallerIdentityCommand({}));
    return {
      valid: true,
      message: `Connected as ${identity.Arn}`,
      accountId: identity.Account ?? '',
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'AWS credential validation failed';
    return { valid: false, message, accountId: '' };
  }
}

export async function validateGcpCredentials(creds: GcpCredentials): Promise<ValidationResult> {
  try {
    const key = JSON.parse(creds.serviceAccountKey);
    const auth = new GoogleAuth({
      credentials: key,
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });
    const client = await auth.getClient();
    await client.getAccessToken();
    return {
      valid: true,
      message: `Connected as ${key.client_email}`,
      accountId: creds.projectId,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'GCP credential validation failed';
    return { valid: false, message, accountId: '' };
  }
}

export async function validateAzureCredentials(creds: AzureCredentials): Promise<ValidationResult> {
  try {
    const tokenUrl = `https://login.microsoftonline.com/${creds.tenantId}/oauth2/v2.0/token`;
    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
      scope: 'https://management.azure.com/.default',
    });
    const res = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    if (!res.ok) {
      const err = await res.json() as { error_description?: string };
      return {
        valid: false,
        message: err.error_description ?? `Azure auth failed (HTTP ${res.status})`,
        accountId: '',
      };
    }
    return {
      valid: true,
      message: `Connected to tenant ${creds.tenantId}`,
      accountId: creds.subscriptionId.slice(0, 8) + '...',
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Azure credential validation failed';
    return { valid: false, message, accountId: '' };
  }
}

export async function validateCredentials(provider: string, credentials: Record<string, unknown>): Promise<ValidationResult> {
  switch (provider) {
    case 'aws': return validateAwsCredentials(credentials as unknown as AwsCredentials);
    case 'gcp': return validateGcpCredentials(credentials as unknown as GcpCredentials);
    case 'azure': return validateAzureCredentials(credentials as unknown as AzureCredentials);
    default: return { valid: false, message: `Unknown provider: ${provider}`, accountId: '' };
  }
}
