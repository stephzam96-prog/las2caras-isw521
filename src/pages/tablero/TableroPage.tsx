import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Category, View } from '../../types';
import { categoriasService } from '../../services/categoriasService';
import { publicacionesService, type ViewSort } from '../../services/publicacionesService';
import { cacheService } from '../../services/cacheService';
import GridPublicaciones from '../../components/publicaciones/GridPublicaciones';
import FiltroOrdenHashtag from '../../components/publicaciones/FiltroOrdenHashtag';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import { translateCategoryName } from '../../utils/categoryLabels';

const PAGE_SIZE = 10;
const VALID_SORTS: ViewSort[] = ['recent', 'likes', 'dislikes'];

function isValidSort(value: string | null): value is ViewSort {
  return value !== null && (VALID_SORTS as string[]).includes(value);
}

type LoadStatus = 'loading' | 'loading-more' | 'success' | 'empty' | 'error';

export default function TableroPage() {
  // Filtros: la URL manda (para que /?category=...&sort=... sea
  // compartible/recargable). Si no hay query params (ej. entraste a "/"
  // a mano), se cae a lasdoscaras_filters como último recurso -- mismo
  // criterio que categorías/hashtags cacheados en otras pantallas.
  const [searchParams, setSearchParams] = useSearchParams();
  const [initialFilters] = useState(() => cacheService.getFilters());

  const [selectedCategory, setSelectedCategory] = useState(
    () => searchParams.get('category') ?? initialFilters?.category ?? '',
  );
  const [selectedHashtag, setSelectedHashtag] = useState(
    () => searchParams.get('hashtag') ?? initialFilters?.hashtag ?? '',
  );
  const [sort, setSort] = useState<ViewSort>(() => {
    const fromUrl = searchParams.get('sort');
    if (isValidSort(fromUrl)) return fromUrl;
    return initialFilters?.sort ?? 'recent';
  });

  const [categories, setCategories] = useState<Category[]>([]);

  const [views, setViews] = useState<View[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [autoRetryDone, setAutoRetryDone] = useState(false);
  // true cuando el fetch falló y estamos mostrando la última tanda
  // cacheada (modo lectura sin conexión).
  const [showingCached, setShowingCached] = useState(false);

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

  // Filtros activos: se reflejan en la URL (compartible/recargable) y se
  // persisten en localStorage como fallback, cada vez que cambian.
  useEffect(() => {
    const params: Record<string, string> = {};
    if (selectedCategory) params.category = selectedCategory;
    if (selectedHashtag) params.hashtag = selectedHashtag;
    if (sort !== 'recent') params.sort = sort;
    setSearchParams(params, { replace: true });

    cacheService.setFilters({
      category: selectedCategory || undefined,
      hashtag: selectedHashtag || undefined,
      sort,
    });
  }, [selectedCategory, selectedHashtag, sort, setSearchParams]);

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
        setShowingCached(false);
        // Guardamos la primera página para poder mostrarla offline.
        if (!append) cacheService.setBoardViews(result.views);
      } catch (err) {
        console.error('No se pudieron cargar las publicaciones', err);
        // Modo lectura sin conexión: si tenemos una tanda cacheada, la
        // mostramos con un aviso en vez de dejar la pantalla en error.
        const cached = !append ? cacheService.getBoardViews() : null;
        if (cached && cached.length > 0) {
          setViews(cached);
          setTotal(cached.length);
          setShowingCached(true);
          setStatus('success');
        } else {
          setStatus('error');
        }
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

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      {showingCached && (
        <div className="mb-4 rounded-md bg-yellow-100 px-4 py-2 text-sm text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
          Mostrando información guardada — sin conexión al servidor.
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
                {translateCategoryName(c.name)}
              </option>
            ))}
          </select>
        </div>

        <FiltroOrdenHashtag sort={sort} onSortChange={setSort} hashtag={selectedHashtag} onHashtagChange={setSelectedHashtag} />
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
