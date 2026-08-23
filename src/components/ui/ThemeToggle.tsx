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
      className="rounded-md p-2 text-lg hover:bg-gray-100 dark:hover:bg-gray-800"
    >
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  );
}
