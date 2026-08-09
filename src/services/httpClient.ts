// Cliente HTTP base: agrega el Bearer token, y traduce cada código de error
// del API a un ApiError tipado según la tabla del CLAUDE.md.
// El 401 no redirige acá (el httpClient no conoce el router): dispara el
// evento "auth:expired" en window, que AuthContext escucha para limpiar
// la sesión y dejar que los guards redirijan a /login.

import { cacheService } from './cacheService';

const BASE_URL = import.meta.env.VITE_API_URL;

export type ApiErrorKind =
  | 'validation'   // 400 -> errores por campo
  | 'unauthorized' // 401
  | 'forbidden'    // 403
  | 'not_found'    // 404
  | 'conflict'     // 409
  | 'unprocessable'// 422
  | 'server'       // 500/502/503
  | 'network';     // fetch lanzó (offline, DNS, CORS, etc.)

export interface FieldErrors {
  [field: string]: string;
}

export class ApiError extends Error {
  kind: ApiErrorKind;
  status?: number;
  fieldErrors?: FieldErrors;

  constructor(kind: ApiErrorKind, message: string, status?: number, fieldErrors?: FieldErrors) {
    super(message);
    this.kind = kind;
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  auth?: boolean; // default true: si hay token, lo manda
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, auth = true, headers, ...rest } = options;

  const finalHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    ...headers,
  };

  if (auth) {
    const stored = cacheService.getAuth();
    if (stored?.token) {
      (finalHeaders as Record<string, string>)['Authorization'] = `Bearer ${stored.token}`;
    }
  }

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...rest,
      headers: finalHeaders,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('network', 'No se pudo conectar con el servidor. Revisá tu conexión.');
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const data = await response.json().catch(() => null);

  if (response.ok) {
    return data as T;
  }

  switch (response.status) {
    case 400:
      throw new ApiError('validation', 'Errores de validación', 400, data?.errors ?? data);
    case 401:
      window.dispatchEvent(new CustomEvent('auth:expired'));
      throw new ApiError('unauthorized', 'Su sesión ha expirado', 401);
    case 403:
      throw new ApiError('forbidden', 'No tenés permiso para realizar esta acción', 403);
    case 404:
      throw new ApiError('not_found', data?.message ?? 'El recurso no existe o fue eliminado', 404);
    case 409:
      throw new ApiError('conflict', data?.message ?? 'Conflicto con el estado actual', 409, data?.errors ?? data);
    case 422:
      throw new ApiError('unprocessable', data?.message ?? 'Datos no procesables', 422, data?.errors ?? data);
    default:
      throw new ApiError('server', 'Ocurrió un error en el servidor. Intentá de nuevo más tarde.', response.status);
  }
}

export const httpClient = {
  get: <T>(path: string, options?: RequestOptions) => request<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'POST', body }),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'PUT', body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'PATCH', body }),
  delete: <T>(path: string, options?: RequestOptions) => request<T>(path, { ...options, method: 'DELETE' }),
};
