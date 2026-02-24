import yaml from 'js-yaml';

const REQUIRED_INPUTS = [
  'template_slug',
  'template_provider',
  'variables',
  'deployment_id',
  'deployment_name',
  'action',
] as const;

interface ValidationResult {
  valid: boolean;
  fixed: string | null;
  changes: string[];
}

/**
 * Ensures a workflow YAML has a workflow_dispatch trigger with all required inputs.
 * Uses string-based insertion to preserve comments and formatting.
 */
export function ensureWorkflowDispatch(content: string): ValidationResult {
  const changes: string[] = [];

  // Parse to inspect structure
  let doc: any;
  try {
    doc = yaml.load(content);
  } catch {
    return { valid: false, fixed: null, changes: ['Failed to parse YAML'] };
  }

  if (!doc || typeof doc !== 'object') {
    return { valid: false, fixed: null, changes: ['Invalid workflow file'] };
  }

  // js-yaml parses bare `on:` as { true: ... } because `on` is a YAML boolean
  const onKey = doc.on !== undefined ? 'on' : doc.true !== undefined ? 'true' : null;
  const triggers = onKey !== null ? doc[onKey] : null;

  const hasWorkflowDispatch =
    triggers &&
    typeof triggers === 'object' &&
    ('workflow_dispatch' in triggers);

  const existingInputs: Record<string, any> =
    hasWorkflowDispatch && triggers.workflow_dispatch?.inputs
      ? triggers.workflow_dispatch.inputs
      : {};

  const missingInputs = REQUIRED_INPUTS.filter((name) => !(name in existingInputs));

  if (hasWorkflowDispatch && missingInputs.length === 0) {
    return { valid: true, fixed: null, changes: [] };
  }

  // Build fixes using string insertion
  let fixed = content;

  if (!triggers) {
    // No `on:` block at all — add one at the top (after `name:` line if present)
    const inputsBlock = buildInputsBlock(REQUIRED_INPUTS as unknown as string[]);
    const triggerBlock = `\non:\n  workflow_dispatch:\n    inputs:\n${inputsBlock}\n`;
    const nameMatch = fixed.match(/^name:.*$/m);
    if (nameMatch) {
      const insertPos = (nameMatch.index ?? 0) + nameMatch[0].length;
      fixed = fixed.slice(0, insertPos) + triggerBlock + fixed.slice(insertPos);
    } else {
      fixed = triggerBlock + fixed;
    }
    changes.push('Added on.workflow_dispatch trigger with all required inputs');
  } else if (!hasWorkflowDispatch) {
    // Has `on:` but no workflow_dispatch — insert workflow_dispatch under `on:`
    const inputsBlock = buildInputsBlock(REQUIRED_INPUTS as unknown as string[]);
    const dispatchBlock = `  workflow_dispatch:\n    inputs:\n${inputsBlock}\n`;

    // Find the `on:` line (could be quoted or unquoted)
    const onLineRegex = /^(on|'on'|"on"):.*$/m;
    const onMatch = fixed.match(onLineRegex);
    if (onMatch) {
      const insertPos = (onMatch.index ?? 0) + onMatch[0].length;
      fixed = fixed.slice(0, insertPos) + '\n' + dispatchBlock + fixed.slice(insertPos);
    }
    changes.push('Added workflow_dispatch trigger with all required inputs');
  } else if (missingInputs.length > 0) {
    // Has workflow_dispatch but missing some inputs
    const inputsBlock = buildInputsBlock(missingInputs);

    if (Object.keys(existingInputs).length === 0) {
      // workflow_dispatch exists but has no inputs section
      const wdRegex = /^(\s*)workflow_dispatch:\s*$/m;
      const wdMatch = fixed.match(wdRegex);
      if (wdMatch) {
        const insertPos = (wdMatch.index ?? 0) + wdMatch[0].length;
        fixed = fixed.slice(0, insertPos) + '\n' + wdMatch[1] + '  inputs:\n' + inputsBlock + fixed.slice(insertPos);
      }
    } else {
      // Has inputs section — append missing inputs after the last existing input block
      const inputsRegex = /^(\s*)inputs:\s*$/m;
      const inputsMatch = fixed.match(inputsRegex);
      if (inputsMatch) {
        const baseIndent = inputsMatch[1] + '  ';
        // Find the end of the inputs block: scan forward for lines at the input indent level
        const afterInputs = (inputsMatch.index ?? 0) + inputsMatch[0].length;
        let endPos = afterInputs;
        const lines = fixed.slice(afterInputs).split('\n');
        for (const line of lines) {
          if (line.trim() === '') {
            endPos += line.length + 1;
            continue;
          }
          // If the line starts at or deeper than baseIndent, it's part of inputs
          if (line.startsWith(baseIndent) || line.match(/^\s*$/)) {
            endPos += line.length + 1;
          } else {
            break;
          }
        }
        fixed = fixed.slice(0, endPos) + buildInputsBlock(missingInputs) + fixed.slice(endPos);
      }
    }
    changes.push(`Added missing inputs: ${missingInputs.join(', ')}`);
  }

  return { valid: false, fixed, changes };
}

