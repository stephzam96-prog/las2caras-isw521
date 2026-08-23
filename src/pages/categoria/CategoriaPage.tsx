import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import type { Category, View } from '../../types';
import { categoriasService } from '../../services/categoriasService';
import { publicacionesService } from '../../services/publicacionesService';
import GridPublicaciones from '../../components/publicaciones/GridPublicaciones';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';

type CategoryStatus = 'loading' | 'success' | 'error';
type ViewsStatus = 'loading' | 'success' | 'empty' | 'error';

export default function CategoriaPage() {
  const { id } = useParams<{ id: string }>();

  const [category, setCategory] = useState<Category | null>(null);
  const [categoryStatus, setCategoryStatus] = useState<CategoryStatus>('loading');

  const [views, setViews] = useState<View[]>([]);
  const [viewsStatus, setViewsStatus] = useState<ViewsStatus>('loading');

  // Trae los datos de la categoría (nombre, etc.) según el
  // id de la URL. Mismo patrón de loading/error que usa TableroPage.tsx.
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
        console.error('No se pudo cargar la categoría', err);
        setCategoryStatus('error');
      });
  }, [id]);

  // Publicaciones de esta categoría. Fetch
  // independiente del de la categoría, con sus propios estados
  // loading/empty/error (mismo patrón que TableroPage.tsx).
  useEffect(() => {
    if (!id) return;
    setViewsStatus('loading');
    publicacionesService
      .listViews({ category: id, limit: 20 })
      .then((result) => {
        setViews(result.views);
        setViewsStatus(result.total === 0 ? 'empty' : 'success');
      })
      .catch((err) => {
        console.error('No se pudieron cargar las publicaciones de la categoría', err);
        setViewsStatus('error');
      });
  }, [id]);

  if (categoryStatus === 'loading') {
    return <Spinner label="Cargando categoría…" />;
  }

  if (categoryStatus === 'error' || !category) {
    return (
      <EmptyState
        title="No pudimos cargar la categoría"
        message="Puede que no exista o haya un problema de conexión."
      />
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      {/* Breadcrumb + título con category.name. */}
      <nav className="mb-2 text-sm text-gray-500 dark:text-gray-400">
        <Link to="/" className="hover:underline">
          Tablero
        </Link>{' '}
        / {category.name}
      </nav>
      <h1 className="mb-4 text-2xl font-bold text-gray-900 dark:text-gray-100">{category.name}</h1>

      {viewsStatus === 'loading' && <Spinner label="Cargando publicaciones…" />}

      {viewsStatus === 'error' && (
        <EmptyState
          title="No pudimos cargar las publicaciones"
          message="Revisá tu conexión e intentá de nuevo."
        />
      )}

      {viewsStatus === 'empty' && <EmptyState title="No hay publicaciones en esta categoría" />}

      {viewsStatus === 'success' && <GridPublicaciones views={views} />}
    </div>
  );
}
