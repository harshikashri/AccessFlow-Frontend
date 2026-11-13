import type { PropsWithChildren, ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { Header, LayoutContent, Sidebar } from './LayoutPrimitives';

export interface DashboardLayoutProps extends PropsWithChildren {
  sidebar?: ReactNode;
  sidebarBrand?: ReactNode;
  sidebarFooter?: ReactNode;
  title?: string;
  headerActions?: ReactNode;
}

export function DashboardLayout({
  children,
  sidebar,
  sidebarBrand,
  sidebarFooter,
  title,
  headerActions,
}: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!sidebarOpen) return;
    sidebarRef.current
      ?.querySelector<HTMLElement>(
        'a[href], button:not(:disabled), [tabindex]:not([tabindex="-1"])',
      )
      ?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSidebarOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [sidebarOpen]);

  return (
    <div className="dashboard-layout">
      <Sidebar
        brand={sidebarBrand}
        footer={sidebarFooter}
        open={sidebarOpen}
        sidebarRef={sidebarRef}
        onNavigate={() => {
          setSidebarOpen(false);
          menuButtonRef.current?.focus();
        }}
      >
        {sidebar}
      </Sidebar>
      {sidebarOpen && (
        <button
          className="dashboard-layout__scrim"
          type="button"
          aria-label="Close navigation menu"
          onClick={() => {
            setSidebarOpen(false);
            menuButtonRef.current?.focus();
          }}
        />
      )}
      <div className="dashboard-layout__main">
        <Header
          title={title}
          menuOpen={sidebarOpen}
          menuButtonRef={menuButtonRef}
          onMenuClick={() => setSidebarOpen((open) => !open)}
        >
          {headerActions}
        </Header>
        <LayoutContent>{children}</LayoutContent>
      </div>
    </div>
  );
}
