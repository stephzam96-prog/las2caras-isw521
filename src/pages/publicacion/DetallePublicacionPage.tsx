import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useParams, Link } from 'react-router-dom';
import type { Comment, CommentThread, ReactionType, View, ViewSide } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { useSideReactions } from '../../hooks/useSideReactions';
import { useFavorite } from '../../hooks/useFavorite';
import { useShare } from '../../hooks/useShare';
import { publicacionesService } from '../../services/publicacionesService';
import { comentariosService } from '../../services/comentariosService';
import { cacheService } from '../../services/cacheService';
import { ApiError } from '../../services/httpClient';
import { extractYoutubeId } from '../../utils/youtube';
import { translateCategoryName } from '../../utils/categoryLabels';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';

type PageStatus = 'loading' | 'success' | 'notfound' | 'error';

export default function DetallePublicacionPage() {
  const { id } = useParams<{ id: string }>();
  const [view, setView] = useState<View | null>(null);
  const [status, setStatus] = useState<PageStatus>('loading');

  const fetchView = useCallback(() => {
    if (!id) return;
    setStatus('loading');
    publicacionesService
      .getView(id)
      .then(({ view }) => {
        setView(view);
        setStatus('success');
        // Cuenta como "vista reciente" solo si realmente se pudo cargar.
        const sideA = view.sides.find((s) => s.type === 'SIDE');
        cacheService.addToHistory({
          id: view.id,
          title: sideA?.title ?? '',
          categoryName: view.category.name,
        });
      })
      .catch((err) => {
        // El backend devuelve 404 tanto si no existe como si esta
        // despublicada (y no sos el autor/superadmin) -- no hay forma de
        // distinguirlas desde el cliente, asi que el mensaje es generico.
        if (err instanceof ApiError && err.kind === 'not_found') {
          setStatus('notfound');
        } else {
          console.error('No se pudo cargar la publicación', err);
          setStatus('error');
        }
      });
  }, [id]);

  useEffect(() => {
    fetchView();
  }, [fetchView]);

  if (status === 'loading') {
    return <Spinner label="Cargando publicación…" />;
  }

  if (status === 'notfound') {
    return (
      <EmptyState
        title="Esta publicación no existe o fue eliminada"
        message="Puede que el link esté roto o que la publicación haya sido despublicada."
      />
    );
  }

  if (status === 'error' || !view) {
    return (
      <EmptyState
        title="No pudimos cargar la publicación"
        message="Revisá tu conexión e intentá de nuevo."
        actionLabel="Reintentar"
        onAction={fetchView}
      />
    );
  }

  return <PublicacionDetalle view={view} />;
}

