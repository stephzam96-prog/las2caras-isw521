# LasDosCaras — Contexto del proyecto para Claude Code

> Este archivo se lee automáticamente al inicio de cada sesión de Claude Code.
> Se sube a Git — lo comparten los 3 integrantes. Si algo cambia (convenciones,
> decisiones de equipo), actualícenlo aquí para que quede como fuente de verdad.

## Qué es LasDosCaras

SPA (single page application) que presenta **siempre dos narrativas** de
cualquier tema (social, político, económico, cultural). Cada publicación
(`Vista`) tiene **Lado A** y **Lado B**, cada uno con su propio título,
descripción, fuentes, likes y dislikes, tratados como entidades independientes
en la UI — nunca se deben fusionar ni tratar como una sola.

Proyecto académico (ISW-521, UTN). El backend/API REST con JWT ya está dado
por el docente (Swagger/OpenAPI) y corre en Docker **local**, no en la nube.
Cada integrante levanta su propio backend en su máquina.

**Regla de oro para vos como asistente:** este proyecto se evalúa con 40% de
defensa oral individual donde la estudiante debe explicar y modificar en vivo
cualquier línea del código. Por lo tanto:
- Explicá el plan antes de escribir código extenso, no solo lo hagas.
- Preferí código legible y convencional sobre trucos ingeniosos difíciles de
  explicar en el momento.
- Si tomás una decisión de arquitectura no trivial, decila explícitamente y
  el porqué, para que quede documentada y se pueda repasar después.

## Stack obligatorio (no negociable)

- **React + TypeScript estricto** (no `any` sin justificar por escrito).
- **Vite** como build tool.
- **Tailwind CSS**, mobile-first, con tema claro/oscuro.
- **React Router** con guards de autenticación y de rol.
- **Context API + useReducer** para el estado global de auth (no Redux, no
  librerías externas de estado a menos que el equipo lo decida).
- **Capa de servicio centralizada** para toda llamada al API. Prohibido hacer
  `fetch` suelto dentro de un componente — siempre pasa por `src/services/`.
- JWT en header `Authorization: Bearer <token>` en cada request autenticado.
- `.env` con `VITE_API_URL` (nunca se sube a Git; sí se sube `.env.example`).

## Roles del sistema

| Rol | Puede |
|---|---|
| Anónimo | Ver tablero, detalle, categorías, perfil de autor, buscar, compartir |
| Autenticado | Todo lo anterior + crear/editar sus publicaciones, like/dislike, comentar, guardar favoritos |
| Superadmin | Todo lo anterior + banear usuarios, gestionar categorías, despublicar contenido |

## Manejo de errores HTTP (obligatorio en la capa de servicio)

| Código | Comportamiento esperado |
|---|---|
| 400 | Mostrar errores de validación **por campo**, nunca un mensaje genérico |
| 401 | Limpiar auth, borrar token del storage, redirigir a `/login` ("Su sesión ha expirado") |
| 403 | Mostrar página/toast de error de permisos. NO redirigir a login |
| 404 | Página o mensaje inline contextual ("Esta publicación no existe o fue eliminada") |
| 409 | Mensaje inline en el campo correspondiente (ej. correo duplicado) |
| 422 | Mostrar el detalle de error que devuelve el API |
| 500/502/503 | Mensaje genérico al usuario + log técnico en consola |

Además: detectar `offline`/error de red y mostrar banner, reintento automático
en GETs fallidos, nunca mostrar excepciones técnicas crudas al usuario.

## Claves de localStorage (ya definidas — no inventar otras)

