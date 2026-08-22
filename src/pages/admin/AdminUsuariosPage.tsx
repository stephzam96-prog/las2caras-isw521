import { useEffect, useState } from 'react';
import type { User } from '../../types';
import { usuariosService } from '../../services/usuariosService';
import { useAuth } from '../../hooks/useAuth';
import { useDebounce } from '../../hooks/useDebounce';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';

type LoadStatus = 'loading' | 'success' | 'error';

const STATUS_LABEL: Record<User['status'], { text: string; className: string }> = {
  ACTIVE: { text: 'Activo', className: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' },
  PENDING: { text: 'Pendiente', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-200' },
  SUSPENDED: { text: 'Baneado', className: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' },
};

export default function AdminUsuariosPage() {
  const { user: currentUser } = useAuth();

  const [users, setUsers] = useState<User[]>([]);
  const [status, setStatus] = useState<LoadStatus>('loading');

  // Búsqueda con debounce: no le pegamos a la API en cada tecla, esperamos
  // 300ms de inactividad. Mismo patrón que el autocomplete de TableroPage.tsx.
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  // Id del usuario cuyo baneo/desbaneo se está procesando (deshabilita su
  // botón mientras tanto para evitar doble clic).
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Fetch inicial + búsqueda: se re-dispara cuando cambia `debouncedSearch`.
  // En el primer render el search está vacío, así que trae la lista completa.
  useEffect(() => {
    setStatus('loading');
    const q = debouncedSearch.trim();
    usuariosService
      .listUsers({ search: q || undefined, limit: 100 })
      .then((result) => {
        setUsers(result.users);
        setStatus('success');
      })
      .catch((err) => {
        console.error('No se pudieron cargar los usuarios', err);
        setStatus('error');
      });
  }, [debouncedSearch]);

  // Banear/desbanear según el estado actual del usuario. Actualiza solo esa
  // fila en la lista local con la respuesta, sin refetchear todo (mismo
  // patrón que AdminCategoriasPage.tsx).
  async function handleToggleBan(targetUser: User) {
    setProcessingId(targetUser.id);
    try {
      const { user } =
        targetUser.status === 'SUSPENDED'
          ? await usuariosService.unbanUser(targetUser.id)
          : await usuariosService.banUser(targetUser.id);
      setUsers((prev) => prev.map((u) => (u.id === user.id ? user : u)));
    } catch (err) {
      console.error('No se pudo cambiar el estado del usuario', err);
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <h1 className="mb-4 text-2xl font-bold text-gray-900 dark:text-gray-100">Usuarios</h1>

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar por nombre o email…"
        className="mb-4 w-full max-w-sm rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
      />

      {status === 'loading' && <Spinner label="Cargando usuarios…" />}
      {status === 'error' && <EmptyState title="No pudimos cargar los usuarios" />}

      {status === 'success' && users.length === 0 && (
        <EmptyState title="No se encontraron usuarios" message="Probá con otro nombre o email." />
      )}

      {status === 'success' && users.length > 0 && (
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="py-2">Nombre</th>
              <th className="py-2">Email</th>
              <th className="py-2">Estado</th>
              <th className="py-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map((rowUser) => {
              const badge = STATUS_LABEL[rowUser.status];
              const isSelf = rowUser.id === currentUser?.id;
              return (
                <tr key={rowUser.id} className="border-b border-gray-100 dark:border-gray-800">
                  <td className="py-2">{rowUser.name}</td>
                  <td className="py-2">{rowUser.email}</td>
                  <td className="py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${badge.className}`}>{badge.text}</span>
                  </td>
                  <td className="py-2">
                    {/* Guarda de auto-baneo: el API no la tiene, así que esta
                        es la única protección -- no dejamos que un superadmin
                        se banee a sí mismo. */}
                    {isSelf ? (
                      <span className="text-xs text-gray-400" title="No podés banearte a vos mismo">
                        (vos)
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleToggleBan(rowUser)}
                        disabled={processingId === rowUser.id}
                        className={
                          rowUser.status === 'SUSPENDED'
                            ? 'text-green-600 hover:underline disabled:opacity-50'
                            : 'text-red-600 hover:underline disabled:opacity-50'
                        }
                      >
                        {rowUser.status === 'SUSPENDED' ? 'Desbanear' : 'Banear'}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}