function PublicacionDetalle({ view }: { view: View }) {
  const { user, isAuthenticated } = useAuth();
  // Misma logica de reaccion que TarjetaPublicacion (Tablero/Categoria),
  // reutilizada via el hook para no duplicar el POST-y-merge.
  const { sides, react, reactingSideId } = useSideReactions(view);
  const { isFavorite, toggleFavorite, isToggling: isTogglingFavorite } = useFavorite(view);
  const { share } = useShare();

  const sideA = sides.find((s) => s.type === 'SIDE');
  const sideB = sides.find((s) => s.type === 'COUNTERPART');

  const isAuthor = user?.id === view.authorId;
  const isSuperadmin = user?.role === 'SUPERADMIN';

  // Copia local del status: se actualiza tras publicar/despublicar sin
  // tener que refetchear toda la vista.
  const [currentStatus, setCurrentStatus] = useState(view.status);
  const [isTogglingPublish, setIsTogglingPublish] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  async function handleTogglePublish() {
    setIsTogglingPublish(true);
    setPublishError(null);
    try {
      if (currentStatus === 'PUBLISHED') {
        await publicacionesService.unpublishView(view.id);
        setCurrentStatus('UNPUBLISHED');
      } else {
        await publicacionesService.publishView(view.id);
        setCurrentStatus('PUBLISHED');
      }
    } catch (err) {
      console.error('No se pudo cambiar el estado de publicación', err);
      setPublishError('No se pudo completar la acción. Intentá de nuevo.');
    } finally {
      setIsTogglingPublish(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <span className="rounded-full bg-gray-100 px-2 py-0.5 dark:bg-gray-700">{translateCategoryName(view.category.name)}</span>
          <span>
            por{' '}
            <Link to={`/authors/${view.author.id}`} className="hover:underline">
              {view.author.name}
            </Link>
          </span>
          <span>· {new Date(view.createdAt).toLocaleDateString('es-AR')}</span>
          {currentStatus === 'UNPUBLISHED' && (
            <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
              Despublicada
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Favorito: solo si hay sesion, mismo criterio que TarjetaPublicacion. */}
          {isAuthenticated && (
            <button
              type="button"
              onClick={toggleFavorite}
              disabled={isTogglingFavorite}
              aria-label={isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
              aria-pressed={isFavorite}
              className={`rounded-md border px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-60 transition-colors flex items-center gap-1.5 ${
                isFavorite
                  ? 'border-red-300 text-red-600 dark:border-red-800 dark:text-red-400 font-semibold'
                  : 'border-gray-300 text-gray-600 dark:border-gray-600 dark:text-gray-400'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={isFavorite ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-red-600 dark:text-red-400">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
              <span>Favorito</span>
            </button>
          )}

          {/* Compartir: siempre visible, no depende de ser autor/superadmin. */}
          <button
            type="button"
            onClick={() => {
              const sideATitle = sideA?.title ?? '';
              void share(`${window.location.origin}/views/${view.id}`, sideATitle);
            }}
            aria-label="Compartir publicación"
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-600 flex items-center gap-1.5 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
            <span>Compartir</span>
          </button>

          {/* Editar: autor o superadmin. Despublicar/Publicar: SOLO superadmin
              (verificado contra el backend real -- ni el autor puede). */}
          {(isAuthor || isSuperadmin) && (
            <>
            <Link
              to={`/views/${view.id}/edit`}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-600"
            >
              Editar
            </Link>
            {isSuperadmin && (
              <button
                type="button"
                onClick={handleTogglePublish}
                disabled={isTogglingPublish}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-50 dark:border-gray-600"
              >
                {currentStatus === 'PUBLISHED' ? 'Despublicar' : 'Publicar'}
              </button>
            )}
            </>
          )}
        </div>
      </header>

      {publishError && (
        <p role="alert" className="mb-3 text-sm text-red-600">
          {publishError}
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {sideA && (
          <LadoDetalle
            side={sideA}
            label="Lado A"
            disabled={!isAuthenticated || reactingSideId === sideA.id}
            onReact={(type) => react(sideA, type)}
          />
        )}
        {sideB && (
          <LadoDetalle
            side={sideB}
            label="Lado B"
            disabled={!isAuthenticated || reactingSideId === sideB.id}
            onReact={(type) => react(sideB, type)}
          />
        )}
      </div>

      {view.hashtags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2 text-sm text-blue-600 dark:text-blue-400">
          {view.hashtags.map((h) => (
            <span key={h.id}>#{h.name}</span>
          ))}
        </div>
      )}

      <SeccionComentarios viewId={view.id} />
    </div>
  );
}

function LadoDetalle({
  side,
  label,
  disabled,
  onReact,
}: {
  side: ViewSide;
  label: string;
  disabled: boolean;
  onReact: (type: ReactionType) => void;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</p>
      <h2 className="mb-2 text-xl font-bold text-gray-900 dark:text-gray-100">{side.title}</h2>
      <p className="mb-4 whitespace-pre-wrap text-gray-700 dark:text-gray-300">{side.description}</p>

      {side.sources.length > 0 && (
        <div className="mb-4">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Fuentes
          </p>
          {/* TODO (equipo, opcional): las fuentes tipo DOCUMENT hoy caen al
              link simple (mismo que LINK) -- si quieren, podrían mostrar un
              ícono distinto según source.type para diferenciarlas
              visualmente, no es indispensable. */}
          <ul className="flex flex-col gap-3">
            {side.sources.map((source) => {
              const youtubeId = source.type === 'YOUTUBE' ? extractYoutubeId(source.url) : null;
              return (
                <li key={source.id}>
                  {youtubeId ? (
                    <div>
                      <div className="aspect-video w-full overflow-hidden rounded-md">
                        <iframe
                          src={`https://www.youtube.com/embed/${youtubeId}`}
                          title={source.label || 'Video de YouTube'}
                          className="h-full w-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                      {source.label && (
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 inline-block text-sm text-blue-600 hover:underline dark:text-blue-400"
                        >
                          {source.label}
                        </a>
                      )}
                    </div>
                  ) : (
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline dark:text-blue-400"
                    >
                      {source.label || source.url}
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="flex items-center gap-3 text-sm">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onReact('LIKE')}
          title={disabled && side.myReaction !== 'LIKE' ? 'Iniciá sesión para reaccionar' : undefined}
          className={`rounded-md px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-60 flex items-center gap-1 transition-colors ${
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
          className={`rounded-md px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-60 flex items-center gap-1 transition-colors ${
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
    </div>
  );
}

function SeccionComentarios({ viewId }: { viewId: string }) {
  const { isAuthenticated } = useAuth();
  const [threads, setThreads] = useState<CommentThread[]>([]);
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  const [newThreadTitle, setNewThreadTitle] = useState('');
  const [newThreadContent, setNewThreadContent] = useState('');
  const [isPostingThread, setIsPostingThread] = useState(false);

  const loadThreads = useCallback(() => {
    setStatus('loading');
    comentariosService
      .listThreads(viewId)
      .then(({ threads }) => {
        setThreads(threads);
        setStatus('success');
      })
      .catch((err) => {
        console.error('No se pudieron cargar los comentarios', err);
        setStatus('error');
      });
  }, [viewId]);

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  async function handleCreateThread(event: FormEvent) {
    event.preventDefault();
    if (!newThreadContent.trim()) return;
    setIsPostingThread(true);
    try {
      const { thread } = await comentariosService.createThread(viewId, {
        title: newThreadTitle.trim() || undefined,
        content: newThreadContent.trim(),
      });
      setThreads((prev) => [...prev, thread]);
      setNewThreadTitle('');
      setNewThreadContent('');
    } catch (err) {
      console.error('No se pudo publicar el comentario', err);
    } finally {
      setIsPostingThread(false);
    }
  }

  // Inserta la respuesta/comentario nuevo en el hilo correspondiente sin
  // refetchear todo -- misma filosofia que las reacciones.
  function handleCommentPosted(threadId: string, comment: Comment) {
    setThreads((prev) =>
      prev.map((t) => {
        if (t.id !== threadId) return t;
        if (comment.parentId) {
          return {
            ...t,
            comments: t.comments.map((c) =>
              c.id === comment.parentId ? { ...c, replies: [...(c.replies ?? []), comment] } : c,
            ),
          };
        }
        return { ...t, comments: [...t.comments, comment] };
      }),
    );
  }

  return (
    <section className="mt-8">
      <h2 className="mb-4 text-xl font-bold text-gray-900 dark:text-gray-100">Comentarios</h2>

      {status === 'loading' && <Spinner label="Cargando comentarios…" />}
      {status === 'error' && <p className="text-sm text-red-600">No pudimos cargar los comentarios.</p>}

      {status === 'success' && (
        <div className="flex flex-col gap-4">
          {threads.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400">Todavía no hay comentarios. Sé el primero.</p>
          )}
          {threads.map((thread) => (
            <Hilo key={thread.id} thread={thread} viewId={viewId} onCommentPosted={handleCommentPosted} />
          ))}
        </div>
      )}

      {isAuthenticated ? (
        <form
          onSubmit={handleCreateThread}
          className="mt-4 flex flex-col gap-2 rounded-md border border-gray-200 p-3 dark:border-gray-700"
        >
          {/* Advertencia estática, no depende de ningún estado del backend
              -- verificado que comments.service.js no implementa ningún
              tipo de moderación/aprobación real (ni de IA ni manual), así
              que no se agrega ningún indicador de "en revisión" post-envío
              que sugeriría un pipeline que no existe. */}
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Los comentarios pueden ser analizados por un sistema automático para detectar contenido inapropiado.
          </p>
          <input
            type="text"
            aria-label="Título del hilo (opcional)"
            value={newThreadTitle}
            onChange={(e) => setNewThreadTitle(e.target.value)}
            placeholder="Título del hilo (opcional)"
            className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
          />
          <textarea
            aria-label="Escribí un comentario"
            value={newThreadContent}
            onChange={(e) => setNewThreadContent(e.target.value)}
            placeholder="Escribí un comentario…"
            required
            rows={3}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
          />
          <button
            type="submit"
            disabled={isPostingThread}
            className="self-end rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {isPostingThread ? 'Publicando…' : 'Comentar'}
          </button>
        </form>
      ) : (
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
          <Link to="/login" className="text-blue-600 hover:underline">
            Iniciá sesión
          </Link>{' '}
          para comentar.
        </p>
      )}
    </section>
  );
}

function Hilo({
  thread,
  viewId,
  onCommentPosted,
}: {
  thread: CommentThread;
  viewId: string;
  onCommentPosted: (threadId: string, comment: Comment) => void;
}) {
  const { isAuthenticated } = useAuth();
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [isPosting, setIsPosting] = useState(false);

  async function handleReply(parentId: string) {
    if (!replyContent.trim()) return;
    setIsPosting(true);
    try {
      const { comment } = await comentariosService.createComment(viewId, thread.id, {
        content: replyContent.trim(),
        parentId,
      });
      onCommentPosted(thread.id, comment);
      setReplyContent('');
      setReplyingTo(null);
    } catch (err) {
      console.error('No se pudo publicar la respuesta', err);
    } finally {
      setIsPosting(false);
    }
  }

  return (
    <div className="rounded-md border border-gray-200 p-3 dark:border-gray-700">
      {thread.title && <h3 className="mb-2 font-semibold text-gray-900 dark:text-gray-100">{thread.title}</h3>}
      <ul className="flex flex-col gap-3">
        {thread.comments.map((comment) => (
          <li key={comment.id}>
            <ComentarioLinea comment={comment} />
            {isAuthenticated && (
              <button
                type="button"
                onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                className="mt-1 text-xs text-blue-600 hover:underline"
              >
                Responder
              </button>
            )}
            {replyingTo === comment.id && (
              <div className="mt-2 flex gap-2">
                <input
                  type="text"
                  aria-label="Escribí una respuesta"
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="Escribí una respuesta…"
                  className="flex-1 rounded-md border border-gray-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800"
                />
                <button
                  type="button"
                  onClick={() => handleReply(comment.id)}
                  disabled={isPosting}
                  className="rounded-md bg-blue-600 px-3 py-1 text-sm text-white disabled:opacity-50"
                >
                  Enviar
                </button>
              </div>
            )}
            {comment.replies && comment.replies.length > 0 && (
              <ul className="ml-4 mt-2 flex flex-col gap-2 border-l border-gray-200 pl-3 dark:border-gray-700">
                {comment.replies.map((reply) => (
                  <li key={reply.id}>
                    <ComentarioLinea comment={reply} />
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ComentarioLinea({ comment }: { comment: Comment }) {
  return (
    <div>
      <p className="text-sm">
        <span className="font-semibold text-gray-900 dark:text-gray-100">{comment.user?.name ?? 'Usuario'}</span>{' '}
        <span className="text-gray-500 dark:text-gray-400">
          · {new Date(comment.createdAt).toLocaleDateString('es-AR')}
        </span>
      </p>
      <p className="text-gray-700 dark:text-gray-300">{comment.content}</p>
    </div>
  );
}
