import { Input } from '../ui/Input';
import type { TemplateVariable } from '@idp/shared';

interface DynamicFormProps {
  variables: TemplateVariable[];
  values: Record<string, string>;
  onChange: (name: string, value: string) => void;
  errors?: Record<string, string>;
}

export function DynamicForm({ variables, values, onChange, errors = {} }: DynamicFormProps) {
  return (
    <div className="space-y-4">
      {variables.map((v) => (
        <Input
          key={v.name}
          label={`${v.name}${v.required ? ' *' : ''}`}
          placeholder={v.default || v.description}
          value={values[v.name] || ''}
          onChange={(e) => onChange(v.name, e.target.value)}
          error={errors[v.name]}
        />
      ))}
    </div>
  );
}