/**
 * Finds `hashicorp/setup-terraform` steps and adds `terraform_wrapper: false`
 * to the `with:` block if not already present.
 */
export function fixSetupTerraformWrapper(content: string): { fixed: string; changed: boolean } {
  const lines = content.split('\n');
  const result: string[] = [];
  let changed = false;
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Match `uses: hashicorp/setup-terraform` — either inline with `-` or as a property
    const inlineMatch = line.match(/^(\s*)-\s*uses:\s*hashicorp\/setup-terraform/);
    const propMatch = !inlineMatch ? line.match(/^(\s*)uses:\s*hashicorp\/setup-terraform/) : null;

    if (!inlineMatch && !propMatch) {
      result.push(line);
      i++;
      continue;
    }

    // Determine the indent for step properties (with:, name:, etc.)
    let propIndent: string;
    let stepItemIndent: string;
    if (inlineMatch) {
      // `    - uses: ...` → stepItemIndent="    ", propIndent="      "
      stepItemIndent = inlineMatch[1];
      propIndent = stepItemIndent + '  ';
    } else {
      // `      uses: ...` → propIndent is the uses line's indent, stepItemIndent is 2 less
      propIndent = propMatch![1];
      stepItemIndent = propIndent.length >= 2 ? propIndent.slice(0, -2) : '';
    }

    result.push(line);
    i++;

    // Scan forward through the step's remaining properties to find `with:` or end of step
    let withLineIdx = -1;
    let withIndent = '';
    let stepEnd = i;

    for (let j = i; j < lines.length; j++) {
      const l = lines[j];
      if (l.trim() === '') {
        stepEnd = j;
        break;
      }
      // Next step starts with `- ` at the step item indent level, or line is less indented
      if (l.match(new RegExp(`^${stepItemIndent}- `)) || (l.trim() !== '' && !l.startsWith(propIndent))) {
        stepEnd = j;
        break;
      }
      if (l.match(new RegExp(`^${propIndent}with:\\s*$`)) || l.match(new RegExp(`^${propIndent}with:\\s*#`))) {
        withLineIdx = j;
        withIndent = propIndent + '  ';
      }
      // Check if terraform_wrapper is already set
      if (withLineIdx !== -1 && l.includes('terraform_wrapper')) {
        withLineIdx = -2; // sentinel: already present
      }
      stepEnd = j + 1;
    }

    if (withLineIdx === -2) {
      while (i < stepEnd) {
        result.push(lines[i]);
        i++;
      }
      continue;
    }

    if (withLineIdx >= 0) {
      // Has `with:` block but no terraform_wrapper — insert after `with:` line
      while (i <= withLineIdx) {
        result.push(lines[i]);
        i++;
      }
      result.push(`${withIndent}terraform_wrapper: false`);
      changed = true;
      while (i < stepEnd) {
        result.push(lines[i]);
        i++;
      }
    } else {
      // No `with:` block — add one after the uses line
      result.push(`${propIndent}with:`);
      result.push(`${propIndent}  terraform_wrapper: false`);
      changed = true;
      while (i < stepEnd) {
        result.push(lines[i]);
        i++;
      }
    }
  }

  return { fixed: result.join('\n'), changed };
}

