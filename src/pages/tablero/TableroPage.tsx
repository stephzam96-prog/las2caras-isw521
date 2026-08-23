import { useCallback, useEffect, useState } from 'react';
import type { Category, Hashtag, View } from '../../types';
import { categoriasService } from '../../services/categoriasService';
import { hashtagsService } from '../../services/hashtagsService';
import { publicacionesService, type ViewSort } from '../../services/publicacionesService';
import { cacheService } from '../../services/cacheService';
import { useDebounce } from '../../hooks/useDebounce';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import GridPublicaciones from '../../components/publicaciones/GridPublicaciones';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';

const PAGE_SIZE = 10;

const SORT_OPTIONS: { value: ViewSort; label: string }[] = [
  { value: 'recent', label: 'Más recientes' },
  { value: 'likes', label: 'Más likes' },
  { value: 'dislikes', label: 'Más dislikes' },
];

type LoadStatus = 'loading' | 'loading-more' | 'success' | 'empty' | 'error';

export default function TableroPage() {
  const isOnline = useOnlineStatus();

  // Filtros: se restauran una sola vez al montar desde lasdoscaras_filters.
  const [initialFilters] = useState(() => cacheService.getFilters());
  const [selectedCategory, setSelectedCategory] = useState(initialFilters?.category ?? '');
  const [selectedHashtag, setSelectedHashtag] = useState(initialFilters?.hashtag ?? '');
  const [sort, setSort] = useState<ViewSort>(initialFilters?.sort ?? 'recent');

  const [categories, setCategories] = useState<Category[]>([]);

  const [hashtagQuery, setHashtagQuery] = useState('');
  const debouncedHashtagQuery = useDebounce(hashtagQuery, 300);
  const [hashtagSuggestions, setHashtagSuggestions] = useState<Hashtag[]>([]);
  const [isHashtagDropdownOpen, setIsHashtagDropdownOpen] = useState(false);

  const [views, setViews] = useState<View[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [autoRetryDone, setAutoRetryDone] = useState(false);

  // Categorías: cache inmediato (stale-while-revalidate) + refresco en
  // segundo plano. Un fallo acá no debe tumbar el tablero entero -- si no
  // hay red, se sigue mostrando lo que ya estaba en cache (o el select
  // queda vacío, pero la lista de publicaciones igual puede cargar).
  useEffect(() => {
    const cached = cacheService.getCategories();
    if (cached) setCategories(cached);

    categoriasService
      .listCategories()
      .then(({ categories }) => {
        setCategories(categories);
        cacheService.setCategories(categories);
      })
      .catch((err) => console.error('No se pudieron refrescar las categorías', err));
  }, []);

  // Hashtags: mismo patrón, pero reutilizando el efecto para el
  // autocomplete -- cuando el query está vacío, sirve como "sugerencias
  // iniciales" (cacheadas); cuando el usuario tipea, es la búsqueda en vivo
  // (nunca cacheada individualmente, solo la respuesta con query vacío).
  useEffect(() => {
    const q = debouncedHashtagQuery.trim();

    if (q === '') {
      const cached = cacheService.getHashtags();
      if (cached) setHashtagSuggestions(cached);
    }

    hashtagsService
      .searchHashtags(q || undefined)
      .then(({ hashtags }) => {
        setHashtagSuggestions(hashtags);
        if (q === '') cacheService.setHashtags(hashtags);
      })
      .catch((err) => console.error('No se pudieron cargar los hashtags', err));
  }, [debouncedHashtagQuery]);

  // Filtros activos: se persisten siempre que cambian (permanente, sin TTL).
  useEffect(() => {
    cacheService.setFilters({
      category: selectedCategory || undefined,
      hashtag: selectedHashtag || undefined,
      sort,
    });
  }, [selectedCategory, selectedHashtag, sort]);

  const fetchViews = useCallback(
    async (targetPage: number, append: boolean) => {
      setStatus(append ? 'loading-more' : 'loading');
      setAutoRetryDone(false);
      try {
        const result = await publicacionesService.listViews({
          category: selectedCategory || undefined,
          hashtag: selectedHashtag || undefined,
          sort,
          page: targetPage,
          limit: PAGE_SIZE,
        });
        setViews((prev) => (append ? [...prev, ...result.views] : result.views));
        setTotal(result.total);
        setPage(result.page);
        setStatus(result.total === 0 ? 'empty' : 'success');
      } catch (err) {
        console.error('No se pudieron cargar las publicaciones', err);
        setStatus('error');
      }
    },
    [selectedCategory, selectedHashtag, sort],
  );

  // Se re-dispara cada vez que cambia un filtro (siempre arranca en page=1,
  // no se persiste la página actual: ver decision del plan).
  useEffect(() => {
    fetchViews(1, false);
  }, [fetchViews]);

  // Reintento automático (una sola vez) en GETs fallidos, según CLAUDE.md.
  useEffect(() => {
    if (status !== 'error' || autoRetryDone) return;
    const timer = setTimeout(() => {
      setAutoRetryDone(true);
      fetchViews(1, false);
    }, 3000);
    return () => clearTimeout(timer);
  }, [status, autoRetryDone, fetchViews]);

  function handleSelectHashtag(hashtag: Hashtag) {
    setSelectedHashtag(hashtag.name);
    setHashtagQuery(hashtag.name);
    setIsHashtagDropdownOpen(false);
  }

  function handleClearHashtag() {
    setSelectedHashtag('');
    setHashtagQuery('');
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      {!isOnline && (
        <div className="mb-4 rounded-md bg-yellow-100 px-4 py-2 text-sm text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
          Estás sin conexión. Los datos que ves pueden estar desactualizados.
        </div>
      )}

      <h1 className="mb-4 text-2xl font-bold text-gray-900 dark:text-gray-100">Tablero</h1>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div>
          <label htmlFor="filtro-categoria" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Categoría
          </label>
          <select
            id="filtro-categoria"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
          >
            <option value="">Todas las categorías</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="filtro-orden" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Ordenar por
          </label>
          <select
            id="filtro-orden"
            value={sort}
            onChange={(e) => setSort(e.target.value as ViewSort)}
            className="rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div
          className="relative"
          // Cierra el dropdown solo cuando el foco sale por completo del
          // contenedor (input + lista de sugerencias), no en cada blur del
          // input -- así un Tab desde el input hacia una sugerencia no lo
          // cierra con el foco todavía adentro (era una trampa de foco).
          // relatedTarget es null cuando se hace click afuera en algo no
          // focuseable, así que el cierre por click-afuera se sigue
          // comportando igual que antes.
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
              setIsHashtagDropdownOpen(false);
            }
          }}
        >
          <label htmlFor="filtro-hashtag" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Hashtag
          </label>
          {selectedHashtag ? (
            <span className="flex items-center gap-2 rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600">
              #{selectedHashtag}
              <button
                type="button"
                onClick={handleClearHashtag}
                aria-label="Quitar filtro de hashtag"
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                ✕
              </button>
            </span>
          ) : (
            <>
              <input
                id="filtro-hashtag"
                type="text"
                placeholder="Buscar hashtag…"
                value={hashtagQuery}
                onChange={(e) => setHashtagQuery(e.target.value)}
                onFocus={() => setIsHashtagDropdownOpen(true)}
                className="w-48 rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
              />
              {isHashtagDropdownOpen && hashtagSuggestions.length > 0 && (
                <ul className="absolute z-10 mt-1 w-48 rounded-md border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
                  {hashtagSuggestions.map((h) => (
                    <li key={h.id}>
                      <button
                        type="button"
                        onMouseDown={() => handleSelectHashtag(h)}
                        className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        #{h.name}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </div>

      {status === 'loading' && <Spinner label="Cargando publicaciones…" />}

      {status === 'error' && (
        <EmptyState
          title="No pudimos cargar las publicaciones"
          message="Revisá tu conexión e intentá de nuevo."
          actionLabel="Reintentar"
          onAction={() => fetchViews(1, false)}
        />
      )}

      {status === 'empty' && (
        <EmptyState title="No hay publicaciones" message="Probá cambiar los filtros seleccionados." />
      )}

      {(status === 'success' || status === 'loading-more') && (
        <>
          <GridPublicaciones views={views} />
          {views.length < total && (
            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={() => fetchViews(page + 1, true)}
                disabled={status === 'loading-more'}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {status === 'loading-more' ? 'Cargando…' : 'Cargar más'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
