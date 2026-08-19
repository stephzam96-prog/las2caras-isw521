import { httpClient } from './httpClient';
import type { Category } from '../types';

export interface ListCategoriesResponse {
  categories: Category[];
}

export interface GetCategoryResponse {
  category: Category;
}

export const categoriasService = {
  // Publico, ya excluye categorias con soft-delete (deletedAt) del lado
  // del servidor -- no hace falta filtrar de nuevo en el cliente.
  listCategories(): Promise<ListCategoriesResponse> {
    return httpClient.get<ListCategoriesResponse>('/categories');
  },
  // Lanza 404 (ApiError kind 'not_found') si el id no existe o esta
  // soft-deleted -- getCategoryById en el backend las trata igual.
  getCategory(id: string): Promise<GetCategoryResponse> {
    return httpClient.get<GetCategoryResponse>(`/categories/${id}`);
  },
};
