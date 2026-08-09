import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate, Link, type Location } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { ApiError, type FieldErrors } from '../../services/httpClient';

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Si ya está autenticado (ej. volvió a /login a mano), no tiene sentido
  // mostrar el formulario de nuevo.
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFieldErrors({});
    setFormError(null);
    setIsSubmitting(true);

    try {
      await login({ email, password });
      const from = (location.state as { from?: Location })?.from;
      navigate(from?.pathname ?? '/', { replace: true });
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.kind === 'validation' && error.fieldErrors) {
          setFieldErrors(error.fieldErrors);
        } else if (error.kind === 'unauthorized') {
          setFormError('Correo o contraseña incorrectos.');
        } else {
          setFormError(error.message);
        }
      } else {
        setFormError('Ocurrió un error inesperado.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center px-4">
      <h1 className="mb-6 text-2xl font-bold text-gray-900 dark:text-gray-100">Iniciar sesión</h1>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Correo electrónico
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
          />
          {fieldErrors.email && <p className="mt-1 text-sm text-red-600">{fieldErrors.email}</p>}
        </div>

        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Contraseña
          </label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
          />
          {fieldErrors.password && <p className="mt-1 text-sm text-red-600">{fieldErrors.password}</p>}
        </div>

        {formError && <p className="text-sm text-red-600">{formError}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-blue-600 px-4 py-2 font-medium text-white disabled:opacity-50"
        >
          {isSubmitting ? 'Ingresando…' : 'Ingresar'}
        </button>
      </form>

      <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
        ¿No tenés cuenta?{' '}
        <Link to="/register" className="text-blue-600 hover:underline">
          Registrate
        </Link>
      </p>
    </div>
  );
}
