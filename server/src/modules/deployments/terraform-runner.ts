import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { logger } from '../../utils/logger';

export interface TerraformResult {
  success: boolean;
  output: string;
  outputs?: Record<string, string>;
}

type LogCallback = (message: string) => void;

function runCommand(command: string, args: string[], cwd: string, env: Record<string, string>, onLog?: LogCallback): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    const proc = spawn(command, args, {
      cwd,
      env: { ...process.env, ...env, TF_IN_AUTOMATION: 'true' },
    });

    proc.stdout.on('data', (data) => {
      const text = data.toString();
      stdout += text;
      onLog?.(text);
    });

    proc.stderr.on('data', (data) => {
      const text = data.toString();
      stderr += text;
      onLog?.(text);
    });

    proc.on('close', (code) => {
      resolve({ code: code || 0, stdout, stderr });
    });

    proc.on('error', (err) => {
      resolve({ code: 1, stdout, stderr: err.message });
    });
  });
}

function buildEnvVars(provider: string, credentials: Record<string, unknown>): Record<string, string> {
  switch (provider) {
    case 'aws':
      return {
        AWS_ACCESS_KEY_ID: credentials.accessKeyId as string,
        AWS_SECRET_ACCESS_KEY: credentials.secretAccessKey as string,
        AWS_DEFAULT_REGION: credentials.region as string,
      };
    case 'gcp':
      return {
        GOOGLE_PROJECT: credentials.projectId as string,
        GOOGLE_CREDENTIALS: credentials.serviceAccountKey as string,
      };
    case 'azure':
      return {
        ARM_SUBSCRIPTION_ID: credentials.subscriptionId as string,
        ARM_TENANT_ID: credentials.tenantId as string,
        ARM_CLIENT_ID: credentials.clientId as string,
        ARM_CLIENT_SECRET: credentials.clientSecret as string,
      };
    default:
      return {};
  }
}

export async function plan(
  templatePath: string,
  variables: Record<string, string>,
  provider: string,
  credentials: Record<string, unknown>,
  onLog?: LogCallback,
): Promise<TerraformResult> {
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'idp-tf-'));
  const absTemplatePath = path.resolve(templatePath);

  // Copy template files to work directory
  const files = fs.readdirSync(absTemplatePath);
  for (const file of files) {
    fs.copyFileSync(path.join(absTemplatePath, file), path.join(workDir, file));
  }

  // Write tfvars
  const tfvars = Object.entries(variables)
    .map(([k, v]) => `${k} = "${v.replace(/"/g, '\\"')}"`)
    .join('\n');
  fs.writeFileSync(path.join(workDir, 'terraform.tfvars'), tfvars);

  const env = buildEnvVars(provider, credentials);

  // Init
  onLog?.('Running terraform init...\n');
  const initResult = await runCommand('terraform', ['init', '-no-color'], workDir, env, onLog);
  if (initResult.code !== 0) {
    cleanup(workDir);
    return { success: false, output: initResult.stdout + '\n' + initResult.stderr };
  }

  // Plan
  onLog?.('\nRunning terraform plan...\n');
  const planResult = await runCommand('terraform', ['plan', '-no-color', '-out=tfplan'], workDir, env, onLog);

  cleanup(workDir);
  return {
    success: planResult.code === 0,
    output: planResult.stdout + (planResult.stderr ? '\n' + planResult.stderr : ''),
  };
}

export async function apply(
  templatePath: string,
  variables: Record<string, string>,
  provider: string,
  credentials: Record<string, unknown>,
  existingState?: string | null,
  onLog?: LogCallback,
): Promise<TerraformResult> {
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'idp-tf-'));
  const absTemplatePath = path.resolve(templatePath);

  const files = fs.readdirSync(absTemplatePath);
  for (const file of files) {
    fs.copyFileSync(path.join(absTemplatePath, file), path.join(workDir, file));
  }

  const tfvars = Object.entries(variables)
    .map(([k, v]) => `${k} = "${v.replace(/"/g, '\\"')}"`)
    .join('\n');
  fs.writeFileSync(path.join(workDir, 'terraform.tfvars'), tfvars);

  if (existingState) {
    fs.writeFileSync(path.join(workDir, 'terraform.tfstate'), existingState);
  }

  const env = buildEnvVars(provider, credentials);

  onLog?.('Running terraform init...\n');
  const initResult = await runCommand('terraform', ['init', '-no-color'], workDir, env, onLog);
  if (initResult.code !== 0) {
    cleanup(workDir);
    return { success: false, output: initResult.stdout + '\n' + initResult.stderr };
  }

  onLog?.('\nRunning terraform apply...\n');
  const applyResult = await runCommand('terraform', ['apply', '-auto-approve', '-no-color'], workDir, env, onLog);

  let outputs: Record<string, string> = {};
  let state: string | undefined;

  if (applyResult.code === 0) {
    // Get outputs
    const outputResult = await runCommand('terraform', ['output', '-json', '-no-color'], workDir, env);
    try {
      const parsed = JSON.parse(outputResult.stdout);
      outputs = Object.fromEntries(
        Object.entries(parsed).map(([k, v]: [string, any]) => [k, String(v.value)]),
      );
    } catch {}

    // Read state
    const statePath = path.join(workDir, 'terraform.tfstate');
    if (fs.existsSync(statePath)) {
      state = fs.readFileSync(statePath, 'utf-8');
    }
  }

  cleanup(workDir);
  return {
    success: applyResult.code === 0,
    output: applyResult.stdout + (applyResult.stderr ? '\n' + applyResult.stderr : ''),
    outputs,
  };
}

export async function destroy(
  templatePath: string,
  variables: Record<string, string>,
  provider: string,
  credentials: Record<string, unknown>,
  terraformState: string,
  onLog?: LogCallback,
): Promise<TerraformResult> {
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'idp-tf-'));
  const absTemplatePath = path.resolve(templatePath);

  const files = fs.readdirSync(absTemplatePath);
  for (const file of files) {
    fs.copyFileSync(path.join(absTemplatePath, file), path.join(workDir, file));
  }

  const tfvars = Object.entries(variables)
    .map(([k, v]) => `${k} = "${v.replace(/"/g, '\\"')}"`)
    .join('\n');
  fs.writeFileSync(path.join(workDir, 'terraform.tfvars'), tfvars);
  fs.writeFileSync(path.join(workDir, 'terraform.tfstate'), terraformState);

  const env = buildEnvVars(provider, credentials);

  onLog?.('Running terraform init...\n');
  const initResult = await runCommand('terraform', ['init', '-no-color'], workDir, env, onLog);
  if (initResult.code !== 0) {
    cleanup(workDir);
    return { success: false, output: initResult.stdout + '\n' + initResult.stderr };
  }

  onLog?.('\nRunning terraform destroy...\n');
  const destroyResult = await runCommand('terraform', ['destroy', '-auto-approve', '-no-color'], workDir, env, onLog);

  cleanup(workDir);
  return {
    success: destroyResult.code === 0,
    output: destroyResult.stdout + (destroyResult.stderr ? '\n' + destroyResult.stderr : ''),
  };
}

function cleanup(dir: string) {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch (err) {
    logger.warn(`Failed to cleanup temp dir: ${dir}`);
  }
}
