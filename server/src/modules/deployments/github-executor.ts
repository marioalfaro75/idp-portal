import fs from 'fs';
import path from 'path';
import sodium from 'libsodium-wrappers';
import { prisma } from '../../prisma';
import { logger } from '../../utils/logger';
import { getLogEmitter } from './deployments.service';
import * as cloudConnectionService from '../cloud-connections/cloud-connections.service';
import { listWorkflows, getWorkflowFileContent, updateWorkflowFile, pushScaffoldFiles } from '../github/github.service';
import { getAppOctokit, isAppConfigured } from '../github/github-app';
import { ensureWorkflowDispatch, fixSetupTerraformWrapper, fixTerraformFmtCheck, fixTerraformApplyCondition, fixWorkingDirectory, fixTerraformEnvVars, fixTerraformDestroyStep, fixTerraformStatePersistence } from '../github/workflow-validator';
import type { TemplateVariable } from '@idp/shared';
import { generateTfvarsJson } from '../../utils/tfvars';

function parseRepo(repo: string): { owner: string; repo: string } {
  const [owner, name] = repo.split('/');
  if (!owner || !name) throw new Error(`Invalid repo format: "${repo}". Expected "owner/repo".`);
  return { owner, repo: name };
}

const MAX_LOG_SIZE = 500 * 1024; // 500KB max to avoid SQLite bloat

function extractErrorSummary(logText: string): string | null {
  const lines = logText.split('\n');
  for (const line of lines) {
    // Terraform Error: lines (including box-drawing variants like "│ Error:")
    const tfMatch = line.match(/[│|]?\s*Error:\s*(.+)/);
    if (tfMatch) return tfMatch[0].trim();
    // Cloud auth errors
    if (/AccessDenied|AuthorizationError|AuthenticationError|InvalidClientTokenId|UnauthorizedAccess/i.test(line)) {
      return line.trim();
    }
  }
  return null;
}

async function fetchRunLogs(
  octokit: Awaited<ReturnType<typeof getAppOctokit>>,
  owner: string,
  repo: string,
  runId: number,
): Promise<{ logs: string; failedStep: string | null; failedJob: string | null; summary: string | null }> {
  try {
    const { data: jobsData } = await octokit.actions.listJobsForWorkflowRun({
      owner,
      repo,
      run_id: runId,
    });

    let allLogs = '';
    let failedStep: string | null = null;
    let failedJob: string | null = null;

    for (const job of jobsData.jobs) {
      // Build structured header per job with step pass/fail
      const stepLines = (job.steps || []).map((step) => {
        const icon = step.conclusion === 'success' ? '✓' : step.conclusion === 'failure' ? '✗' : '○';
        const duration = step.started_at && step.completed_at
          ? `${Math.round((new Date(step.completed_at).getTime() - new Date(step.started_at).getTime()) / 1000)}s`
          : '';
        if (step.conclusion === 'failure' && !failedStep) {
          failedStep = step.name;
          failedJob = job.name;
        }
        return `  ${icon} ${step.name}${duration ? ` (${duration})` : ''}`;
      });

      allLogs += `=== Job: ${job.name} (${job.conclusion || job.status}) ===\n`;
      allLogs += stepLines.join('\n') + '\n\n';

      // Fetch per-job text logs
      try {
        const { data: jobLog } = await octokit.actions.downloadJobLogsForWorkflowRun({
          owner,
          repo,
          job_id: job.id,
        });
        allLogs += (typeof jobLog === 'string' ? jobLog : String(jobLog)) + '\n\n';
      } catch {
        allLogs += '(logs unavailable for this job)\n\n';
      }
    }

    // Truncate if too large
    if (allLogs.length > MAX_LOG_SIZE) {
      allLogs = allLogs.slice(0, MAX_LOG_SIZE) + '\n\n--- logs truncated (>500KB) ---\n';
    }

    // Build summary
    let summary: string | null = null;
    if (failedJob) {
      const errorLine = extractErrorSummary(allLogs);
      summary = errorLine || `Job "${failedJob}", step "${failedStep}" failed`;
    }

    return { logs: allLogs, failedStep, failedJob, summary };
  } catch (err) {
    logger.warn('Failed to fetch GitHub Actions logs (best-effort)', { error: (err as Error).message });
    return { logs: '', failedStep: null, failedJob: null, summary: null };
  }
}

