import { useEffect, useId, useRef, type ReactNode } from 'react';
import { Button } from './Button';

export interface ModalProps {
  open: boolean;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  onOpenChange: (open: boolean) => void;
  size?: 'sm' | 'md' | 'lg';
}

export function Modal({
  open,
  title,
  description,
  children,
  footer,
  onOpenChange,
  size = 'md',
}: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className={`ui-modal ui-modal--${size}`}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          onOpenChange(false);
        }
      }}
      onClose={() => {
        if (open) onOpenChange(false);
      }}
    >
      <header className="ui-modal__header">
        <div>
          <h2 className="ui-modal__title" id={titleId}>
            {title}
          </h2>
          {description && (
            <p className="ui-modal__description" id={descriptionId}>
              {description}
            </p>
          )}
        </div>
        <Button
          className="ui-modal__close"
          variant="ghost"
          size="sm"
          aria-label="Close dialog"
          onClick={() => onOpenChange(false)}
        >
          <span aria-hidden="true">×</span>
        </Button>
      </header>
      <div className="ui-modal__content">{children}</div>
      {footer && <footer className="ui-modal__footer">{footer}</footer>}
    </dialog>
  );
}
