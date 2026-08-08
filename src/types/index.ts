// ============================================================
//  Cada interface describe la FORMA exacta que la API devuelve o recibe
//  La API usa IDs tipo UUID -> son STRING, no number
// ============================================================
 
 
// ---------- ENUMS (valores fijos que define la API) ----------
 
export type Role = 'USER' | 'SUPERADMIN';
export type UserStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED';
export type ViewStatus = 'PUBLISHED' | 'UNPUBLISHED';
export type SideType = 'SIDE' | 'COUNTERPART';      // ladoA / ladoB
export type SourceType = 'LINK' | 'YOUTUBE' | 'DOCUMENT';
export type ReactionType = 'LIKE' | 'DISLIKE';
 
 
// ---------- USUARIO ----------
// La API nunca devuelve la contraseña ni el token de activación
// (los "sanitiza"), formato del user:
 
export interface User {
  id: string;
  email: string;
  name: string;            
  role: Role;
  status: UserStatus;        // PENDING = registrado pero sin activar
  createdAt: string;         // fecha ISO como string
}
 
// (la API solo incluye id + name del autor).
export interface Author {
  id: string;
  name: string;
}
 
 
// ---------- CATEGORÍA ----------
// La API NO tiene campo "descripcion", solo nombre
 
export interface Category {
  id: string;
  name: string;
  deletedAt?: string | null; // soft-delete: si tiene fecha, está eliminada
}
 
 
// ---------- HASHTAG ----------
 
export interface Hashtag {
  id: string;
  name: string;
}
 
 
// ---------- FUENTE (respalda una postura) ----------
 
export interface Source {
  id: string;
  viewSideId: string;
  type: SourceType;
  url: string;
  label?: string | null;     // texto visible u opcional
  createdAt?: string;
}
 
 
// ---------- LADO / POSTURA (SIDE = A, COUNTERPART = B) ----------
// La API agrega los conteos de reacciones y tu reaccion (si la hay) a cada lado. Por eso estos campos están aquí, no en View.
 
export interface ViewSide {
  id: string;
  politicalViewId: string;
  type: SideType;
  title: string;
  description: string;
  sources: Source[];
  likeCount: number;              // calculado por la API
  dislikeCount: number;           // calculado por la API
  myReaction: ReactionType | null; // reaccion del usuario, o null si no hay
}
 
 
// ---------- VIEW  ----------
// En la API se llama PoliticalView. No tiene un "título" propio, sino que cada lado tiene su título. Por eso no hay campo "title" en View. 
// el título vive en cada lado (sides[].title).
 
export interface View {
  id: string;
  categoryId: string;
  authorId: string;
  status: ViewStatus;
  createdAt: string;
  updatedAt: string;
  category: Category;
  author: Author;
  sides: ViewSide[];              // los dos lados (SIDE y COUNTERPART)
  hashtags: Hashtag[];
  totalLikes: number;            // suma de likes de ambos lados
  totalDislikes: number;
  isFavorite: boolean;          // si el usuario actual la marcó
  _count?: { threads: number }; // nº de hilos de comentarios
}
 
 
// ---------- COMENTARIOS ----------
 
export interface Comment {
  id: string;
  threadId: string;
  userId: string;
  parentId?: string | null;  // si es respuesta a otro comentario
  content: string;
  createdAt: string;
  user?: Author;             // quien comento
  replies?: Comment[];       // respuestas 
}
 
export interface CommentThread {
  id: string;
  politicalViewId: string;
  title?: string | null;
  comments: Comment[];
}
 
 
// ---------- FAVORITO ----------
 
export interface Favorite {
  id: string;
  userId: string;
  politicalViewId: string;
  createdAt: string;
}
 
 
// ============================================================
//  PAYLOADS Y RESPUESTAS DE AUTH
//  (lo que se envia y lo que se recibe en cada endpoint de auth)
// ============================================================
 
// POST /api/auth/login  (body)
export interface LoginPayload {
  email: string;
  password: string;
}
 
// POST /api/auth/register  (body). La password debe tener min. 8 caracteres.
export interface RegisterPayload {
  email: string;
  password: string;
  name: string;
}
 
// Respuesta de POST /api/auth/login
export interface LoginResponse {
  token: string;
  user: User;
}
 
// Respuesta de POST /api/auth/register
// La API devuelve el activationToken directo (modo desarrollo):
// con él se arma el botón/página "Activar".
export interface RegisterResponse {
  user: User;
  activationToken: string;
}
 
// Respuesta de GET /api/auth/activate/:token  y  GET /api/auth/me
export interface UserResponse {
  user: User;
}
 
 
// ============================================================
//  PAYLOADS PARA CREAR/EDITAR UNA PUBLICACIÓN
// ============================================================
 
export interface SourceInput {
  type: SourceType;
  url: string;
  label?: string;
}
 
export interface SideInput {
  title: string;
  description: string;
  sources: SourceInput[];
}
 
export interface CreateViewInput {
  categoryId: string;
  side: SideInput;         // lado A
  counterpart: SideInput;  // lado B
  hashtags?: string[];     // nombres de hashtags
}
 
export type UpdateViewInput = CreateViewInput;