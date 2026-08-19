import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { authService } from '../../services/authService';

type ActivationState = 'idle' | 'loading' | 'success' | 'error';

// La activación es una acción explícita del usuario (botón "Activar mi
// cuenta"), no se dispara sola al cargar la página: /auth/activate/:token
// no es idempotente (consume el token), así que no conviene llamarla
// automáticamente en un efecto. No hace auto-login a propósito: al activar,
// se manda al usuario a /login para que entre con sus credenciales. Un solo
// punto de entrada al estado de auth (el login normal) es más simple de
// defender en vivo.
export default function ActivarCuentaPage() {
  const { token } = useParams<{ token: string }>();
  const [state, setState] = useState<ActivationState>(token ? 'idle' : 'error');

  async function handleActivate() {
    if (!token) return;
    setState('loading');
    try {
      await authService.activate(token);
      setState('success');
    } catch {
      setState('error');
    }
  }

  if (state === 'idle') {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-sm flex-col items-center justify-center px-4 text-center">
        <h1 className="mb-4 text-2xl font-bold text-gray-900 dark:text-gray-100">Activar cuenta</h1>
        <p className="mb-6 text-gray-600 dark:text-gray-400">
          Hacé clic en el botón para activar tu cuenta.
        </p>
        <button
          onClick={handleActivate}
          className="rounded-md bg-blue-600 px-4 py-2 font-medium text-white"
        >
          Activar mi cuenta
        </button>
      </div>
    );
  }

  if (state === 'loading') {
    return <div className="flex min-h-[70vh] items-center justify-center p-8">Activando tu cuenta…</div>;
  }

  if (state === 'success') {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-sm flex-col items-center justify-center px-4 text-center">
        <h1 className="mb-4 text-2xl font-bold text-gray-900 dark:text-gray-100">¡Cuenta activada!</h1>
        <p className="mb-6 text-gray-600 dark:text-gray-400">Ya podés iniciar sesión con tu correo y contraseña.</p>
        <Link to="/login" className="rounded-md bg-blue-600 px-4 py-2 font-medium text-white">
          Iniciar sesión
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-sm flex-col items-center justify-center px-4 text-center">
      <h1 className="mb-4 text-2xl font-bold text-gray-900 dark:text-gray-100">No se pudo activar la cuenta</h1>
      <p className="mb-6 text-gray-600 dark:text-gray-400">
        El enlace de activación es inválido o ya fue utilizado.
      </p>
      <Link to="/register" className="text-blue-600 hover:underline">
        Volver a registrarme
      </Link>
    </div>
  );
}
