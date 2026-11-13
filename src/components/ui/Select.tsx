import { useId, type SelectHTMLAttributes } from 'react';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  helperText?: string;
  error?: string;
  placeholder?: string;
  options: SelectOption[];
}

export function Select({
  id,
  label,
  helperText,
  error,
  placeholder = 'Select an option',
  options,
  required,
  disabled,
  className = '',
  'aria-describedby': ariaDescribedBy,
  ...props
}: SelectProps) {
  const generatedId = useId();
  const selectId = id || generatedId;
  const message = error || helperText;
  const messageId = `${selectId}-message`;
  const describedBy =
    [ariaDescribedBy, message ? messageId : null].filter(Boolean).join(' ') || undefined;

  return (
    <div className="ui-field">
      {label && (
        <label className="ui-field__label" htmlFor={selectId}>
          {label}
          {required && (
            <span className="ui-field__required" aria-hidden="true">
              {' '}
              *
            </span>
          )}
        </label>
      )}
      <select
        {...props}
        id={selectId}
        className={`ui-select ${error ? 'ui-select--error' : ''} ${className}`.trim()}
        required={required}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
      >
        <option value="" disabled={required}>
          {placeholder}
        </option>
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
      {message && (
        <span
          id={messageId}
          className={error ? 'ui-field__message ui-field__message--error' : 'ui-field__message'}
        >
          {message}
        </span>
      )}
    </div>
  );
}
