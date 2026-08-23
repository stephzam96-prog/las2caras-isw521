import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Category } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { useDebounce } from '../../hooks/useDebounce';
import { categoriasService } from '../../services/categoriasService';
import { cacheService } from '../../services/cacheService';
import ThemeToggle from '../ui/ThemeToggle';

// Navbar global: se monta una sola vez en App.tsx (fuera de <AppRoutes/>),
// así que aparece en TODAS las pantallas -- incluidas 404/403, que no
// pasan por AuthGuard/RoleGuard. No asuman que hay sesión ni rol específico
// acá adentro.
export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // --- Sección 2: Categorías ---
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false);

  // Stale-while-revalidate (mismo patrón que TableroPage.tsx): mostramos lo
  // cacheado de inmediato y refrescamos contra el API en segundo plano.
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    const cached = cacheService.getCategories();
    if (cached) setCategories(cached);

    categoriasService
      .listCategories()
      .then(({ categories }) => {
        setCategories(categories);
        cacheService.setCategories(categories);
      })
      .catch((err) => console.error('No se pudieron cargar las categorías', err));
  }, []);

  // --- Sección 3: Búsqueda global ---
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  function handleSearchSubmit(event: FormEvent) {
    event.preventDefault();
    const q = searchQuery.trim();
    if (q) navigate(`/search?q=${encodeURIComponent(q)}`);
  }

  // Además del submit por Enter, el enunciado pide debounce de 300ms: al
  // dejar de tipear, navegamos automáticamente a los resultados (salvo que
  // el campo esté vacío).
  useEffect(() => {
    const q = debouncedSearchQuery.trim();
    if (q) navigate(`/search?q=${encodeURIComponent(q)}`);
  }, [debouncedSearchQuery, navigate]);

  // --- Sección 5: Auth (login/registro vs. perfil/logout) ---
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  function handleLogout() {
    logout();
    setIsUserMenuOpen(false);
    setIsMobileMenuOpen(false);
    navigate('/');
  }

  return (
    <nav className="sticky top-0 z-30 border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        {/* --- Sección 1: Logo (YA ARMADO, no requiere TODO) --- */}
        <Link to="/" className="text-lg font-bold text-gray-900 dark:text-gray-100">
          LasDosCaras
        </Link>

        {/* --- Desktop: categorías + búsqueda + tema + auth --- */}
        <div className="hidden flex-1 items-center gap-4 md:flex">
          <div
            className="relative"
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                setIsCategoriesOpen(false);
              }
            }}
          >
            <button
              type="button"
              aria-expanded={isCategoriesOpen}
              aria-controls="navbar-categories-menu"
              onClick={() => setIsCategoriesOpen((prev) => !prev)}
              className="rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Categorías
            </button>
            {isCategoriesOpen && (
              <ul
                id="navbar-categories-menu"
                role="menu"
                className="absolute z-10 mt-1 w-56 rounded-md border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800"
              >
                {categories.length === 0 && (
                  <li className="px-4 py-2 text-sm text-gray-400 dark:text-gray-500">Sin categorías</li>
                )}
                {categories.map((c) => (
                  <li key={c.id}>
                    <Link
                      to={`/categories/${c.id}`}
                      onClick={() => setIsCategoriesOpen(false)}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                    >
                      {c.name}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <form onSubmit={handleSearchSubmit} className="flex-1">
            <label htmlFor="navbar-search" className="sr-only">
              Buscar publicaciones
            </label>
            <input
              id="navbar-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar…"
              className="w-full max-w-xs rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800"
            />
          </form>

          <ThemeToggle />

          {isAuthenticated ? (
            <div
              className="relative"
              onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                  setIsUserMenuOpen(false);
                }
              }}
            >
              <button
                type="button"
                aria-expanded={isUserMenuOpen}
                aria-controls="navbar-user-menu"
                onClick={() => setIsUserMenuOpen((prev) => !prev)}
                className="rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                {user?.name}
              </button>
              {isUserMenuOpen && (
                <div
                  id="navbar-user-menu"
                  role="menu"
                  className="absolute right-0 z-10 mt-1 w-48 rounded-md border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800"
                >
                  {/* --- YA ARMADO: link a Perfil, no requiere TODO --- */}
                  <Link
                    to="/profile"
                    onClick={() => setIsUserMenuOpen(false)}
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    Mi perfil
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login" className="text-sm text-gray-700 hover:underline dark:text-gray-300">
                Ingresar
              </Link>
              <Link
                to="/register"
                className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white"
              >
                Registrarme
              </Link>
            </div>
          )}
        </div>

        {/* --- Mobile: botón hamburguesa --- */}
        <button
          type="button"
          aria-expanded={isMobileMenuOpen}
          aria-controls="navbar-mobile-menu"
          aria-label={isMobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
          onClick={() => setIsMobileMenuOpen((prev) => !prev)}
          className="rounded-md p-2 text-xl md:hidden"
        >
          {isMobileMenuOpen ? '✕' : '☰'}
        </button>
      </div>

      {/* --- Mobile: panel apilado con las mismas secciones --- */}
      {isMobileMenuOpen && (
        <div
          id="navbar-mobile-menu"
          className="flex flex-col gap-3 border-t border-gray-200 px-4 py-3 md:hidden dark:border-gray-700"
        >
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Categorías
            </p>
            <div className="flex flex-col">
              {categories.map((c) => (
                <Link
                  key={c.id}
                  to={`/categories/${c.id}`}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="py-1 text-sm text-gray-700 dark:text-gray-300"
                >
                  {c.name}
                </Link>
              ))}
            </div>
          </div>

          <form onSubmit={handleSearchSubmit}>
            <label htmlFor="navbar-search-mobile" className="sr-only">
              Buscar publicaciones
            </label>
            <input
              id="navbar-search-mobile"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar…"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
            />
          </form>

          <div className="flex items-center justify-between">
            <ThemeToggle />
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <Link to="/profile" onClick={() => setIsMobileMenuOpen(false)} className="text-sm hover:underline">
                  Mi perfil
                </Link>
                <button type="button" onClick={handleLogout} className="text-sm text-red-600">
                  Cerrar sesión
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link to="/login" onClick={() => setIsMobileMenuOpen(false)} className="text-sm hover:underline">
                  Ingresar
                </Link>
                <Link
                  to="/register"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white"
                >
                  Registrarme
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
