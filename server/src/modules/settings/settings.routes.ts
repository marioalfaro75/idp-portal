import { Router } from 'express';
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import { asyncHandler } from '../../utils/async-handler';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { PERMISSIONS } from '@idp/shared';
import * as settingsService from './settings.service';
import * as auditService from '../audit/audit.service';
import { checkTerraformAvailable, getTerraformBin, clearTerraformBinCache } from '../deployments/terraform-runner';
import { extractFirstFile } from '../../utils/zip';
import { spawn } from 'node:child_process';
import { logger } from '../../utils/logger';

const router = Router();

router.use(authenticate);

// --- Terraform settings endpoints ---

let versionsCache: { versions: string[]; expiry: number } | null = null;

function httpsGet(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const request = (reqUrl: string) => {
      https.get(reqUrl, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          request(res.headers.location);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} from ${reqUrl}`));
          return;
        }
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => resolve(Buffer.concat(chunks)));
        res.on('error', reject);
      }).on('error', reject);
    };
    request(url);
  });
}

function runBinary(command: string, args: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    const proc = spawn(command, args);
    proc.stdout.on('data', (d: Buffer) => { stdout += d.toString(); });
    proc.stderr.on('data', (d: Buffer) => { stderr += d.toString(); });
    proc.on('close', (code) => resolve({ code: code || 0, stdout, stderr }));
    proc.on('error', (err) => resolve({ code: 1, stdout, stderr: err.message }));
  });
}

router.get('/terraform/status', authorize(PERMISSIONS.SETTINGS_MANAGE), asyncHandler(async (_req, res) => {
  const bin = await getTerraformBin();
  const dbValue = await settingsService.get('terraform.bin');
  let source: 'system-setting' | 'env-var' | 'default' = 'default';
  if (dbValue) source = 'system-setting';
  else if (process.env.TERRAFORM_BIN) source = 'env-var';

  const status = await checkTerraformAvailable();
  res.json({ ...status, binaryPath: bin, source });
}));

router.get('/terraform/versions', authorize(PERMISSIONS.SETTINGS_MANAGE), asyncHandler(async (_req, res) => {
  const now = Date.now();
  if (versionsCache && now < versionsCache.expiry) {
    res.json({ versions: versionsCache.versions });
    return;
  }

  const data = await httpsGet('https://releases.hashicorp.com/terraform/index.json');
  const index = JSON.parse(data.toString());
  const allVersions = Object.keys(index.versions || {})
    .filter((v: string) => /^\d+\.\d+\.\d+$/.test(v))
    .sort((a: string, b: string) => {
      const pa = a.split('.').map(Number);
      const pb = b.split('.').map(Number);
      for (let i = 0; i < 3; i++) {
        if (pa[i] !== pb[i]) return pb[i] - pa[i];
      }
      return 0;
    })
    .slice(0, 15);

  versionsCache = { versions: allVersions, expiry: now + 3_600_000 };
  res.json({ versions: allVersions });
}));

router.post('/terraform/install', authorize(PERMISSIONS.SETTINGS_MANAGE), asyncHandler(async (req, res) => {
  const { version } = req.body;
  if (!version || !/^\d+\.\d+\.\d+$/.test(version)) {
    res.status(400).json({ error: { message: 'Invalid version format. Expected x.y.z' } });
    return;
  }

  const platform = process.platform === 'darwin' ? 'darwin' : 'linux';
  const arch = process.arch === 'arm64' ? 'arm64' : 'amd64';
  const url = `https://releases.hashicorp.com/terraform/${version}/terraform_${version}_${platform}_${arch}.zip`;

  logger.info(`Downloading Terraform ${version} from ${url}`);

  let zipBuffer: Buffer;
  try {
    zipBuffer = await httpsGet(url);
  } catch (err: any) {
    res.status(502).json({ error: { message: `Failed to download Terraform: ${err.message}` } });
    return;
  }

  let binary: Buffer;
  try {
    binary = extractFirstFile(zipBuffer);
  } catch (err: any) {
    res.status(500).json({ error: { message: `Failed to extract ZIP: ${err.message}` } });
    return;
  }

  const binDir = path.resolve(__dirname, '../../../bin');
  const binPath = path.join(binDir, 'terraform');

  try {
    fs.mkdirSync(binDir, { recursive: true });
    fs.writeFileSync(binPath, binary);
    fs.chmodSync(binPath, 0o755);
  } catch (err: any) {
    res.status(500).json({ error: { message: `Failed to write binary: ${err.message}` } });
    return;
  }

  await settingsService.set('terraform.bin', binPath);
  clearTerraformBinCache();

  const status = await checkTerraformAvailable();
  logger.info(`Terraform ${version} installed to ${binPath}`);
  await auditService.log({ action: 'terraform_install', resource: 'settings', userId: req.user!.sub, ipAddress: req.ip, details: { version, binaryPath: binPath } });
  res.json({ ...status, binaryPath: binPath, source: 'system-setting' as const });
}));

