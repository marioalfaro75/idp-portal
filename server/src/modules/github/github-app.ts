import { Octokit } from '@octokit/rest';
import { createAppAuth } from '@octokit/auth-app';
import * as settingsService from '../settings/settings.service';
import { decrypt } from '../../utils/crypto';
import { AppError } from '../../utils/errors';
import { logger } from '../../utils/logger';

const SETTINGS_KEYS = {
  appId: 'github.app.appId',
  installationId: 'github.app.installationId',
  privateKey: 'github.app.privateKey',
} as const;

const CACHE_TTL_MS = 55 * 60 * 1000; // 55 minutes (tokens last 60)

let cachedOctokit: Octokit | null = null;
let cacheTimestamp = 0;

export interface AppConfig {
  appId: string;
  installationId: string;
  privateKey: string;
}

export async function getAppConfig(): Promise<AppConfig | null> {
  const [appId, installationId, encryptedKey] = await Promise.all([
    settingsService.get(SETTINGS_KEYS.appId),
    settingsService.get(SETTINGS_KEYS.installationId),
    settingsService.get(SETTINGS_KEYS.privateKey),
  ]);

  if (!appId || !installationId || !encryptedKey) return null;

  try {
    const privateKey = decrypt(encryptedKey);
    return { appId, installationId, privateKey };
  } catch (err) {
    logger.error('Failed to decrypt GitHub App private key', { error: (err as Error).message });
    return null;
  }
}

export async function isAppConfigured(): Promise<boolean> {
  const [appId, installationId, encryptedKey] = await Promise.all([
    settingsService.get(SETTINGS_KEYS.appId),
    settingsService.get(SETTINGS_KEYS.installationId),
    settingsService.get(SETTINGS_KEYS.privateKey),
  ]);
  return !!(appId && installationId && encryptedKey);
}

export async function getAppOctokit(): Promise<Octokit> {
  if (cachedOctokit && Date.now() - cacheTimestamp < CACHE_TTL_MS) {
    return cachedOctokit;
  }

  const config = await getAppConfig();
  if (!config) {
    throw new AppError(503, 'GitHub App is not configured. Ask a Portal Admin to set it up in Portal Administration.');
  }

  const octokit = new Octokit({
    authStrategy: createAppAuth,
    auth: {
      appId: config.appId,
      privateKey: config.privateKey,
      installationId: Number(config.installationId),
    },
  });

  cachedOctokit = octokit;
  cacheTimestamp = Date.now();
  return octokit;
}

export async function getInstallationOwner(): Promise<string | null> {
  try {
    const config = await getAppConfig();
    if (!config) return null;

    const octokit = await getAppOctokit();
    const { data } = await octokit.apps.getInstallation({
      installation_id: Number(config.installationId),
    });
    return (data.account as any)?.login || null;
  } catch (err) {
    logger.warn('Failed to get installation owner', { error: (err as Error).message });
    return null;
  }
}

export function invalidateCache(): void {
  cachedOctokit = null;
  cacheTimestamp = 0;
}

export { SETTINGS_KEYS };
