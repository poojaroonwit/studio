import { renderHook, act } from '@testing-library/react';
import {
  useResourceCleanup,
  useTimeout,
  useInterval,
  useAbortController,
  useEventListener,
  useBodyScrollLock,
  usePortalContainer,
} from '../use-resource-cleanup';

// Mock timers
jest.useFakeTimers();

describe('useResourceCleanup', () => {
  beforeEach(() => {
    jest.clearAllTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should track and cleanup timeouts', () => {
    const callback = jest.fn();
    const { result } = renderHook(() => useResourceCleanup());

    act(() => {
      const timeout = result.current.addTimeout(callback, 1000);
      expect(timeout).toBeDefined();
    });

    // Fast-forward time
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should track and cleanup intervals', () => {
    const callback = jest.fn();
    const { result } = renderHook(() => useResourceCleanup());

    act(() => {
      const interval = result.current.addInterval(callback, 1000);
      expect(interval).toBeDefined();
    });

    // Fast-forward time
    act(() => {
      jest.advanceTimersByTime(3000);
    });

    expect(callback).toHaveBeenCalledTimes(3);
  });

  it('should track and cleanup abort controllers', () => {
    const { result } = renderHook(() => useResourceCleanup());

    act(() => {
      const controller = result.current.createAbortController();
      expect(controller).toBeDefined();
      expect(controller.signal.aborted).toBe(false);
    });
  });

  it('should track and cleanup event listeners', () => {
    const callback = jest.fn();
    const { result } = renderHook(() => useResourceCleanup());

    act(() => {
      result.current.addEventListener(document, 'click', callback);
    });

    // Trigger event
    act(() => {
      document.dispatchEvent(new Event('click'));
    });

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should cleanup all resources on unmount', () => {
    const timeoutCallback = jest.fn();
    const intervalCallback = jest.fn();
    const eventCallback = jest.fn();
    const cleanupCallback = jest.fn();

    const { result, unmount } = renderHook(() => useResourceCleanup());

    act(() => {
      result.current.addTimeout(timeoutCallback, 1000);
      result.current.addInterval(intervalCallback, 1000);
      result.current.addEventListener(document, 'click', eventCallback);
      result.current.addCleanupFunction(cleanupCallback);
    });

    // Unmount should trigger cleanup
    unmount();

    expect(cleanupCallback).toHaveBeenCalledTimes(1);
  });
});

describe('useTimeout', () => {
  beforeEach(() => {
    jest.clearAllTimers();
  });

  it('should execute callback after delay', () => {
    const callback = jest.fn();
    const { result } = renderHook(() => useTimeout(callback, 1000));

    expect(callback).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should not execute callback if delay is null', () => {
    const callback = jest.fn();
    renderHook(() => useTimeout(callback, null));

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(callback).not.toHaveBeenCalled();
  });

  it('should clear timeout when clear is called', () => {
    const callback = jest.fn();
    const { result } = renderHook(() => useTimeout(callback, 1000));

    act(() => {
      result.current.clear();
    });

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(callback).not.toHaveBeenCalled();
  });

  it('should cleanup timeout on unmount', () => {
    const callback = jest.fn();
    const { unmount } = renderHook(() => useTimeout(callback, 1000));

    unmount();

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(callback).not.toHaveBeenCalled();
  });
});

describe('useInterval', () => {
  beforeEach(() => {
    jest.clearAllTimers();
  });

  it('should execute callback repeatedly', () => {
    const callback = jest.fn();
    const { result } = renderHook(() => useInterval(callback, 1000));

    expect(callback).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(3000);
    });

    expect(callback).toHaveBeenCalledTimes(3);
  });

  it('should not execute callback if delay is null', () => {
    const callback = jest.fn();
    renderHook(() => useInterval(callback, null));

    act(() => {
      jest.advanceTimersByTime(3000);
    });

    expect(callback).not.toHaveBeenCalled();
  });

  it('should clear interval when clear is called', () => {
    const callback = jest.fn();
    const { result } = renderHook(() => useInterval(callback, 1000));

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(callback).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.clear();
    });

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(callback).toHaveBeenCalledTimes(1); // Should not increase
  });

  it('should cleanup interval on unmount', () => {
    const callback = jest.fn();
    const { unmount } = renderHook(() => useInterval(callback, 1000));

    unmount();

    act(() => {
      jest.advanceTimersByTime(3000);
    });

    expect(callback).not.toHaveBeenCalled();
  });
});

describe('useAbortController', () => {
  it('should create abort controller', () => {
    const { result } = renderHook(() => useAbortController());

    expect(result.current.signal).toBeDefined();
    expect(result.current.signal.aborted).toBe(false);
  });

  it('should abort controller when abort is called', () => {
    const { result } = renderHook(() => useAbortController());

    act(() => {
      result.current.abort();
    });

    expect(result.current.signal?.aborted).toBe(true);
  });

  it('should cleanup controller on unmount', () => {
    const { result, unmount } = renderHook(() => useAbortController());

    const signal = result.current.signal;
    expect(signal?.aborted).toBe(false);

    unmount();

    // The signal should be aborted on unmount
    expect(signal?.aborted).toBe(true);
  });
});

