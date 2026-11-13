import { useId, useState, type InputHTMLAttributes, type ReactNode } from 'react';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'type'> {
  label?: string;
  helperText?: string;
  error?: string;
  type?: 'text' | 'email' | 'password' | 'number' | 'search' | 'date';
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
  const [passwordVisible, setPasswordVisible] = useState(false);
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
          type={type === 'password' && passwordVisible ? 'text' : type}
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
        {type === 'password' && (
          <button
            className="ui-input__password-toggle"
            type="button"
            aria-label={passwordVisible ? 'Hide password' : 'Show password'}
            aria-pressed={passwordVisible}
            aria-controls={inputId}
            disabled={disabled}
            onClick={() => setPasswordVisible((visible) => !visible)}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              {passwordVisible ? (
                <>
                  <path d="M3 3l18 18" />
                  <path d="M10.6 10.6a2 2 0 002.8 2.8" />
                  <path d="M9.9 5.1A10.9 10.9 0 0112 4.9c5.5 0 9.5 7.1 9.5 7.1a16.2 16.2 0 01-3.1 3.9" />
                  <path d="M6.6 6.6C3.9 8.4 2.5 12 2.5 12a16.9 16.9 0 003.6 4.3A9.9 9.9 0 0012 19.1c1 0 2-.2 2.9-.5" />
                </>
              ) : (
                <>
                  <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
                  <circle cx="12" cy="12" r="3" />
                </>
              )}
            </svg>
          </button>
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
