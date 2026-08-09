// Único módulo del proyecto que llama localStorage.getItem/setItem directo.
// Todo lo demás (context, hooks, páginas) pasa por acá.

import type { User } from '../types';

export interface StoredAuth {
  token: string;
  user: User;
}

const KEYS = {
  auth: 'lasdoscaras_auth',
  categories: 'lasdoscaras_categories',
  hashtags: 'lasdoscaras_hashtags',
  filters: 'lasdoscaras_filters',
  favorites: 'lasdoscaras_favorites',
  draft: 'lasdoscaras_draft',
  theme: 'lasdoscaras_theme',
  history: 'lasdoscaras_history',
} as const;

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

function remove(key: string): void {
  localStorage.removeItem(key);
}

export const cacheService = {
  getAuth(): StoredAuth | null {
    return read<StoredAuth>(KEYS.auth);
  },
  setAuth(auth: StoredAuth): void {
    write(KEYS.auth, auth);
  },
  clearAuth(): void {
    remove(KEYS.auth);
  },
};
