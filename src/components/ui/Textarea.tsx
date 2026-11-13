import { useId, type TextareaHTMLAttributes } from 'react';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helperText?: string;
  error?: string;
}

export function Textarea({
  id,
  label,
  helperText,
  error,
  required,
  disabled,
  className = '',
  'aria-describedby': ariaDescribedBy,
  ...props
}: TextareaProps) {
  const generatedId = useId();
  const textareaId = id || generatedId;
  const message = error || helperText;
  const messageId = `${textareaId}-message`;
  const describedBy =
    [ariaDescribedBy, message ? messageId : null].filter(Boolean).join(' ') || undefined;

  return (
    <div className="ui-field">
      {label && (
        <label className="ui-field__label" htmlFor={textareaId}>
          {label}
          {required && (
            <span className="ui-field__required" aria-hidden="true">
              {' '}
              *
            </span>
          )}
        </label>
      )}
      <textarea
        {...props}
        id={textareaId}
        className={`ui-textarea ${error ? 'ui-textarea--error' : ''} ${className}`.trim()}
        required={required}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
      />
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
