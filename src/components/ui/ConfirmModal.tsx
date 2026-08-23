import { useEffect, useRef } from 'react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'danger';
  onConfirm: () => void;
  onCancel: () => void;
}

// Modal de confirmación genérico y accesible -- misma mecánica de
// accesibilidad (role="dialog", aria-modal, focus trap con Tab/Shift+Tab,
// cierre con Escape, foco de retorno al cerrar) que se construyó para el
// modal de crear/editar en AdminCategoriasPage.tsx, extraída acá para no
// duplicarla en cada pantalla que necesite confirmar una acción.
//
// Diferencia importante respecto a aquel modal: este no tiene ningún campo
// de texto, así que el foco inicial va al botón "Cancelar" (no al de
// confirmar) -- es la convención estándar para diálogos destructivos, para
// que un Enter accidental no dispare una acción irreversible (banear,
// despublicar, etc.).
//
// No hace falta pasarle una ref del botón que lo abrió: captura
// document.activeElement apenas isOpen pasa a true y se lo devuelve el
// foco al cerrar.
export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'default',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      triggerRef.current = document.activeElement as HTMLElement | null;
      cancelButtonRef.current?.focus();
    } else {
      triggerRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    function getFocusableElements(): HTMLElement[] {
      if (!modalRef.current) return [];
      return Array.from(
        modalRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onCancel();
        return;
      }
      if (event.key !== 'Tab') return;

      const focusable = getFocusableElements();
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        aria-describedby="confirm-modal-message"
        className="w-full max-w-sm rounded-lg bg-white p-4 dark:bg-gray-800"
      >
        <h2 id="confirm-modal-title" className="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
          {title}
        </h2>
        <p id="confirm-modal-message" className="mb-4 text-sm text-gray-600 dark:text-gray-400">
          {message}
        </p>
        <div className="flex justify-end gap-2">
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={onCancel}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-600"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`rounded-md px-3 py-1.5 text-sm font-medium text-white ${
              variant === 'danger' ? 'bg-red-600' : 'bg-blue-600'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
