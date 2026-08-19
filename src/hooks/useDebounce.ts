import { useEffect, useState } from 'react';

// Devuelve `value`, pero actualizado recien despues de `delayMs` sin
// cambios. Se usa en el autocomplete de hashtags para no llamar a la API
// en cada tecla.
export function useDebounce<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