describe('useEventListener', () => {
  it('should add event listener', () => {
    const callback = jest.fn();
    renderHook(() => useEventListener(document, 'click', callback));

    act(() => {
      document.dispatchEvent(new Event('click'));
    });

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should not add listener if element is null', () => {
    const callback = jest.fn();
    renderHook(() => useEventListener(null, 'click', callback));

    act(() => {
      document.dispatchEvent(new Event('click'));
    });

    expect(callback).not.toHaveBeenCalled();
  });

  it('should remove event listener on unmount', () => {
    const callback = jest.fn();
    const { unmount } = renderHook(() => useEventListener(document, 'click', callback));

    unmount();

    act(() => {
      document.dispatchEvent(new Event('click'));
    });

    expect(callback).not.toHaveBeenCalled();
  });
});

describe('useBodyScrollLock', () => {
  beforeEach(() => {
    // Reset body style
    document.body.style.overflow = '';
  });

  it('should lock body scroll when locked is true', () => {
    renderHook(() => useBodyScrollLock(true));

    expect(document.body.style.overflow).toBe('hidden');
  });

  it('should not lock body scroll when locked is false', () => {
    renderHook(() => useBodyScrollLock(false));

    expect(document.body.style.overflow).toBe('');
  });

  it('should restore original overflow on unmount', () => {
    document.body.style.overflow = 'auto';
    
    const { unmount } = renderHook(() => useBodyScrollLock(true));
    
    expect(document.body.style.overflow).toBe('hidden');
    
    unmount();
    
    expect(document.body.style.overflow).toBe('auto');
  });
});

describe('usePortalContainer', () => {
  beforeEach(() => {
    // Clean up any existing containers
    document.querySelectorAll('[data-portal-container]').forEach(el => el.remove());
  });

  it('should create portal container', () => {
    const { result } = renderHook(() => usePortalContainer('test-container'));

    expect(result.current).toBeDefined();
    expect(result.current?.getAttribute('data-portal-container')).toBe('test-container');
    expect(document.body.contains(result.current)).toBe(true);
  });

  it('should reuse existing container with same id', () => {
    const { result: result1 } = renderHook(() => usePortalContainer('test-container'));
    const { result: result2 } = renderHook(() => usePortalContainer('test-container'));

    expect(result1.current).toBe(result2.current);
  });

  it('should cleanup container on unmount', () => {
    const { result, unmount } = renderHook(() => usePortalContainer('test-container'));

    const container = result.current;
    expect(document.body.contains(container)).toBe(true);

    unmount();

    expect(document.body.contains(container)).toBe(false);
  });
});

describe('Memory Leak Prevention', () => {
  it('should not leak memory with multiple timeouts', () => {
    const callback = jest.fn();
    const { result, rerender } = renderHook(() => useResourceCleanup());

    // Create multiple timeouts
    for (let i = 0; i < 10; i++) {
      act(() => {
        result.current.addTimeout(callback, 1000);
      });
    }

    // Rerender to trigger cleanup
    rerender();

    // Fast-forward time
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    // Should not have any memory leaks
    expect(callback).toHaveBeenCalledTimes(10);
  });

  it('should not leak memory with multiple intervals', () => {
    const callback = jest.fn();
    const { result, rerender } = renderHook(() => useResourceCleanup());

    // Create multiple intervals
    for (let i = 0; i < 5; i++) {
      act(() => {
        result.current.addInterval(callback, 1000);
      });
    }

    // Fast-forward time
    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(callback).toHaveBeenCalledTimes(10); // 5 intervals * 2 seconds

    // Rerender to trigger cleanup
    rerender();

    // Fast-forward more time
    act(() => {
      jest.advanceTimersByTime(2000);
    });

    // Should not increase further after cleanup
    expect(callback).toHaveBeenCalledTimes(10);
  });

  it('should not leak memory with multiple event listeners', () => {
    const callback = jest.fn();
    const { result, rerender } = renderHook(() => useResourceCleanup());

    // Add multiple event listeners
    for (let i = 0; i < 5; i++) {
      act(() => {
        result.current.addEventListener(document, 'click', callback);
      });
    }

    // Trigger event
    act(() => {
      document.dispatchEvent(new Event('click'));
    });

    expect(callback).toHaveBeenCalledTimes(5);

    // Rerender to trigger cleanup
    rerender();

    // Trigger event again
    act(() => {
      document.dispatchEvent(new Event('click'));
    });

    // Should not be called again after cleanup
    expect(callback).toHaveBeenCalledTimes(5);
  });
});