function extractTerraformOutputs(logText: string): Record<string, string> | null {
  // Match the "Outputs:" section printed after terraform apply
  const outputsMatch = logText.match(/Outputs:\s*\n([\s\S]*?)(?:\n\n|\n(?:=== |--- )|$)/);
  if (!outputsMatch) return null;

  const outputs: Record<string, string> = {};
  // Each output line: key = "value" or key = value
  const lines = outputsMatch[1].split('\n');
  for (const line of lines) {
    const m = line.match(/^\s*(\w+)\s*=\s*"?(.*?)"?\s*$/);
    if (m && m[1] && m[2] !== undefined) {
      outputs[m[1]] = m[2];
    }
  }
  return Object.keys(outputs).length > 0 ? outputs : null;
}

function createLogCollector(deploymentId: string): { messages: string[]; attach: () => void; detach: () => void } {
  const emitter = getLogEmitter(deploymentId);
  const messages: string[] = [];
  const handler = (event: { type: string; message: string }) => {
    messages.push(`[${event.type}] ${event.message}`);
  };
  return {
    messages,
    attach: () => emitter.on('log', handler),
    detach: () => emitter.off('log', handler),
  };
}

async function pushTemplateFiles(
  deploymentId: string,
  owner: string,
  repo: string,
  templatePath: string,
  variables: Record<string, string>,
  templateVarDefs: TemplateVariable[],
): Promise<void> {
  const emitter = getLogEmitter(deploymentId);

  try {
    const absTemplatePath = path.resolve(templatePath);
    const entries = fs.readdirSync(absTemplatePath);
    const tfFiles = entries.filter((f) => f.endsWith('.tf'));

    if (tfFiles.length === 0) {
      emitter.emit('log', { type: 'warning', message: `No .tf files found in ${templatePath}` });
      return;
    }

    // Read template files
    const files: Array<{ path: string; content: string }> = tfFiles.map((f) => ({
      path: `terraform/${f}`,
      content: fs.readFileSync(path.join(absTemplatePath, f), 'utf-8'),
    }));

    // Generate typed terraform.tfvars.json
    const tfvarsJson = generateTfvarsJson(variables, templateVarDefs);
    files.push({ path: 'terraform/terraform.tfvars.json', content: tfvarsJson });

    emitter.emit('log', { type: 'status', message: `Pushing ${files.length} template files to ${owner}/${repo}/terraform/` });
    await pushScaffoldFiles(owner, repo, files);
    emitter.emit('log', { type: 'status', message: 'Template files pushed successfully' });

    // Wait for GitHub to process the commit
    await new Promise((resolve) => setTimeout(resolve, 2000));
  } catch (err) {
    logger.error(`Failed to push template files for deployment ${deploymentId}`, { error: (err as Error).message });
    emitter.emit('log', { type: 'warning', message: `Failed to push template files: ${(err as Error).message}` });
  }
}

