import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

// Protege rutas que requieren estar autenticado (ej. /views/new, /profile).
export function AuthGuard() {
  const { status, isAuthenticated } = useAuth();
  const location = useLocation();

  if (status === 'idle' || status === 'loading') {
    return <div className="flex justify-center p-8">Cargando…</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
