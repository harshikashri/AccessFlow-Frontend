import type { PropsWithChildren, ReactNode, Ref } from 'react';
import { ContentContainer } from '@/components/common/ContentContainer';
import { AppIcon } from '@/components/common/AppIcon';

export interface SidebarProps extends PropsWithChildren {
  brand?: ReactNode;
  footer?: ReactNode;
  open?: boolean;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onNavigate?: () => void;
  sidebarRef?: Ref<HTMLElement>;
}

export function Sidebar({
  brand,
  footer,
  open = false,
  collapsed = false,
  onToggleCollapse,
  onNavigate,
  sidebarRef,
  children,
}: SidebarProps) {
  return (
    <aside
      ref={sidebarRef}
      className="dashboard-sidebar"
      data-open={open}
      data-collapsed={collapsed}
      aria-label="Primary navigation"
    >
      <div className="dashboard-sidebar__brand">
        {brand}
        {onToggleCollapse && (
          <button
            className="dashboard-sidebar__collapse"
            type="button"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            onClick={onToggleCollapse}
          >
            <AppIcon name={collapsed ? 'expand' : 'collapse'} size={18} />
          </button>
        )}
      </div>
      <nav
        className="dashboard-sidebar__navigation"
        aria-label="Workspace"
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
  title?: ReactNode;
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
          <AppIcon name="menu" />
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
