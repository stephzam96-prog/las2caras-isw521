import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { View } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { publicacionesService, type GetViewResponse } from '../../services/publicacionesService';
import { usuariosService } from '../../services/usuariosService';
import { cacheService } from '../../services/cacheService';
import GridPublicaciones from '../../components/publicaciones/GridPublicaciones';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';

type SectionStatus = 'loading' | 'success' | 'empty' | 'error';

// Perfil del usuario autenticado (distinto de PerfilAutorPage, que es
// publico). Los datos del usuario se muestran de solo lectura: verificado
// contra el backend que no existe ningun PUT/PATCH para que un usuario
// edite su propio nombre/email/password -- users.service.js solo expone
// listUsers/banUser/unbanUser (acciones de superadmin sobre otros).
export default function PerfilUsuarioPage() {
  const { user } = useAuth();

  // --- Mis publicaciones ---
  const [myViews, setMyViews] = useState<View[]>([]);
  const [myViewsStatus, setMyViewsStatus] = useState<SectionStatus>('loading');

  const fetchMyViews = useCallback(() => {
    setMyViewsStatus('loading');
    // autor=me filtra por el usuario logueado del lado del servidor -- no
    // hace falta conocer el propio id. OJO: este endpoint solo devuelve
    // publicaciones PUBLISHED (siempre, sin excepcion para el dueño) --
    // si un superadmin despublicó algo mío, no va a aparecer acá y no hay
    // ningún endpoint no-admin que lo muestre.
    publicacionesService
      .listViews({ autor: 'me', limit: 50 })
      .then((result) => {
        setMyViews(result.views);
        setMyViewsStatus(result.total === 0 ? 'empty' : 'success');
      })
      .catch((err) => {
        console.error('No se pudieron cargar tus publicaciones', err);
        setMyViewsStatus('error');
      });
  }, []);

  useEffect(() => {
    fetchMyViews();
  }, [fetchMyViews]);

  // --- Favoritos ---
  const [favoriteViews, setFavoriteViews] = useState<View[]>([]);
  const [favoritesStatus, setFavoritesStatus] = useState<SectionStatus>('loading');

  const fetchFavorites = useCallback(() => {
    setFavoritesStatus('loading');
    usuariosService
      .getMyFavoriteIds()
      .then(({ favorites }) => {
        // Mirror simple en cache, se llena recien aca (ver nota en
        // CLAUDE.md sobre por que no esta enganchado al login todavia).
        cacheService.setFavoriteIds(favorites);

        if (favorites.length === 0) {
          setFavoriteViews([]);
          setFavoritesStatus('empty');
          return;
        }

        // GET /users/me/favorites solo da IDs -- para las tarjetas
        // completas hace falta un GET /views/:id por cada uno (N+1,
        // aceptable para una lista personal). allSettled en vez de all:
        // si un favorito viejo ya no es visible (el autor o un superadmin
        // lo despublicó), ese GET puntual da 404 -- no debe tumbar toda
        // la seccion, simplemente se omite esa tarjeta.
        Promise.allSettled(favorites.map((id) => publicacionesService.getView(id))).then((results) => {
          const views = results
            .filter((r): r is PromiseFulfilledResult<GetViewResponse> => r.status === 'fulfilled')
            .map((r) => r.value.view);
          setFavoriteViews(views);
          setFavoritesStatus(views.length === 0 ? 'empty' : 'success');
        });
      })
      .catch((err) => {
        console.error('No se pudieron cargar tus favoritos', err);
        setFavoritesStatus('error');
      });
  }, []);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  // Quitar un favorito de la lista en vivo: si era el ultimo, el estado
  // pasa a 'empty' (separado del filter para no meter un setState dentro
  // de otro updater).
  function handleFavoriteRemoved(id: string) {
    setFavoriteViews((prev) => prev.filter((v) => v.id !== id));
  }

  useEffect(() => {
    if (favoritesStatus === 'success' && favoriteViews.length === 0) {
      setFavoritesStatus('empty');
    }
  }, [favoriteViews, favoritesStatus]);

  // AuthGuard ya garantiza que hay sesion antes de montar esta pantalla;
  // este chequeo es solo defensivo.
  if (!user) return null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="mb-4 text-2xl font-bold text-gray-900 dark:text-gray-100">Mi perfil</h1>

      <section className="mb-8 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{user.name}</h2>
          {user.role === 'SUPERADMIN' && (
            <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs text-purple-700 dark:bg-purple-900 dark:text-purple-300">
              Superadmin
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Miembro desde {new Date(user.createdAt).toLocaleDateString('es-AR')}
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-4 text-xl font-bold text-gray-900 dark:text-gray-100">Mis publicaciones</h2>
        {myViewsStatus === 'loading' && <Spinner label="Cargando tus publicaciones…" />}
        {myViewsStatus === 'error' && (
          <EmptyState
            title="No pudimos cargar tus publicaciones"
            message="Revisá tu conexión e intentá de nuevo."
            actionLabel="Reintentar"
            onAction={fetchMyViews}
          />
        )}
        {myViewsStatus === 'empty' && <EmptyState title="Todavía no publicaste nada" />}
        {myViewsStatus === 'success' && <GridPublicaciones views={myViews} />}
      </section>

      <section>
        <h2 className="mb-4 text-xl font-bold text-gray-900 dark:text-gray-100">Mis favoritos</h2>
        {favoritesStatus === 'loading' && <Spinner label="Cargando tus favoritos…" />}
        {favoritesStatus === 'error' && (
          <EmptyState
            title="No pudimos cargar tus favoritos"
            message="Revisá tu conexión e intentá de nuevo."
            actionLabel="Reintentar"
            onAction={fetchFavorites}
          />
        )}
        {favoritesStatus === 'empty' && <EmptyState title="Todavía no marcaste ninguna publicación como favorita" />}
        {favoritesStatus === 'success' && (
          <ul className="flex flex-col gap-2">
            {favoriteViews.map((view) => (
              <ItemFavorito key={view.id} view={view} onRemoved={handleFavoriteRemoved} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

// Lista propia liviana, no GridPublicaciones/TarjetaPublicacion a
// proposito: esta seccion necesita una accion ("Quitar de favoritos")
// que la tarjeta compartida no tiene -- mismo criterio que se uso para
// Lado A/B en DetallePublicacionPage (armar algo propio en vez de forzar
// el componente compartido a soportar un caso que no le corresponde).
function ItemFavorito({ view, onRemoved }: { view: View; onRemoved: (id: string) => void }) {
  const sideA = view.sides.find((s) => s.type === 'SIDE') ?? view.sides[0];
  const [isRemoving, setIsRemoving] = useState(false);

  async function handleRemove() {
    setIsRemoving(true);
    try {
      await publicacionesService.unfavoriteView(view.id);
      onRemoved(view.id);
    } catch (err) {
      console.error('No se pudo quitar de favoritos', err);
      setIsRemoving(false);
    }
  }

  return (
    <li className="flex items-center justify-between gap-3 rounded-md border border-gray-200 p-3 dark:border-gray-700">
      <div>
        <Link to={`/views/${view.id}`} className="font-medium text-blue-600 hover:underline">
          {sideA?.title}
        </Link>
        <p className="text-sm text-gray-500 dark:text-gray-400">{view.category.name}</p>
      </div>
      <button
        type="button"
        onClick={handleRemove}
        disabled={isRemoving}
        className="shrink-0 text-sm text-red-600 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isRemoving ? 'Quitando…' : 'Quitar de favoritos'}
      </button>
    </li>
  );
}
