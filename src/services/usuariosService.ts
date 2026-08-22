import { httpClient } from './httpClient';

export interface MyFavoritesResponse {
  favorites: string[]; // solo IDs de publicaciones, no objetos completos
}

export const usuariosService = {
  getMyFavoriteIds(): Promise<MyFavoritesResponse> {
    return httpClient.get<MyFavoritesResponse>('/users/me/favorites');
  },
};
