import { Link } from 'react-router-dom';

interface ErrorPageProps {
  code: 403 | 404;
  title: string;
  message: string;
}

// Página genérica de error: la usan tanto la ruta catch-all (404, pública)
// como RoleGuard (403, cuando un usuario autenticado no tiene el rol
// necesario). No depende de AuthContext para poder mostrarse a anónimos.
export default function ErrorPage({ code, title, message }: ErrorPageProps) {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-4 text-center">
      <p className="text-6xl font-bold text-gray-500 dark:text-gray-400">{code}</p>
      <h1 className="mt-4 text-2xl font-bold text-gray-900 dark:text-gray-100">{title}</h1>
      <p className="mt-2 text-gray-600 dark:text-gray-400">{message}</p>
      <Link to="/" className="mt-6 rounded-md bg-blue-600 px-4 py-2 font-medium text-white">
        Volver al tablero
      </Link>
    </div>
  );
}
