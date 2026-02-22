import { useState, useCallback } from 'react';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import type { TemplateVariable } from '@idp/shared';
import { getBaseType, parseContainsValidation, validateVariables } from '@idp/shared';

interface DynamicFormProps {
  variables: TemplateVariable[];
  values: Record<string, string>;
  onChange: (name: string, value: string) => void;
  errors?: Record<string, string>;
}

export function DynamicForm({ variables, values, onChange, errors = {} }: DynamicFormProps) {
  const [blurErrors, setBlurErrors] = useState<Record<string, string>>({});

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
          const placeholder = baseType === 'list'
            ? '[{"key": "value"}]'
            : '{"key": "value"}';
          return (
            <div key={v.name}>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {label}
              </label>
              <textarea
                className={`block w-full rounded-lg border ${fieldError ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'} px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none dark:bg-gray-800 dark:text-gray-100 dark:focus:border-primary-400 font-mono`}
                rows={3}
                placeholder={v.default || placeholder}
                value={values[v.name] || ''}
                onChange={(e) => handleChange(v.name, e.target.value)}
                onBlur={() => handleBlur(v.name)}
              />
              {fieldError && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{fieldError}</p>}
              {v.description && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{v.description}</p>
              )}
            </div>
          );
        }

        // list(string) → text input with comma hint
        if (baseType === 'list') {
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
