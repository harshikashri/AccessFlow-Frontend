import { EmptyState } from '@/components/feedback/EmptyState';
import { PageHeader } from '@/components/common/PageHeader';

export function AccountSettingsPage() {
  return (
    <div className="workspace-page">
      <PageHeader
        eyebrow="Account"
        title="Account settings"
        description="Account preferences will be available in a future phase."
      />
      <div className="workspace-placeholder">
        <EmptyState
          title="Settings are a placeholder"
          description="No settings are changed and no business data is requested on this page."
        />
      </div>
    </div>
  );
}
