import { httpClient } from './httpClient';

// Perfil publico minimo -- verificado contra el backend real
// (authors.service.js): no hay bio ni avatar en el modelo, y nunca se
// expone el email de otro usuario. publishedViewsCount ya viene calculado
// del lado del servidor.
export interface AuthorProfile {
  id: string;
  name: string;
  createdAt: string;
  publishedViewsCount: number;
}

export interface GetAuthorResponse {
  author: AuthorProfile;
}

export const authorsService = {
  // 404 (ApiError kind 'not_found') si el id no existe.
  getAuthor(id: string): Promise<GetAuthorResponse> {
    return httpClient.get<GetAuthorResponse>(`/authors/${id}`);
  },
};
