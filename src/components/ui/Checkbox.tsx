import { useEffect, useId, useRef, type InputHTMLAttributes } from 'react';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  helperText?: string;
  error?: string;
  indeterminate?: boolean;
}

export function Checkbox({
  id,
  label,
  helperText,
  error,
  indeterminate = false,
  disabled,
  ...props
}: CheckboxProps) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);

  return (
    <div className="ui-choice">
      <input
        {...props}
        ref={inputRef}
        id={inputId}
        className="ui-choice__control"
        type="checkbox"
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || helperText ? `${inputId}-message` : undefined}
      />
      <div>
        <label className="ui-choice__label" htmlFor={inputId}>
          {label}
        </label>
        {(error || helperText) && (
          <span
            id={`${inputId}-message`}
            className={error ? 'ui-field__message ui-field__message--error' : 'ui-field__message'}
          >
            {error || helperText}
          </span>
        )}
      </div>
    </div>
  );
}