router.put('/terraform/path', authorize(PERMISSIONS.SETTINGS_MANAGE), asyncHandler(async (req, res) => {
  const { path: binPath } = req.body;
  if (!binPath || typeof binPath !== 'string') {
    res.status(400).json({ error: { message: 'Path is required' } });
    return;
  }

  const result = await runBinary(binPath.trim(), ['--version']);
  if (result.code !== 0) {
    res.status(400).json({ error: { message: `Binary at "${binPath}" is not a valid Terraform executable: ${result.stderr}` } });
    return;
  }

  const match = result.stdout.match(/Terraform v([\d.]+)/);
  await settingsService.set('terraform.bin', binPath.trim());
  clearTerraformBinCache();

  await auditService.log({ action: 'terraform_path', resource: 'settings', userId: req.user!.sub, ipAddress: req.ip, details: { binaryPath: binPath.trim(), version: match?.[1] } });
  res.json({
    available: true,
    version: match?.[1],
    binaryPath: binPath.trim(),
    source: 'system-setting' as const,
  });
}));

// --- General settings endpoints ---

const PORTAL_ADMIN_KEY_PREFIXES = ['github.'];

function isPortalAdminKey(key: string): boolean {
  return PORTAL_ADMIN_KEY_PREFIXES.some((prefix) => key.startsWith(prefix));
}

function hasPortalAdmin(req: import('express').Request): boolean {
  return req.user?.permissions?.includes(PERMISSIONS.PORTAL_ADMIN) ?? false;
}

router.get('/', authorize(PERMISSIONS.SETTINGS_MANAGE), asyncHandler(async (req, res) => {
  const settings = await settingsService.getAll();
  if (!hasPortalAdmin(req)) {
    const filtered: Record<string, string> = {};
    for (const [key, value] of Object.entries(settings)) {
      if (!isPortalAdminKey(key)) filtered[key] = value;
    }
    res.json(filtered);
    return;
  }
  res.json(settings);
}));

router.put('/:key', authorize(PERMISSIONS.SETTINGS_MANAGE), asyncHandler(async (req, res) => {
  if (isPortalAdminKey(req.params.key) && !hasPortalAdmin(req)) {
    res.status(403).json({ error: { message: 'Portal Admin permission required' } });
    return;
  }
  await settingsService.set(req.params.key, req.body.value);
  await auditService.log({ action: 'update', resource: 'settings', userId: req.user!.sub, ipAddress: req.ip, details: { key: req.params.key } });
  res.json({ key: req.params.key, value: req.body.value });
}));

router.delete('/:key', authorize(PERMISSIONS.SETTINGS_MANAGE), asyncHandler(async (req, res) => {
  if (isPortalAdminKey(req.params.key) && !hasPortalAdmin(req)) {
    res.status(403).json({ error: { message: 'Portal Admin permission required' } });
    return;
  }
  await settingsService.del(req.params.key);
  await auditService.log({ action: 'delete', resource: 'settings', userId: req.user!.sub, ipAddress: req.ip, details: { key: req.params.key } });
  res.status(204).end();
}));

export default router;
