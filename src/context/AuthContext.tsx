import { createContext, useEffect, useReducer, useCallback, type ReactNode } from 'react';
import { authReducer, initialAuthState, type AuthState } from './authReducer';
import { authService } from '../services/authService';
import { cacheService } from '../services/cacheService';
import type { LoginPayload, RegisterPayload } from '../types';

interface AuthContextValue extends AuthState {
  isAuthenticated: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<{ activationToken: string }>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialAuthState);

  // Restauración de sesión al montar: patrón stale-while-revalidate.
  // 1) Si hay algo en localStorage, se muestra de inmediato como autenticado
  //    (optimista, sin esperar red).
  // 2) En paralelo se llama GET /auth/me para revalidar el token contra el
  //    backend. Si el token ya no es válido, el 401 dispara "auth:expired"
  //    (ver más abajo) y se limpia la sesión.
  useEffect(() => {
    const stored = cacheService.getAuth();

    if (!stored) {
      dispatch({ type: 'NO_SESSION' });
      return;
    }

    dispatch({ type: 'RESTORE_SESSION', payload: stored });

    authService
      .getMe()
      .then(({ user }) => {
        cacheService.setAuth({ token: stored.token, user });
        dispatch({ type: 'SESSION_REFRESHED', payload: { user } });
      })
      .catch(() => {
        // Si fue 401, el evento "auth:expired" ya se encarga de limpiar.
        // Otros errores (red, 500) se ignoran acá: se sigue usando el
        // estado cacheado hasta la próxima revalidación.
      });
  }, []);

  // El httpClient no conoce el router ni el reducer: cuando cualquier
  // request devuelve 401, dispara este evento global y acá se limpia todo.
  useEffect(() => {
    function handleExpired() {
      cacheService.clearAuth();
      dispatch({ type: 'SESSION_EXPIRED' });
    }
    window.addEventListener('auth:expired', handleExpired);
    return () => window.removeEventListener('auth:expired', handleExpired);
  }, []);

  const login = useCallback(async (payload: LoginPayload) => {
    const { token, user } = await authService.login(payload);
    cacheService.setAuth({ token, user });
    dispatch({ type: 'LOGIN_SUCCESS', payload: { token, user } });
  }, []);

  const register = useCallback(async (payload: RegisterPayload) => {
    const { activationToken } = await authService.register(payload);
    // El registro no autentica: el usuario queda PENDING hasta activar.
    // No se guarda sesión acá, solo se devuelve el token de activación
    // para que la pantalla arme el link/botón "Activar".
    return { activationToken };
  }, []);

  const logout = useCallback(() => {
    cacheService.clearAuth();
    dispatch({ type: 'LOGOUT' });
  }, []);

  const value: AuthContextValue = {
    ...state,
    isAuthenticated: state.status === 'authenticated',
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
