import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Shield, ShieldAlert, ShieldCheck, ShieldX, ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react';
import type { SecurityScanResult, SecuritySeverity, TrivyFinding, TFLintFinding, OPAFinding } from '@idp/shared';

type ScanState =
  | { status: 'scanning' }
  | { status: 'done'; result: SecurityScanResult }
  | { status: 'error'; message: string };

interface SecurityScanModalProps {
  open: boolean;
  onClose: () => void;
  scanState: ScanState;
  onDeploy: () => void;
  deploying: boolean;
}

const SEVERITY_COLORS: Record<SecuritySeverity, { variant: 'danger' | 'warning' | 'info' | 'default' | 'success' }> = {
  CRITICAL: { variant: 'danger' },
  HIGH: { variant: 'danger' },
  MEDIUM: { variant: 'warning' },
  LOW: { variant: 'info' },
  INFO: { variant: 'default' },
};

export function SecurityScanModal({ open, onClose, scanState, onDeploy, deploying }: SecurityScanModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="Security Scan" size="lg">
      {scanState.status === 'scanning' && <ScanningView />}
      {scanState.status === 'done' && (
        <ResultsView result={scanState.result} onDeploy={onDeploy} onClose={onClose} deploying={deploying} />
      )}
      {scanState.status === 'error' && (
        <ErrorView message={scanState.message} onDeploy={onDeploy} onClose={onClose} deploying={deploying} />
      )}
    </Modal>
  );
}

function ScanningView() {
  return (
    <div className="flex flex-col items-center py-8 gap-4">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
      <div className="text-center">
        <p className="font-medium text-gray-900 dark:text-gray-100">Scanning template...</p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Running Trivy, TFLint, and OPA checks</p>
      </div>
    </div>
  );
}

function ResultsView({
  result,
  onDeploy,
  onClose,
  deploying,
}: {
  result: SecurityScanResult;
  onDeploy: () => void;
  onClose: () => void;
  deploying: boolean;
}) {
  const totalFindings = Object.values(result.summary).reduce((a, b) => a + b, 0);
  const blocked = !result.passed && result.enforced;
  const warned = !result.passed && !result.enforced;

  return (
    <div className="space-y-4">
      {/* Status header */}
      <div className={`flex items-center gap-3 p-4 rounded-lg ${
        result.passed
          ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
          : blocked
          ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
          : 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800'
      }`}>
        {result.passed ? (
          <ShieldCheck className="w-6 h-6 text-green-500 shrink-0" />
        ) : blocked ? (
          <ShieldX className="w-6 h-6 text-red-500 shrink-0" />
        ) : (
          <ShieldAlert className="w-6 h-6 text-amber-500 shrink-0" />
        )}
        <div>
          <p className={`font-medium ${
            result.passed
              ? 'text-green-700 dark:text-green-400'
              : blocked
              ? 'text-red-700 dark:text-red-400'
              : 'text-amber-700 dark:text-amber-400'
          }`}>
            {result.passed
              ? 'All checks passed'
              : blocked
              ? 'Scan failed — deployment blocked'
              : 'Issues found — deployment allowed'}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {totalFindings} finding{totalFindings !== 1 ? 's' : ''} &middot; Threshold: {result.severityThreshold} &middot; {result.scanDuration}ms
          </p>
        </div>
      </div>

      {/* Summary badges */}
      {totalFindings > 0 && (
        <div className="flex gap-2 flex-wrap">
          {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'] as SecuritySeverity[]).map(sev => (
            result.summary[sev] > 0 && (
              <Badge key={sev} variant={SEVERITY_COLORS[sev].variant}>
                {sev}: {result.summary[sev]}
              </Badge>
            )
          ))}
        </div>
      )}

      {/* Tool results */}
      <div className="space-y-2">
        <ToolSection
          name="Trivy"
          subtitle="Security misconfigurations"
          available={result.trivy.available}
          findings={result.trivy.findings}
          error={result.trivy.error}
          renderFinding={(f: TrivyFinding) => (
            <div>
              <div className="flex items-center gap-2">
                <Badge variant={SEVERITY_COLORS[f.severity].variant}>{f.severity}</Badge>
                <span className="font-medium text-sm">{f.title || f.ruleId}</span>
              </div>
              {f.description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{f.description}</p>}
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                {f.file}{f.startLine ? `:${f.startLine}` : ''}{f.resource ? ` — ${f.resource}` : ''}
              </p>
              {f.resolution && <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">{f.resolution}</p>}
            </div>
          )}
        />
        <ToolSection
          name="TFLint"
          subtitle="Terraform linting"
          available={result.tflint.available}
          findings={result.tflint.findings}
          error={result.tflint.error}
          renderFinding={(f: TFLintFinding) => (
            <div>
              <div className="flex items-center gap-2">
                <Badge variant={SEVERITY_COLORS[f.severity].variant}>{f.severity}</Badge>
                <span className="font-medium text-sm">{f.message}</span>
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                {f.rule}{f.file ? ` — ${f.file}:${f.line}` : ''}
              </p>
            </div>
          )}
        />
        <ToolSection
          name="Conftest"
          subtitle="OPA/Rego policies"
          available={result.opa.available}
          findings={result.opa.findings}
          error={result.opa.error}
          renderFinding={(f: OPAFinding) => (
            <div>
              <div className="flex items-center gap-2">
                <Badge variant={SEVERITY_COLORS[f.severity].variant}>{f.severity}</Badge>
                <span className="font-medium text-sm">{f.message}</span>
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                {f.rule} &middot; {f.namespace}{f.file ? ` — ${f.file}` : ''}
              </p>
            </div>
          )}
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2 border-t dark:border-gray-700">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        {result.passed && (
          <Button onClick={onDeploy} loading={deploying}>
            <Shield className="w-4 h-4 mr-2" />Deploy
          </Button>
        )}
        {warned && (
          <Button variant="danger" onClick={onDeploy} loading={deploying}>
            <AlertTriangle className="w-4 h-4 mr-2" />Deploy Anyway
          </Button>
        )}
      </div>
    </div>
  );
}

