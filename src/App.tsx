import Navbar from './components/layout/Navbar';
import { AppRoutes } from './routes/AppRoutes';
import './App.css';

// Navbar fuera de <AppRoutes/> a propósito: así aparece en TODAS las
// pantallas, incluidas 404/403, que no pasan por AuthGuard/RoleGuard.
function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <AppRoutes />
      </main>
    </div>
  );
}

export default App;
