import { useId, useState } from 'react';

export interface SwitchProps {
  label: string;
  checked?: boolean;
  defaultChecked?: boolean;
  disabled?: boolean;
  description?: string;
  onCheckedChange?: (checked: boolean) => void;
}

export function Switch({
  label,
  checked,
  defaultChecked = false,
  disabled = false,
  description,
  onCheckedChange,
}: SwitchProps) {
  const id = useId();
  const [uncontrolledChecked, setUncontrolledChecked] = useState(defaultChecked);
  const isChecked = checked ?? uncontrolledChecked;

  const toggle = () => {
    if (disabled) return;
    const nextChecked = !isChecked;
    if (checked === undefined) {
      setUncontrolledChecked(nextChecked);
    }
    onCheckedChange?.(nextChecked);
  };

  return (
    <div className={`ui-switch-row ${disabled ? 'ui-switch-row--disabled' : ''}`}>
      <div className="ui-switch-row__text">
        <span className="ui-choice__label" id={`${id}-label`}>
          {label}
        </span>
        {description && (
          <span className="ui-choice__description" id={`${id}-description`}>
            {description}
          </span>
        )}
      </div>
      <button
        id={id}
        className="ui-switch"
        type="button"
        role="switch"
        aria-checked={isChecked}
        aria-labelledby={`${id}-label`}
        aria-describedby={description ? `${id}-description` : undefined}
        disabled={disabled}
        onClick={toggle}
      >
        <span className="ui-switch__thumb" aria-hidden="true" />
      </button>
    </div>
  );
}
