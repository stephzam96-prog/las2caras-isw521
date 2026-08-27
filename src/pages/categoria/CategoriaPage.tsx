import { useCallback, useEffect, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import type { Category, View } from '../../types';
import { categoriasService } from '../../services/categoriasService';
import { publicacionesService, type ViewSort } from '../../services/publicacionesService';
import { ApiError } from '../../services/httpClient';
import GridPublicaciones from '../../components/publicaciones/GridPublicaciones';
import FiltroOrdenHashtag from '../../components/publicaciones/FiltroOrdenHashtag';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import { translateCategoryName } from '../../utils/categoryLabels';

const PAGE_SIZE = 20;
const VALID_SORTS: ViewSort[] = ['recent', 'likes', 'dislikes'];

function isValidSort(value: string | null): value is ViewSort {
  return value !== null && (VALID_SORTS as string[]).includes(value);
}

type CategoryStatus = 'loading' | 'success' | 'notfound' | 'error';
type ViewsStatus = 'loading' | 'loading-more' | 'success' | 'empty' | 'error';

export default function CategoriaPage() {
  const { id } = useParams<{ id: string }>();

  const [category, setCategory] = useState<Category | null>(null);
  const [categoryStatus, setCategoryStatus] = useState<CategoryStatus>('loading');

  // Trae los datos de la categoría según el id de la URL. El backend NO
  // devuelve description en ningún endpoint de categorías (verificado
  // contra categories.service.js: el modelo solo tiene id/name/deletedAt)
  // -- por eso el encabezado de abajo no muestra descripción, solo
  // nombre + conteo real de publicaciones.
  useEffect(() => {
    if (!id) return;
    setCategoryStatus('loading');
    categoriasService
      .getCategory(id)
      .then(({ category }) => {
        setCategory(category);
        setCategoryStatus('success');
      })
      .catch((err) => {
        if (err instanceof ApiError && err.kind === 'not_found') {
          setCategoryStatus('notfound');
        } else {
          console.error('No se pudo cargar la categoría', err);
          setCategoryStatus('error');
        }
      });
  }, [id]);

  // Filtros (hashtag + orden), reflejados en la URL igual que en
  // TableroPage.tsx -- la categoría en sí NO es un filtro acá, ya viene
  // fija por :id.
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedHashtag, setSelectedHashtag] = useState(() => searchParams.get('hashtag') ?? '');
  const [sort, setSort] = useState<ViewSort>(() => {
    const fromUrl = searchParams.get('sort');
    return isValidSort(fromUrl) ? fromUrl : 'recent';
  });

  useEffect(() => {
    const params: Record<string, string> = {};
    if (selectedHashtag) params.hashtag = selectedHashtag;
    if (sort !== 'recent') params.sort = sort;
    setSearchParams(params, { replace: true });
  }, [selectedHashtag, sort, setSearchParams]);

  const [views, setViews] = useState<View[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [viewsStatus, setViewsStatus] = useState<ViewsStatus>('loading');

  // Publicaciones de esta categoría. Fetch independiente del de la
  // categoría, con sus propios estados loading/empty/error (mismo patrón
  // que TableroPage.tsx). El conteo del encabezado sale de result.total
  // de esta misma llamada -- no hace falta un request aparte, la API de
  // categorías no expone un conteo propio.
  const fetchViews = useCallback(
    async (targetPage: number, append: boolean) => {
      if (!id) return;
      setViewsStatus(append ? 'loading-more' : 'loading');
      try {
        const result = await publicacionesService.listViews({
          category: id,
          hashtag: selectedHashtag || undefined,
          sort,
          page: targetPage,
          limit: PAGE_SIZE,
        });
        setViews((prev) => (append ? [...prev, ...result.views] : result.views));
        setTotal(result.total);
        setPage(result.page);
        setViewsStatus(result.total === 0 ? 'empty' : 'success');
      } catch (err) {
        console.error('No se pudieron cargar las publicaciones de la categoría', err);
        setViewsStatus('error');
      }
    },
    [id, selectedHashtag, sort],
  );

  useEffect(() => {
    fetchViews(1, false);
  }, [fetchViews]);

  if (categoryStatus === 'loading') {
    return <Spinner label="Cargando categoría…" />;
  }

  if (categoryStatus === 'notfound') {
    return (
      <div className="mx-auto max-w-5xl px-4 py-6">
        <nav className="mb-4 text-sm text-gray-500 dark:text-gray-400">
          <Link to="/" className="hover:underline">
            Inicio
          </Link>
          {' › '}
          <span>Categorías</span>
        </nav>
        <EmptyState
          title="Esta categoría no existe"
          message="Puede que el link esté roto o que la categoría haya sido eliminada."
        />
      </div>
    );
  }

  if (categoryStatus === 'error' || !category) {
    return (
      <EmptyState
        title="No pudimos cargar la categoría"
        message="Revisá tu conexión e intentá de nuevo."
      />
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <nav className="mb-2 text-sm text-gray-500 dark:text-gray-400">
        <Link to="/" className="hover:underline">
          Inicio
        </Link>
        {' › '}
        {/* "Categorías" sin link a propósito: no existe una pantalla de
            listado de categorías en la app (ver AppRoutes.tsx) -- lo único
            navegable es Inicio y la categoría actual. */}
        <span>Categorías</span>
        {' › '}
        <span>{translateCategoryName(category.name)}</span>
      </nav>
      <h1 className="mb-1 text-2xl font-bold text-gray-900 dark:text-gray-100">{translateCategoryName(category.name)}</h1>
      <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
        {total} {total === 1 ? 'publicación' : 'publicaciones'}
      </p>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <FiltroOrdenHashtag sort={sort} onSortChange={setSort} hashtag={selectedHashtag} onHashtagChange={setSelectedHashtag} />
      </div>

      {viewsStatus === 'loading' && <Spinner label="Cargando publicaciones…" />}

      {viewsStatus === 'error' && (
        <EmptyState
          title="No pudimos cargar las publicaciones"
          message="Revisá tu conexión e intentá de nuevo."
          actionLabel="Reintentar"
          onAction={() => fetchViews(1, false)}
        />
      )}

      {viewsStatus === 'empty' && (
        <EmptyState
          title="No hay publicaciones en esta categoría"
          message="Probá cambiar el hashtag u orden seleccionados."
        />
      )}

      {(viewsStatus === 'success' || viewsStatus === 'loading-more') && (
        <>
          <GridPublicaciones views={views} />
          {views.length < total && (
            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={() => fetchViews(page + 1, true)}
                disabled={viewsStatus === 'loading-more'}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {viewsStatus === 'loading-more' ? 'Cargando…' : 'Cargar más'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
