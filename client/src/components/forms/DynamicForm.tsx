import { useState, useCallback } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import type { TemplateVariable } from '@idp/shared';
import { getBaseType, parseContainsValidation, validateVariables, generateTypeExample, containsPlaceholderValues } from '@idp/shared';

interface DynamicFormProps {
  variables: TemplateVariable[];
  values: Record<string, string>;
  onChange: (name: string, value: string) => void;
  errors?: Record<string, string>;
}

export function DynamicForm({ variables, values, onChange, errors = {} }: DynamicFormProps) {
  const [blurErrors, setBlurErrors] = useState<Record<string, string>>({});
  const [expandedExamples, setExpandedExamples] = useState<Set<string>>(new Set());

  const handleBlur = useCallback((name: string) => {
    const fieldErrors = validateVariables(values, variables);
    setBlurErrors((prev) => {
      const next = { ...prev };
      if (fieldErrors[name]) {
        next[name] = fieldErrors[name];
      } else {
        delete next[name];
      }
      return next;
    });
  }, [values, variables]);

  const handleChange = useCallback((name: string, value: string) => {
    // Clear blur error when user starts typing
    setBlurErrors((prev) => {
      if (prev[name]) {
        const next = { ...prev };
        delete next[name];
        return next;
      }
      return prev;
    });
    onChange(name, value);
  }, [onChange]);

  const mergedErrors = { ...blurErrors, ...errors };

  const toggleExample = useCallback((name: string) => {
    setExpandedExamples((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }, []);

  return (
    <div className="space-y-4">
      {variables.map((v) => {
        const baseType = getBaseType(v.type);
        const containsValues = v.validation ? parseContainsValidation(v.validation) : null;
        const fieldError = mergedErrors[v.name];
        const label = `${v.name}${v.required ? ' *' : ''}`;

        // String with contains() validation → Select dropdown
        if (containsValues) {
          return (
            <div key={v.name}>
              <Select
                label={label}
                options={containsValues.map((val) => ({ value: val, label: val }))}
                value={values[v.name] || ''}
                onChange={(e) => handleChange(v.name, e.target.value)}
                error={fieldError}
              />
              {v.description && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{v.description}</p>
              )}
            </div>
          );
        }

        // Bool → checkbox toggle
        if (baseType === 'bool') {
          const checked = (values[v.name] || v.default || 'false').toLowerCase() === 'true';
          return (
            <div key={v.name}>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => handleChange(v.name, e.target.checked ? 'true' : 'false')}
                  className="rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
              </label>
              {v.description && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{v.description}</p>
              )}
              {fieldError && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{fieldError}</p>}
            </div>
          );
        }

        // Number → number input
        if (baseType === 'number') {
          return (
            <div key={v.name}>
              <Input
                label={label}
                type="number"
                step="any"
                placeholder={v.default || v.description}
                value={values[v.name] || ''}
                onChange={(e) => handleChange(v.name, e.target.value)}
                onBlur={() => handleBlur(v.name)}
                error={fieldError}
              />
              {v.description && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{v.description}</p>
              )}
            </div>
          );
        }

        // Complex types (list(object), map, object) → textarea
        if (baseType === 'map' || baseType === 'object' || (baseType === 'list' && !v.type.match(/^list\(string\)$/i))) {
          const typeExample = generateTypeExample(v.type, v.name);
          const placeholder = typeExample
            || (baseType === 'list' ? '[{"key": "value"}]' : '{"key": "value"}');
          const rows = Math.min(10, Math.max(3, placeholder.split('\n').length));
          const isExpanded = expandedExamples.has(v.name);
          const isEmpty = !values[v.name];
          const hasPlaceholders = !isEmpty && containsPlaceholderValues(values[v.name]);
          return (
            <div key={v.name}>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {label}
              </label>
              <textarea
                className={`block w-full rounded-lg border ${fieldError ? 'border-red-300' : hasPlaceholders ? 'border-amber-400 dark:border-amber-500' : 'border-gray-300 dark:border-gray-600'} px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none dark:bg-gray-800 dark:text-gray-100 dark:focus:border-primary-400 font-mono`}
                rows={rows}
                placeholder={v.default || placeholder}
                value={values[v.name] || ''}
                onChange={(e) => handleChange(v.name, e.target.value)}
                onBlur={() => handleBlur(v.name)}
              />
              {fieldError && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{fieldError}</p>}
              {hasPlaceholders && !fieldError && (
                <p className="mt-1 text-sm text-amber-600 dark:text-amber-400">
                  This field contains example values. Edit them with real values before deploying.
                </p>
              )}
              {v.description && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{v.description}</p>
              )}
              {typeExample && (
                <div className="mt-1.5">
                  <button
                    type="button"
                    onClick={() => toggleExample(v.name)}
                    className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                    {isExpanded ? 'Hide example' : 'Show example'}
                  </button>
                  {isExpanded && (
                    <div className="mt-1.5">
                      <pre className="rounded-md bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2 text-xs font-mono text-gray-700 dark:text-gray-300 overflow-x-auto table-scroll">
                        {typeExample}
                      </pre>
                      {isEmpty && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleChange(v.name, typeExample)}
                            className="mt-1.5 px-2.5 py-1 text-xs font-medium text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-md hover:bg-primary-100 dark:hover:bg-primary-900/30"
                          >
                            Insert template
                          </button>
                          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                            Edit the example values before deploying
                          </p>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        }

        // list(string) → text input with comma hint
        if (baseType === 'list') {
          const listExample = '["value1", "value2"]';
          const isListExpanded = expandedExamples.has(v.name);
          const isListEmpty = !values[v.name];
          return (
            <div key={v.name}>
              <Input
                label={label}
                placeholder={v.default || 'value1, value2, value3'}
                value={values[v.name] || ''}
                onChange={(e) => handleChange(v.name, e.target.value)}
                onBlur={() => handleBlur(v.name)}
                error={fieldError}
              />
              {v.description && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{v.description}</p>
              )}
              <div className="mt-1.5">
                <button
                  type="button"
                  onClick={() => toggleExample(v.name)}
                  className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  {isListExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                  {isListExpanded ? 'Hide example' : 'Show example'}
                </button>
                {isListExpanded && (
                  <div className="mt-1.5">
                    <pre className="rounded-md bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2 text-xs font-mono text-gray-700 dark:text-gray-300 overflow-x-auto table-scroll">
                      {listExample}
                    </pre>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Comma-separated or JSON array format accepted
                    </p>
                    {isListEmpty && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleChange(v.name, listExample)}
                          className="mt-1.5 px-2.5 py-1 text-xs font-medium text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-md hover:bg-primary-100 dark:hover:bg-primary-900/30"
                        >
                          Insert template
                        </button>
                        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                          Edit the example values before deploying
                        </p>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        }

        // Default: string → text input
        return (
          <div key={v.name}>
            <Input
              label={label}
              placeholder={v.default || v.description}
              value={values[v.name] || ''}
              onChange={(e) => handleChange(v.name, e.target.value)}
              onBlur={() => handleBlur(v.name)}
              error={fieldError}
            />
            {v.description && !v.default && (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{v.description}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
