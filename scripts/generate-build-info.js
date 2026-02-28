#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const outPath = path.join(__dirname, '..', 'BUILD_INFO.json');

// Skip if file already exists (e.g. written by Docker build)
if (fs.existsSync(outPath)) {
  console.log('BUILD_INFO.json already exists, skipping.');
  process.exit(0);
}

const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf-8'));

let commitHash = 'unknown';
let fullCommitHash = 'unknown';
try {
  commitHash = execSync('git rev-parse --short HEAD').toString().trim();
  fullCommitHash = execSync('git rev-parse HEAD').toString().trim();
} catch {
  console.warn('git not available, using "unknown" commit hash.');
}

const buildInfo = {
  version: pkg.version,
  commitHash,
  fullCommitHash,
  buildTime: new Date().toISOString(),
};

fs.writeFileSync(outPath, JSON.stringify(buildInfo, null, 2) + '\n');
console.log(`BUILD_INFO.json generated: ${buildInfo.version}-${buildInfo.commitHash}`);