/**
 * Adds a job-level `env:` block that maps cloud credential repo secrets
 * to environment variables so Terraform can authenticate with the provider.
 */
export function fixTerraformEnvVars(content: string, secretNames: string[]): { fixed: string; changed: boolean } {
  if (secretNames.length === 0) {
    return { fixed: content, changed: false };
  }

  // Parse to check existing env vars
  let doc: any;
  try {
    doc = yaml.load(content);
  } catch {
    return { fixed: content, changed: false };
  }

  if (!doc?.jobs || typeof doc.jobs !== 'object') {
    return { fixed: content, changed: false };
  }

  // Check first job for existing env vars
  const jobEntries = Object.entries(doc.jobs) as [string, any][];
  const [, firstJob] = jobEntries[0] || [];
  if (!firstJob) return { fixed: content, changed: false };

  const existingEnv = firstJob.env || {};
  const missingSecrets = secretNames.filter((name) => !(name in existingEnv));
  if (missingSecrets.length === 0) {
    return { fixed: content, changed: false };
  }

  // Build env lines mapping secret names to ${{ secrets.NAME }}
  const envLines = missingSecrets
    .map((name) => `      ${name}: \${{ secrets.${name} }}`)
    .join('\n');

  let fixed = content;

  if (firstJob.env && Object.keys(firstJob.env).length > 0) {
    // Has existing env block — find it and append
    const envRegex = /^(\s+)env:\s*$/m;
    const envMatch = fixed.match(envRegex);
    if (envMatch) {
      const envIndent = envMatch[1] + '  ';
      // Find end of existing env block
      const afterEnv = (envMatch.index ?? 0) + envMatch[0].length;
      let endPos = afterEnv;
      const lines = fixed.slice(afterEnv).split('\n');
      for (const line of lines) {
        if (line.trim() === '' || line.startsWith(envIndent)) {
          endPos += line.length + 1;
        } else {
          break;
        }
      }
      fixed = fixed.slice(0, endPos) + envLines + '\n' + fixed.slice(endPos);
    }
  } else {
    // No env block — add one after runs-on or environment line
    const jobPropRegex = /^(\s+)(runs-on|environment):.*$/gm;
    let lastMatch: RegExpExecArray | null = null;
    let m: RegExpExecArray | null;
    while ((m = jobPropRegex.exec(fixed)) !== null) {
      lastMatch = m;
    }
    if (lastMatch) {
      const jobIndent = lastMatch[1];
      const insertPos = lastMatch.index + lastMatch[0].length;
      fixed = fixed.slice(0, insertPos) + `\n\n${jobIndent}env:\n${envLines}` + fixed.slice(insertPos);
    }
  }

  return { fixed, changed: true };
}

/**
 * Changes `terraform fmt -check` to `terraform fmt` so it auto-formats
 * instead of failing on formatting differences in pushed template files.
 */
export function fixTerraformFmtCheck(content: string): { fixed: string; changed: boolean } {
  const fmtCheckRegex = /^(\s*run:\s*)terraform\s+fmt\s+-check\s*$/gm;
  if (!fmtCheckRegex.test(content)) {
    return { fixed: content, changed: false };
  }
  const fixed = content.replace(
    /^(\s*run:\s*)terraform\s+fmt\s+-check\s*$/gm,
    '$1terraform fmt',
  );
  return { fixed, changed: true };
}

