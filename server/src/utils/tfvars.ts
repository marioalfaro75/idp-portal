import type { TemplateVariable } from '@idp/shared';
import { coerceVariableValue } from '@idp/shared';

/**
 * Generate a terraform.tfvars.json string with properly typed values.
 * Terraform natively loads .tfvars.json files and expects typed JSON values.
 * Skips entries where the value is empty (lets Terraform use defaults).
 */
export function generateTfvarsJson(
  variables: Record<string, string>,
  definitions: TemplateVariable[],
): string {
  const defMap = new Map(definitions.map((d) => [d.name, d]));
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(variables)) {
    if (!value || !value.trim()) continue;

    const def = defMap.get(key);
    if (!def) continue; // Skip variables not defined in the template
    result[key] = coerceVariableValue(value, def.type);
  }

  return JSON.stringify(result, null, 2);
}
