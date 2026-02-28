import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { asyncHandler } from '../../utils/async-handler';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { PERMISSIONS } from '@idp/shared';
import { securityScanRequestSchema, securityConfigSchema } from '@idp/shared';
import * as securityService from './security.service';
import * as auditService from '../audit/audit.service';
import {
  checkTrivyAvailable, checkTFLintAvailable, checkConftestAvailable,
  getTrivyBin, getTFLintBin, getConftestBin,
  clearTrivyBinCache, clearTFLintBinCache, clearConftestBinCache,
} from './security-tools';
import * as settingsService from '../settings/settings.service';
import { httpsGet } from '../../utils/http';
import { extractFileFromZip } from '../../utils/zip';
import { spawn } from 'node:child_process';
import { logger } from '../../utils/logger';

const router = Router();

router.use(authenticate);

// --- Scan endpoint ---

router.post('/scan', authorize(PERMISSIONS.DEPLOYMENTS_CREATE), validate(securityScanRequestSchema), asyncHandler(async (req, res) => {
  const { templateId, variables } = req.body;
  const result = await securityService.scanTemplate(templateId, variables);
  await auditService.log({
    action: 'security_scan',
    resource: 'template',
    resourceId: templateId,
    userId: req.user!.sub,
    ipAddress: req.ip,
    details: { passed: result.passed, summary: result.summary },
  });
  res.json(result);
}));

// --- Config endpoints ---

router.get('/config', authorize(PERMISSIONS.PORTAL_ADMIN), asyncHandler(async (_req, res) => {
  const config = await securityService.getConfig();
  res.json(config);
}));

router.put('/config', authorize(PERMISSIONS.PORTAL_ADMIN), validate(securityConfigSchema), asyncHandler(async (req, res) => {
  const config = await securityService.updateConfig(req.body);
  await auditService.log({
    action: 'security_config_update',
    resource: 'settings',
    userId: req.user!.sub,
    ipAddress: req.ip,
    details: req.body,
  });
  res.json(config);
}));

// --- Tool status ---

router.get('/tools/status', authorize(PERMISSIONS.PORTAL_ADMIN), asyncHandler(async (_req, res) => {
  const [trivy, tflint, conftest] = await Promise.all([
    getToolStatus('trivy'),
    getToolStatus('tflint'),
    getToolStatus('conftest'),
  ]);
  res.json([trivy, tflint, conftest]);
}));

async function getToolStatus(name: 'trivy' | 'tflint' | 'conftest') {
  const getBin = { trivy: getTrivyBin, tflint: getTFLintBin, conftest: getConftestBin }[name];
  const checkAvailable = { trivy: checkTrivyAvailable, tflint: checkTFLintAvailable, conftest: checkConftestAvailable }[name];
  const settingKey = `security.${name}.bin`;

  const bin = await getBin();
  const dbValue = await settingsService.get(settingKey);
  let source: 'system-setting' | 'env-var' | 'default' = 'default';
  if (dbValue) source = 'system-setting';
  else if (process.env[`${name.toUpperCase()}_BIN`]) source = 'env-var';

  const status = await checkAvailable();
  return { name, ...status, binaryPath: bin, source };
}

// --- Install endpoints ---

const TOOL_RELEASES: Record<string, {
  version: string;
  urlTemplate: (version: string, platform: string, arch: string) => string;
  format: 'zip' | 'tar.gz';
  binaryName: string;
}> = {
  trivy: {
    version: '0.58.0',
    urlTemplate: (v, p, a) => `https://github.com/aquasecurity/trivy/releases/download/v${v}/trivy_${v}_${p === 'darwin' ? 'macOS' : 'Linux'}-${a === 'arm64' ? 'ARM64' : '64bit'}.tar.gz`,
    format: 'tar.gz',
    binaryName: 'trivy',
  },
  tflint: {
    version: '0.54.0',
    urlTemplate: (v, p, a) => `https://github.com/terraform-linters/tflint/releases/download/v${v}/tflint_${p}_${a}.zip`,
    format: 'zip',
    binaryName: 'tflint',
  },
  conftest: {
    version: '0.56.0',
    urlTemplate: (v, p, a) => `https://github.com/open-policy-agent/conftest/releases/download/v${v}/conftest_${v}_${p === 'darwin' ? 'Darwin' : 'Linux'}_${a === 'arm64' ? 'arm64' : 'x86_64'}.tar.gz`,
    format: 'tar.gz',
    binaryName: 'conftest',
  },
};

for (const tool of ['trivy', 'tflint', 'conftest'] as const) {
  router.post(`/tools/${tool}/install`, authorize(PERMISSIONS.PORTAL_ADMIN), asyncHandler(async (req, res) => {
    const release = TOOL_RELEASES[tool];
    const platform = process.platform === 'darwin' ? 'darwin' : 'linux';
    const arch = process.arch === 'arm64' ? 'arm64' : 'amd64';
    const url = release.urlTemplate(release.version, platform, arch);

    logger.info(`Downloading ${tool} ${release.version} from ${url}`);

    let buffer: Buffer;
    try {
      buffer = await httpsGet(url);
    } catch (err: any) {
      res.status(502).json({ error: { message: `Failed to download ${tool}: ${err.message}` } });
      return;
    }

    const binDir = path.resolve(__dirname, '../../../bin');
    const binPath = path.join(binDir, release.binaryName);

    try {
      fs.mkdirSync(binDir, { recursive: true });

      if (release.format === 'zip') {
        const binary = extractFileFromZip(buffer, release.binaryName);
        fs.writeFileSync(binPath, binary);
      } else {
        // tar.gz — extract using system tar
        const tmpFile = path.join(binDir, `${tool}.tar.gz`);
        fs.writeFileSync(tmpFile, buffer);
        await extractTarGz(tmpFile, binDir);
        try { fs.unlinkSync(tmpFile); } catch { /* ignore */ }
      }

      fs.chmodSync(binPath, 0o755);
    } catch (err: any) {
      res.status(500).json({ error: { message: `Failed to extract ${tool}: ${err.message}` } });
      return;
    }

    const settingKey = `security.${tool}.bin`;
    await settingsService.set(settingKey, binPath);

    const clearCache = { trivy: clearTrivyBinCache, tflint: clearTFLintBinCache, conftest: clearConftestBinCache }[tool];
    clearCache();

    const checkAvailable = { trivy: checkTrivyAvailable, tflint: checkTFLintAvailable, conftest: checkConftestAvailable }[tool];
    const status = await checkAvailable();

    logger.info(`${tool} ${release.version} installed to ${binPath}`);
    await auditService.log({
      action: `${tool}_install`,
      resource: 'settings',
      userId: req.user!.sub,
      ipAddress: req.ip,
      details: { version: release.version, binaryPath: binPath },
    });

    res.json({ name: tool, ...status, binaryPath: binPath, source: 'system-setting' as const });
  }));
}

function extractTarGz(tarPath: string, destDir: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn('tar', ['xzf', tarPath, '-C', destDir]);
    let stderr = '';
    proc.stderr.on('data', (d: Buffer) => { stderr += d.toString(); });
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`tar extraction failed (code ${code}): ${stderr}`));
    });
    proc.on('error', reject);
  });
}

export default router;
