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
    const propMatch = !inlineMatch && line.match(/^(\s*)uses:\s*hashicorp\/setup-terraform/);

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

function buildInputsBlock(inputs: string[]): string {
  return inputs
    .map(
      (name) =>
        `      ${name}:\n        description: '${name}'\n        required: true\n        type: string`,
    )
    .join('\n');
}
