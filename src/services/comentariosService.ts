import { httpClient } from './httpClient';
import type { Comment, CommentThread } from '../types';

export interface ListThreadsResponse {
  threads: CommentThread[];
}

export interface CreateThreadInput {
  title?: string;
  content: string;
}

export interface CreateThreadResponse {
  thread: CommentThread;
}

export interface CreateCommentInput {
  content: string;
  parentId?: string; // respuesta anidada si se pasa; comentario de nivel superior si no
}

export interface CreateCommentResponse {
  comment: Comment;
}

export const comentariosService = {
  // GET /threads ya trae los comentarios de nivel superior de cada hilo
  // con sus respuestas anidadas incluidas (un solo nivel) -- no hace
  // falta un fetch separado por hilo.
  listThreads(viewId: string): Promise<ListThreadsResponse> {
    return httpClient.get<ListThreadsResponse>(`/views/${viewId}/threads`);
  },
  // Crea un hilo nuevo junto con su comentario de apertura.
  createThread(viewId: string, input: CreateThreadInput): Promise<CreateThreadResponse> {
    return httpClient.post<CreateThreadResponse>(`/views/${viewId}/threads`, input);
  },
  // Comenta dentro de un hilo existente. Sin parentId = comentario de
  // nivel superior en ese hilo; con parentId = respuesta anidada.
  createComment(viewId: string, threadId: string, input: CreateCommentInput): Promise<CreateCommentResponse> {
    return httpClient.post<CreateCommentResponse>(`/views/${viewId}/threads/${threadId}/comments`, input);
  },
};
