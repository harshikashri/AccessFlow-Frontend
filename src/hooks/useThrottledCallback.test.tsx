import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useThrottledCallback } from './useThrottledCallback';

describe('useThrottledCallback', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('runs immediately and then once with the latest trailing arguments', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(0));
    const callback = vi.fn<(value: string) => void>();
    const { result } = renderHook(() => useThrottledCallback(callback, 100));

    act(() => result.current('first'));
    act(() => {
      result.current('second');
      result.current('latest');
    });

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenLastCalledWith('first');

    act(() => vi.advanceTimersByTime(100));
    expect(callback).toHaveBeenCalledTimes(2);
    expect(callback).toHaveBeenLastCalledWith('latest');
  });

  it('clears a pending trailing call when unmounted', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(0));
    const callback = vi.fn<() => void>();
    const { result, unmount } = renderHook(() => useThrottledCallback(callback, 100));

    act(() => {
      result.current();
      result.current();
    });
    unmount();
    act(() => vi.advanceTimersByTime(100));

    expect(callback).toHaveBeenCalledTimes(1);
  });
});
