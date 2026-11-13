import type { PropsWithChildren, ReactNode, Ref } from 'react';
import { ContentContainer } from '@/components/common/ContentContainer';

export interface SidebarProps extends PropsWithChildren {
  brand?: ReactNode;
  footer?: ReactNode;
  open?: boolean;
  onNavigate?: () => void;
  sidebarRef?: Ref<HTMLElement>;
}

export function Sidebar({
  brand,
  footer,
  open = false,
  onNavigate,
  sidebarRef,
  children,
}: SidebarProps) {
  return (
    <aside
      ref={sidebarRef}
      className="dashboard-sidebar"
      data-open={open}
      aria-label="Primary navigation"
    >
      {brand && <div className="dashboard-sidebar__brand">{brand}</div>}
      <nav
        className="dashboard-sidebar__navigation"
        onClick={(event) => {
          if (event.target instanceof Element && event.target.closest('a')) {
            onNavigate?.();
          }
        }}
      >
        {children}
      </nav>
      {footer && <div className="dashboard-sidebar__footer">{footer}</div>}
    </aside>
  );
}

export interface HeaderProps extends PropsWithChildren {
  title?: string | undefined;
  menuOpen?: boolean;
  onMenuClick?: () => void;
  menuButtonRef?: Ref<HTMLButtonElement>;
}

export function Header({
  title,
  menuOpen = false,
  onMenuClick,
  menuButtonRef,
  children,
}: HeaderProps) {
  return (
    <header className="dashboard-header">
      {onMenuClick && (
        <button
          ref={menuButtonRef}
          className="dashboard-header__menu"
          type="button"
          aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={menuOpen}
          onClick={onMenuClick}
        >
          <span aria-hidden="true">☰</span>
        </button>
      )}
      {title && <div className="dashboard-header__title">{title}</div>}
      <div className="dashboard-header__actions">{children}</div>
    </header>
  );
}

export function LayoutContent({ children }: PropsWithChildren) {
  return <ContentContainer className="dashboard-content">{children}</ContentContainer>;
}
