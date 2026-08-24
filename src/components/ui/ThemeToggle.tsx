import { useEffect, useState } from 'react';
import { cacheService } from '../../services/cacheService';

// El variant `dark:` de Tailwind ya está configurado en src/index.css para
// responder a la clase `.dark` en <html>. Agregar/quitar esa clase en
// document.documentElement es lo que cambia el tema de toda la app.
// cacheService.getTheme()/setTheme() son la única vía permitida para leer/
// escribir la preferencia (CLAUDE.md prohíbe tocar localStorage directo).

// Estado inicial: preferencia guardada, o la del sistema operativo si el
// usuario nunca eligió (getTheme() devuelve null).
function getInitialTheme(): 'light' | 'dark' {
  const saved = cacheService.getTheme();
  if (saved) return saved;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export default function ThemeToggle() {
  const [theme, setThemeState] = useState<'light' | 'dark'>(getInitialTheme);

  // Aplica la clase `dark` en <html> al montar y cada vez que cambia el
  // tema, para que los `dark:` de toda la app respondan.
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  function handleToggle() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setThemeState(next);
    cacheService.setTheme(next);
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label={theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
      className="rounded-md p-2 text-lg hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center text-gray-700 dark:text-gray-300"
    >
      {theme === 'dark' ? (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  );
}
