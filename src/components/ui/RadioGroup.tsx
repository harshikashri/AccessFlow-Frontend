import { useId, useState } from 'react';

export interface RadioOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

export interface RadioGroupProps {
  label: string;
  name?: string;
  value?: string;
  defaultValue?: string;
  options: RadioOption[];
  helperText?: string;
  error?: string;
  disabled?: boolean;
  onValueChange?: (value: string) => void;
}

export function RadioGroup({
  label,
  name,
  value,
  defaultValue,
  options,
  helperText,
  error,
  disabled = false,
  onValueChange,
}: RadioGroupProps) {
  const generatedId = useId();
  const radioName = name || generatedId;
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue || '');
  const selectedValue = value ?? uncontrolledValue;

  const selectValue = (nextValue: string) => {
    if (value === undefined) {
      setUncontrolledValue(nextValue);
    }
    onValueChange?.(nextValue);
  };

  return (
    <fieldset
      className="ui-field ui-radio-group"
      disabled={disabled}
      aria-describedby={error || helperText ? `${generatedId}-message` : undefined}
    >
      <legend className="ui-field__label">{label}</legend>
      <div className="ui-radio-group__options">
        {options.map((option) => {
          const optionId = `${radioName}-${option.value}`;
          return (
            <label
              className={`ui-radio-option ${option.disabled || disabled ? 'ui-radio-option--disabled' : ''}`}
              htmlFor={optionId}
              key={option.value}
            >
              <input
                id={optionId}
                className="ui-choice__control"
                type="radio"
                name={radioName}
                value={option.value}
                checked={selectedValue === option.value}
                disabled={disabled || option.disabled}
                onChange={() => selectValue(option.value)}
              />
              <span>
                <span className="ui-choice__label">{option.label}</span>
                {option.description && (
                  <span className="ui-choice__description">{option.description}</span>
                )}
              </span>
            </label>
          );
        })}
      </div>
      {(error || helperText) && (
        <span
          id={`${generatedId}-message`}
          className={error ? 'ui-field__message ui-field__message--error' : 'ui-field__message'}
        >
          {error || helperText}
        </span>
      )}
    </fieldset>
  );
}
