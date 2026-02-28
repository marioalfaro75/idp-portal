export type SecuritySeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

export interface TrivyFinding {
  ruleId: string;
  severity: SecuritySeverity;
  title: string;
  description: string;
  resource: string;
  file: string;
  startLine: number;
  resolution: string;
}

export interface TFLintFinding {
  rule: string;
  severity: SecuritySeverity;
  message: string;
  file: string;
  line: number;
}

export interface OPAFinding {
  rule: string;
  severity: SecuritySeverity;
  message: string;
  file: string;
  namespace: string;
}

export interface ScanToolResult<T> {
  available: boolean;
  findings: T[];
  error?: string;
  duration?: number;
}

export interface SecurityScanResult {
  passed: boolean;
  enforced: boolean;
  severityThreshold: SecuritySeverity;
  scanDuration: number;
  trivy: ScanToolResult<TrivyFinding>;
  tflint: ScanToolResult<TFLintFinding>;
  opa: ScanToolResult<OPAFinding>;
  summary: Record<SecuritySeverity, number>;
}

export interface SecurityConfig {
  enabled: boolean;
  enforcement: 'blocking' | 'advisory';
  severityThreshold: SecuritySeverity;
  opaPolicy: string;
}

export interface SecurityToolStatus {
  name: string;
  available: boolean;
  version?: string;
  binaryPath?: string;
  source?: 'system-setting' | 'env-var' | 'default';
}
