import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { prisma } from '../../prisma';
import { NotFoundError } from '../../utils/errors';
import * as settingsService from '../settings/settings.service';
import {
  getTrivyBin, getTFLintBin, getConftestBin,
  checkTrivyAvailable, checkTFLintAvailable, checkConftestAvailable,
  runCommand,
} from './security-tools';
import { logger } from '../../utils/logger';
import type {
  SecurityConfig, SecurityScanResult, SecuritySeverity,
  TrivyFinding, TFLintFinding, OPAFinding, ScanToolResult,
} from '@idp/shared';

const SEVERITY_ORDER: Record<SecuritySeverity, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
  INFO: 4,
};

const SEVERITIES_AT_OR_ABOVE = (threshold: SecuritySeverity): SecuritySeverity[] => {
  const level = SEVERITY_ORDER[threshold];
  return (Object.keys(SEVERITY_ORDER) as SecuritySeverity[]).filter(s => SEVERITY_ORDER[s] <= level);
};

// --- Config ---

const CONFIG_KEYS = {
  enabled: 'security.enabled',
  enforcement: 'security.enforcement',
  severityThreshold: 'security.severityThreshold',
  opaPolicy: 'security.opaPolicy',
} as const;

export async function getConfig(): Promise<SecurityConfig> {
  const [enabled, enforcement, severityThreshold, opaPolicy] = await Promise.all([
    settingsService.get(CONFIG_KEYS.enabled),
    settingsService.get(CONFIG_KEYS.enforcement),
    settingsService.get(CONFIG_KEYS.severityThreshold),
    settingsService.get(CONFIG_KEYS.opaPolicy),
  ]);

  return {
    enabled: enabled === 'true',
    enforcement: (enforcement as SecurityConfig['enforcement']) || 'blocking',
    severityThreshold: (severityThreshold as SecuritySeverity) || 'HIGH',
    opaPolicy: opaPolicy || '',
  };
}

export async function updateConfig(updates: Partial<SecurityConfig>): Promise<SecurityConfig> {
  const ops: Promise<void>[] = [];
  if (updates.enabled !== undefined) ops.push(settingsService.set(CONFIG_KEYS.enabled, String(updates.enabled)));
  if (updates.enforcement !== undefined) ops.push(settingsService.set(CONFIG_KEYS.enforcement, updates.enforcement));
  if (updates.severityThreshold !== undefined) ops.push(settingsService.set(CONFIG_KEYS.severityThreshold, updates.severityThreshold));
  if (updates.opaPolicy !== undefined) ops.push(settingsService.set(CONFIG_KEYS.opaPolicy, updates.opaPolicy));
  await Promise.all(ops);
  return getConfig();
}

// --- Scan Orchestration ---

export async function scanTemplate(templateId: string, variables?: Record<string, string>): Promise<SecurityScanResult> {
  const startTime = Date.now();
  const config = await getConfig();

  // If scanning is disabled, return a clean pass immediately
  if (!config.enabled) {
    return {
      passed: true,
      enforced: false,
      severityThreshold: config.severityThreshold,
      scanDuration: 0,
      trivy: { available: false, findings: [] },
      tflint: { available: false, findings: [] },
      opa: { available: false, findings: [] },
      summary: { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, INFO: 0 },
    };
  }

  const template = await prisma.template.findUnique({ where: { id: templateId } });
  if (!template) throw new NotFoundError('Template');

  const templatePath = path.resolve(template.templatePath);
  if (!fs.existsSync(templatePath)) {
    throw new NotFoundError('Template directory not found on disk');
  }

  // Create a temp copy of the template with user's variable values applied
  // so scanners evaluate the actual deployment config, not just defaults
  let scanDir = templatePath;
  let tempDir: string | null = null;

  if (variables && Object.keys(variables).length > 0) {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'security-scan-'));
    scanDir = tempDir;

    // Copy all .tf files to temp dir
    for (const file of fs.readdirSync(templatePath)) {
      if (file.endsWith('.tf') || file.endsWith('.tf.json')) {
        fs.copyFileSync(path.join(templatePath, file), path.join(scanDir, file));
      }
    }

    // Write user variables as terraform.tfvars.json so scanners evaluate with actual values
    const tfvars = convertVariablesToTfvars(variables, template.variables);
    fs.writeFileSync(path.join(scanDir, 'terraform.tfvars.json'), JSON.stringify(tfvars, null, 2));
    logger.debug(`Security scan: wrote tfvars to ${scanDir}/terraform.tfvars.json`);
  }

  const threshold = config.severityThreshold;

  try {
    const [trivy, tflint, opa] = await Promise.all([
      runTrivy(scanDir, threshold),
      runTFLint(scanDir),
      runConftest(scanDir, config.opaPolicy),
    ]);

    const summary: Record<SecuritySeverity, number> = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, INFO: 0 };
    for (const f of trivy.findings) summary[f.severity]++;
    for (const f of tflint.findings) summary[f.severity]++;
    for (const f of opa.findings) summary[f.severity]++;

    // Determine pass/fail: any finding at or above threshold = fail
    const blocking = SEVERITIES_AT_OR_ABOVE(threshold);
    const hasBlockingFindings = blocking.some(s => summary[s] > 0);
    const passed = !hasBlockingFindings;

    return {
      passed,
      enforced: config.enforcement === 'blocking',
      severityThreshold: threshold,
      scanDuration: Date.now() - startTime,
      trivy,
      tflint,
      opa,
      summary,
    };
  } finally {
    if (tempDir) {
      try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch { /* ignore */ }
    }
  }
}