/**
 * Fixes the Terraform Apply step's `if` condition so it runs on workflow_dispatch
 * events (when action == 'apply') in addition to push events.
 * Also fixes the Terraform Plan step to save a plan file and the Apply step to use it.
 */
export function fixTerraformApplyCondition(content: string): { fixed: string; changed: boolean } {
  let fixed = content;
  let changed = false;

  // Fix Apply condition: replace any existing `if:` on the Apply step
  // Common patterns: `if: github.ref == ... && github.event_name == 'push'`
  const applyIfRegex = /^(\s*-\s*name:\s*Terraform Apply\s*\n\s*)if:.*$/m;
  const applyIfMatch = fixed.match(applyIfRegex);
  if (applyIfMatch) {
    const newCondition = `${applyIfMatch[1]}if: github.event_name == 'workflow_dispatch' && inputs.action == 'apply'`;
    fixed = fixed.replace(applyIfMatch[0], newCondition);
    changed = true;
  }

  // Fix Plan to use -out=tfplan so Apply can use the saved plan
  const planRunRegex = /^(\s*run:\s*)terraform\s+plan\s+-input=false\s*$/m;
  if (planRunRegex.test(fixed) && !/terraform plan.*-out/m.test(fixed)) {
    fixed = fixed.replace(planRunRegex, '$1terraform plan -input=false -out=tfplan');
    changed = true;
  }

  // Fix Apply to use the saved plan file
  const applyRunRegex = /^(\s*run:\s*)terraform\s+apply\s+-auto-approve\s+-input=false\s*$/m;
  if (applyRunRegex.test(fixed)) {
    fixed = fixed.replace(applyRunRegex, '$1terraform apply -auto-approve tfplan');
    changed = true;
  }

  return { fixed, changed };
}

/**
 * Ensures the job's `defaults.run` block includes `working-directory: terraform`
 * so that terraform commands execute in the directory where template files are pushed.
 */
export function fixWorkingDirectory(content: string): { fixed: string; changed: boolean } {
  // Parse to check if working-directory is already set
  let doc: any;
  try {
    doc = yaml.load(content);
  } catch {
    return { fixed: content, changed: false };
  }

  if (!doc?.jobs || typeof doc.jobs !== 'object') {
    return { fixed: content, changed: false };
  }

  // Check all jobs — if any already has working-directory: terraform, skip
  const jobs = Object.values(doc.jobs) as any[];
  const allHaveWorkDir = jobs.every(
    (job) => job?.defaults?.run?.['working-directory'] === 'terraform',
  );
  if (allHaveWorkDir) {
    return { fixed: content, changed: false };
  }

  // String-based fix: find `defaults:` blocks and add/update working-directory
  let fixed = content;
  let changed = false;

  for (const [jobName, job] of Object.entries(doc.jobs) as [string, any][]) {
    if (job?.defaults?.run?.['working-directory'] === 'terraform') {
      continue;
    }

    if (job?.defaults?.run) {
      // Has defaults.run but no working-directory (or wrong value)
      // Find the `shell:` or last property under `run:` within this job's defaults
      // Look for the run: line under defaults:
      const runRegex = /^(\s+)run:\s*$/m;
      const runMatch = fixed.match(runRegex);
      if (runMatch) {
        const runIndent = runMatch[1];
        const propIndent = runIndent + '  ';
        const insertPos = (runMatch.index ?? 0) + runMatch[0].length;
        // Check if working-directory already exists as text (might have wrong value)
        const wdRegex = new RegExp(`^${propIndent}working-directory:.*$`, 'm');
        const wdMatch = fixed.match(wdRegex);
        if (wdMatch) {
          fixed = fixed.replace(wdMatch[0], `${propIndent}working-directory: terraform`);
        } else {
          fixed = fixed.slice(0, insertPos) + `\n${propIndent}working-directory: terraform` + fixed.slice(insertPos);
        }
        changed = true;
      }
    } else if (job?.defaults) {
      // Has defaults but no run block
      const defaultsRegex = /^(\s+)defaults:\s*$/m;
      const defaultsMatch = fixed.match(defaultsRegex);
      if (defaultsMatch) {
        const defIndent = defaultsMatch[1];
        const insertPos = (defaultsMatch.index ?? 0) + defaultsMatch[0].length;
        fixed = fixed.slice(0, insertPos) + `\n${defIndent}  run:\n${defIndent}    working-directory: terraform` + fixed.slice(insertPos);
        changed = true;
      }
    } else {
      // No defaults block — add one after runs-on or environment line
      const jobHeaderRegex = new RegExp(`^(\\s+)(runs-on|environment):.*$`, 'gm');
      let lastMatch: RegExpExecArray | null = null;
      let m: RegExpExecArray | null;
      while ((m = jobHeaderRegex.exec(fixed)) !== null) {
        lastMatch = m;
      }
      if (lastMatch) {
        const jobIndent = lastMatch[1];
        const insertPos = lastMatch.index + lastMatch[0].length;
        fixed = fixed.slice(0, insertPos) + `\n\n${jobIndent}defaults:\n${jobIndent}  run:\n${jobIndent}    working-directory: terraform` + fixed.slice(insertPos);
        changed = true;
      }
    }
  }

  return { fixed, changed };
}

