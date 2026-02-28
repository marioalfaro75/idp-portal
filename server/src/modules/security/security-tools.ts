import { spawn } from 'child_process';
import * as settingsService from '../settings/settings.service';
import { logger } from '../../utils/logger';

// --- Shared command runner ---

export function runCommand(
  command: string,
  args: string[],
  cwd: string,
): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    const proc = spawn(command, args, { cwd, env: { ...process.env } });
    proc.stdout.on('data', (d: Buffer) => { stdout += d.toString(); });
    proc.stderr.on('data', (d: Buffer) => { stderr += d.toString(); });
    proc.on('close', (code) => resolve({ code: code || 0, stdout, stderr }));
    proc.on('error', (err) => resolve({ code: 1, stdout, stderr: err.message }));
  });
}

// --- Trivy ---

let trivyCachedBin: string | null = null;
let trivyCacheExpiry = 0;

export async function getTrivyBin(): Promise<string> {
  const now = Date.now();
  if (trivyCachedBin && now < trivyCacheExpiry) return trivyCachedBin;
  const dbValue = await settingsService.get('security.trivy.bin');
  trivyCachedBin = dbValue || process.env.TRIVY_BIN || 'trivy';
  trivyCacheExpiry = now + 10_000;
  return trivyCachedBin;
}

export function clearTrivyBinCache(): void {
  trivyCachedBin = null;
  trivyCacheExpiry = 0;
}

export async function checkTrivyAvailable(): Promise<{ available: boolean; version?: string }> {
  const bin = await getTrivyBin();
  const result = await runCommand(bin, ['--version'], process.cwd());
  if (result.code === 0) {
    const match = result.stdout.match(/Version:\s*([\d.]+)/i) || result.stdout.match(/([\d.]+)/);
    return { available: true, version: match?.[1] };
  }
  return { available: false };
}

// --- TFLint ---

let tflintCachedBin: string | null = null;
let tflintCacheExpiry = 0;

export async function getTFLintBin(): Promise<string> {
  const now = Date.now();
  if (tflintCachedBin && now < tflintCacheExpiry) return tflintCachedBin;
  const dbValue = await settingsService.get('security.tflint.bin');
  tflintCachedBin = dbValue || process.env.TFLINT_BIN || 'tflint';
  tflintCacheExpiry = now + 10_000;
  return tflintCachedBin;
}

export function clearTFLintBinCache(): void {
  tflintCachedBin = null;
  tflintCacheExpiry = 0;
}

export async function checkTFLintAvailable(): Promise<{ available: boolean; version?: string }> {
  const bin = await getTFLintBin();
  const result = await runCommand(bin, ['--version'], process.cwd());
  if (result.code === 0) {
    const match = result.stdout.match(/TFLint version ([\d.]+)/i) || result.stdout.match(/([\d.]+)/);
    return { available: true, version: match?.[1] };
  }
  return { available: false };
}

// --- Conftest ---

let conftestCachedBin: string | null = null;
let conftestCacheExpiry = 0;

export async function getConftestBin(): Promise<string> {
  const now = Date.now();
  if (conftestCachedBin && now < conftestCacheExpiry) return conftestCachedBin;
  const dbValue = await settingsService.get('security.conftest.bin');
  conftestCachedBin = dbValue || process.env.CONFTEST_BIN || 'conftest';
  conftestCacheExpiry = now + 10_000;
  return conftestCachedBin;
}

export function clearConftestBinCache(): void {
  conftestCachedBin = null;
  conftestCacheExpiry = 0;
}

export async function checkConftestAvailable(): Promise<{ available: boolean; version?: string }> {
  const bin = await getConftestBin();
  const result = await runCommand(bin, ['--version'], process.cwd());
  if (result.code === 0) {
    const match = result.stdout.match(/Version:\s*([\d.]+)/i) || result.stdout.match(/([\d.]+)/);
    return { available: true, version: match?.[1] };
  }
  return { available: false };
}

// --- Logging ---

export async function logToolAvailability(): Promise<void> {
  const [trivy, tflint, conftest] = await Promise.all([
    checkTrivyAvailable(),
    checkTFLintAvailable(),
    checkConftestAvailable(),
  ]);

  if (trivy.available) logger.info(`Trivy available: v${trivy.version}`);
  else logger.info('Trivy not found. Security scans will skip Trivy checks.');

  if (tflint.available) logger.info(`TFLint available: v${tflint.version}`);
  else logger.info('TFLint not found. Security scans will skip TFLint checks.');

  if (conftest.available) logger.info(`Conftest available: v${conftest.version}`);
  else logger.info('Conftest not found. Security scans will skip OPA/Conftest checks.');
}