| Clave | Contenido | TTL |
|---|---|---|
| `lasdoscaras_auth` | token JWT + datos del usuario | hasta logout o 401 |
| `lasdoscaras_categories` | categorías (fallback si el API falla) | 1 hora |
| `lasdoscaras_hashtags` | hashtags para autocomplete | 30 min |
| `lasdoscaras_filters` | filtros/orden activos del tablero | permanente |
| `lasdoscaras_favorites` | IDs de publicaciones favoritas | sync con API al login |
| `lasdoscaras_draft` | borrador de publicación nueva | permanente hasta publicar/descartar |
| `lasdoscaras_theme` | `"light"` \| `"dark"` | permanente |
| `lasdoscaras_history` | últimas 20 publicaciones vistas (FIFO) | permanente |

Todo acceso a localStorage pasa por un único `CacheService` — nunca
`localStorage.getItem/setItem` directo en un componente. Patrón
stale-while-revalidate: mostrar lo cacheado de inmediato, refrescar en
segundo plano.

## Rutas de la aplicación

| Ruta | Pantalla | Acceso |
|---|---|---|
| `/` | Tablero Principal | Público |
| `/login` | Login | Solo no autenticados |
| `/register` | Registro | Solo no autenticados |
| `/categories/:id` | Página de Categoría | Público |
| `/views/:id` | Detalle de Publicación | Público |
| `/views/new` | Crear Publicación | Autenticado |
| `/views/:id/edit` | Editar Publicación | Autenticado (autor o superadmin) |
| `/profile` | Perfil de Usuario | Autenticado |
| `/search` | Resultados de Búsqueda | Público |
| `/authors/:id` | Perfil Público de Autor | Público |
| `/admin/users` | Gestión de Usuarios | Solo superadmin |
| `/admin/categories` | Gestión de Categorías | Solo superadmin |
| `/admin/moderation` | Moderación de Contenido | Solo superadmin |
| `/*` | 404 | Público |

## Estructura de carpetas (ver `estructura-carpetas.md` para el detalle)

```
src/
├── components/   # componentes reutilizables (Tarjeta, Navbar, Toast, etc.)
├── pages/        # una carpeta por pantalla/ruta
├── services/      # capa de servicio HTTP + CacheService
├── context/       # AuthContext + reducer
├── hooks/         # custom hooks (useDebounce, useAuth, etc.)
├── types/         # interfaces TypeScript de las entidades del API
├── routes/        # AuthGuard, RoleGuard, definición de rutas
└── utils/
```

## Convención de commits

Formato convencional, en español, consistente en todo el repo:

```
feat: agrega pantalla de registro con validación de formulario
fix: corrige manejo de error 401 en el servicio de autenticación
refactor: extrae lógica de fetch a capa de servicio independiente
style: aplica diseño responsivo a tarjetas del tablero
```

Nunca commits tipo "cambios", "arreglos", "subiendo archivos" — el docente
los revisa como señal de bajo criterio técnico.

## Reparto de trabajo del equipo (contexto, no restricción técnica)

- **Integrante 1** (compañera): Tablero, Categoría, Búsqueda, Perfil Autor, 404
- **Integrante 2** (yo, en la práctica cubro esto): Login, Registro,
  Crear/Editar Publicación, Perfil de Usuario
- **Integrante 3** (yo, en la práctica cubro esto también): Detalle de
  Publicación, Admin Usuarios, Admin Categorías, Admin Moderación

Cada pantalla se desarrolla en su propia rama `feature/<nombre-pantalla>`
partiendo de `develop`, con PR hacia `develop` al terminar.

## Cómo quiero que trabajes conmigo en este repo

1. Antes de tocar código nuevo, decime brevemente el plan (qué archivos vas a
   crear/tocar y por qué).
2. Trabajá pantalla por pantalla, no todo de una vez.
3. Al terminar una pantalla o feature, dame un resumen corto: qué se
   implementó, qué decisiones de diseño tomaste y por qué, y qué endpoints del
   API se usaron. Lo voy a guardar en `NOTAS-DEFENSA.md` para repasar antes de
   la defensa oral.
4. Si algo del enunciado no está claro o hay una alternativa de
   implementación válida, decímelo en vez de asumir en silencio.
