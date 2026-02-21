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

function buildInputsBlock(inputs: string[]): string {
  return inputs
    .map(
      (name) =>
        `      ${name}:\n        description: '${name}'\n        required: true\n        type: string`,
    )
    .join('\n');
}
