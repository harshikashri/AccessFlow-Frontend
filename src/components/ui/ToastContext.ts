import { createContext } from 'react';
import type { ToastOptions } from './toast.types';

export interface ToastContextValue {
  showToast: (toast: ToastOptions) => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);
