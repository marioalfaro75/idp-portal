import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

export interface BuildInfo {
  version: string;
  commitHash: string;
  fullCommitHash: string;
  buildTime: string;
}

let cached: BuildInfo | null = null;

export function getBuildInfo(): BuildInfo {
  if (cached) return cached;

  // Try loading BUILD_INFO.json (written by prebuild script or Docker)
  const buildInfoPath = path.join(__dirname, '../../../BUILD_INFO.json');
  try {
    const raw = fs.readFileSync(buildInfoPath, 'utf-8');
    cached = JSON.parse(raw) as BuildInfo;
    return cached;
  } catch {
    // File not found — dev mode fallback
  }

  // Dev fallback: read from git + package.json
  const pkgPath = path.join(__dirname, '../../../package.json');
  let version = '1.0.0';
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    version = pkg.version;
  } catch {
    // ignore
  }

  let commitHash = 'unknown';
  let fullCommitHash = 'unknown';
  try {
    commitHash = execSync('git rev-parse --short HEAD').toString().trim();
    fullCommitHash = execSync('git rev-parse HEAD').toString().trim();
  } catch {
    // git not available
  }

  cached = {
    version,
    commitHash,
    fullCommitHash,
    buildTime: new Date().toISOString(),
  };
  return cached;
}
