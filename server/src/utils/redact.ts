const OUTPUT_PATTERNS: [RegExp, string][] = [
  [/AKIA[0-9A-Z]{16}/g, '[REDACTED_AWS_KEY]'],
  [/ASIA[0-9A-Z]{16}/g, '[REDACTED_AWS_TEMP_KEY]'],
  [/(?<=secret_?access_?key\s*=\s*")[^"]+/gi, '[REDACTED]'],
  [/(?<=password\s*=\s*")[^"]+/gi, '[REDACTED]'],
  [/(?<=token\s*=\s*")[^"]+/gi, '[REDACTED]'],
];

export function redactOutput(output: string): string {
  let result = output;
  for (const [pattern, replacement] of OUTPUT_PATTERNS) {
    result = result.replace(pattern, replacement);
  }
  return result;
}
