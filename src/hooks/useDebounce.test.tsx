import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useDebounce } from './useDebounce';

describe('useDebounce', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('updates only after the latest value has remained unchanged for the delay', () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 200), {
      initialProps: { value: 'initial' },
    });

    rerender({ value: 'first' });
    act(() => vi.advanceTimersByTime(150));
    rerender({ value: 'latest' });
    act(() => vi.advanceTimersByTime(199));
    expect(result.current).toBe('initial');

    act(() => vi.advanceTimersByTime(1));
    expect(result.current).toBe('latest');
  });
});
