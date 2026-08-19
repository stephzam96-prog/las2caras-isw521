interface SpinnerProps {
  label?: string;
}

export default function Spinner({ label = 'Cargando…' }: SpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 p-8 text-gray-500 dark:text-gray-400">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600 dark:border-gray-600 dark:border-t-blue-400" />
      <p className="text-sm">{label}</p>
    </div>
  );
}
