import { Link } from 'react-router-dom';
import type { ReactionType, View, ViewSide } from '../../types';
import { useSideReactions } from '../../hooks/useSideReactions';
import { useFavorite } from '../../hooks/useFavorite';
import { useShare } from '../../hooks/useShare';

interface TarjetaPublicacionProps {
  view: View;
}

// La reutilizan Tablero, Categoria, Busqueda y Perfil de Autor -- por eso
// solo depende de `view` y del contexto de auth, nada especifico de una
// pantalla en particular.
//
// No se muestra un "total" combinado de likes/dislikes: los dos lados son
// entidades independientes (regla del CLAUDE.md), mezclarlos en un numero
// unico iria en contra de esa idea y ademas quedaria desactualizado en
// cuanto el usuario reaccione a un solo lado.
export default function TarjetaPublicacion({ view }: TarjetaPublicacionProps) {
  // La logica de reaccion (POST + merge del estado local) vive en el hook
  // para poder reutilizarla en DetallePublicacionPage sin duplicarla.
  const { sides, react, reactingSideId, isAuthenticated } = useSideReactions(view);
  const { isFavorite, toggleFavorite, isToggling } = useFavorite(view);
  const { share } = useShare();

  const sideA = sides.find((s) => s.type === 'SIDE');
  const sideB = sides.find((s) => s.type === 'COUNTERPART');

  return (
    <article className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm text-gray-500 dark:text-gray-400">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-gray-100 px-2 py-0.5 dark:bg-gray-700">{view.category.name}</span>
          <span>
            por{' '}
            <Link to={`/authors/${view.author.id}`} className="hover:underline">
              {view.author.name}
            </Link>
          </span>
          <span>· {new Date(view.createdAt).toLocaleDateString('es-AR')}</span>
        </div>
        <div className="flex items-center gap-1">
          {isAuthenticated && (
            <button
              type="button"
              onClick={toggleFavorite}
              disabled={isToggling}
              aria-label={isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
              aria-pressed={isFavorite}
              className={`rounded-md p-1.5 disabled:cursor-not-allowed disabled:opacity-60 transition-colors flex items-center justify-center ${
                isFavorite
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-gray-400 hover:text-red-600 dark:text-gray-500 dark:hover:text-red-400'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={isFavorite ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              const sideATitle = sideA?.title ?? '';
              void share(`${window.location.origin}/views/${view.id}`, sideATitle);
            }}
            aria-label="Compartir publicación"
            className="rounded-md p-1.5 text-gray-400 hover:text-blue-600 dark:text-gray-500 dark:hover:text-blue-400 flex items-center justify-center transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
          </button>
        </div>
      </header>

      <Link to={`/views/${view.id}`} className="mb-3 block">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {sideA && <LadoBloque side={sideA} label="Lado A" />}
          {sideB && <LadoBloque side={sideB} label="Lado B" />}
        </div>
      </Link>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {sideA && (
          <BotonesReaccion
            side={sideA}
            disabled={!isAuthenticated || reactingSideId === sideA.id}
            onReact={(type) => react(sideA, type)}
          />
        )}
        {sideB && (
          <BotonesReaccion
            side={sideB}
            disabled={!isAuthenticated || reactingSideId === sideB.id}
            onReact={(type) => react(sideB, type)}
          />
        )}
      </div>

      {view.hashtags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-blue-600 dark:text-blue-400">
          {view.hashtags.map((h) => (
            <span key={h.id}>#{h.name}</span>
          ))}
        </div>
      )}
    </article>
  );
}

function LadoBloque({ side, label }: { side: ViewSide; label: string }) {
  return (
    <div className="rounded-md bg-gray-50 p-3 dark:bg-gray-900">
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</p>
      <h3 className="mb-1 font-semibold text-gray-900 dark:text-gray-100">{side.title}</h3>
      <p className="line-clamp-3 text-sm text-gray-600 dark:text-gray-400">{side.description}</p>
    </div>
  );
}

function BotonesReaccion({
  side,
  disabled,
  onReact,
}: {
  side: ViewSide;
  disabled: boolean;
  onReact: (type: ReactionType) => void;
}) {
  return (
    <div className="flex items-center gap-3 px-1 text-sm">
      <button
        type="button"
        disabled={disabled}
        onClick={() => onReact('LIKE')}
        title={disabled && side.myReaction !== 'LIKE' ? 'Iniciá sesión para reaccionar' : undefined}
        className={`rounded-md px-2 py-1 disabled:cursor-not-allowed disabled:opacity-60 flex items-center gap-1 transition-colors ${
          side.myReaction === 'LIKE'
            ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 font-semibold'
            : 'hover:bg-gray-100 dark:hover:bg-gray-700'
        }`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={side.myReaction === 'LIKE' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
          <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
        </svg>
        <span>{side.likeCount}</span>
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onReact('DISLIKE')}
        title={disabled && side.myReaction !== 'DISLIKE' ? 'Iniciá sesión para reaccionar' : undefined}
        className={`rounded-md px-2 py-1 disabled:cursor-not-allowed disabled:opacity-60 flex items-center gap-1 transition-colors ${
          side.myReaction === 'DISLIKE'
            ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 font-semibold'
            : 'hover:bg-gray-100 dark:hover:bg-gray-700'
        }`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={side.myReaction === 'DISLIKE' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
          <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3" />
        </svg>
        <span>{side.dislikeCount}</span>
      </button>
    </div>
  );
}
