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
      if (varName.includes('dimension')) {
        return JSON.stringify({ InstanceId: 'i-1234567890abcdef0' }, null, 2);
      }
      if (varName.includes('deploy') || varName.includes('configuration')) {
        return JSON.stringify({ ClusterName: 'my-cluster', ServiceName: 'my-service' }, null, 2);
      }
      if (varName.includes('named_value')) {
        return JSON.stringify({ BackendUrl: 'https://api.example.com', RateLimit: '100' }, null, 2);
      }
      if (varName.includes('secret')) {
        return JSON.stringify({ DATABASE_URL: '<secret-value>', API_KEY: '<secret-value>' }, null, 2);
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
    if (name.includes('expiration') && name.includes('days')) return 90;
    if (name.includes('days')) return 30;
    if (name.includes('age') || name.includes('seconds') || name.includes('timeout') || name.includes('ttl')) return 3600;
    if (name.includes('threshold')) return 80;
    if (name.includes('period') && !name.includes('days')) return 300;
    if (name.includes('severity')) return 2;
    if (name.includes('quota')) return 50;
    if (name.includes('interval')) return 300;
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

  // list(string) / set(string) → field-name-aware arrays
  if (/^(?:list|set)\s*\(\s*string\s*\)$/.test(t)) {
    if (name.includes('method')) return ['GET', 'PUT'];
    if (name.includes('expose') && name.includes('header')) return ['ETag'];
    if (name.includes('header')) return ['*'];
    if (name.includes('origin')) return ['https://example.com'];
    if (name.includes('action')) return ['*'];
    if (name.includes('protocol')) return ['Http', 'Https'];
    if (name.includes('cidr') || name.includes('prefix')) return ['10.0.0.0/16'];
    if (name.includes('permission')) return ['Get', 'List', 'Create'];
    if (name.includes('operations')) return ['Encrypt', 'Decrypt'];
    if (name.includes('scope')) return ['/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/my-rg'];
    if (name.includes('log_categor') || name.includes('metric_categor')) return ['AllMetrics'];
    if (name.includes('event_type')) return ['Error', 'Warning'];
    if (name.includes('path_pattern') || name.includes('patterns')) return ['/static/*', '/images/*'];
    if (name.includes('service')) return ['Microsoft.Storage', 'Microsoft.Sql'];
    return ['value1', 'value2'];
  }

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
  // Order matters: more specific patterns must come before generic ones.

  // Secrets / sensitive
  if (name.includes('secret') || name.includes('password') || name.includes('token')) return '<secret-value>';

  // ARNs and cloud resource identifiers
  if (name.includes('arn')) return 'arn:aws:iam::123456789012:role/example-role';
  if (name.includes('grantee_principal')) return 'arn:aws:iam::123456789012:role/app-role';
  if (name.includes('principal_id') || name.includes('object_id')) return '00000000-0000-0000-0000-000000000000';
  if (name.includes('resource_id') || name.includes('target_resource')) return '/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/my-rg/providers/Microsoft.Compute/virtualMachines/my-vm';

  // Contact / communication
  if (name.includes('email')) return 'user@example.com';
  if (name.includes('uri')) return 'https://example.com/webhook';
  if (name.includes('url') || name.includes('endpoint')) return 'https://example.com';

  // IP addresses
  if (name.includes('start_ip')) return '203.0.113.0';
  if (name.includes('end_ip')) return '203.0.113.255';

  // Networking
  if (name.includes('cidr')) return '10.0.0.0/16';

  // Cloud locations
  if (name.includes('location') && !name.includes('log')) return 'eastus2';
  if (name.includes('region')) return 'us-east-1';

  // Monitoring / observability
  if (name.includes('comparison_operator')) return 'GreaterThanOrEqualToThreshold';
  if (name.includes('statistic')) return 'Average';
  if (name.includes('aggregation')) return 'Average';
  if (name === 'operator') return 'GreaterThan';
  if (name.includes('treat_missing')) return 'missing';
  if (name.includes('frequency')) return 'PT5M';
  if (name.includes('window_size')) return 'PT15M';
  if (name.includes('cache_duration')) return '1.00:00:00';
  if (name.includes('metric_namespace') || name === 'namespace') return 'AWS/EC2';
  if (name.includes('metric_name')) return 'CPUUtilization';
  if (name.includes('operation_name')) return 'Microsoft.Compute/virtualMachines/write';

  // IAM / RBAC (before generic *name*, *id*)
  if (name === 'effect') return 'Allow';
  if (name.includes('role_definition_name')) return 'Contributor';
  if (name.includes('service_account') && !name.includes('scope')) return 'my-app@my-project.iam.gserviceaccount.com';
  if (name === 'member') return 'user:admin@example.com';
  if (name === 'role') return 'roles/editor';
  if (name === 'role_id') return 'customStorageViewer';

  // Database-specific (before generic *type*)
  if (name.includes('hash_key_type') || name.includes('range_key_type')) return 'S';
  if (name.includes('projection_type')) return 'ALL';
  if (name.includes('stream_view_type')) return 'NEW_AND_OLD_IMAGES';

  // Cloud resource types / kinds (before generic *type*)
  if (name.includes('action_type')) return 'Delete';
  if (name.includes('access_type')) return 'private';
  if (name === 'kind') return 'CanNotDelete';

  // Activity / severity levels
  if (name === 'level') return 'Warning';
  if (name === 'category') return 'Administrative';

  // Logging / filtering
  if (name === 'pattern') return 'ERROR';
  if (name === 'filter') return 'severity >= WARNING';

  // Display names / titles (before generic *name*)
  if (name.includes('display_name')) return 'My Application';
  if (name.includes('title')) return 'My Custom Resource';
  if (name.includes('query_string')) return 'fields @timestamp, @message | filter @message like /ERROR/ | limit 20';
  if (name.includes('collection')) return 'users';
  if (name.includes('field_path')) return 'status';

  // Existing generic patterns
  if (name.includes('version')) return 'latest';
  if (name.includes('description')) return 'Example description';
  if (name.includes('projection')) return 'ALL';
  if (name.includes('prefix')) return 'logs/';
  if (name.includes('storage_class') || name.includes('storageclass')) return 'STANDARD_IA';
  if (name.includes('class')) return 'standard';

  // Generic identifiers (broadest matchers last)
  if (name.includes('name')) return 'my-resource';
  if (name.includes('key')) return 'my-key';
  if (name.includes('id')) return 'abc-12345';
  if (name.includes('type')) return 'standard';
  return 'example-value';
}

/** Known placeholder strings used in auto-generated examples */
const PLACEHOLDER_PATTERNS = [
  'example-value',
  'abc-12345',
  '<secret-value>',
  'my-resource',
  'my-key',
  'arn:aws:iam::123456789012:role/example-role',
  '00000000-0000-0000-0000-000000000000',
  'my-app@my-project.iam.gserviceaccount.com',
];

/**
 * Check if a complex type field value contains auto-generated placeholder values.
 * Returns true if the value likely contains unmodified example data.
 */
export function containsPlaceholderValues(value: string): boolean {
  if (!value || !value.trim()) return false;
  const lower = value.toLowerCase();
  return PLACEHOLDER_PATTERNS.some((p) => lower.includes(p.toLowerCase()));
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
