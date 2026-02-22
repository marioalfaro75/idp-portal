import fs from 'fs';
import path from 'path';
import sodium from 'libsodium-wrappers';
import { Octokit } from '@octokit/rest';
import { prisma } from '../../prisma';
import { decrypt } from '../../utils/crypto';
import { logger } from '../../utils/logger';
import { getLogEmitter } from './deployments.service';
import * as cloudConnectionService from '../cloud-connections/cloud-connections.service';
import { listWorkflows, getWorkflowFileContent, updateWorkflowFile, pushScaffoldFiles } from '../github/github.service';
import { ensureWorkflowDispatch, fixSetupTerraformWrapper, fixTerraformFmtCheck, fixTerraformApplyCondition, fixWorkingDirectory, fixTerraformEnvVars, fixTerraformDestroyStep, fixPermissionsContentsWrite, fixTerraformStatePersistence } from '../github/workflow-validator';

async function getOctokit(userId: string): Promise<Octokit> {
  const conn = await prisma.gitHubConnection.findUnique({ where: { userId } });
  if (!conn) throw new Error('No GitHub connection found. Connect GitHub first.');
  const token = decrypt(conn.encryptedToken);
  return new Octokit({ auth: token });
}

function parseRepo(repo: string): { owner: string; repo: string } {
  const [owner, name] = repo.split('/');
  if (!owner || !name) throw new Error(`Invalid repo format: "${repo}". Expected "owner/repo".`);
  return { owner, repo: name };
}

async function pushTemplateFiles(
  deploymentId: string,
  userId: string,
  owner: string,
  repo: string,
  templatePath: string,
  variables: Record<string, string>,
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

    // Generate terraform.tfvars
    const tfvars = Object.entries(variables)
      .map(([k, v]) => `${k} = "${v.replace(/"/g, '\\"')}"`)
      .join('\n');
    files.push({ path: 'terraform/terraform.tfvars', content: tfvars });

    emitter.emit('log', { type: 'status', message: `Pushing ${files.length} template files to ${owner}/${repo}/terraform/` });
    await pushScaffoldFiles(userId, owner, repo, files);
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
  octokit: Octokit,
  owner: string,
  repo: string,
  cloudConnectionId: string,
  provider: string,
): Promise<string[]> {
  const emitter = getLogEmitter(deploymentId);

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
        'GitHub token lacks permission to set repository secrets. ' +
        'For fine-grained PATs, grant "Secrets: Read and write" permission. ' +
        'For classic PATs, enable the "repo" scope. ' +
        'Update your token at https://github.com/settings/tokens and reconnect in the GitHub settings page.'
      );
    }
    throw err;
  }

  return secretNames;
}