/**
 * Convert string-typed deploy variables to proper types for tfvars.json.
 * Includes ALL template variables to prevent Trivy panics on null values.
 * Parses booleans, numbers, and JSON arrays/objects so Terraform evaluates them correctly.
 */
function convertVariablesToTfvars(
  variables: Record<string, string>,
  templateVarsJson: string,
): Record<string, unknown> {
  let templateVarDefs: Array<{ name: string; type?: string; default?: unknown }> = [];
  try {
    templateVarDefs = JSON.parse(templateVarsJson || '[]');
  } catch { /* ignore */ }

  const typeMap = new Map(templateVarDefs.map(v => [v.name, v.type || 'string']));
  const result: Record<string, unknown> = {};

  // First, ensure every template variable has a value (prevents Trivy panic on null)
  for (const varDef of templateVarDefs) {
    if (variables[varDef.name] !== undefined) continue; // user provided a value
    if (varDef.default !== undefined) continue; // has a default in .tf

    // Provide a placeholder value based on type to prevent Trivy crash
    const t = (varDef.type || 'string').toLowerCase();
    if (t === 'bool' || t === 'boolean') result[varDef.name] = false;
    else if (t === 'number') result[varDef.name] = 0;
    else if (t.startsWith('list') || t.startsWith('set')) result[varDef.name] = [];
    else if (t.startsWith('map') || t.startsWith('object')) result[varDef.name] = {};
    else result[varDef.name] = 'placeholder';
  }

  // Then apply user-provided values with proper type coercion
  for (const [key, value] of Object.entries(variables)) {
    const varType = typeMap.get(key) || 'string';

    if (varType === 'bool' || varType === 'boolean') {
      result[key] = value === 'true';
    } else if (varType === 'number') {
      const num = Number(value);
      result[key] = isNaN(num) ? value : num;
    } else if (varType.startsWith('list') || varType.startsWith('map') || varType.startsWith('object') || varType.startsWith('set')) {
      try {
        result[key] = JSON.parse(value);
      } catch {
        result[key] = value;
      }
    } else {
      result[key] = value;
    }
  }

  return result;
}

// --- Trivy ---

async function runTrivy(dir: string, threshold: SecuritySeverity): Promise<ScanToolResult<TrivyFinding>> {
  const start = Date.now();
  const status = await checkTrivyAvailable();
  if (!status.available) return { available: false, findings: [] };

  try {
    const bin = await getTrivyBin();
    const severities = SEVERITIES_AT_OR_ABOVE(threshold).join(',');
    const args = ['config', '--format', 'json', '--severity', severities];

    // Explicitly pass tfvars file — Trivy doesn't auto-read terraform.tfvars.json
    const tfvarsPath = path.join(dir, 'terraform.tfvars.json');
    if (fs.existsSync(tfvarsPath)) {
      args.push('--tf-vars', tfvarsPath);
    }

    args.push(dir);
    const result = await runCommand(bin, args, dir);

    const findings: TrivyFinding[] = [];
    logger.debug(`Trivy exit code: ${result.code}, stdout length: ${result.stdout.length}, stderr length: ${result.stderr.length}`);
    if (result.stderr.trim()) {
      logger.debug(`Trivy stderr: ${result.stderr.substring(0, 500)}`);
    }
    if (result.stdout.trim()) {
      try {
        const parsed = JSON.parse(result.stdout);
        const results = parsed.Results || [];
        logger.debug(`Trivy parsed ${results.length} result group(s)`);
        for (const r of results) {
          for (const m of r.Misconfigurations || []) {
            findings.push({
              ruleId: m.ID || m.AVDID || '',
              severity: normalizeSeverity(m.Severity),
              title: m.Title || '',
              description: m.Description || '',
              resource: m.CauseMetadata?.Resource || '',
              file: r.Target || '',
              startLine: m.CauseMetadata?.StartLine || 0,
              resolution: m.Resolution || '',
            });
          }
        }
        logger.debug(`Trivy found ${findings.length} misconfiguration(s)`);
      } catch (parseErr) {
        logger.warn(`Failed to parse Trivy output: ${(parseErr as Error).message}`);
        logger.debug(`Trivy raw stdout (first 500 chars): ${result.stdout.substring(0, 500)}`);
      }
    } else if (result.code !== 0) {
      // Trivy crashed (e.g. panic) with no JSON output
      const errMsg = result.stderr.includes('panic')
        ? 'Trivy crashed during scan'
        : `Trivy exited with code ${result.code}`;
      logger.warn(`${errMsg}: ${result.stderr.substring(0, 300)}`);
      return { available: true, findings: [], error: errMsg, duration: Date.now() - start };
    } else {
      logger.debug('Trivy produced no stdout output');
    }

    return { available: true, findings, duration: Date.now() - start };
  } catch (err: any) {
    return { available: true, findings: [], error: err.message, duration: Date.now() - start };
  }
}

