import type { RequestField } from '../types/request.types';

interface Props {
  fields: RequestField[];
  values: Record<string, unknown>;
  errors: Record<string, string>;
  onChange: (key: string, value: unknown) => void;
}

function isVisible(field: RequestField, values: Record<string, unknown>) {
  const condition = field.visibleWhen;
  if (!condition) return true;
  const current = values[condition.field];
  if (condition.operator === 'EQUALS') return current === condition.value;
  if (condition.operator === 'NOT_EQUALS') return current !== condition.value;
  return true;
}

export function DynamicRequestForm({ fields, values, errors, onChange }: Props) {
  const orderedFields = [...fields].sort((a, b) => a.displayOrder - b.displayOrder);
  return (
    <div className="request-form-fields">
      {orderedFields.map((field) => {
        if (!isVisible(field, values)) return null;
        const value = values[field.key];
        const error = errors[field.key];
        const label = `${field.label}${field.required ? ' *' : ''}`;
        const common = {
          id: `request-field-${field.key}`,
          name: field.key,
          'aria-invalid': Boolean(error),
          'aria-describedby': error ? `request-error-${field.key}` : undefined,
        };
        return (
          <div className="request-form-field" key={field.key}>
            <label htmlFor={common.id}>{label}</label>
            {field.description && (
              <p className="request-form-field__description">{field.description}</p>
            )}
            {field.type === 'TEXTAREA' ? (
              <textarea
                {...common}
                placeholder={field.placeholder}
                value={typeof value === 'string' ? value : ''}
                onChange={(event) => onChange(field.key, event.target.value)}
              />
            ) : field.type === 'SELECT' ? (
              <select
                {...common}
                value={typeof value === 'string' ? value : ''}
                onChange={(event) => onChange(field.key, event.target.value)}
              >
                <option value="">Select an option</option>
                {(field.options ?? []).map((option) => (
                  <option value={option} key={option}>
                    {option}
                  </option>
                ))}
              </select>
            ) : field.type === 'MULTI_SELECT' ? (
              <select
                {...common}
                multiple
                value={Array.isArray(value) ? value.map(String) : []}
                onChange={(event) =>
                  onChange(
                    field.key,
                    [...event.target.selectedOptions].map((option) => option.value),
                  )
                }
              >
                {(field.options ?? []).map((option) => (
                  <option value={option} key={option}>
                    {option}
                  </option>
                ))}
              </select>
            ) : field.type === 'CHECKBOX' ? (
              <input
                {...common}
                type="checkbox"
                checked={value === true}
                onChange={(event) => onChange(field.key, event.target.checked)}
              />
            ) : (
              <input
                {...common}
                type={field.type === 'NUMBER' ? 'number' : field.type === 'DATE' ? 'date' : 'text'}
                placeholder={field.placeholder}
                value={value === undefined || value === null ? '' : String(value)}
                onChange={(event) =>
                  onChange(
                    field.key,
                    field.type === 'NUMBER'
                      ? event.target.value === ''
                        ? ''
                        : Number(event.target.value)
                      : event.target.value,
                  )
                }
              />
            )}
            {error && (
              <p className="request-form-field__error" id={`request-error-${field.key}`}>
                {error}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
