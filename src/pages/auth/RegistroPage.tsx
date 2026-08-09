import { useState, type FormEvent } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { ApiError, type FieldErrors } from '../../services/httpClient';

export default function RegistroPage() {
  const { register, isAuthenticated } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Se guarda acá (no en el AuthContext) porque registrarse no autentica:
  // el usuario queda PENDING hasta activar la cuenta.
  const [activationToken, setActivationToken] = useState<string | null>(null);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  function validateClientSide(): boolean {
    if (password.length < 8) {
      setFieldErrors({ password: 'La contraseña debe tener al menos 8 caracteres.' });
      return false;
    }
    return true;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFieldErrors({});
    setFormError(null);

    if (!validateClientSide()) return;

    setIsSubmitting(true);
    try {
      const result = await register({ name, email, password });
      setActivationToken(result.activationToken);
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.kind === 'validation' && error.fieldErrors) {
          setFieldErrors(error.fieldErrors);
        } else if (error.kind === 'conflict') {
          setFieldErrors({ email: 'Ese correo ya está registrado.' });
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

  // Registro modo desarrollo: la API devuelve el activationToken directo
  // (sin envío real de correo), así que se muestra acá para poder activar.
  if (activationToken) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center px-4 text-center">
        <h1 className="mb-4 text-2xl font-bold text-gray-900 dark:text-gray-100">¡Cuenta creada!</h1>
        <p className="mb-4 text-gray-600 dark:text-gray-400">
          Tu cuenta quedó pendiente de activación. En un entorno real esto llegaría por correo.
        </p>
        <Link
          to={`/auth/activate/${activationToken}`}
          className="rounded-md bg-blue-600 px-4 py-2 font-medium text-white"
        >
          Activar cuenta
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center px-4">
      <h1 className="mb-6 text-2xl font-bold text-gray-900 dark:text-gray-100">Crear cuenta</h1>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <div>
          <label htmlFor="name" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Nombre
          </label>
          <input
            id="name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
          />
          {fieldErrors.name && <p className="mt-1 text-sm text-red-600">{fieldErrors.name}</p>}
        </div>

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
            minLength={8}
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
          {isSubmitting ? 'Creando cuenta…' : 'Crear cuenta'}
        </button>
      </form>

      <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
        ¿Ya tenés cuenta?{' '}
        <Link to="/login" className="text-blue-600 hover:underline">
          Iniciá sesión
        </Link>
      </p>
    </div>
  );
}