// --- TFLint ---

async function runTFLint(dir: string): Promise<ScanToolResult<TFLintFinding>> {
  const start = Date.now();
  const status = await checkTFLintAvailable();
  if (!status.available) return { available: false, findings: [] };

  try {
    const bin = await getTFLintBin();
    // Exit code 2 means issues found (not an error)
    const result = await runCommand(bin, ['--format', 'json', '--force'], dir);

    const findings: TFLintFinding[] = [];
    if (result.stdout.trim()) {
      try {
        const parsed = JSON.parse(result.stdout);
        for (const issue of parsed.issues || []) {
          findings.push({
            rule: issue.rule?.name || '',
            severity: normalizeTFLintSeverity(issue.rule?.severity || 'warning'),
            message: issue.message || '',
            file: issue.range?.filename || '',
            line: issue.range?.start?.line || 0,
          });
        }
        for (const err of parsed.errors || []) {
          findings.push({
            rule: 'tflint-error',
            severity: 'HIGH',
            message: err.message || String(err),
            file: '',
            line: 0,
          });
        }
      } catch {
        logger.warn('Failed to parse TFLint output');
      }
    }

    return { available: true, findings, duration: Date.now() - start };
  } catch (err: any) {
    return { available: true, findings: [], error: err.message, duration: Date.now() - start };
  }
}

// --- Conftest / OPA ---

async function runConftest(dir: string, opaPolicy: string): Promise<ScanToolResult<OPAFinding>> {
  const start = Date.now();

  const status = await checkConftestAvailable();
  if (!status.available) return { available: false, findings: [] };

  if (!opaPolicy.trim()) {
    return { available: true, findings: [], duration: Date.now() - start };
  }

  let policyDir: string | null = null;
  try {
    policyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'opa-policy-'));
    const policyFile = path.join(policyDir, 'main.rego');
    fs.writeFileSync(policyFile, opaPolicy);

    // Find all .tf files in the template dir
    const tfFiles = fs.readdirSync(dir).filter(f => f.endsWith('.tf'));
    if (tfFiles.length === 0) {
      return { available: true, findings: [], duration: Date.now() - start };
    }

    const bin = await getConftestBin();
    const args = ['test', '--policy', policyDir, '--output', 'json', '--no-color', ...tfFiles.map(f => path.join(dir, f))];
    const result = await runCommand(bin, args, dir);

    const findings: OPAFinding[] = [];
    if (result.stdout.trim()) {
      try {
        const parsed = JSON.parse(result.stdout);
        for (const entry of Array.isArray(parsed) ? parsed : [parsed]) {
          for (const failure of entry.failures || []) {
            findings.push({
              rule: failure.metadata?.details?.rule || 'opa-violation',
              severity: mapOpaSeverity(failure.metadata?.details?.severity),
              message: failure.msg || '',
              file: entry.filename || '',
              namespace: failure.metadata?.details?.namespace || entry.namespace || 'main',
            });
          }
          for (const warning of entry.warnings || []) {
            findings.push({
              rule: warning.metadata?.details?.rule || 'opa-warning',
              severity: 'LOW',
              message: warning.msg || '',
              file: entry.filename || '',
              namespace: warning.metadata?.details?.namespace || entry.namespace || 'main',
            });
          }
        }
      } catch {
        logger.warn('Failed to parse Conftest output');
      }
    }

    return { available: true, findings, duration: Date.now() - start };
  } catch (err: any) {
    return { available: true, findings: [], error: err.message, duration: Date.now() - start };
  } finally {
    if (policyDir) {
      try { fs.rmSync(policyDir, { recursive: true, force: true }); } catch { /* ignore */ }
    }
  }
}

// --- Helpers ---

function normalizeSeverity(severity: string): SecuritySeverity {
  const upper = (severity || '').toUpperCase();
  if (upper in SEVERITY_ORDER) return upper as SecuritySeverity;
  return 'INFO';
}

function normalizeTFLintSeverity(severity: string): SecuritySeverity {
  switch (severity.toLowerCase()) {
    case 'error': return 'HIGH';
    case 'warning': return 'MEDIUM';
    case 'notice': return 'LOW';
    default: return 'INFO';
  }
}

function mapOpaSeverity(severity?: string): SecuritySeverity {
  if (!severity) return 'HIGH';
  const upper = severity.toUpperCase();
  if (upper in SEVERITY_ORDER) return upper as SecuritySeverity;
  return 'HIGH';
}
