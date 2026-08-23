import { useEffect, useRef, useState, type FormEvent, type MouseEvent as ReactMouseEvent } from 'react';
import type { Category } from '../../types';
import { categoriasService } from '../../services/categoriasService';
import { ApiError } from '../../services/httpClient';
import { useToast } from '../../hooks/useToast';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import ConfirmModal from '../../components/ui/ConfirmModal';

export default function AdminCategoriasPage() {
  const { showToast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    categoriasService
      .adminListCategories()
      .then(({ categories }) => {
        setCategories(categories);
        setStatus('success');
      })
      .catch((err) => {
        console.error('No se pudieron cargar las categorías', err);
        setStatus('error');
      });
  }, []);

  // --- YA ARMADO: estado y apertura/cierre del modal de crear/editar ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Accesibilidad del modal: guardamos qué botón lo abrió para devolverle el
  // foco al cerrar, una ref al input para mandarle el foco apenas se abre, y
  // una ref al contenedor del diálogo para el focus trap (Tab/Shift+Tab).
  const nameInputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  function handleOpenCreate(event: ReactMouseEvent<HTMLButtonElement>) {
    triggerRef.current = event.currentTarget;
    setEditingCategory(null);
    setNameInput('');
    setFormError(null);
    setIsModalOpen(true);
  }

  function handleOpenEdit(event: ReactMouseEvent<HTMLButtonElement>, category: Category) {
    triggerRef.current = event.currentTarget;
    setEditingCategory(category);
    setNameInput(category.name);
    setFormError(null);
    setIsModalOpen(true);
  }

  function handleCloseModal() {
    setIsModalOpen(false);
    triggerRef.current?.focus();
  }

  // Foco inicial al input cuando se abre el modal.
  useEffect(() => {
    if (isModalOpen) nameInputRef.current?.focus();
  }, [isModalOpen]);

  // Cerrar con Escape + focus trap: Tab desde el último elemento
  // focuseable del modal vuelve al primero, y Shift+Tab desde el primero
  // vuelve al último, para que el foco nunca se escape a la tabla de fondo.
  useEffect(() => {
    if (!isModalOpen) return;

    function getFocusableElements(): HTMLElement[] {
      if (!modalRef.current) return [];
      return Array.from(
        modalRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        handleCloseModal();
        return;
      }
      if (event.key !== 'Tab') return;

      const focusable = getFocusableElements();
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);

    const name = nameInput.trim();
    if (!name) {
      setFormError('El nombre es obligatorio.');
      return;
    }

    try {
      if (editingCategory === null) {
        const { category } = await categoriasService.createCategory(name);
        setCategories((prev) => [...prev, category]);
      } else {
        const { category } = await categoriasService.updateCategory(editingCategory.id, name);
        setCategories((prev) => prev.map((c) => (c.id === category.id ? category : c)));
      }
      handleCloseModal();
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.kind === 'conflict') {
          setFormError(error.message || 'Ya existe una categoría con este nombre.');
        } else {
          setFormError(error.message);
        }
      } else {
        setFormError('Ocurrió un error inesperado al guardar la categoría.');
      }
    }
  }

  // Confirmación antes de borrar vía ConfirmModal (antes usaba
  // window.confirm). La API NO valida si la categoría tiene publicaciones
  // asociadas, así que esta es la única red de seguridad -- no debe
  // depender de que alguien se acuerde de agregarla después.
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);

  async function handleDelete(category: Category) {
    setDeleteTarget(null);
    try {
      await categoriasService.deleteCategory(category.id);
      // Soft-delete: actualizamos la categoría en la lista local marcándola con deletedAt
      setCategories((prev) =>
        prev.map((c) => (c.id === category.id ? { ...c, deletedAt: new Date().toISOString() } : c)),
      );
      showToast(`Categoría "${category.name}" eliminada.`, 'success');
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Ocurrió un error al eliminar la categoría.';
      showToast(message, 'error');
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Categorías</h1>
        <button
          type="button"
          onClick={handleOpenCreate}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white"
        >
          Nueva categoría
        </button>
      </div>

      {status === 'loading' && <Spinner label="Cargando categorías…" />}
      {status === 'error' && <EmptyState title="No pudimos cargar las categorías" />}
      {status === 'success' && categories.length === 0 && (
        <EmptyState title="Todavía no hay categorías" message="Creá la primera con el botón de arriba." />
      )}

      {status === 'success' && categories.length > 0 && (
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="py-2">Nombre</th>
              <th className="py-2">Estado</th>
              <th className="py-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((category) => (
              <tr key={category.id} className="border-b border-gray-100 dark:border-gray-800">
                <td className="py-2">{category.name}</td>
                <td className="py-2">
                  {category.deletedAt ? (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700 dark:bg-red-900 dark:text-red-300">
                      Eliminada
                    </span>
                  ) : (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700 dark:bg-green-900 dark:text-green-300">
                      Activa
                    </span>
                  )}
                </td>
                <td className="py-2">
                  <button
                    type="button"
                    onClick={(event) => handleOpenEdit(event, category)}
                    className="mr-3 text-blue-600 hover:underline"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(category)}
                    className="text-red-600 hover:underline"
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* --- YA ARMADO: shell del modal de crear/editar (UI). El submit
          real es TODO (ver handleSubmit arriba). --- */}
      {isModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 px-4">
          <div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="categoria-modal-title"
            className="w-full max-w-sm rounded-lg bg-white p-4 dark:bg-gray-800"
          >
            <h2 id="categoria-modal-title" className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
              {editingCategory ? 'Editar categoría' : 'Nueva categoría'}
            </h2>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <input
                ref={nameInputRef}
                type="text"
                aria-label="Nombre de la categoría"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="Nombre de la categoría"
                required
                className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900"
              />
              {formError && <p className="text-sm text-red-600">{formError}</p>}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-600"
                >
                  Cancelar
                </button>
                <button type="submit" className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white">
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={deleteTarget !== null}
        title="Eliminar categoría"
        message={
          deleteTarget
            ? `¿Eliminar la categoría "${deleteTarget.name}"? Esta acción no se puede deshacer, y las publicaciones que ya la usan van a seguir apuntando a ella.`
            : ''
        }
        confirmLabel="Eliminar"
        variant="danger"
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
