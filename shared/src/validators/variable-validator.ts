import type { TemplateVariable } from '../types/template';

/**
 * Parse a Terraform type string into a base type.
 * Handles: string, number, bool, list(string), list(object({...})), map(string), object({...}), etc.
 */
export function getBaseType(tfType: string): 'string' | 'number' | 'bool' | 'list' | 'map' | 'object' {
  const t = tfType.trim().toLowerCase();
  if (t === 'number') return 'number';
  if (t === 'bool') return 'bool';
  if (t.startsWith('list') || t.startsWith('set')) return 'list';
  if (t.startsWith('map')) return 'map';
  if (t.startsWith('object')) return 'object';
  return 'string';
}

/**
 * Extract allowed values from contains(["a", "b"], var.x) validation patterns.
 * Returns the list of allowed values, or null if the pattern doesn't match.
 */
export function parseContainsValidation(validation: string): string[] | null {
  // Match contains([...], var.xxx) pattern
  const match = validation.match(/contains\s*\(\s*\[([^\]]+)\]\s*,/);
  if (!match) return null;

  const inner = match[1];
  const values: string[] = [];
  // Match quoted strings
  const re = /"([^"]*?)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(inner)) !== null) {
    values.push(m[1]);
  }
  return values.length > 0 ? values : null;
}

/**
 * Validate variable values against their definitions.
 * Returns a map of field name → error message for invalid fields.
 */
export function validateVariables(
  values: Record<string, string>,
  definitions: TemplateVariable[],
): Record<string, string> {
  const errors: Record<string, string> = {};

  for (const def of definitions) {
    const value = values[def.name]?.trim() ?? '';

    // Required check
    if (def.required && !value) {
      errors[def.name] = 'This field is required';
      continue;
    }

    // Skip validation for empty optional fields
    if (!value) continue;

    const baseType = getBaseType(def.type);

    switch (baseType) {
      case 'number':
        if (isNaN(Number(value))) {
          errors[def.name] = 'Must be a valid number';
        }
        break;

      case 'bool':
        if (!['true', 'false'].includes(value.toLowerCase())) {
          errors[def.name] = 'Must be true or false';
        }
        break;

      case 'list':
        // Accept JSON arrays or comma-separated for list(string)
        if (value.startsWith('[')) {
          try {
            const parsed = JSON.parse(value);
            if (!Array.isArray(parsed)) {
              errors[def.name] = 'Must be a valid JSON array';
            }
          } catch {
            errors[def.name] = 'Must be a valid JSON array';
          }
        }
        // Comma-separated is always valid for list(string)
        break;

      case 'map':
      case 'object':
        try {
          const parsed = JSON.parse(value);
          if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
            errors[def.name] = `Must be a valid JSON object`;
          }
        } catch {
          errors[def.name] = `Must be a valid JSON object`;
        }
        break;
    }

    // Contains validation check
    if (!errors[def.name] && def.validation) {
      const allowed = parseContainsValidation(def.validation);
      if (allowed && !allowed.includes(value)) {
        errors[def.name] = `Must be one of: ${allowed.join(', ')}`;
      }
    }
  }

  return errors;
}

/**
 * Generate an example JSON string from a Terraform type definition.
 * e.g. "list(object({id = string, enabled = bool}))" → '[{"id": "", "enabled": false}]'
 */
export function generateTypeExample(tfType: string): string | null {
  const t = tfType.trim();

  // list(object({...})) or set(object({...}))
  const listObjMatch = t.match(/^(?:list|set)\s*\(\s*object\s*\(\s*\{([\s\S]*)\}\s*\)\s*\)$/);
  if (listObjMatch) {
    const obj = parseObjectFields(listObjMatch[1]);
    if (obj) return JSON.stringify([obj], null, 2);
  }

  // object({...})
  const objMatch = t.match(/^object\s*\(\s*\{([\s\S]*)\}\s*\)$/);
  if (objMatch) {
    const obj = parseObjectFields(objMatch[1]);
    if (obj) return JSON.stringify(obj, null, 2);
  }

  return null;
}

function parseObjectFields(fieldsStr: string): Record<string, unknown> | null {
  const fields: Record<string, unknown> = {};
  // Match field = type patterns, handling nested types
  const lines = fieldsStr.split('\n').map(l => l.trim()).filter(Boolean);
  for (const line of lines) {
    const m = line.match(/^(\w+)\s*=\s*(.+?)$/);
    if (!m) continue;
    const [, name, rawType] = m;
    fields[name] = defaultForType(rawType.trim());
  }
  return Object.keys(fields).length > 0 ? fields : null;
}

function defaultForType(t: string): unknown {
  if (t === 'string') return '';
  if (t === 'number') return 0;
  if (t === 'bool') return false;
  if (t.startsWith('list')) return [];
  if (t.startsWith('map')) return {};
  return '';
}

/**
 * Convert a string value to a properly typed value for Terraform tfvars.
 */
export function coerceVariableValue(value: string, tfType: string): unknown {
  const trimmed = value.trim();
  const baseType = getBaseType(tfType);

  switch (baseType) {
    case 'number':
      return Number(trimmed);

    case 'bool':
      return trimmed.toLowerCase() === 'true';

    case 'list':
      if (trimmed.startsWith('[')) {
        return JSON.parse(trimmed);
      }
      // Comma-separated → string array
      return trimmed.split(',').map((s) => s.trim()).filter(Boolean);

    case 'map':
    case 'object':
      return JSON.parse(trimmed);

    default:
      return trimmed;
  }
}
