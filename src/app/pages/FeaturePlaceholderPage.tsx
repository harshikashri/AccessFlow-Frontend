import { EmptyState } from '@/components/feedback/EmptyState';
import { PageHeader } from '@/components/common/PageHeader';
import { findNavigationItem } from '@/features/authorization/navigation';

export function FeaturePlaceholderPage({ itemId }: { itemId: string }) {
  const item = findNavigationItem(itemId);

  if (!item) {
    return (
      <EmptyState
        title="This page is unavailable"
        description="The workspace route is not configured."
      />
    );
  }

  return (
    <div className="workspace-page">
      <PageHeader
        {...(item.section ? { eyebrow: item.section } : {})}
        title={item.label}
        description={item.description ?? 'This workspace will be available in a future phase.'}
      />
      <div className="workspace-placeholder">
        <EmptyState
          title={`${item.label} is a placeholder`}
          description="This Phase 3 page contains no business data and does not make feature API requests."
        />
      </div>
    </div>
  );
}
