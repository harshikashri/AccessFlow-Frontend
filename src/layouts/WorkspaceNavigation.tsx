import { useId, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { AppIcon } from '@/components/common/AppIcon';
import { Tooltip } from '@/components/ui/Tooltip';
import type { NavigationItem, NavigationSection } from '@/features/authorization/navigation.config';

function hasActiveDescendant(item: NavigationItem, pathname: string): boolean {
  return (
    item.children?.some(
      (child) => child.path === pathname || hasActiveDescendant(child, pathname),
    ) ?? false
  );
}

interface WorkspaceNavigationProps {
  sections: readonly NavigationSection[];
  collapsed: boolean;
}

function NavigationLink({ item, collapsed }: { item: NavigationItem; collapsed: boolean }) {
  if (!item.path) return null;

  const link = (
    <NavLink
      to={item.path}
      end={item.path === '/'}
      aria-label={item.label}
      title={collapsed ? item.label : undefined}
      className={({ isActive }) =>
        `workspace-nav__link${isActive ? ' workspace-nav__link--active' : ''}`
      }
    >
      <AppIcon name={item.icon} size={19} />
      <span className="workspace-nav__label">{item.label}</span>
    </NavLink>
  );

  return collapsed ? (
    <Tooltip label={item.label} placement="right">
      {link}
    </Tooltip>
  ) : (
    link
  );
}

function NavigationGroup({ item, collapsed }: { item: NavigationItem; collapsed: boolean }) {
  const location = useLocation();
  const submenuId = useId();
  const children = item.children ?? [];
  const [expanded, setExpanded] = useState(() => hasActiveDescendant(item, location.pathname));

  return (
    <div className={`workspace-nav__group${expanded ? ' workspace-nav__group--expanded' : ''}`}>
      <div className="workspace-nav__group-heading">
        {item.path ? (
          <NavigationLink item={item} collapsed={collapsed} />
        ) : (
          <div className="workspace-nav__group-title" title={collapsed ? item.label : undefined}>
            <AppIcon name={item.icon} size={19} />
            <span className="workspace-nav__label">{item.label}</span>
          </div>
        )}
        <button
          className="workspace-nav__toggle"
          type="button"
          aria-label={`${expanded ? 'Collapse' : 'Expand'} ${item.label} submenu`}
          aria-expanded={expanded}
          aria-controls={submenuId}
          onClick={() => setExpanded((current) => !current)}
        >
          <AppIcon name="chevron" size={16} />
        </button>
      </div>
      <div className="workspace-nav__children" id={submenuId} hidden={!expanded}>
        {children.map((child) => (
          <NavigationItemView key={child.id} item={child} collapsed={collapsed} />
        ))}
      </div>
    </div>
  );
}

function NavigationItemView({ item, collapsed }: { item: NavigationItem; collapsed: boolean }) {
  if (item.children?.length) return <NavigationGroup item={item} collapsed={collapsed} />;
  return <NavigationLink item={item} collapsed={collapsed} />;
}

export function WorkspaceNavigation({ sections, collapsed }: WorkspaceNavigationProps) {
  return (
    <div className="workspace-nav">
      {sections.map((section) => (
        <section key={section.id} className="workspace-nav__section" aria-label={section.label}>
          <h2 className="workspace-nav__section-title">{section.label}</h2>
          <div className="workspace-nav__items">
            {section.items.map((item) => (
              <NavigationItemView key={item.id} item={item} collapsed={collapsed} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
