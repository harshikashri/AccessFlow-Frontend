import { Button } from '@/components/ui';
import { ErrorState } from '@/components/feedback/ErrorState';

interface DashboardErrorStateProps {
  message: string;
  onRetry: () => void;
}

export function DashboardErrorState({ message, onRetry }: DashboardErrorStateProps) {
  return (
    <ErrorState
      title="Dashboard data is unavailable"
      description={message}
      action={
        <Button variant="outline" onClick={onRetry}>
          Retry
        </Button>
      }
    />
  );
}