function buildCredentialSecrets(provider: string, credentials: Record<string, unknown>): Record<string, string> {
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

async function pushCloudCredentials(
  deploymentId: string,
  owner: string,
  repo: string,
  cloudConnectionId: string,
  provider: string,
): Promise<string[]> {
  const emitter = getLogEmitter(deploymentId);
  const octokit = await getAppOctokit();

  const { credentials } = await cloudConnectionService.getDecryptedCredentials(cloudConnectionId);
  const secrets = buildCredentialSecrets(provider, credentials);
  const secretNames = Object.keys(secrets).filter((k) => secrets[k]);

  if (secretNames.length === 0) return secretNames;

  await sodium.ready;

  try {
    // Get the repo's public key for encrypting secrets
    const { data: publicKey } = await octokit.actions.getRepoPublicKey({ owner, repo });

    emitter.emit('log', { type: 'status', message: `Setting ${secretNames.length} cloud credential secrets on ${owner}/${repo}` });

    for (const [name, value] of Object.entries(secrets)) {
      if (!value) continue;
      // Encrypt the secret value using the repo's public key
      const key = sodium.from_base64(publicKey.key, sodium.base64_variants.ORIGINAL);
      const encrypted = sodium.crypto_box_seal(sodium.from_string(value), key);
      const encryptedBase64 = sodium.to_base64(encrypted, sodium.base64_variants.ORIGINAL);

      await octokit.actions.createOrUpdateRepoSecret({
        owner,
        repo,
        secret_name: name,
        encrypted_value: encryptedBase64,
        key_id: publicKey.key_id,
      });
    }

    emitter.emit('log', { type: 'status', message: 'Cloud credentials set as repository secrets' });
  } catch (err: any) {
    if (err.status === 403 || err.message?.includes('Resource not accessible')) {
      throw new Error(
        'GitHub App lacks permission to set repository secrets. ' +
        'Ensure the App has "Secrets: Read and write" permission. ' +
        'Check the App installation settings on GitHub.'
      );
    }
    throw err;
  }

  return secretNames;
}

async function ensureWorkflowReady(
  deploymentId: string,
  owner: string,
  repo: string,
  workflowId: string,
  ref: string,
  credentialSecretNames: string[],
): Promise<void> {
  const emitter = getLogEmitter(deploymentId);
  try {
    // Resolve workflow file path from workflow ID
    const workflows = await listWorkflows(owner, repo);
    const workflow = workflows.find((w) => String(w.id) === workflowId || w.path === workflowId || w.name === workflowId);
    if (!workflow) {
      emitter.emit('log', { type: 'warning', message: 'Could not find workflow file to validate — proceeding with dispatch' });
      return;
    }

    const filePath = workflow.path; // e.g. ".github/workflows/deploy.yml"
    emitter.emit('log', { type: 'status', message: `Validating workflow file: ${filePath}` });

    const { content, sha } = await getWorkflowFileContent(owner, repo, filePath, ref);

    // Apply all workflow fixes in sequence
    const result = ensureWorkflowDispatch(content);
    const wrapperFix = fixSetupTerraformWrapper(result.fixed || content);
    const workDirFix = fixWorkingDirectory(wrapperFix.fixed);
    const fmtFix = fixTerraformFmtCheck(workDirFix.fixed);
    const applyFix = fixTerraformApplyCondition(fmtFix.fixed);
    const envFix = fixTerraformEnvVars(applyFix.fixed, credentialSecretNames);
    const destroyFix = fixTerraformDestroyStep(envFix.fixed);
    const stateFix = fixTerraformStatePersistence(destroyFix.fixed);

    const allChanges = [...result.changes];
    if (wrapperFix.changed) allChanges.push('Set terraform_wrapper: false on setup-terraform');
    if (workDirFix.changed) allChanges.push('Set working-directory: terraform for run steps');
    if (fmtFix.changed) allChanges.push('Changed terraform fmt -check to terraform fmt');
    if (applyFix.changed) allChanges.push('Fixed Terraform Apply condition for workflow_dispatch');
    if (envFix.changed) allChanges.push('Added cloud credential env vars from repo secrets');
    if (destroyFix.changed) allChanges.push('Added Terraform Destroy step for destroy/rollback actions');
    if (stateFix.changed) allChanges.push('Added artifact-based terraform state persistence');

    const finalContent = stateFix.fixed;
    const anyFixApplied = wrapperFix.changed || workDirFix.changed || fmtFix.changed || applyFix.changed || envFix.changed || destroyFix.changed || stateFix.changed;
    const needsUpdate = !result.valid || anyFixApplied;

    if (!needsUpdate) {
      emitter.emit('log', { type: 'status', message: 'Workflow file validated — all required inputs present' });
      return;
    }

    if (!result.valid && !result.fixed && !anyFixApplied) {
      emitter.emit('log', { type: 'warning', message: `Workflow validation failed: ${result.changes.join('; ')}. Proceeding with dispatch anyway.` });
      return;
    }

    // Commit the fix
    emitter.emit('log', { type: 'status', message: `Auto-fixing workflow: ${allChanges.join('; ')}` });
    await updateWorkflowFile(owner, repo, filePath, finalContent, sha, ref);
    emitter.emit('log', { type: 'status', message: 'Workflow file updated — waiting for GitHub to process changes...' });

    // Wait for GitHub to process the commit before dispatching
    await new Promise((resolve) => setTimeout(resolve, 2000));
  } catch (err) {
    logger.warn(`Workflow validation failed for deployment ${deploymentId}`, { error: (err as Error).message });
    const emitter = getLogEmitter(deploymentId);
    emitter.emit('log', { type: 'warning', message: `Workflow validation skipped: ${(err as Error).message}` });
  }
}

export async function dispatchAndTrack(deploymentId: string): Promise<void> {
  const deployment = await prisma.deployment.findUnique({
    where: { id: deploymentId },
    include: { template: true },
  });
  if (!deployment) throw new Error('Deployment not found');

  const collector = createLogCollector(deploymentId);
  collector.attach();

  try {
    const octokit = await getAppOctokit();
    const { owner, repo } = parseRepo(deployment.githubRepo!);
    const workflowId = deployment.githubWorkflowId!;
    const ref = deployment.githubRef || 'main';
    const variables = JSON.parse(deployment.variables);
    const templateVarDefs: TemplateVariable[] = JSON.parse(deployment.template.variables || '[]');

    await pushTemplateFiles(deploymentId, owner, repo, deployment.template.templatePath, variables, templateVarDefs);
    const secretNames = await pushCloudCredentials(deploymentId, owner, repo, deployment.cloudConnectionId, deployment.template.provider);
    await ensureWorkflowReady(deploymentId, owner, repo, workflowId, ref, secretNames);

    const dispatchedAt = new Date();

    try {
      await octokit.actions.createWorkflowDispatch({
        owner,
        repo,
        workflow_id: workflowId,
        ref,
        inputs: {
          template_slug: deployment.template.slug,
          template_provider: deployment.template.provider,
          variables: JSON.stringify(variables),
          deployment_id: deployment.id,
          deployment_name: deployment.name,
          action: 'apply',
        },
      });
    } catch (err: any) {
      if (err.status === 403 || err.message?.includes('Resource not accessible')) {
        throw new Error(
          'GitHub App lacks permission to dispatch workflows. ' +
          'Ensure the App has "Actions: Read and write" and "Contents: Read" permissions. ' +
          'Check the App installation settings on GitHub.'
        );
      }
      throw err;
    }

    await prisma.deployment.update({
      where: { id: deploymentId },
      data: { status: 'dispatched', planOutput: collector.messages.join('\n') || null },
    });

    const emitter = getLogEmitter(deploymentId);
    emitter.emit('log', { type: 'status', message: 'Workflow dispatched to GitHub Actions' });

    // Poll for the run ID after a delay
    setTimeout(async () => {
      try {
        await findAndStoreRunId(deploymentId, owner, repo, workflowId, dispatchedAt);
      } catch (err) {
        logger.error(`Failed to find GitHub run for deployment ${deploymentId}`, { error: (err as Error).message });
      }
    }, 5000);
  } finally {
    collector.detach();
    // Persist collected logs even on failure
    try {
      await prisma.deployment.update({
        where: { id: deploymentId },
        data: { planOutput: collector.messages.join('\n') || null },
      });
    } catch { /* best-effort */ }
  }
}

export async function dispatchDestroy(deploymentId: string): Promise<void> {
  const deployment = await prisma.deployment.findUnique({
    where: { id: deploymentId },
    include: { template: true },
  });
  if (!deployment) throw new Error('Deployment not found');

  const collector = createLogCollector(deploymentId);
  collector.attach();

  try {
    const octokit = await getAppOctokit();
    const { owner, repo } = parseRepo(deployment.githubRepo!);
    const workflowId = deployment.githubWorkflowId!;
    const ref = deployment.githubRef || 'main';
    const variables = JSON.parse(deployment.variables);
    const templateVarDefs: TemplateVariable[] = JSON.parse(deployment.template.variables || '[]');

    await pushTemplateFiles(deploymentId, owner, repo, deployment.template.templatePath, variables, templateVarDefs);
    const secretNames = await pushCloudCredentials(deploymentId, owner, repo, deployment.cloudConnectionId, deployment.template.provider);
    await ensureWorkflowReady(deploymentId, owner, repo, workflowId, ref, secretNames);

    const dispatchedAt = new Date();

    try {
      await octokit.actions.createWorkflowDispatch({
        owner,
        repo,
        workflow_id: workflowId,
        ref,
        inputs: {
          template_slug: deployment.template.slug,
          template_provider: deployment.template.provider,
          variables: JSON.stringify(variables),
          deployment_id: deployment.id,
          deployment_name: deployment.name,
          action: 'destroy',
        },
      });
    } catch (err: any) {
      if (err.status === 403 || err.message?.includes('Resource not accessible')) {
        throw new Error(
          'GitHub App lacks permission to dispatch workflows. ' +
          'Ensure the App has "Actions: Read and write" and "Contents: Read" permissions. ' +
          'Check the App installation settings on GitHub.'
        );
      }
      throw err;
    }

    await prisma.deployment.update({
      where: { id: deploymentId },
      data: { status: 'destroying', planOutput: collector.messages.join('\n') || null },
    });

    const emitter = getLogEmitter(deploymentId);
    emitter.emit('log', { type: 'status', message: 'Destroy workflow dispatched to GitHub Actions' });

    setTimeout(async () => {
      try {
        await findAndStoreRunId(deploymentId, owner, repo, workflowId, dispatchedAt);
      } catch (err) {
        logger.error(`Failed to find GitHub run for destroy ${deploymentId}`, { error: (err as Error).message });
      }
    }, 5000);
  } finally {
    collector.detach();
    try {
      await prisma.deployment.update({
        where: { id: deploymentId },
        data: { planOutput: collector.messages.join('\n') || null },
      });
    } catch { /* best-effort */ }
  }
}

export async function dispatchRollback(deploymentId: string): Promise<void> {
  const deployment = await prisma.deployment.findUnique({
    where: { id: deploymentId },
    include: { template: true },
  });
  if (!deployment) throw new Error('Deployment not found');

  const collector = createLogCollector(deploymentId);
  collector.attach();

  try {
    const octokit = await getAppOctokit();
    const { owner, repo } = parseRepo(deployment.githubRepo!);
    const workflowId = deployment.githubWorkflowId!;
    const ref = deployment.githubRef || 'main';
    const variables = JSON.parse(deployment.variables);
    const templateVarDefs: TemplateVariable[] = JSON.parse(deployment.template.variables || '[]');

    await pushTemplateFiles(deploymentId, owner, repo, deployment.template.templatePath, variables, templateVarDefs);
    const secretNames = await pushCloudCredentials(deploymentId, owner, repo, deployment.cloudConnectionId, deployment.template.provider);
    await ensureWorkflowReady(deploymentId, owner, repo, workflowId, ref, secretNames);

    const dispatchedAt = new Date();

    try {
      await octokit.actions.createWorkflowDispatch({
        owner,
        repo,
        workflow_id: workflowId,
        ref,
        inputs: {
          template_slug: deployment.template.slug,
          template_provider: deployment.template.provider,
          variables: JSON.stringify(variables),
          deployment_id: deployment.id,
          deployment_name: deployment.name,
          action: 'destroy',
        },
      });
    } catch (err: any) {
      if (err.status === 403 || err.message?.includes('Resource not accessible')) {
        throw new Error(
          'GitHub App lacks permission to dispatch workflows. ' +
          'Ensure the App has "Actions: Read and write" and "Contents: Read" permissions. ' +
          'Check the App installation settings on GitHub.'
        );
      }
      throw err;
    }

    await prisma.deployment.update({
      where: { id: deploymentId },
      data: { status: 'rolling_back', planOutput: collector.messages.join('\n') || null },
    });

    const emitter = getLogEmitter(deploymentId);
    emitter.emit('log', { type: 'status', message: 'Rollback workflow dispatched to GitHub Actions' });

    setTimeout(async () => {
      try {
        await findAndStoreRunId(deploymentId, owner, repo, workflowId, dispatchedAt);
      } catch (err) {
        logger.error(`Failed to find GitHub run for rollback ${deploymentId}`, { error: (err as Error).message });
      }
    }, 5000);
  } finally {
    collector.detach();
    try {
      await prisma.deployment.update({
        where: { id: deploymentId },
        data: { planOutput: collector.messages.join('\n') || null },
      });
    } catch { /* best-effort */ }
  }
}

async function findAndStoreRunId(
  deploymentId: string,
  owner: string,
  repo: string,
  workflowId: string,
  dispatchedAt: Date,
): Promise<void> {
  const octokit = await getAppOctokit();

  // Try a few times to find the run
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data } = await octokit.actions.listWorkflowRuns({
      owner,
      repo,
      workflow_id: workflowId,
      event: 'workflow_dispatch',
      per_page: 5,
    });

    const run = data.workflow_runs.find(
      (r) => new Date(r.created_at) >= dispatchedAt,
    );

    if (run) {
      await prisma.deployment.update({
        where: { id: deploymentId },
        data: {
          githubRunId: String(run.id),
          githubRunUrl: run.html_url,
        },
      });
      logger.info(`Linked deployment ${deploymentId} to GitHub run ${run.id}`);
      return;
    }

    // Wait 3 seconds before retrying
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }

  logger.warn(`Could not find GitHub run for deployment ${deploymentId} after retries`);
  await prisma.deployment.update({
    where: { id: deploymentId },
    data: {
      errorMessage:
        'Could not find the GitHub Actions workflow run after multiple attempts. ' +
        'Possible causes: workflow file syntax error, branch protection rules blocking the run, ' +
        'GitHub processing delays, or the workflow_dispatch trigger is missing. ' +
        'Check the Actions tab in your repository for details.',
    },
  });
}

