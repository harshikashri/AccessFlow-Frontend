export function BrandMark({ size = 'compact' }: { size?: 'compact' | 'large' }) {
  return (
    <span className={`brand-mark brand-mark--${size}`} aria-hidden="true">
      <svg
        viewBox="0 0 40 40"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.2"
      >
        <path d="m18.5 13.5-4.7 10.2m8.4-10.2L27 23.7M15 28.5h10" stroke="currentColor" />
        <circle cx="20" cy="10.5" r="3.3" fill="var(--brand-mark-accent)" />
        <circle
          cx="11.5"
          cy="28.5"
          r="3.3"
          fill="var(--brand-mark-surface)"
          stroke="currentColor"
        />
        <circle
          cx="28.5"
          cy="28.5"
          r="3.3"
          fill="var(--brand-mark-surface)"
          stroke="currentColor"
        />
      </svg>
    </span>
  );
}
