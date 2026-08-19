import { httpClient } from './httpClient';
import type { Hashtag } from '../types';

export interface ListHashtagsResponse {
  hashtags: Hashtag[];
}

export const hashtagsService = {
  // Autocomplete, no un listado completo: la API siempre devuelve maximo
  // 20 resultados (ordenados alfabeticamente), filtrados por "q" si se pasa.
  searchHashtags(q?: string): Promise<ListHashtagsResponse> {
    const qs = q ? `?q=${encodeURIComponent(q)}` : '';
    return httpClient.get<ListHashtagsResponse>(`/hashtags${qs}`);
  },
};
