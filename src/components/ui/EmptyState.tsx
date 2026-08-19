interface EmptyStateProps {
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}

// Generico: sirve tanto para "sin resultados" como para el estado de error
// de red (con un boton de "Reintentar" via actionLabel/onAction).
export default function EmptyState({ title, message, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 p-8 text-center dark:border-gray-700">
      <p className="font-medium text-gray-700 dark:text-gray-300">{title}</p>
      {message && <p className="text-sm text-gray-500 dark:text-gray-400">{message}</p>}
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
