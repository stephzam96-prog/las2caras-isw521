import { useOnlineStatus } from '../../hooks/useOnlineStatus';

// Banner global de sin-conexión: se monta en App.tsx (fuera de <AppRoutes/>),
// así aparece en TODAS las pantallas. Antes este banner vivía dentro de
// TableroPage y solo se veía ahí.
export default function OfflineBanner() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      className="bg-yellow-100 px-4 py-2 text-center text-sm text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
    >
      Estás sin conexión. Los datos que ves pueden estar desactualizados.
    </div>
  );
}