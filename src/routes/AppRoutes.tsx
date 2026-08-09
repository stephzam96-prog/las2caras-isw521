import { Routes, Route } from 'react-router-dom';
import LoginPage from '../pages/auth/LoginPage';
import RegistroPage from '../pages/auth/RegistroPage';
import ActivarCuentaPage from '../pages/auth/ActivarCuentaPage';
import ErrorPage from '../pages/error/ErrorPage';
import { AuthGuard } from './AuthGuard';
import { useAuth } from '../hooks/useAuth';

// Placeholder del Tablero: lo reemplaza la integrante que arma esa pantalla.
// Se deja acá solo para poder probar el flujo de login/registro end-to-end.
function HomePlaceholder() {
  const { user, logout } = useAuth();
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">LasDosCaras</h1>
      {user ? (
        <div className="mt-4">
          <p>Sesión iniciada como {user.name} ({user.email})</p>
          <button onClick={logout} className="mt-2 rounded-md bg-gray-200 px-3 py-1 dark:bg-gray-700">
            Cerrar sesión
          </button>
        </div>
      ) : (
        <p className="mt-4">No hay sesión iniciada.</p>
      )}
    </div>
  );
}

// Rutas de auth ya armadas acá; el resto (tablero, categorías, admin, etc.)
// se va agregando pantalla por pantalla en sus propias features.
export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePlaceholder />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegistroPage />} />
      <Route path="/auth/activate/:token" element={<ActivarCuentaPage />} />

      <Route element={<AuthGuard />}>
        {/* futuras rutas autenticadas: /views/new, /profile, etc. */}
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
