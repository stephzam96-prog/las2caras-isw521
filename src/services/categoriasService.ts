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

  // --- Admin (SUPERADMIN) ---

  // A diferencia de listCategories() (publico), este SI incluye las
  // categorias soft-deleted (deletedAt no nulo) -- verificado contra el
  // backend real.
  adminListCategories(): Promise<ListCategoriesResponse> {
    return httpClient.get<ListCategoriesResponse>('/admin/categories');
  },
  // 409 (ApiError kind 'conflict') si ya existe una categoria con ese
  // nombre -- probado en vivo contra la API real.
  createCategory(name: string): Promise<GetCategoryResponse> {
    return httpClient.post<GetCategoryResponse>('/admin/categories', { name });
  },
  updateCategory(id: string, name: string): Promise<GetCategoryResponse> {
    return httpClient.put<GetCategoryResponse>(`/admin/categories/${id}`, { name });
  },
  // Soft-delete (204, sin body). La API NO valida si la categoria tiene
  // publicaciones asociadas -- por eso la UI debe confirmar antes de
  // llamar esto.
  deleteCategory(id: string): Promise<void> {
    return httpClient.delete<void>(`/admin/categories/${id}`);
  },
};
