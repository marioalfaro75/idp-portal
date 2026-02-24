import type { TemplateVariable } from '../types/template';

/**
 * Parse a Terraform type string into a base type.
 * Handles: string, number, bool, list(string), list(object({...})), map(string), object({...}), etc.
 */
export function getBaseType(tfType: string): 'string' | 'number' | 'bool' | 'list' | 'map' | 'object' {
  const t = tfType.trim().toLowerCase();
  if (t === 'any') return 'object';
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
 * e.g. "list(object({id = string, enabled = bool}))" → '[{"id": "abc-12345", "enabled": false}]'
 * Accepts an optional variableName to produce context-aware realistic values.
 */
export function generateTypeExample(tfType: string, variableName?: string): string | null {
  const t = tfType.trim();

  // any type — generic object
  if (t.toLowerCase() === 'any') {
    return JSON.stringify({ key: 'value' }, null, 2);
  }

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

  // map(type)
  const mapMatch = t.match(/^map\s*\(\s*(\w+)\s*\)$/);
  if (mapMatch) {
    const innerType = mapMatch[1].toLowerCase();
    const varName = (variableName || '').toLowerCase();
    if (innerType === 'string') {
      if (varName.includes('tag') || varName.includes('label')) {
        return JSON.stringify({ Environment: 'production', Team: 'platform' }, null, 2);
      }
      if (varName.includes('setting') || varName.includes('env') || varName.includes('variable')) {
        return JSON.stringify({ LOG_LEVEL: 'info', APP_ENV: 'production' }, null, 2);
      }
      return JSON.stringify({ key1: 'value1', key2: 'value2' }, null, 2);
    }
    if (innerType === 'number') {
      return JSON.stringify({ key1: 1, key2: 2 }, null, 2);
    }
    if (innerType === 'bool') {
      return JSON.stringify({ feature_a: true, feature_b: false }, null, 2);
    }
    // fallback map
    return JSON.stringify({ key1: 'value1', key2: 'value2' }, null, 2);
  }

  return null;
}

/**
 * Parse object field definitions using bracket-depth tracking to handle
 * multi-line nested types like list(object({...})) and optional(type).
 */
function parseObjectFields(fieldsStr: string): Record<string, unknown> | null {
  const fields: Record<string, unknown> = {};
  const content = fieldsStr.trim();
  let i = 0;

  while (i < content.length) {
    // Skip whitespace
    while (i < content.length && /\s/.test(content[i])) i++;
    if (i >= content.length) break;

    // Match field name: word = ...
    const remaining = content.substring(i);
    const nameMatch = remaining.match(/^(\w+)\s*=\s*/);
    if (!nameMatch) {
      const nl = content.indexOf('\n', i);
      i = nl === -1 ? content.length : nl + 1;
      continue;
    }

    const fieldName = nameMatch[1];
    i += nameMatch[0].length;

    // Parse type value with bracket depth tracking
    const typeStart = i;
    let depth = 0;
    while (i < content.length) {
      const ch = content[i];
      if (ch === '(' || ch === '{' || ch === '[') {
        depth++;
        i++;
      } else if (ch === ')' || ch === '}' || ch === ']') {
        if (depth === 0) break;
        depth--;
        i++;
      } else if (depth === 0 && ch === '\n') {
        break;
      } else {
        i++;
      }
    }

    const rawType = content.substring(typeStart, i).trim();
    if (rawType) {
      fields[fieldName] = defaultForType(rawType, fieldName);
    }
  }

  return Object.keys(fields).length > 0 ? fields : null;
}

/**
 * Unwrap optional(type) or optional(type, default) → inner type string.
 */
function unwrapOptional(t: string): string {
  if (!t.startsWith('optional(') || !t.endsWith(')')) return t;
  const inner = t.slice('optional('.length, -1);
  // Find first comma at depth 0 to separate type from default value
  let depth = 0;
  for (let i = 0; i < inner.length; i++) {
    if (inner[i] === '(' || inner[i] === '{' || inner[i] === '[') depth++;
    else if (inner[i] === ')' || inner[i] === '}' || inner[i] === ']') depth--;
    else if (inner[i] === ',' && depth === 0) {
      return inner.substring(0, i).trim();
    }
  }
  return inner.trim();
}

function defaultForType(t: string, fieldName?: string): unknown {
  const name = (fieldName || '').toLowerCase();

  // Unwrap optional(type) or optional(type, default)
  const unwrapped = unwrapOptional(t);
  if (unwrapped !== t) return defaultForType(unwrapped, fieldName);

  if (t === 'bool') {
    if (name.includes('enabled') || name.includes('active')) return true;
    return false;
  }

  if (t === 'number') {
    if (name.includes('capacity') || name.includes('count') || name.includes('size')) return 5;
    if (name.includes('port')) return 8080;
    return 1;
  }

  // Nested list(object({...})) → recursive
  const listObjMatch = t.match(/^(?:list|set)\s*\(\s*object\s*\(\s*\{([\s\S]*)\}\s*\)\s*\)$/);
  if (listObjMatch) {
    const obj = parseObjectFields(listObjMatch[1]);
    if (obj) return [obj];
    return [];
  }

  // Nested object({...}) → recursive
  const objMatch = t.match(/^object\s*\(\s*\{([\s\S]*)\}\s*\)$/);
  if (objMatch) {
    const obj = parseObjectFields(objMatch[1]);
    if (obj) return obj;
    return {};
  }

  // list(string) / set(string) → populated array
  if (/^(?:list|set)\s*\(\s*string\s*\)$/.test(t)) return ['value1', 'value2'];

  // map(type) → populated object
  const mapMatch = t.match(/^map\s*\(\s*(\w+)\s*\)$/);
  if (mapMatch) {
    const inner = mapMatch[1].toLowerCase();
    if (inner === 'number') return { key1: 1, key2: 2 };
    if (inner === 'bool') return { feature_a: true, feature_b: false };
    return { key1: 'value1', key2: 'value2' };
  }

  if (t.startsWith('list') || t.startsWith('set')) return [];
  if (t.startsWith('map')) return {};

  // String type — use field name patterns for realistic values
  if (name.includes('secret') || name.includes('password') || name.includes('token')) return '<secret-value>';
  if (name.includes('arn')) return 'arn:aws:iam::123456789012:role/example-role';
  if (name.includes('email')) return 'user@example.com';
  if (name.includes('url') || name.includes('endpoint')) return 'https://example.com';
  if (name.includes('cidr')) return '10.0.0.0/16';
  if (name.includes('region')) return 'us-east-1';
  if (name.includes('version')) return 'latest';
  if (name.includes('description')) return 'Example description';
  if (name.includes('projection')) return 'ALL';
  if (name.includes('name')) return 'my-resource';
  if (name.includes('key')) return 'my-key';
  if (name.includes('id')) return 'abc-12345';
  if (name.includes('type')) return 'standard';
  return 'example-value';
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