async function ensureWorkflowReady(
  deploymentId: string,
  userId: string,
  owner: string,
  repo: string,
  workflowId: string,
  ref: string,
  credentialSecretNames: string[],
): Promise<void> {
  const emitter = getLogEmitter(deploymentId);
  try {
    // Resolve workflow file path from workflow ID
    const workflows = await listWorkflows(userId, owner, repo);
    const workflow = workflows.find((w) => String(w.id) === workflowId || w.path === workflowId || w.name === workflowId);
    if (!workflow) {
      emitter.emit('log', { type: 'warning', message: 'Could not find workflow file to validate — proceeding with dispatch' });
      return;
    }

    const filePath = workflow.path; // e.g. ".github/workflows/deploy.yml"
    emitter.emit('log', { type: 'status', message: `Validating workflow file: ${filePath}` });

    const { content, sha } = await getWorkflowFileContent(userId, owner, repo, filePath, ref);

    // Apply all workflow fixes in sequence
    const result = ensureWorkflowDispatch(content);
    const wrapperFix = fixSetupTerraformWrapper(result.fixed || content);
    const workDirFix = fixWorkingDirectory(wrapperFix.fixed);
    const fmtFix = fixTerraformFmtCheck(workDirFix.fixed);
    const applyFix = fixTerraformApplyCondition(fmtFix.fixed);
    const envFix = fixTerraformEnvVars(applyFix.fixed, credentialSecretNames);
    const destroyFix = fixTerraformDestroyStep(envFix.fixed);
    const permsFix = fixPermissionsContentsWrite(destroyFix.fixed);
    const stateFix = fixTerraformStatePersistence(permsFix.fixed);

    const allChanges = [...result.changes];
    if (wrapperFix.changed) allChanges.push('Set terraform_wrapper: false on setup-terraform');
    if (workDirFix.changed) allChanges.push('Set working-directory: terraform for run steps');
    if (fmtFix.changed) allChanges.push('Changed terraform fmt -check to terraform fmt');
    if (applyFix.changed) allChanges.push('Fixed Terraform Apply condition for workflow_dispatch');
    if (envFix.changed) allChanges.push('Added cloud credential env vars from repo secrets');
    if (destroyFix.changed) allChanges.push('Added Terraform Destroy step for destroy/rollback actions');
    if (permsFix.changed) allChanges.push('Updated permissions.contents to write for state persistence');
    if (stateFix.changed) allChanges.push('Added steps to persist terraform state to repo');

    const finalContent = stateFix.fixed;
    const anyFixApplied = wrapperFix.changed || workDirFix.changed || fmtFix.changed || applyFix.changed || envFix.changed || destroyFix.changed || permsFix.changed || stateFix.changed;
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
    await updateWorkflowFile(userId, owner, repo, filePath, finalContent, sha, ref);
    emitter.emit('log', { type: 'status', message: 'Workflow file updated — waiting for GitHub to process changes...' });

    // Wait for GitHub to process the commit before dispatching
    await new Promise((resolve) => setTimeout(resolve, 2000));
  } catch (err) {
    logger.warn(`Workflow validation failed for deployment ${deploymentId}`, { error: (err as Error).message });
    const emitter = getLogEmitter(deploymentId);
    emitter.emit('log', { type: 'warning', message: `Workflow validation skipped: ${(err as Error).message}` });
  }
}

export async function dispatchAndTrack(deploymentId: string, userId: string): Promise<void> {
  const deployment = await prisma.deployment.findUnique({
    where: { id: deploymentId },
    include: { template: true },
  });
  if (!deployment) throw new Error('Deployment not found');

  const octokit = await getOctokit(userId);
  const { owner, repo } = parseRepo(deployment.githubRepo!);
  const workflowId = deployment.githubWorkflowId!;
  const ref = deployment.githubRef || 'main';
  const variables = JSON.parse(deployment.variables);

  await pushTemplateFiles(deploymentId, userId, owner, repo, deployment.template.templatePath, variables);
  const secretNames = await pushCloudCredentials(deploymentId, octokit, owner, repo, deployment.cloudConnectionId, deployment.template.provider);
  await ensureWorkflowReady(deploymentId, userId, owner, repo, workflowId, ref, secretNames);

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
        'GitHub token lacks permission to dispatch workflows. ' +
        'For classic PATs, enable the "repo" scope. ' +
        'For fine-grained PATs, grant "Actions: Read and write" and "Contents: Read" permissions. ' +
        'Update your token at https://github.com/settings/tokens and reconnect in the GitHub settings page.'
      );
    }
    throw err;
  }

  await prisma.deployment.update({
    where: { id: deploymentId },
    data: { status: 'dispatched' },
  });

  const emitter = getLogEmitter(deploymentId);
  emitter.emit('log', { type: 'status', message: 'Workflow dispatched to GitHub Actions' });

  // Poll for the run ID after a delay
  setTimeout(async () => {
    try {
      await findAndStoreRunId(deploymentId, userId, owner, repo, workflowId, dispatchedAt);
    } catch (err) {
      logger.error(`Failed to find GitHub run for deployment ${deploymentId}`, { error: (err as Error).message });
    }
  }, 5000);
}

