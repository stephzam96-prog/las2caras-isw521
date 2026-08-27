import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import type { View } from '../../types';
import { authorsService, type AuthorProfile } from '../../services/authorsService';
import { publicacionesService } from '../../services/publicacionesService';
import { ApiError } from '../../services/httpClient';
import GridPublicaciones from '../../components/publicaciones/GridPublicaciones';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';

// Dos fetches independientes (autor + sus publicaciones), cada uno con su
// propio estado de loading/error -- mismo patrón que CategoriaPage.tsx y
// DetallePublicacionPage.tsx.
type AuthorStatus = 'loading' | 'success' | 'notfound' | 'error';
type ViewsStatus = 'loading' | 'success' | 'empty' | 'error';

export default function PerfilAutorPage() {
  const { id } = useParams<{ id: string }>();

  const [author, setAuthor] = useState<AuthorProfile | null>(null);
  const [authorStatus, setAuthorStatus] = useState<AuthorStatus>('loading');

  const [views, setViews] = useState<View[]>([]);
  const [viewsStatus, setViewsStatus] = useState<ViewsStatus>('loading');

  // 1. Datos públicos del autor. authorsService.getAuthor tira un ApiError
  //    con kind === 'not_found' si el id no existe -> lo mostramos inline
  //    (mismo patrón que DetallePublicacionPage.tsx), sin redirigir a /404.
  useEffect(() => {
    if (!id) return;
    setAuthorStatus('loading');
    authorsService
      .getAuthor(id)
      .then(({ author }) => {
        setAuthor(author);
        setAuthorStatus('success');
      })
      .catch((err) => {
        if (err instanceof ApiError && err.kind === 'not_found') {
          setAuthorStatus('notfound');
        } else {
          console.error('No se pudo cargar el autor', err);
          setAuthorStatus('error');
        }
      });
  }, [id]);

  // 2. Publicaciones del autor. Fetch simple (sin "Cargar más"): el result
  //    (`views`) se pasa directo a <GridPublicaciones />. Independiente del
  //    autor: si una de las dos falla, la otra sigue mostrando lo suyo.
  useEffect(() => {
    if (!id) return;
    setViewsStatus('loading');
    publicacionesService
      .listViews({ autorId: id, limit: 50 })
      .then((result) => {
        setViews(result.views);
        setViewsStatus(result.total === 0 ? 'empty' : 'success');
      })
      .catch((err) => {
        console.error('No se pudieron cargar las publicaciones del autor', err);
        setViewsStatus('error');
      });
  }, [id]);

  // 404 inline: el autor no existe.
  if (authorStatus === 'notfound') {
    return (
      <EmptyState
        title="Este autor no existe"
        message="Puede que el link esté roto o que el perfil haya sido eliminado."
      />
    );
  }

  if (authorStatus === 'loading') {
    return <Spinner label="Cargando perfil…" />;
  }

  if (authorStatus === 'error' || !author) {
    return (
      <EmptyState
        title="No pudimos cargar el perfil"
        message="Revisá tu conexión e intentá de nuevo."
      />
    );
  }

  // 3. Header: nombre, fecha de registro y cantidad de publicaciones
  //    publicadas. Estilo alineado con el header de DetallePublicacionPage.
  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <header className="mb-6">
        <nav className="mb-2 text-sm text-gray-500 dark:text-gray-400">
          <Link to="/" className="hover:underline">
            Tablero
          </Link>{' '}
          / Autor
        </nav>
        <h1 className="mb-1 text-2xl font-bold text-gray-900 dark:text-gray-100">{author.name}</h1>
        <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <span>Registrado el {new Date(author.createdAt).toLocaleDateString('es-AR')}</span>
          <span>·</span>
          <span>
            {author.publishedViewsCount}{' '}
            {author.publishedViewsCount === 1 ? 'publicación publicada' : 'publicaciones publicadas'}
          </span>
        </div>
      </header>

      {viewsStatus === 'loading' && <Spinner label="Cargando publicaciones…" />}

      {viewsStatus === 'error' && (
        <EmptyState
          title="No pudimos cargar las publicaciones"
          message="Revisá tu conexión e intentá de nuevo."
        />
      )}

      {viewsStatus === 'empty' && <EmptyState title="Este autor todavía no tiene publicaciones publicadas" />}

      {viewsStatus === 'success' && <GridPublicaciones views={views} />}
    </div>
  );
}