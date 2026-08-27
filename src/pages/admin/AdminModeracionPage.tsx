import { useCallback, useEffect, useState } from 'react';
import type { View, ViewStatus } from '../../types';
import { publicacionesService } from '../../services/publicacionesService';
import { useToast } from '../../hooks/useToast';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import ConfirmModal from '../../components/ui/ConfirmModal';
import { translateCategoryName } from '../../utils/categoryLabels';

const STATUS_LABEL: Record<ViewStatus, { text: string; className: string }> = {
  PUBLISHED: { text: 'Publicada', className: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' },
  UNPUBLISHED: {
    text: 'Despublicada',
    className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-200',
  },
};

export default function AdminModeracionPage() {
  const { showToast } = useToast();
  const [views, setViews] = useState<View[]>([]);
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [statusFilter, setStatusFilter] = useState<ViewStatus | ''>('');
  // Id de la publicación cuyo cambio de estado se está procesando, para
  // deshabilitar su botón y evitar doble submit.
  const [processingId, setProcessingId] = useState<string | null>(null);
  // Publicación para la que se está pidiendo confirmación (null = cerrado).
  const [toggleTarget, setToggleTarget] = useState<View | null>(null);

  const fetchViews = useCallback(async () => {
    setStatus('loading');
    try {
      const response = await publicacionesService.adminListViews({
        status: statusFilter || undefined,
        limit: 100,
      });
      setViews(response.views);
      setStatus('success');
    } catch (err) {
      console.error('No se pudieron cargar las publicaciones para moderación', err);
      setStatus('error');
    }
  }, [statusFilter]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchViews();
  }, [fetchViews]);

  async function handleTogglePublish(targetView: View) {
    setProcessingId(targetView.id);
    try {
      const response = targetView.status === 'PUBLISHED'
        ? await publicacionesService.unpublishView(targetView.id)
        : await publicacionesService.publishView(targetView.id);

      // OJO: unpublish/publish devuelven el PoliticalView SIN relaciones
      // (sin sides/category/author) -- no reemplazamos la vista entera con
      // la respuesta (rompería el .find sobre .sides al renderizar), solo
      // actualizamos el campo status que sí es confiable.
      setViews((prev) => prev.map((v) => (v.id === targetView.id ? { ...v, status: response.view.status } : v)));
      showToast(
        response.view.status === 'PUBLISHED' ? 'Publicación republicada.' : 'Publicación despublicada.',
        'success',
      );
    } catch (err) {
      console.error('Error al cambiar el estado de publicación', err);
      showToast('No se pudo cambiar el estado de publicación.', 'error');
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="mb-4 text-2xl font-bold text-gray-900 dark:text-gray-100">Moderación de Contenido</h1>

      <select
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value as ViewStatus | '')}
        className="mb-4 rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
      >
        <option value="">Todos los estados</option>
        <option value="PUBLISHED">Publicadas</option>
        <option value="UNPUBLISHED">Despublicadas</option>
      </select>

      {status === 'loading' && <Spinner label="Cargando publicaciones…" />}
      {status === 'error' && <EmptyState title="No pudimos cargar las publicaciones" />}
      {status === 'success' && views.length === 0 && (
        <EmptyState title="No hay publicaciones para moderar" message="Probá cambiar el filtro de estado." />
      )}

      {status === 'success' && views.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="py-2">Título (Lado A)</th>
                <th className="py-2">Categoría</th>
                <th className="py-2">Autor</th>
                <th className="py-2">Estado</th>
                <th className="py-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {views.map((view) => {
                const sideA = view.sides.find((s) => s.type === 'SIDE') ?? view.sides[0];
                const badge = STATUS_LABEL[view.status];
                return (
                  <tr key={view.id} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="py-2">{sideA?.title}</td>
                    <td className="py-2">{translateCategoryName(view.category.name)}</td>
                    <td className="py-2">{view.author.name}</td>
                    <td className="py-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${badge.className}`}>{badge.text}</span>
                    </td>
                    <td className="py-2">
                      <button
                        type="button"
                        onClick={() => setToggleTarget(view)}
                        disabled={processingId === view.id}
                        className={
                          view.status === 'PUBLISHED'
                            ? 'text-red-600 hover:underline disabled:opacity-50'
                            : 'text-green-600 hover:underline disabled:opacity-50'
                        }
                      >
                        {view.status === 'PUBLISHED' ? 'Despublicar' : 'Publicar'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Confirmación antes de despublicar/republicar (acción de moderación,
          la pedimos siempre según el enunciado). */}
      <ConfirmModal
        isOpen={toggleTarget !== null}
        title={toggleTarget?.status === 'PUBLISHED' ? 'Despublicar publicación' : 'Republicar publicación'}
        message={
          toggleTarget?.status === 'PUBLISHED'
            ? 'Va a dejar de verse en el tablero público hasta que la vuelvas a publicar. ¿Continuar?'
            : 'Va a volver a verse en el tablero público. ¿Continuar?'
        }
        confirmLabel={toggleTarget?.status === 'PUBLISHED' ? 'Despublicar' : 'Publicar'}
        variant={toggleTarget?.status === 'PUBLISHED' ? 'danger' : 'default'}
        onConfirm={() => {
          if (toggleTarget) handleTogglePublish(toggleTarget);
          setToggleTarget(null);
        }}
        onCancel={() => setToggleTarget(null)}
      />
    </div>
  );
}
