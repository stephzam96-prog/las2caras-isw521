import { httpClient } from './httpClient';
import type { ReactionType, SideType, View } from '../types';

export type ViewSort = 'recent' | 'likes' | 'dislikes';

export interface ListViewsParams {
  category?: string;
  hashtag?: string;
  sort?: ViewSort;
  page?: number;
  limit?: number;
  autorId?: string;
  autor?: 'me';
}

export interface ListViewsResponse {
  total: number;
  page: number;
  limit: number;
  views: View[];
}

// La API identifica los lados como 'a'/'b' en la URL de reacciones, no como
// SideType ('SIDE'/'COUNTERPART'). SIDE = lado A, COUNTERPART = lado B.
export type ViewSideLetter = 'a' | 'b';

export interface SideReactionResponse {
  likeCount: number;
  dislikeCount: number;
  myReaction: ReactionType | null;
}

export function toSideLetter(type: SideType): ViewSideLetter {
  return type === 'SIDE' ? 'a' : 'b';
}

function buildQuery(params: ListViewsParams): string {
  const query = new URLSearchParams();
  if (params.category) query.set('category', params.category);
  if (params.hashtag) query.set('hashtag', params.hashtag);
  if (params.sort) query.set('sort', params.sort);
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  if (params.autorId) query.set('autorId', params.autorId);
  if (params.autor) query.set('autor', params.autor);
  const qs = query.toString();
  return qs ? `?${qs}` : '';
}

export const publicacionesService = {
  // auth por defecto (true): si hay token lo manda, así la API devuelve
  // myReaction/isFavorite del usuario actual. Funciona igual sin token
  // (optionalAuthenticate en el backend), solo que sin personalizar.
  listViews(params: ListViewsParams = {}): Promise<ListViewsResponse> {
    return httpClient.get<ListViewsResponse>(`/views${buildQuery(params)}`);
  },
  // La API hace upsert: repetir la misma reacción no la "saca", y no existe
  // endpoint para quitarla, solo para cambiarla (like <-> dislike).
  reactToSide(viewId: string, side: ViewSideLetter, type: ReactionType): Promise<SideReactionResponse> {
    const action = type === 'LIKE' ? 'like' : 'dislike';
    return httpClient.post<SideReactionResponse>(`/views/${viewId}/sides/${side}/${action}`);
  },
};
