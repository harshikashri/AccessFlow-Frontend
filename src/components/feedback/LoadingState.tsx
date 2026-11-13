import { Spinner } from '@/components/ui/Spinner';

export function LoadingState({ label = 'Loading content' }: { label?: string }) {
  return (
    <div className="feedback-state" aria-busy="true">
      <Spinner label={label} />
      <p aria-hidden="true">{label}</p>
    </div>
  );
}
