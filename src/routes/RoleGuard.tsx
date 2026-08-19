import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import type { Role } from '../types';

interface RoleGuardProps {
  allowedRoles: Role[];
}

// Va anidado dentro de AuthGuard en las rutas (ej. /admin/*), así que acá
// ya se asume que hay sesión: solo valida el rol.
export function RoleGuard({ allowedRoles }: RoleGuardProps) {
  const { user } = useAuth();

  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/403" replace />;
  }

  return <Outlet />;
}
