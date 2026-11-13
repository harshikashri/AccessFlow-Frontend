import { useEffect, useId, useRef, useState } from 'react';
import type { ReactNode, KeyboardEvent } from 'react';

export interface DropdownMenuItem {
  label: string;
  onSelect: () => void;
  disabled?: boolean;
  destructive?: boolean;
}

export interface DropdownMenuProps {
  label: string;
  trigger: ReactNode;
  items: DropdownMenuItem[];
  align?: 'start' | 'end';
}

export function DropdownMenu({ label, trigger, items, align = 'start' }: DropdownMenuProps) {
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    menuRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]:not(:disabled)')?.focus();
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open]);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const menuItems = Array.from(
      event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)'),
    );
    if (menuItems.length === 0) return;
    const currentIndex = menuItems.findIndex((item) => item === document.activeElement);
    let nextIndex: number | undefined;

    if (event.key === 'ArrowDown') nextIndex = (currentIndex + 1) % menuItems.length;
    if (event.key === 'ArrowUp')
      nextIndex = (currentIndex - 1 + menuItems.length) % menuItems.length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = menuItems.length - 1;
    if (nextIndex !== undefined && menuItems.length > 0) {
      event.preventDefault();
      menuItems[nextIndex]?.focus();
    }
    if (event.key === 'Escape') {
      setOpen(false);
      triggerRef.current?.focus();
    }
  };

  return (
    <div className="ui-dropdown" ref={rootRef}>
      <button
        ref={triggerRef}
        className="ui-dropdown__trigger"
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((current) => !current)}
      >
        {trigger}
        <span className="ui-dropdown__chevron" aria-hidden="true">
          ▾
        </span>
      </button>
      {open && (
        <div
          className={`ui-dropdown__menu ui-dropdown__menu--${align}`}
          id={menuId}
          role="menu"
          aria-label={label}
          ref={menuRef}
          onKeyDown={handleKeyDown}
        >
          {items.map((item, index) => (
            <button
              key={`${item.label}-${index}`}
              className={`ui-dropdown__item ${item.destructive ? 'ui-dropdown__item--destructive' : ''}`}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              onClick={() => {
                item.onSelect();
                setOpen(false);
                triggerRef.current?.focus();
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