/**
 * Ensures the workflow has a "Terraform Destroy" step that runs
 * `terraform destroy -auto-approve` when `inputs.action == 'destroy'`.
 */
export function fixTerraformDestroyStep(content: string): { fixed: string; changed: boolean } {
  const hasDestroyStep = /name:\s*Terraform Destroy/m.test(content);

  // Check if Apply step is broken (missing `run:`)
  const applyBroken = /- name: Terraform Apply\s*\n\s*if:.*\n\s*\n/m.test(content) ||
    /- name: Terraform Apply\s*\n\s*if:.*\n\s*- name:/m.test(content);

  if (applyBroken) {
    // Rebuild both steps cleanly by removing the broken Destroy step (if any)
    // and the broken Apply step, then re-adding both correctly
    const lines = content.split('\n');
    const result: string[] = [];
    let stepIndent = '    ';
    let i = 0;

    while (i < lines.length) {
      const applyMatch = lines[i].match(/^(\s*)-\s*name:\s*Terraform Apply/);
      const destroyMatch = lines[i].match(/^(\s*)-\s*name:\s*Terraform Destroy/);

      if (applyMatch || destroyMatch) {
        if (applyMatch) stepIndent = applyMatch[1];
        // Skip this entire step
        i++;
        const propIndent = stepIndent + '  ';
        while (i < lines.length) {
          if (lines[i].match(new RegExp(`^${stepIndent}-\\s`))) break;
          if (lines[i].trim() !== '' && !lines[i].startsWith(propIndent)) break;
          i++;
        }
        continue;
      }
      result.push(lines[i]);
      i++;
    }

    // Remove trailing blank lines before appending
    while (result.length > 0 && result[result.length - 1].trim() === '') {
      result.pop();
    }

    const propIndent = stepIndent + '  ';
    result.push(
      '',
      `${stepIndent}- name: Terraform Apply`,
      `${propIndent}if: github.event_name == 'workflow_dispatch' && inputs.action == 'apply'`,
      `${propIndent}run: terraform apply -auto-approve tfplan`,
      '',
      `${stepIndent}- name: Terraform Destroy`,
      `${propIndent}if: github.event_name == 'workflow_dispatch' && inputs.action == 'destroy'`,
      `${propIndent}run: terraform destroy -auto-approve -input=false`,
    );

    return { fixed: result.join('\n') + '\n', changed: true };
  }

  if (hasDestroyStep) {
    return { fixed: content, changed: false };
  }

  const lines = content.split('\n');
  let applyStepStart = -1;
  let stepIndent = '';

  // Find the "Terraform Apply" step
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^(\s*)-\s*name:\s*Terraform Apply/);
    if (match) {
      applyStepStart = i;
      stepIndent = match[1];
      break;
    }
  }

  if (applyStepStart === -1) {
    return { fixed: content, changed: false };
  }

  // Find the end of the Apply step by scanning for the next step or end of block
  const propIndent = stepIndent + '  ';
  let insertAfter = applyStepStart;
  for (let i = applyStepStart + 1; i < lines.length; i++) {
    const line = lines[i];
    // Next step at same indent level
    if (line.match(new RegExp(`^${stepIndent}-\\s`))) {
      break;
    }
    // Continuation line (indented deeper or blank)
    if (line.trim() === '' || line.startsWith(propIndent)) {
      insertAfter = i;
    } else {
      break;
    }
  }

  // Insert destroy step after the apply step
  const destroyLines = [
    '',
    `${stepIndent}- name: Terraform Destroy`,
    `${propIndent}if: github.event_name == 'workflow_dispatch' && inputs.action == 'destroy'`,
    `${propIndent}run: terraform destroy -auto-approve -input=false`,
  ];

  const result = [
    ...lines.slice(0, insertAfter + 1),
    ...destroyLines,
    ...lines.slice(insertAfter + 1),
  ];

  return { fixed: result.join('\n'), changed: true };
}

