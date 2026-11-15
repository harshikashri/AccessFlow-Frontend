import {
  cloneElement,
  useCallback,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactElement,
} from 'react';
import { useThrottledCallback } from '@/hooks/useThrottledCallback';

interface TooltipTriggerProps {
  'aria-describedby'?: string;
}

export interface TooltipProps {
  label: string;
  children: ReactElement<TooltipTriggerProps>;
  placement?: 'top' | 'right' | 'bottom' | 'left';
}

export function Tooltip({ label, children, placement = 'top' }: TooltipProps) {
  const tooltipId = useId();
  const rootRef = useRef<HTMLSpanElement>(null);
  const contentRef = useRef<HTMLSpanElement>(null);
  const [horizontalOffset, setHorizontalOffset] = useState<number | null>(null);

  const positionWithinViewport = useCallback(() => {
    const root = rootRef.current;
    const content = contentRef.current;
    if (!root || !content) return;

    const rootRect = root.getBoundingClientRect();
    const contentWidth = content.getBoundingClientRect().width;
    const viewportWidth = document.documentElement.clientWidth;
    const left = Math.max(
      8,
      Math.min(
        rootRect.left + (rootRect.width - contentWidth) / 2,
        viewportWidth - contentWidth - 8,
      ),
    );
    setHorizontalOffset(left - rootRect.left);
  }, []);
  const handleResize = useThrottledCallback(positionWithinViewport, 100);

  useLayoutEffect(() => {
    positionWithinViewport();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize, positionWithinViewport]);

  return (
    <span
      className={`ui-tooltip ui-tooltip--${placement}`}
      ref={rootRef}
      onPointerEnter={positionWithinViewport}
      onFocusCapture={positionWithinViewport}
    >
      {cloneElement(children, {
        'aria-describedby': [children.props['aria-describedby'], tooltipId]
          .filter(Boolean)
          .join(' '),
      })}
      <span
        className="ui-tooltip__content"
        role="tooltip"
        id={tooltipId}
        ref={contentRef}
        style={
          horizontalOffset === null ? undefined : { left: horizontalOffset, transform: 'none' }
        }
      >
        {label}
      </span>
    </span>
  );
}
