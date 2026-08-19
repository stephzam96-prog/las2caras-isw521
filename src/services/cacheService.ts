// Único módulo del proyecto que llama localStorage.getItem/setItem directo.
// Todo lo demás (context, hooks, páginas) pasa por acá.

import type { Category, Hashtag, User } from '../types';
import type { ViewSort } from './publicacionesService';

export interface StoredAuth {
  token: string;
  user: User;
}

export interface TableroFilters {
  category?: string;
  hashtag?: string;
  sort?: ViewSort;
}

// Guardamos algo mas que el id para poder pintar un widget de "vistos
// recientemente" en el futuro sin tener que re-fetchear cada publicacion.
export interface HistoryEntry {
  id: string;
  title: string; // titulo del Lado A
  categoryName: string;
  viewedAt: string; // ISO
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

const ONE_HOUR_MS = 60 * 60 * 1000;
const THIRTY_MIN_MS = 30 * 60 * 1000;
const MAX_HISTORY = 20;

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

// Envoltorio con vencimiento para el patron stale-while-revalidate: dentro
// del TTL se puede mostrar de inmediato; vencido, se trata como "no hay
// cache" (se espera el fetch) en vez de mostrar datos potencialmente viejos.
interface TtlEntry<T> {
  value: T;
  expiresAt: number;
}

function readTtl<T>(key: string): T | null {
  const entry = read<TtlEntry<T>>(key);
  if (!entry || Date.now() > entry.expiresAt) return null;
  return entry.value;
}

function writeTtl<T>(key: string, value: T, ttlMs: number): void {
  write<TtlEntry<T>>(key, { value, expiresAt: Date.now() + ttlMs });
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

  getCategories(): Category[] | null {
    return readTtl<Category[]>(KEYS.categories);
  },
  setCategories(categories: Category[]): void {
    writeTtl(KEYS.categories, categories, ONE_HOUR_MS);
  },

  // Guarda solo las sugerencias iniciales (busqueda vacia), no cada
  // busqueda del autocomplete -- esas siempre van directo a la red.
  getHashtags(): Hashtag[] | null {
    return readTtl<Hashtag[]>(KEYS.hashtags);
  },
  setHashtags(hashtags: Hashtag[]): void {
    writeTtl(KEYS.hashtags, hashtags, THIRTY_MIN_MS);
  },

  getFilters(): TableroFilters | null {
    return read<TableroFilters>(KEYS.filters);
  },
  setFilters(filters: TableroFilters): void {
    write(KEYS.filters, filters);
  },

  getHistory(): HistoryEntry[] {
    return read<HistoryEntry[]>(KEYS.history) ?? [];
  },
  // FIFO, maximo 20: si la publicacion ya estaba en el historial, se saca
  // de su posicion vieja y se vuelve a insertar al frente (no queda
  // duplicada ni se pierde el cupo por una repetida).
  addToHistory(entry: Omit<HistoryEntry, 'viewedAt'>): void {
    const withoutDuplicate = cacheService.getHistory().filter((h) => h.id !== entry.id);
    const updated = [{ ...entry, viewedAt: new Date().toISOString() }, ...withoutDuplicate].slice(0, MAX_HISTORY);
    write(KEYS.history, updated);
  },
};
