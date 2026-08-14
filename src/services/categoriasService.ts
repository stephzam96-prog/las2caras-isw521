import { httpClient } from './httpClient';
import type { Category } from '../types';

export interface ListCategoriesResponse {
  categories: Category[];
}

export const categoriasService = {
  // Publico, ya excluye categorias con soft-delete (deletedAt) del lado
  // del servidor -- no hace falta filtrar de nuevo en el cliente.
  listCategories(): Promise<ListCategoriesResponse> {
    return httpClient.get<ListCategoriesResponse>('/categories');
  },
};
