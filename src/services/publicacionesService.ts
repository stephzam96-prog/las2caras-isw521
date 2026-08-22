import { httpClient } from './httpClient';
import type { CreateViewInput, ReactionType, SideType, UpdateViewInput, View } from '../types';

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

export interface GetViewResponse {
  view: View;
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
  // Si la vista esta UNPUBLISHED, el backend devuelve 404 (no 403) salvo
  // que quien pide sea el autor o superadmin -- por eso "no existe" y
  // "fue despublicada" se ven identicas desde el cliente.
  getView(id: string): Promise<GetViewResponse> {
    return httpClient.get<GetViewResponse>(`/views/${id}`);
  },
  // La API hace upsert: repetir la misma reacción no la "saca", y no existe
  // endpoint para quitarla, solo para cambiarla (like <-> dislike).
  reactToSide(viewId: string, side: ViewSideLetter, type: ReactionType): Promise<SideReactionResponse> {
    const action = type === 'LIKE' ? 'like' : 'dislike';
    return httpClient.post<SideReactionResponse>(`/views/${viewId}/sides/${side}/${action}`);
  },
  // Ambas requieren rol SUPERADMIN en el backend -- ni siquiera el autor
  // puede despublicar/republicar su propia publicacion (verificado contra
  // el codigo fuente real: requireRole('SUPERADMIN') en la ruta).
  unpublishView(id: string): Promise<GetViewResponse> {
    return httpClient.patch<GetViewResponse>(`/views/${id}/unpublish`);
  },
  publishView(id: string): Promise<GetViewResponse> {
    return httpClient.patch<GetViewResponse>(`/views/${id}/publish`);
  },
  // Se publica de inmediato (status default PUBLISHED en el backend) --
  // no existe un estado "borrador" del lado del servidor.
  createView(input: CreateViewInput): Promise<GetViewResponse> {
    return httpClient.post<GetViewResponse>('/views', input);
  },
  // OJO: es un reemplazo completo, no un patch parcial. El backend borra
  // todas las fuentes viejas de ambos lados y crea las nuevas, y los
  // hashtags se reemplazan con "set" (no se mezclan) -- verificado en
  // views.service.js. El formulario tiene que mandar el estado completo.
  updateView(id: string, input: UpdateViewInput): Promise<GetViewResponse> {
    return httpClient.put<GetViewResponse>(`/views/${id}`, input);
  },
};
