import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import type { SearchViewResult } from '../../services/busquedaService';
import { busquedaService } from '../../services/busquedaService';
import { useDebounce } from '../../hooks/useDebounce';
import EmptyState from '../../components/ui/EmptyState';
import Spinner from '../../components/ui/Spinner';

// NOTA IMPORTANTE (ver también CLAUDE.md, sección "GridPublicaciones/
// TarjetaPublicacion -- regla de uso"): esta pantalla NO reutiliza
// GridPublicaciones/TarjetaPublicacion a propósito. GET /api/search
// devuelve un shape distinto al View completo (sin description, sin
// conteos de reacciones) -- por eso existe SearchViewResult, un tipo
// liviano separado, y una tarjeta de resultado propia más abajo.

export default function BusquedaPage() {
  // --- YA ARMADO: lectura del query param ?q= ---
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') ?? '';

  // --- YA ARMADO: input de búsqueda con debounce (evita pegarle a la API
  // en cada tecla) ---
  const [query, setQuery] = useState(initialQuery);
  const debouncedQuery = useDebounce(query.trim(), 300);

  // --- YA ARMADO: mantiene la URL sincronizada con lo que se busca, para
  // que /search?q=... sea compartible/bookmarkeable ---
  useEffect(() => {
    if (debouncedQuery) {
      setSearchParams({ q: debouncedQuery });
    } else {
      setSearchParams({});
    }
  }, [debouncedQuery, setSearchParams]);

  const [results, setResults] = useState<SearchViewResult[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'empty' | 'error'>('idle');
  const [prevQuery, setPrevQuery] = useState('');

  // Sincronizar el estado de forma síncrona en el renderizado al cambiar el query
  if (debouncedQuery !== prevQuery) {
    setPrevQuery(debouncedQuery);
    if (!debouncedQuery) {
      setResults([]);
      setStatus('idle');
    } else {
      setStatus('loading');
    }
  }

  const handleRetry = () => {
    if (!debouncedQuery) return;
    setStatus('loading');
    busquedaService
      .search(debouncedQuery)
      .then(({ views }) => {
        setResults(views);
        setStatus(views.length === 0 ? 'empty' : 'success');
      })
      .catch((err) => {
        console.error('Error al buscar', err);
        setStatus('error');
      });
  };

  useEffect(() => {
    if (!debouncedQuery) return;

    let active = true;
    busquedaService
      .search(debouncedQuery)
      .then(({ views }) => {
        if (!active) return;
        setResults(views);
        setStatus(views.length === 0 ? 'empty' : 'success');
      })
      .catch((err) => {
        if (!active) return;
        console.error('Error al buscar', err);
        setStatus('error');
      });

    return () => {
      active = false;
    };
  }, [debouncedQuery]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="mb-4 text-2xl font-bold text-gray-900 dark:text-gray-100">Buscar</h1>

      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar publicaciones, categorías, hashtags, autores…"
        className="mb-6 w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
      />

      {debouncedQuery === '' ? (
        <EmptyState title="Buscá algo" message="Escribí un término para ver resultados." />
      ) : (
        <>
          {status === 'loading' && <Spinner label="Buscando..." />}

          {status === 'error' && (
            <EmptyState
              title="Error al buscar"
              message="No pudimos realizar la búsqueda. Por favor, intentá de nuevo."
              actionLabel="Reintentar"
              onAction={handleRetry}
            />
          )}

          {status === 'empty' && (
            <EmptyState
              title="Sin resultados"
              message={`No encontramos nada para "${debouncedQuery}".`}
            />
          )}

          {status === 'success' && (
            <ul className="flex flex-col gap-2">
              {results.map((view) => (
                <ResultadoBusquedaCard key={view.id} view={view} />
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

// --- YA ARMADO: tarjeta liviana para un resultado de búsqueda ---
// No reutiliza TarjetaPublicacion a propósito -- ver la nota al inicio
// del archivo y en CLAUDE.md.
function ResultadoBusquedaCard({ view }: { view: SearchViewResult }) {
  const sideA = view.sides.find((s) => s.type === 'SIDE') ?? view.sides[0];
  return (
    <li className="rounded-md border border-gray-200 p-3 dark:border-gray-700">
      <Link to={`/views/${view.id}`} className="font-medium text-blue-600 hover:underline">
        {sideA?.title}
      </Link>
      <p className="text-sm text-gray-500 dark:text-gray-400">{view.category.name}</p>
    </li>
  );
}
