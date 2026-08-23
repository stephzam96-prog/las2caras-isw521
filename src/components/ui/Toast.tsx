import type { ToastType } from '../../context/ToastContext';

interface ToastProps {
  type: ToastType;
  message: string;
  onDismiss: () => void;
}

// role="alert" (aria-live="assertive" implícito) SOLO para error -- es el
// único caso urgente que amerita interrumpir al lector de pantalla.
// success/warning/info usan role="status" (aria-live="polite" implícito):
// informan sin cortar lo que el usuario esté haciendo o escuchando.
const STYLES: Record<ToastType, string> = {
  success: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  error: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  info: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
};

const ICONS: Record<ToastType, string> = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ',
};

export default function Toast({ type, message, onDismiss }: ToastProps) {
  return (
    <div
      role={type === 'error' ? 'alert' : 'status'}
      className={`flex max-w-sm items-center gap-2 rounded-md px-4 py-2 text-sm shadow-lg ${STYLES[type]}`}
    >
      <span aria-hidden="true">{ICONS[type]}</span>
      <p className="flex-1">{message}</p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Cerrar notificación"
        className="shrink-0 opacity-70 hover:opacity-100"
      >
        ✕
      </button>
    </div>
  );
}
