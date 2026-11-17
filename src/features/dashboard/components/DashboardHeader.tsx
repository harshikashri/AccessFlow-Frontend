import { PageHeader } from '@/components/common/PageHeader';
import { IconButton } from '@/components/common/IconButton';
import type {
  DashboardSection,
  DashboardType,
  PlatformDashboardSection,
  OrganizationDashboardSection,
} from '@/features/dashboard/types/dashboard.types';

interface DashboardHeaderProps {
  type: DashboardType;
  section: DashboardSection;
  userName: string;
  refreshing: boolean;
  onRefresh: () => void;
}

const platformSectionDetails: Record<
  PlatformDashboardSection,
  { title: string; description: string }
> = {
  overview: {
    title: 'Dashboard',
    description: 'A clear overview of organizations, access and platform activity.',
  },
  'organization-analytics': {
    title: 'Org analytics',
    description: 'Review organization growth and status across the platform.',
  },
  'user-analytics': {
    title: 'User analytics',
    description: 'Understand user growth, activity and organization memberships.',
  },
  'platform-usage': {
    title: 'Platform usage',
    description: 'Explore request trends and recent platform activity.',
  },
};

const organizationSectionDetails: Record<
  OrganizationDashboardSection,
  { title: string; description: string }
> = {
  'request-summary': {
    title: 'Request summary',
    description: 'Review request trends, volume and status within your authorized scope.',
  },
  'approval-summary': {
    title: 'Approval summary',
    description: 'Review approval workload and decision performance.',
  },
  'approval-activity': {
    title: 'Approval activity',
    description: 'Review recorded approval decisions and stage activity.',
  },
  'user-statistics': {
    title: 'User statistics',
    description: 'Review user registrations and department membership statistics.',
  },
  'department-overview': {
    title: 'Dept overview',
    description: 'Review department status and organization-wide department information.',
  },
};

function isPlatformSection(section: DashboardSection): section is PlatformDashboardSection {
  return section in platformSectionDetails;
}

function isOrganizationSection(section: DashboardSection): section is OrganizationDashboardSection {
  return section in organizationSectionDetails;
}

export function DashboardHeader({
  type,
  section,
  userName,
  refreshing,
  onRefresh,
}: DashboardHeaderProps) {
  const platform = type === 'PLATFORM';
  const organizationOverview = !platform && section === 'overview';
  const details = platform
    ? isPlatformSection(section)
      ? platformSectionDetails[section]
      : platformSectionDetails.overview
    : isOrganizationSection(section)
      ? organizationSectionDetails[section]
      : null;
  return (
    <PageHeader
      {...(platform
        ? { eyebrow: 'Platform' }
        : organizationOverview
          ? {}
          : { eyebrow: 'Workspace' })}
      title={organizationOverview ? `Welcome back, ${userName}!` : (details?.title ?? 'Dashboard')}
      description={
        organizationOverview
          ? "Here's what's happening in your organization today."
          : (details?.description ??
            `Welcome back, ${userName}. Here is the information available to your session.`)
      }
      actions={
        <IconButton
          variant="outline"
          icon="refresh"
          label="Refresh dashboard"
          loading={refreshing}
          onClick={onRefresh}
        />
      }
    />
  );
}
