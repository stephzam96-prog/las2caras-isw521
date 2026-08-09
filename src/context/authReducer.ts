import type { User } from '../types';

export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated';

export interface AuthState {
  user: User | null;
  token: string | null;
  status: AuthStatus;
}

export type AuthAction =
  // sesión restaurada de localStorage al montar (optimista, sin esperar red)
  | { type: 'RESTORE_SESSION'; payload: { user: User; token: string } }
  | { type: 'LOGIN_SUCCESS'; payload: { user: User; token: string } }
  // revalidación de GET /auth/me exitosa: refresca los datos del user
  | { type: 'SESSION_REFRESHED'; payload: { user: User } }
  | { type: 'LOGOUT' }
  | { type: 'SESSION_EXPIRED' }
  | { type: 'NO_SESSION' };

export const initialAuthState: AuthState = {
  user: null,
  token: null,
  status: 'idle',
};

export function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'RESTORE_SESSION':
    case 'LOGIN_SUCCESS':
      return { user: action.payload.user, token: action.payload.token, status: 'authenticated' };
    case 'SESSION_REFRESHED':
      return { ...state, user: action.payload.user };
    case 'LOGOUT':
    case 'SESSION_EXPIRED':
    case 'NO_SESSION':
      return { user: null, token: null, status: 'unauthenticated' };
    default:
      return state;
  }
}
