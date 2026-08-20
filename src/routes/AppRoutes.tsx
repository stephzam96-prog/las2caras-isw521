import { Routes, Route } from 'react-router-dom';
import TableroPage from '../pages/tablero/TableroPage';
import LoginPage from '../pages/auth/LoginPage';
import RegistroPage from '../pages/auth/RegistroPage';
import ActivarCuentaPage from '../pages/auth/ActivarCuentaPage';
import ErrorPage from '../pages/error/ErrorPage';
import { AuthGuard } from './AuthGuard';
import CategoriaPage from '../pages/categoria/CategoriaPage';
import BusquedaPage from '../pages/busqueda/BusquedaPage';
import DetallePublicacionPage from '../pages/publicacion/DetallePublicacionPage';
import PerfilAutorPage from '../pages/perfil/PerfilAutorPage';
import AdminCategoriasPage from '../pages/admin/AdminCategoriasPage';
import { RoleGuard } from './RoleGuard';

// Rutas de auth y tablero ya armadas acá; el resto (categorías, búsqueda,
// admin, etc.) se va agregando pantalla por pantalla en sus propias features.
export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<TableroPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegistroPage />} />
      <Route path="/auth/activate/:token" element={<ActivarCuentaPage />} />
      <Route path="/categories/:id" element={<CategoriaPage />} />
      <Route path="/search" element={<BusquedaPage />} />
      <Route path="/views/:id" element={<DetallePublicacionPage />} />
      <Route path="/authors/:id" element={<PerfilAutorPage />} />

      <Route element={<AuthGuard />}>
        {/* futuras rutas autenticadas: /views/new, /profile, etc. */}
        <Route element={<RoleGuard allowedRoles={['SUPERADMIN']} />}>
          <Route path="/admin/categories" element={<AdminCategoriasPage />} />
        </Route>
      </Route>

      <Route
        path="/403"
        element={
          <ErrorPage
            code={403}
            title="No tenés permiso"
            message="No tenés los permisos necesarios para ver esta página."
          />
        }
      />
      <Route
        path="*"
        element={
          <ErrorPage
            code={404}
            title="Página no encontrada"
            message="Esta publicación o página no existe o fue eliminada."
          />
        }
      />
    </Routes>
  );
}
