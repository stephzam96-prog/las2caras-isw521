import { useEffect, useState, type FormEvent } from 'react';
import type { Category } from '../../types';
import { categoriasService } from '../../services/categoriasService';
import { ApiError } from '../../services/httpClient';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';

export default function AdminCategoriasPage() {
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

  function handleOpenCreate() {
    setEditingCategory(null);
    setNameInput('');
    setFormError(null);
    setIsModalOpen(true);
  }

  function handleOpenEdit(category: Category) {
    setEditingCategory(category);
    setNameInput(category.name);
    setFormError(null);
    setIsModalOpen(true);
  }

  function handleCloseModal() {
    setIsModalOpen(false);
  }

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

  // --- YA ARMADO: confirmacion antes de borrar. La API NO valida si la
  // categoria tiene publicaciones asociadas, asi que esta es la unica red
  // de seguridad -- no debe depender de que alguien se acuerde de
  // agregarla despues. ---
  async function handleDelete(category: Category) {
    const confirmed = window.confirm(
      `¿Eliminar la categoría "${category.name}"? Esta acción no se puede deshacer, y las publicaciones que ya la usan van a seguir apuntando a ella.`,
    );
    if (!confirmed) return;

    try {
      await categoriasService.deleteCategory(category.id);
      // Soft-delete: actualizamos la categoría en la lista local marcándola con deletedAt
      setCategories((prev) =>
        prev.map((c) => (c.id === category.id ? { ...c, deletedAt: new Date().toISOString() } : c)),
      );
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Ocurrió un error al eliminar la categoría.';
      alert(message);
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

      {status === 'success' && (
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="py-2">Nombre</th>
              <th className="py-2">Estado</th>
              <th className="py-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {/* TODO (equipo): esto ya mapea sobre `categories`, pero como
                sigue siendo el placeholder vacio de arriba, no muestra
                nada hasta que conectes el fetch real. */}
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
                    onClick={() => handleOpenEdit(category)}
                    className="mr-3 text-blue-600 hover:underline"
                  >
                    Editar
                  </button>
                  <button type="button" onClick={() => handleDelete(category)} className="text-red-600 hover:underline">
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
          <div className="w-full max-w-sm rounded-lg bg-white p-4 dark:bg-gray-800">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
              {editingCategory ? 'Editar categoría' : 'Nueva categoría'}
            </h2>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <input
                type="text"
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
    </div>
  );
}
