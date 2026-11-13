import { NavLink } from 'react-router-dom';
import { AppIcon } from '@/components/common/AppIcon';
import { Tooltip } from '@/components/ui/Tooltip';
import type { NavigationItem, NavigationSection } from '@/features/authorization/navigation.config';

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

function NavigationItemView({ item, collapsed }: { item: NavigationItem; collapsed: boolean }) {
  if (item.children?.length) {
    return (
      <div className="workspace-nav__group">
        <div className="workspace-nav__group-title" title={collapsed ? item.label : undefined}>
          <AppIcon name={item.icon} size={19} />
          <span className="workspace-nav__label">{item.label}</span>
        </div>
        <div className="workspace-nav__children">
          {item.children.map((child) => (
            <NavigationItemView key={child.id} item={child} collapsed={collapsed} />
          ))}
        </div>
      </div>
    );
  }

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
