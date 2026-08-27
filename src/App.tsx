import Navbar from './components/layout/Navbar';
import OfflineBanner from './components/layout/OfflineBanner';
import { AppRoutes } from './routes/AppRoutes';
import { useReloadOnReconnect } from './hooks/useReloadOnReconnect';
import './App.css';

// Navbar y OfflineBanner fuera de <AppRoutes/> a propósito: así aparecen en
// TODAS las pantallas, incluidas 404/403, que no pasan por AuthGuard/RoleGuard.
function App() {
  // Al recuperar la conexión, recarga para traer datos frescos del API.
  useReloadOnReconnect();

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <OfflineBanner />
      <main className="flex-1">
        <AppRoutes />
      </main>
    </div>
  );
}

export default App;
