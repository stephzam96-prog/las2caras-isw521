import { createContext, useCallback, useRef, useState, type ReactNode } from 'react';
import Toast from '../components/ui/Toast';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

export const ToastContext = createContext<ToastContextValue | undefined>(undefined);

// Error se queda más tiempo en pantalla que el resto -- un mensaje de error
// suele requerir más tiempo para leerse/entenderse que uno de éxito.
const DURATION_MS: Record<ToastType, number> = {
  error: 6000,
  success: 4000,
  warning: 4000,
  info: 4000,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const nextId = useRef(0);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    if (timers.current[id]) {
      clearTimeout(timers.current[id]);
      delete timers.current[id];
    }
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = 'info') => {
      const id = `toast-${nextId.current++}`;
      setToasts((prev) => [...prev, { id, type, message }]);
      timers.current[id] = setTimeout(() => dismissToast(id), DURATION_MS[type]);
    },
    [dismissToast],
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Contenedor fijo: no hace falta tocar App.tsx/Navbar.tsx para que
          los toasts aparezcan, viven acá adentro del provider. */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            type={toast.type}
            message={toast.message}
            onDismiss={() => dismissToast(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
