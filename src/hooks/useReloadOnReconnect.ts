import { useEffect } from 'react';

// Cuando el navegador recupera la conexión (evento "online"), recarga la
// página para traer datos frescos del API. El enunciado pide que al volver
// la conexión la app recargue automáticamente los datos.
export function useReloadOnReconnect(): void {
  useEffect(() => {
    function handleOnline() {
      window.location.reload();
    }
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);
}