export async function dispatchDestroy(deploymentId: string, userId: string): Promise<void> {
  const deployment = await prisma.deployment.findUnique({
    where: { id: deploymentId },
    include: { template: true },
  });
  if (!deployment) throw new Error('Deployment not found');

  const octokit = await getOctokit(userId);
  const { owner, repo } = parseRepo(deployment.githubRepo!);
  const workflowId = deployment.githubWorkflowId!;
  const ref = deployment.githubRef || 'main';
  const variables = JSON.parse(deployment.variables);

  await pushTemplateFiles(deploymentId, userId, owner, repo, deployment.template.templatePath, variables);
  const secretNames = await pushCloudCredentials(deploymentId, octokit, owner, repo, deployment.cloudConnectionId, deployment.template.provider);
  await ensureWorkflowReady(deploymentId, userId, owner, repo, workflowId, ref, secretNames);

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
        'GitHub token lacks permission to dispatch workflows. ' +
        'For classic PATs, enable the "repo" scope. ' +
        'For fine-grained PATs, grant "Actions: Read and write" and "Contents: Read" permissions. ' +
        'Update your token at https://github.com/settings/tokens and reconnect in the GitHub settings page.'
      );
    }
    throw err;
  }

  await prisma.deployment.update({
    where: { id: deploymentId },
    data: { status: 'destroying' },
  });

  const emitter = getLogEmitter(deploymentId);
  emitter.emit('log', { type: 'status', message: 'Destroy workflow dispatched to GitHub Actions' });

  setTimeout(async () => {
    try {
      await findAndStoreRunId(deploymentId, userId, owner, repo, workflowId, dispatchedAt);
    } catch (err) {
      logger.error(`Failed to find GitHub run for destroy ${deploymentId}`, { error: (err as Error).message });
    }
  }, 5000);
}

export async function dispatchRollback(deploymentId: string, userId: string): Promise<void> {
  const deployment = await prisma.deployment.findUnique({
    where: { id: deploymentId },
    include: { template: true },
  });
  if (!deployment) throw new Error('Deployment not found');

  const octokit = await getOctokit(userId);
  const { owner, repo } = parseRepo(deployment.githubRepo!);
  const workflowId = deployment.githubWorkflowId!;
  const ref = deployment.githubRef || 'main';
  const variables = JSON.parse(deployment.variables);

  await pushTemplateFiles(deploymentId, userId, owner, repo, deployment.template.templatePath, variables);
  const secretNames = await pushCloudCredentials(deploymentId, octokit, owner, repo, deployment.cloudConnectionId, deployment.template.provider);
  await ensureWorkflowReady(deploymentId, userId, owner, repo, workflowId, ref, secretNames);

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
        'GitHub token lacks permission to dispatch workflows. ' +
        'For classic PATs, enable the "repo" scope. ' +
        'For fine-grained PATs, grant "Actions: Read and write" and "Contents: Read" permissions. ' +
        'Update your token at https://github.com/settings/tokens and reconnect in the GitHub settings page.'
      );
    }
    throw err;
  }

  await prisma.deployment.update({
    where: { id: deploymentId },
    data: { status: 'rolling_back' },
  });

  const emitter = getLogEmitter(deploymentId);
  emitter.emit('log', { type: 'status', message: 'Rollback workflow dispatched to GitHub Actions' });

  setTimeout(async () => {
    try {
      await findAndStoreRunId(deploymentId, userId, owner, repo, workflowId, dispatchedAt);
    } catch (err) {
      logger.error(`Failed to find GitHub run for rollback ${deploymentId}`, { error: (err as Error).message });
    }
  }, 5000);
}

async function findAndStoreRunId(
  deploymentId: string,
  userId: string,
  owner: string,
  repo: string,
  workflowId: string,
  dispatchedAt: Date,
): Promise<void> {
  const octokit = await getOctokit(userId);

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
}

export async function pollGitHubDeployments(): Promise<void> {
  try {
    const deployments = await prisma.deployment.findMany({
      where: {
        executionMethod: 'github',
        status: { in: ['dispatched', 'running', 'destroying', 'rolling_back'] },
        githubRunId: { not: null },
      },
    });

    if (deployments.length === 0) return;

    // Group by createdById to reuse Octokit instances
    const byUser = new Map<string, typeof deployments>();
    for (const d of deployments) {
      const list = byUser.get(d.createdById) || [];
      list.push(d);
      byUser.set(d.createdById, list);
    }

    for (const [userId, userDeployments] of byUser) {
      let octokit: Octokit;
      try {
        octokit = await getOctokit(userId);
      } catch {
        logger.warn(`Cannot poll GitHub for user ${userId}: no connection`);
        continue;
      }

      for (const deployment of userDeployments) {
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
            await prisma.deployment.update({
              where: { id: deployment.id },
              data: {
                status: newStatus,
                githubRunUrl: run.html_url,
                errorMessage: newStatus === 'failed' ? `GitHub Actions run ${run.conclusion}: ${run.html_url}` : null,
              },
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
    }
  } catch (err) {
    logger.error('GitHub deployment polling failed', { error: (err as Error).message });
  }
}
