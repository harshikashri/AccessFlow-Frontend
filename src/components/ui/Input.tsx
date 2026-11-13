import { useId, type InputHTMLAttributes, type ReactNode } from 'react';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'type'> {
  label?: string;
  helperText?: string;
  error?: string;
  type?: 'text' | 'email' | 'password' | 'number' | 'search';
  controlSize?: 'sm' | 'md' | 'lg';
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
}

export function Input({
  id,
  label,
  helperText,
  error,
  type = 'text',
  controlSize = 'md',
  leadingIcon,
  trailingIcon,
  required,
  disabled,
  className = '',
  'aria-describedby': ariaDescribedBy,
  ...props
}: InputProps) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const message = error || helperText;
  const messageId = `${inputId}-message`;
  const describedBy =
    [ariaDescribedBy, message ? messageId : null].filter(Boolean).join(' ') || undefined;

  return (
    <div className="ui-field">
      {label && (
        <label className="ui-field__label" htmlFor={inputId}>
          {label}
          {required && (
            <span className="ui-field__required" aria-hidden="true">
              {' '}
              *
            </span>
          )}
        </label>
      )}
      <span
        className={[
          'ui-input-wrap',
          `ui-input-wrap--${controlSize}`,
          error ? 'ui-input-wrap--error' : '',
          disabled ? 'ui-input-wrap--disabled' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {leadingIcon && (
          <span className="ui-input__icon" aria-hidden="true">
            {leadingIcon}
          </span>
        )}
        <input
          {...props}
          id={inputId}
          className={`ui-input ${className}`.trim()}
          type={type}
          required={required}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
        />
        {trailingIcon && (
          <span className="ui-input__icon" aria-hidden="true">
            {trailingIcon}
          </span>
        )}
      </span>
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
