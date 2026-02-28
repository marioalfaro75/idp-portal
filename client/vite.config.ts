import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';

const pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../package.json'), 'utf-8'));

let commitHash = 'unknown';
const buildInfoPath = path.resolve(__dirname, '../BUILD_INFO.json');
try {
  const buildInfo = JSON.parse(fs.readFileSync(buildInfoPath, 'utf-8'));
  commitHash = buildInfo.commitHash;
} catch {
  // Dev mode fallback: read from git
  try {
    commitHash = execSync('git rev-parse --short HEAD').toString().trim();
  } catch {
    // git not available
  }
}

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(`${pkg.version}-${commitHash}`),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
