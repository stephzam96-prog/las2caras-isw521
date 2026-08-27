// Único módulo del proyecto que llama localStorage.getItem/setItem directo.
// Todo lo demás (context, hooks, páginas) pasa por acá.

import type { Category, Hashtag, SourceType, User, View } from '../types';
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

// Borrador del formulario de CREAR publicación (no se usa en modo edición
// -- ver nota en CrearEditarPublicacionPage.tsx). Forma laxa a propósito:
// mientras se completa el formulario los campos pueden estar vacíos, no
// tiene que cumplir las validaciones de CreateViewInput.
export interface DraftSideForm {
  title: string;
  description: string;
  sources: { type: SourceType; url: string; label: string }[];
}

export interface DraftPublicacion {
  categoryId: string;
  side: DraftSideForm;
  counterpart: DraftSideForm;
  hashtags: string[];
}

export type Theme = 'light' | 'dark';

const KEYS = {
  auth: 'lasdoscaras_auth',
  categories: 'lasdoscaras_categories',
  hashtags: 'lasdoscaras_hashtags',
  filters: 'lasdoscaras_filters',
  favorites: 'lasdoscaras_favorites',
  draft: 'lasdoscaras_draft',
  theme: 'lasdoscaras_theme',
  history: 'lasdoscaras_history',
  board: 'lasdoscaras_board',
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

  // Última tanda de publicaciones del Tablero, para el modo lectura sin
  // conexión: si el GET /views falla (API caída / offline), se muestran
  // estas con un aviso "Mostrando información guardada". Clave nueva
  // (lasdoscaras_board), agregada para cumplir el requisito de contenido
  // cacheado del enunciado -- documentarla en la tabla de claves del
  // CLAUDE.md. Sin TTL: mejor mostrar algo viejo que una pantalla vacía
  // cuando no hay red.
  getBoardViews(): View[] | null {
    return read<View[]>(KEYS.board);
  },
  setBoardViews(views: View[]): void {
    write(KEYS.board, views);
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
  clearHistory(): void {
    remove(KEYS.history);
  },

  getDraft(): DraftPublicacion | null {
    return read<DraftPublicacion>(KEYS.draft);
  },
  setDraft(draft: DraftPublicacion): void {
    write(KEYS.draft, draft);
  },
  clearDraft(): void {
    remove(KEYS.draft);
  },

  // Mirror de GET /users/me/favorites, sincronizado en AuthContext.tsx al
  // login y al restaurar sesion (fire-and-forget, no bloquea el render --
  // mismo patron stale-while-revalidate que categorias/hashtags). El
  // icono de favorito de TarjetaPublicacion lee de aca, no de
  // view.isFavorite.
  getFavoriteIds(): string[] {
    return read<string[]>(KEYS.favorites) ?? [];
  },
  setFavoriteIds(ids: string[]): void {
    write(KEYS.favorites, ids);
  },
  // Se llama en logout() -- si no se limpia, favoritos de un usuario
  // podrian quedar visibles para otro que loguee despues en la misma
  // maquina/navegador compartido.
  clearFavoriteIds(): void {
    remove(KEYS.favorites);
  },

  // null significa "el usuario nunca eligió" -- en ese caso ThemeToggle
  // debe caer al prefers-color-scheme del SO, no asumir 'light'.
  getTheme(): Theme | null {
    return read<Theme>(KEYS.theme);
  },
  setTheme(theme: Theme): void {
    write(KEYS.theme, theme);
  },
};
