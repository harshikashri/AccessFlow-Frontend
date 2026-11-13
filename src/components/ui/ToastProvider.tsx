import { useCallback, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { Button } from './Button';
import { ToastContext } from './ToastContext';
import type { ToastItem, ToastOptions } from './toast.types';

export function ToastProvider({ children }: PropsWithChildren) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);
  const timers = useRef(new Map<number, number>());

  const dismissToast = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer !== undefined) {
      window.clearTimeout(timer);
      timers.current.delete(id);
    }
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (toast: ToastOptions) => {
      const id = nextId.current++;
      const duration = toast.duration ?? 5000;
      setToasts((current) => [...current, { ...toast, id }]);
      if (duration > 0) {
        timers.current.set(
          id,
          window.setTimeout(() => dismissToast(id), duration),
        );
      }
    },
    [dismissToast],
  );

  useEffect(
    () => () => {
      timers.current.forEach((timer) => window.clearTimeout(timer));
      timers.current.clear();
    },
    [],
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="ui-toast-viewport" aria-label="Notifications">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`ui-toast ui-toast--${toast.variant ?? 'information'}`}
            role={toast.variant === 'error' ? 'alert' : 'status'}
            aria-live={toast.variant === 'error' ? 'assertive' : 'polite'}
          >
            <div className="ui-toast__content">
              <p className="ui-toast__title">{toast.title}</p>
              {toast.description && <p className="ui-toast__description">{toast.description}</p>}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="ui-toast__close"
              aria-label={`Dismiss ${toast.title} notification`}
              onClick={() => dismissToast(toast.id)}
            >
              <span aria-hidden="true">×</span>
            </Button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