function ErrorView({
  message,
  onDeploy,
  onClose,
  deploying,
}: {
  message: string;
  onDeploy: () => void;
  onClose: () => void;
  deploying: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
        <AlertTriangle className="w-6 h-6 text-amber-500 shrink-0" />
        <div>
          <p className="font-medium text-amber-700 dark:text-amber-400">Scan failed</p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">{message}</p>
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2 border-t dark:border-gray-700">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button variant="danger" onClick={onDeploy} loading={deploying}>
          <AlertTriangle className="w-4 h-4 mr-2" />Deploy Anyway
        </Button>
      </div>
    </div>
  );
}

function ToolSection<T>({
  name,
  subtitle,
  available,
  findings,
  error,
  renderFinding,
}: {
  name: string;
  subtitle: string;
  available: boolean;
  findings: T[];
  error?: string;
  renderFinding: (f: T) => React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(findings.length > 0);

  return (
    <div className="border dark:border-gray-700 rounded-lg overflow-hidden">
      <button
        type="button"
        className="flex items-center justify-between w-full p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          <span className="font-medium text-sm">{name}</span>
          <span className="text-xs text-gray-400 dark:text-gray-500">{subtitle}</span>
        </div>
        <div className="flex items-center gap-2">
          {!available && <Badge>Not installed</Badge>}
          {available && error && <Badge variant="warning">Error</Badge>}
          {available && !error && findings.length === 0 && <Badge variant="success">Clean</Badge>}
          {available && !error && findings.length > 0 && (
            <Badge variant="warning">{findings.length} issue{findings.length !== 1 ? 's' : ''}</Badge>
          )}
        </div>
      </button>
      {expanded && findings.length > 0 && (
        <div className="border-t dark:border-gray-700 divide-y dark:divide-gray-700">
          {findings.map((f, i) => (
            <div key={i} className="p-3">
              {renderFinding(f)}
            </div>
          ))}
        </div>
      )}
      {expanded && error && (
        <div className="border-t dark:border-gray-700 p-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}
    </div>
  );
}
