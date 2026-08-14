import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import type { Category, View } from '../../types';
import { categoriasService } from '../../services/categoriasService';
// TODO (equipo): importar publicacionesService acá cuando completes el
// TODO de más abajo -- ya existe en src/services/publicacionesService.ts,
// mirá cómo lo usa TableroPage.tsx (src/pages/tablero/TableroPage.tsx)
// como referencia.
// import { publicacionesService } from '../../services/publicacionesService';
import GridPublicaciones from '../../components/publicaciones/GridPublicaciones';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';

type CategoryStatus = 'loading' | 'success' | 'error';

export default function CategoriaPage() {
  const { id } = useParams<{ id: string }>();

  const [category, setCategory] = useState<Category | null>(null);
  const [categoryStatus, setCategoryStatus] = useState<CategoryStatus>('loading');

  // TODO (equipo): reemplazá este placeholder por el estado real de las
  // publicaciones de esta categoría, por ejemplo:
  //   const [views, setViews] = useState<View[]>([]);
  //   const [viewsStatus, setViewsStatus] = useState<'loading' | 'success' | 'empty' | 'error'>('loading');
  const views: View[] = [];

  // --- YA ARMADO: trae los datos de la categoría (nombre, etc.) según el
  // id de la URL. Mismo patrón de loading/error que usa TableroPage.tsx
  // para categorías/hashtags -- revisalo si tenés dudas de cómo seguir.
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

  // TODO (equipo): traer las publicaciones de esta categoría.
  //
  // 1. Descomentá el import de publicacionesService de arriba.
  // 2. Agregá un useEffect que dependa de [id] y llame:
  //      publicacionesService.listViews({ category: id, limit: 20 })
  //    (podés sumar "sort" y paginación con "Cargar más" copiando el
  //    patrón de fetchViews en TableroPage.tsx -- no es obligatorio para
  //    esta pantalla, con traer una sola página alcanza).
  // 3. Guardá el resultado en el estado `views` (reemplazando el
  //    placeholder de arriba) y manejá los 3 casos: cargando / vacío
  //    (result.total === 0) / error (catch) -- igual que status ===
  //    'loading' | 'empty' | 'error' en TableroPage.tsx.
  //
  // useEffect(() => {
  //   if (!id) return;
  //   ...
  // }, [id]);

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
      {/*
        TODO (equipo): breadcrumb/título de la página.
        Acá abajo ya tenés `category.name` disponible (la categoría ya
        terminó de cargar en este punto del componente). Armá algo como:

          <nav className="mb-2 text-sm text-gray-500 dark:text-gray-400">
            <Link to="/" className="hover:underline">Tablero</Link> / {category.name}
          </nav>
          <h1 className="mb-4 text-2xl font-bold text-gray-900 dark:text-gray-100">
            {category.name}
          </h1>

        Fijate las clases de Tailwind que usa el <h1> de TableroPage.tsx
        para mantener el mismo estilo entre pantallas. No te olvides de
        importar Link de react-router-dom si lo usás.
      */}

      <GridPublicaciones views={views} />

      {/* TODO (equipo): si agregaste el estado 'empty' de arriba, mostrá
          acá un <EmptyState title="No hay publicaciones en esta categoría" />
          en vez de un GridPublicaciones vacío cuando no haya resultados. */}
    </div>
  );
}
