import type { ButtonProps } from '@/components/ui/Button';
import { Button } from '@/components/ui/Button';
import { AppIcon } from './AppIcon';
import type { AppIconName } from './AppIcon';

type IconButtonProps = Omit<
  ButtonProps,
  'children' | 'leadingIcon' | 'trailingIcon' | 'aria-label'
> & {
  icon: AppIconName;
  label: string;
};

export function IconButton({ icon, label, className = '', ...props }: IconButtonProps) {
  return (
    <Button
      {...props}
      className={['ui-icon-button', className].filter(Boolean).join(' ')}
      aria-label={label}
      title={label}
      leadingIcon={<AppIcon name={icon} size={18} />}
    />
  );
}