/**
 * Manages terraform state persistence using GitHub Actions artifacts
 * instead of committing state to the repo (which triggers push protection
 * since state files contain secrets like access keys).
 *
 * Adds two steps:
 * 1. "Restore Terraform State" — after checkout, downloads the latest
 *    state artifact from a previous workflow run via the GitHub API.
 * 2. "Save Terraform State" — at the end, uploads terraform.tfstate
 *    as an artifact using actions/upload-artifact@v4.
 */
export function fixTerraformStatePersistence(content: string): { fixed: string; changed: boolean } {
  const hasArtifactSave = /name:\s*Save Terraform State/m.test(content) && /upload-artifact/m.test(content);
  const hasRestore = /name:\s*Restore Terraform State/m.test(content);

  // Already has artifact-based state management
  if (hasArtifactSave && hasRestore) {
    return { fixed: content, changed: false };
  }

  let fixed = content;
  let changed = false;

  // Remove old git-based "Save Terraform State" step if present
  const hasOldGitSave = /name:\s*Save Terraform State/m.test(fixed) && !hasArtifactSave;
  if (hasOldGitSave) {
    const lines = fixed.split('\n');
    const result: string[] = [];
    let i = 0;
    while (i < lines.length) {
      const match = lines[i].match(/^(\s*)-\s*name:\s*Save Terraform State/);
      if (match) {
        const si = match[1];
        const pi = si + '  ';
        if (result.length > 0 && result[result.length - 1].trim() === '') {
          result.pop();
        }
        i++;
        while (i < lines.length) {
          if (lines[i].trim() === '') { i++; continue; }
          if (lines[i].match(new RegExp(`^${si}-\\s`))) break;
          if (!lines[i].startsWith(pi)) break;
          i++;
        }
        changed = true;
        continue;
      }
      result.push(lines[i]);
      i++;
    }
    fixed = result.join('\n');
  }

  // Add "Restore Terraform State" step after checkout
  if (!hasRestore) {
    const lines = fixed.split('\n');
    const result: string[] = [];
    let inserted = false;
    let i = 0;

    while (i < lines.length) {
      result.push(lines[i]);

      if (!inserted && /uses:\s*actions\/checkout/.test(lines[i])) {
        let stepIndent = '      ';
        for (let j = result.length - 1; j >= 0; j--) {
          const m = result[j].match(/^(\s*)-\s*(name:|uses:)/);
          if (m) { stepIndent = m[1]; break; }
        }
        const propIndent = stepIndent + '  ';

        // Continue past remaining checkout step lines
        i++;
        while (i < lines.length) {
          if (lines[i].match(new RegExp(`^${stepIndent}-\\s`)) ||
              (lines[i].trim() !== '' && !lines[i].startsWith(propIndent))) {
            break;
          }
          result.push(lines[i]);
          i++;
        }

        result.push('');
        result.push(`${stepIndent}- name: Restore Terraform State`);
        result.push(`${propIndent}if: github.event_name == 'workflow_dispatch'`);
        result.push(`${propIndent}continue-on-error: true`);
        result.push(`${propIndent}env:`);
        result.push(`${propIndent}  GH_TOKEN: \${{ github.token }}`);
        result.push(`${propIndent}working-directory: \${{ github.workspace }}`);
        result.push(`${propIndent}run: |`);
        result.push(`${propIndent}  ARTIFACT_NAME="terraform-state-\${{ inputs.deployment_id }}"`);
        result.push(`${propIndent}  ARTIFACT_ID=$(gh api "repos/\${{ github.repository }}/actions/artifacts?name=\${ARTIFACT_NAME}&per_page=1" --jq '.artifacts[0].id // empty' 2>/dev/null || true)`);
        result.push(`${propIndent}  if [ -n "$ARTIFACT_ID" ]; then`);
        result.push(`${propIndent}    echo "Restoring state from artifact \${ARTIFACT_ID}"`);
        result.push(`${propIndent}    gh api "repos/\${{ github.repository }}/actions/artifacts/\${ARTIFACT_ID}/zip" > /tmp/state.zip`);
        result.push(`${propIndent}    unzip -o /tmp/state.zip -d terraform/`);
        result.push(`${propIndent}    rm /tmp/state.zip`);
        result.push(`${propIndent}    echo "Terraform state restored"`);
        result.push(`${propIndent}  else`);
        result.push(`${propIndent}    echo "No previous state found"`);
        result.push(`${propIndent}  fi`);

        inserted = true;
        changed = true;
        continue;
      }

      i++;
    }

    fixed = result.join('\n');
  }

  // Add artifact-based "Save Terraform State" step at end
  if (!hasArtifactSave) {
    const lines = fixed.split('\n');
    let lastStepLine = -1;
    let stepIndent = '      ';

    for (let i = 0; i < lines.length; i++) {
      const m = lines[i].match(/^(\s*)-\s*name:\s*/);
      if (m) {
        lastStepLine = i;
        stepIndent = m[1];
      }
    }

    if (lastStepLine !== -1) {
      const propIndent = stepIndent + '  ';
      let insertAfter = lastStepLine;
      for (let i = lastStepLine + 1; i < lines.length; i++) {
        if (lines[i].match(new RegExp(`^${stepIndent}-\\s`))) break;
        if (lines[i].trim() === '' || lines[i].startsWith(propIndent)) {
          insertAfter = i;
        } else {
          break;
        }
      }

      const saveStep = [
        '',
        `${stepIndent}- name: Save Terraform State`,
        `${propIndent}if: always() && github.event_name == 'workflow_dispatch'`,
        `${propIndent}uses: actions/upload-artifact@v4`,
        `${propIndent}with:`,
        `${propIndent}  name: terraform-state-\${{ inputs.deployment_id }}`,
        `${propIndent}  path: terraform/terraform.tfstate`,
        `${propIndent}  if-no-files-found: ignore`,
        `${propIndent}  overwrite: true`,
      ];

      const result = [
        ...lines.slice(0, insertAfter + 1),
        ...saveStep,
        ...lines.slice(insertAfter + 1),
      ];

      fixed = result.join('\n');
      changed = true;
    }
  }

  return { fixed, changed };
}

function buildInputsBlock(inputs: string[]): string {
  return inputs
    .map(
      (name) =>
        `      ${name}:\n        description: '${name}'\n        required: true\n        type: string`,
    )
    .join('\n');
}
