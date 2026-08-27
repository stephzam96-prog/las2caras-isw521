import { httpClient } from './httpClient';
import type { User } from '../types';

export interface MyFavoritesResponse {
  favorites: string[]; // solo IDs de publicaciones, no objetos completos
}

export interface ListUsersParams {
  search?: string;
  page?: number;
  limit?: number;
}

export interface ListUsersResponse {
  total: number;
  page: number;
  limit: number;
  users: User[];
}

export interface BanUserResponse {
  user: User;
}

function buildUsersQuery(params: ListUsersParams): string {
  const query = new URLSearchParams();
  if (params.search) query.set('search', params.search);
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  const qs = query.toString();
  return qs ? `?${qs}` : '';
}

export const usuariosService = {
  getMyFavoriteIds(): Promise<MyFavoritesResponse> {
    return httpClient.get<MyFavoritesResponse>('/users/me/favorites');
  },

  // --- Admin (SUPERADMIN) ---

  listUsers(params: ListUsersParams = {}): Promise<ListUsersResponse> {
    return httpClient.get<ListUsersResponse>(`/admin/users${buildUsersQuery(params)}`);
  },
  // Sin restricciones del lado del servidor -- ni siquiera evita que un
  // superadmin se banee a si mismo (verificado en users.service.js). La
  // guarda de auto-baneo vive del lado del cliente, en la pagina.
  banUser(id: string): Promise<BanUserResponse> {
    return httpClient.patch<BanUserResponse>(`/admin/users/${id}/ban`);
  },
  unbanUser(id: string): Promise<BanUserResponse> {
    return httpClient.patch<BanUserResponse>(`/admin/users/${id}/unban`);
  },
};
