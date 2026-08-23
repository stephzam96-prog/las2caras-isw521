import { Link } from 'react-router-dom';
import type { ReactionType, View, ViewSide } from '../../types';
import { useSideReactions } from '../../hooks/useSideReactions';

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

  const sideA = sides.find((s) => s.type === 'SIDE');
  const sideB = sides.find((s) => s.type === 'COUNTERPART');

  return (
    <article className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <header className="mb-3 flex flex-wrap items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <span className="rounded-full bg-gray-100 px-2 py-0.5 dark:bg-gray-700">{view.category.name}</span>
        <span>
          por{' '}
          <Link to={`/authors/${view.author.id}`} className="hover:underline">
            {view.author.name}
          </Link>
        </span>
        <span>· {new Date(view.createdAt).toLocaleDateString('es-AR')}</span>
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
        className={`rounded-md px-2 py-1 disabled:cursor-not-allowed disabled:opacity-60 ${
          side.myReaction === 'LIKE'
            ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
            : 'hover:bg-gray-100 dark:hover:bg-gray-700'
        }`}
      >
        👍 {side.likeCount}
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onReact('DISLIKE')}
        title={disabled && side.myReaction !== 'DISLIKE' ? 'Iniciá sesión para reaccionar' : undefined}
        className={`rounded-md px-2 py-1 disabled:cursor-not-allowed disabled:opacity-60 ${
          side.myReaction === 'DISLIKE'
            ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
            : 'hover:bg-gray-100 dark:hover:bg-gray-700'
        }`}
      >
        👎 {side.dislikeCount}
      </button>
    </div>
  );
}
