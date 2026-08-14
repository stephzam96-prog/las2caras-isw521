import { httpClient } from './httpClient';
import type { Author, Category, Hashtag, SideType, ViewStatus } from '../types';

// GET /api/search NO devuelve el View completo de types/index.ts -- ver la
// nota en CLAUDE.md ("GridPublicaciones/TarjetaPublicacion -- regla de uso").
// Verificado contra el codigo fuente real del backend (search.service.js):
// los sides solo traen { type, title }, sin description ni conteos de
// reacciones, y la vista no trae hashtags/totalLikes/isFavorite.
export interface SearchViewResult {
  id: string;
  categoryId: string;
  authorId: string;
  status: ViewStatus;
  createdAt: string;
  updatedAt: string;
  category: Category;
  author: Author;
  sides: { type: SideType; title: string }[];
}

export interface SearchResponse {
  views: SearchViewResult[];
  categories: Category[];
  hashtags: Hashtag[];
  authors: Author[];
}

export const busquedaService = {
  // La API exige q con al menos 1 caracter (400 si se manda vacio) --
  // quien llame a esto debe evitar invocarlo con un string vacio.
  search(q: string): Promise<SearchResponse> {
    return httpClient.get<SearchResponse>(`/search?q=${encodeURIComponent(q)}`);
  },
};