export async function pollGitHubDeployments(): Promise<void> {
  try {
    const configured = await isAppConfigured();
    if (!configured) {
      logger.debug('GitHub App not configured — skipping deployment polling');
      return;
    }

    const deployments = await prisma.deployment.findMany({
      where: {
        executionMethod: 'github',
        status: { in: ['dispatched', 'running', 'destroying', 'rolling_back'] },
        githubRunId: { not: null },
      },
    });

    if (deployments.length === 0) return;

    const octokit = await getAppOctokit();

    for (const deployment of deployments) {
      try {
        const { owner, repo } = parseRepo(deployment.githubRepo!);
        const { data: run } = await octokit.actions.getWorkflowRun({
          owner,
          repo,
          run_id: Number(deployment.githubRunId),
        });

        let newStatus: string | null = null;
        const isDestroying = deployment.status === 'destroying';
        const isRollingBack = deployment.status === 'rolling_back';

        if (run.status === 'completed') {
          if (run.conclusion === 'success') {
            newStatus = isDestroying ? 'destroyed' : isRollingBack ? 'rolled_back' : 'succeeded';
          } else {
            newStatus = 'failed';
          }
        } else if (run.status === 'in_progress') {
          newStatus = isDestroying ? 'destroying' : isRollingBack ? 'rolling_back' : 'running';
        }
        // queued/waiting/pending → keep current status

        if (newStatus && newStatus !== deployment.status) {
          // Fetch logs when run completes (success or failure)
          let logData: { logs: string; summary: string | null } = { logs: '', summary: null };
          if (run.status === 'completed') {
            logData = await fetchRunLogs(octokit, owner, repo, Number(deployment.githubRunId));
          }

          const outputField = (isDestroying || isRollingBack) ? 'destroyOutput' : 'applyOutput';
          const updateData: Record<string, unknown> = {
            status: newStatus,
            githubRunUrl: run.html_url,
          };

          if (run.status === 'completed' && logData.logs) {
            updateData[outputField] = logData.logs;

            // Extract Terraform outputs from logs on successful apply
            if (newStatus === 'succeeded') {
              const parsedOutputs = extractTerraformOutputs(logData.logs);
              if (parsedOutputs) {
                updateData.outputs = JSON.stringify(parsedOutputs);
              }
            }
          }

          if (newStatus === 'failed') {
            updateData.errorMessage = logData.summary || `GitHub Actions run ${run.conclusion}: ${run.html_url}`;
          } else {
            updateData.errorMessage = null;
          }

          await prisma.deployment.update({
            where: { id: deployment.id },
            data: updateData,
          });

          const emitter = getLogEmitter(deployment.id);
          emitter.emit('log', { type: 'status', message: `GitHub Actions: ${newStatus}` });

          if (['succeeded', 'failed', 'destroyed', 'rolled_back'].includes(newStatus)) {
            emitter.emit('log', { type: 'complete', message: newStatus });
          }

          logger.info(`Deployment ${deployment.id} status updated to ${newStatus}`);
        }
      } catch (err) {
        logger.error(`Failed to poll GitHub run for deployment ${deployment.id}`, { error: (err as Error).message });
      }
    }
    // Fail deployments stuck in 'dispatched' with no run ID for >10 minutes
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const staleDeployments = await prisma.deployment.findMany({
      where: {
        executionMethod: 'github',
        status: 'dispatched',
        githubRunId: null,
        updatedAt: { lt: tenMinutesAgo },
      },
    });

    for (const stale of staleDeployments) {
      await prisma.deployment.update({
        where: { id: stale.id },
        data: {
          status: 'failed',
          errorMessage:
            'Deployment timed out: no GitHub Actions workflow run was detected within 10 minutes of dispatch. ' +
            'Possible causes: workflow file not found or has syntax errors, the dispatch event was not received by GitHub, ' +
            'or branch protection rules prevented the run. Check the Actions tab in your repository.',
        },
      });
      const emitter = getLogEmitter(stale.id);
      emitter.emit('log', { type: 'error', message: 'Deployment timed out waiting for GitHub Actions run' });
      emitter.emit('log', { type: 'complete', message: 'failed' });
      logger.warn(`Stale deployment ${stale.id} failed after 10 minute timeout`);
    }
  } catch (err) {
    logger.error('GitHub deployment polling failed', { error: (err as Error).message });
  }
}
