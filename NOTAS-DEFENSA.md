# Notas de defensa — LasDosCaras

> Chuleta personal para repasar antes de la defensa oral (40% de la nota,
> individual). Por cada pantalla/feature que termines con Claude Code,
> pedile un resumen y pegalo acá con tus propias palabras después de
> entenderlo — no copies y pegues sin leer.

Formato sugerido por entrada:

## [Nombre de la pantalla o feature]
- **Qué hace:** ...
- **Endpoints del API que usa:** ...
- **Decisiones de diseño y por qué:** ...
- **Qué localStorage toca (si aplica):** ...
- **Puntos donde podrían preguntarme algo tricky:** ...
- **Cosas que no me quedan 100% claras — repasar antes de defender:** ...

---

## Sprint 0 — Núcleo compartido
- **Qué hace:**
- **Decisiones de diseño y por qué:**
- **Puntos donde podrían preguntarme algo tricky:**

---

## Autenticación
- Decisión: errores 400 se muestran como lista, no por campo, porque 
  la API agrupa todos los mensajes de validación bajo "body" (no 
  separa por nombre de input). Verificado contra la API real, no es 
  una suposición.

## Tablero / TarjetaPublicacion
- Decisión: no se muestra un contador combinado de likes/dislikes de
  ambos lados. Cada lado (A/B) muestra su propio contador, de forma
  independiente, para respetar la regla del enunciado de que los dos
  lados son entidades separadas — un total combinado además quedaría
  desincronizado si solo reaccionás a un lado.
- Reacciones: estado local en TarjetaPublicacion, se actualiza con la
  respuesta del POST sin que el padre (Tablero) necesite saberlo.

## Búsqueda (Página de Búsqueda)
- **Qué hace:** Permite buscar publicaciones de forma interactiva con entrada de texto mediante debounce (evita peticiones excesivas a la API). Soporta URL amigable `/search?q=...` para compartir búsquedas y maneja estados de carga, sin resultados, error y éxito.
- **Endpoints del API que usa:** `GET /api/search?q=...` (a través de `busquedaService.search`).
- **Decisiones de diseño y por qué:**
  - **No reutilizar `GridPublicaciones`/`TarjetaPublicacion`**: El endpoint `GET /api/search` devuelve un listado liviano de vistas (`SearchViewResult`) sin `description` ni contadores de reacciones a nivel de cada vista. Reutilizar la tarjeta general obligaría a forzar el tipado de TypeScript o hacer llamadas N+1, por lo que se diseñó la tarjeta simplificada `ResultadoBusquedaCard`.
  - **Sincronización de estado en el render para evitar warning de ESLint**: En lugar de llamar de forma síncrona a `setResults` y `setStatus` en el cuerpo de `useEffect` (lo cual genera un warning de `react-hooks/set-state-in-effect` en las reglas estrictas de ESLint), se implementó un control de comparación en la fase de renderizado `debouncedQuery !== prevQuery`. Al cambiar la consulta, se inicializa el estado a `'loading'` (o `'idle'` si está vacía) antes de renderizar, evitando renders en cascada.
  - **Limpieza de efecto (`active = false`)**: En el `useEffect` asíncrono se utiliza una variable local `active` que se vuelve `false` en la función de limpieza (cleanup). Esto previene condiciones de carrera si el usuario escribe de nuevo rápidamente o abandona la pantalla antes de que finalice la petición HTTP.
- **Puntos donde podrían preguntarme algo tricky:**
  - *¿Por qué el listado de búsqueda es diferente al del tablero principal?* Por el shape (estructura) de respuesta que devuelve el backend en `GET /api/search` vs `GET /views`. El de búsqueda no trae `description`, hashtags ni reacciones, por lo que necesita una tarjeta y tipo de datos más liviano (`SearchViewResult`).
  - *¿Cómo funciona el debounce de búsqueda?* Evita enviar un request HTTP por cada tecla que presiona el usuario. Espera a que el usuario deje de escribir durante 300ms antes de cambiar el estado de `debouncedQuery` y disparar la llamada al API.
  - *¿Por qué no se usó un `useEffect` simple para inicializar los estados `results` y `status` al borrar el input?* Para evitar infringir la regla de ESLint `react-hooks/set-state-in-effect` que previene actualizaciones de estado síncronas en el cuerpo de un efecto, las cuales provocan re-renderizados en cascada innecesarios. Al ajustar el estado durante el renderizado (cuando `debouncedQuery !== prevQuery`), React descarta el renderizado actual e inmediatamente inicia el nuevo renderizado con los estados actualizados, lo que mejora la eficiencia y limpieza del código.

## Nota de proceso — Categoría
- El PR original de esta pantalla se mergeó con un mensaje de commit
  que no coincidía con el código real (afirmaba listado + breadcrumb
  implementados; ambos seguían como TODO). Detectado en auditoría de
  consistencia previa a la entrega y corregido antes de la entrega final.

  ---
  ## Detalle de Publicación
- Despublicar es exclusivo de superadmin, el autor NO puede (verificado 
  en views.service.js del backend, requireRole('SUPERADMIN') en la ruta 
  PATCH /unpublish). El autor sí puede editar su propia publicación.
- Backend devuelve 404 tanto para "no existe" como "despublicada" -- no 
  se pueden distinguir del lado del cliente, mensaje genérico.
- Hilos de comentarios soportan un nivel de respuestas anidadas (no 
  respuesta-a-respuesta), reflejando el límite real del include de Prisma.
- Refactor: se extrajo la lógica de reacciones (like/dislike por lado) 
  a un hook useSideReactions, compartido entre TarjetaPublicacion y 
  DetallePublicacionPage, para no duplicar el POST-y-merge del estado.

## Login
## Registro
## Crear/Editar Publicación
## Perfil de Usuario
## Detalle de Publicación
## Admin — Usuarios
## Admin — Categorías (Gestión de Categorías)
- **Qué hace:** Proporciona una interfaz CRUD para que el SUPERADMIN pueda listar, crear, editar y eliminar categorías. Muestra visualmente las categorías activas y eliminadas.
- **Endpoints del API que usa:**
  - `GET /api/admin/categories` (lista categorías, incluyendo las marcadas con soft-delete).
  - `POST /api/admin/categories` (crea una nueva categoría).
  - `PUT /api/admin/categories/:id` (actualiza el nombre de una categoría existente).
  - `DELETE /api/admin/categories/:id` (aplica soft-delete a una categoría).
- **Decisiones de diseño y por qué:**
  - **Manejo de soft-delete en la UI**: El backend realiza un borrado lógico (soft-delete), conservando el registro con `deletedAt` no nulo. En lugar de remover las categorías eliminadas del estado local tras borrarlas, la UI las actualiza marcándolas localmente con un `deletedAt` simulado (fecha actual), lo que hace que se sigan listando en la tabla pero con el badge visual "Eliminada".
  - **Uso de `window.confirm` de seguridad**: La API no restringe la eliminación de categorías que contengan publicaciones asociadas. Como medida preventiva, se incluyó un cuadro de confirmación para evitar borrados accidentales de categorías críticas en uso.
  - **Optimización de renderizado (sin refetch completo)**: Al crear o editar, el estado local de `categories` se actualiza agregando la nueva entidad o reemplazando la existente en base a la respuesta del servidor, evitando peticiones adicionales N+1 o recargas completas.
  - **Manejo de error 409 (Conflicto)**: Si se intenta crear o editar una categoría con un nombre ya existente, el backend lanza un error 409. Se captura este tipo de error (`error.kind === 'conflict'`) de forma específica para mostrar una alerta visual clara ("Ya existe una categoría con este nombre") directamente en el formulario modal.
- **Puntos donde podrían preguntarme algo tricky:**
  - *¿Qué sucede si eliminas una categoría con publicaciones activas?* La API lo permite directamente ya que el backend realiza un soft-delete y no tiene restricciones sobre relaciones de FK activas al borrar. Las publicaciones existentes seguirán apuntando a su categoryId y la categoría seguirá listándose en administración con estado "Eliminada" para auditoría.
  - *¿Cómo se protegió la ruta de esta pantalla?* Se anidó la ruta `/admin/categories` dentro de un `<Route element={<AuthGuard />}>` y, dentro de este, se envolvió en un `<Route element={<RoleGuard allowedRoles={['SUPERADMIN']} />}>`. Esto garantiza que solo los usuarios autenticados con rol `SUPERADMIN` puedan acceder, redirigiendo a los usuarios normales a la vista `/403` ("No tenés permiso").

  ---
  ## Crear/Editar Publicación
- El PUT reemplaza el recurso completo (fuentes y hashtags se borran y 
  recrean, no se mezclan) -- el formulario de edición precarga todos 
  los campos, no hace un diff parcial.
- No existe estado "borrador" en el backend -- toda publicación creada 
  queda PUBLISHED de inmediato. lasdoscaras_draft es solo un autoguardado 
  local para no perder texto si el usuario cierra la pestaña antes de 
  enviar, no un draft que el servidor conozca.
- Editar requiere ser el autor O superadmin -- esto es una verificación 
  de "ownership del recurso", distinta de RoleGuard (que solo valida 
  rol, sin saber quién es dueño de qué). Por eso /views/:id/edit usa 
  AuthGuard a nivel de ruta + un chequeo manual (user.id === 
  view.authorId || role === 'SUPERADMIN') una vez que la vista carga, 
  con mensaje inline si no corresponde en vez de redirect.

  ---
  ## Perfil de Usuario — Favoritos
- CLAUDE.md describe sincronizar favoritos al login para mostrar el 
  ícono en cualquier tarjeta. Decidimos NO implementar eso todavía 
  (verificado con grep: TarjetaPublicacion no muestra ese ícono en 
  ningún lado del proyecto hoy, ni Tablero, Categoría, Búsqueda, 
  Autor o Detalle) -- se carga la lista de favoritos solo al visitar 
  /profile. Si más adelante se agrega el ícono en las tarjetas, ahí 
  correspondería mover la carga al login.
- Se agregó "Quitar de favoritos" en esta pantalla (no estaba en el 
  pedido original, pero una lista sin poder sacar elementos sería una 
  experiencia incompleta) -- lista propia liviana, no GridPublicaciones, 
  mismo criterio usado para Lado A/B en Detalle.
- El API no soporta editar datos del perfil (nombre, email, contraseña) 
  ni avatar -- verificado en users.service.js completo, solo expone 
  acciones de superadmin sobre otros usuarios. La pantalla muestra los 
  datos de solo lectura.


  - Se usó Promise.allSettled (no Promise.all) al traer los datos 
  completos de cada favorito -- si un favorito viejo fue despublicado 
  mientras tanto, ese GET puntual da 404 y esa tarjeta se omite en 
  silencio, en vez de romper toda la sección de favoritos.
---
## Admin — Usuarios
- 3 estados reales (PENDING, ACTIVE, SUSPENDED), no un simple activo/
  baneado -- reflejado con badges distintos en la tabla.
- El backend no impide que un superadmin se banee a sí mismo (verificado 
  en banUser, sin ninguna restricción). Se agregó una guarda del lado 
  del cliente: el botón "Banear" está deshabilitado en la fila del 
  usuario actualmente logueado.

## Admin — Moderación (Moderación de Contenido)
- **Qué hace:** Permite al SUPERADMIN listar todas las publicaciones, filtrar por estado (Publicadas, Despublicadas, o Todos) y publicar/despublicar cualquier publicación en tiempo real con actualización directa en la UI.
- **Endpoints del API que usa:**
  - `GET /api/admin/views` (lista publicaciones para moderación, trayendo publicadas y despublicadas juntas si no se filtra por status).
  - `PATCH /api/views/:id/publish` (publica una publicación).
  - `PATCH /api/views/:id/unpublish` (despublica una publicación).
- **Decisiones de diseño y por qué:**
  - **Uso de tabla compacta**: Al igual que en `AdminCategoriasPage.tsx`, se usa una tabla compacta en vez de `GridPublicaciones` o `TarjetaPublicacion` porque un superadmin necesita ver de forma rápida y compacta muchos registros y realizar acciones por fila con un solo clic.
  - **Filtro controlado con refetch**: Se conectó el selector de estado (`statusFilter`) con un `useEffect` que depende de `fetchViews`, la cual a su vez depende de `statusFilter`. Esto asegura que al cambiar el filtro en la UI se vuelvan a cargar los datos de forma inmediata y automatizada.
  - **Actualización en lugar sin refetch completo**: Cuando el superadmin publica o despublica, se actualiza el estado local modificando únicamente el campo `status` del elemento correspondiente en la lista `views` (`prev.map((v) => (v.id === targetView.id ? { ...v, status: response.view.status } : v))`), lo que evita solicitudes adicionales N+1 o parpadeos en la UI.
- **Bug encontrado y corregido (vale la pena poder explicarlo en la defensa):** el `PATCH /publish` y `/unpublish` **no** devuelven el `View` completo como el resto de los endpoints (`GET`/`POST`/`PUT`) -- devuelven el `PoliticalView` sin relaciones, es decir, sin `sides`, `category`, `author` ni `hashtags`. La primera versión de `handleTogglePublish` reemplazaba la fila entera con `response.view`, y como esa respuesta no traía `sides`, el `.find()` sobre `view.sides` al renderizar la tabla explotaba (`Cannot read properties of undefined (reading 'find')`), tumbando toda la pantalla apenas se hacía clic en "Publicar" o "Despublicar". Se corrigió en dos capas: (1) se arregló el tipo de retorno en `publicacionesService.ts` (`unpublishView`/`publishView` ahora devuelven `PublishActionResponse`, un `Pick<View, 'id'|'categoryId'|'authorId'|'status'|'createdAt'|'updatedAt'>`, no `View` completo), y (2) se cambió el handler para tomar solo `response.view.status` en vez de reemplazar la fila entera. Verificado en vivo publicando/despublicando varias veces sin crash.
- **Puntos donde podrían preguntarme algo tricky:**
  - *¿Por qué `GET /api/admin/views` se comporta diferente al endpoint público?* Porque el endpoint público `GET /views` siempre fuerza que el estado sea `PUBLISHED`. En cambio, el panel de moderación necesita listar también el contenido despublicado para que el superadmin pueda moderarlo y republicarlo si lo considera oportuno.
  - *¿Por qué se agregó un comentario de eslint-disable en el `useEffect`?* Para saltar la regla estricta de `react-hooks/set-state-in-effect` de ESLint, dado que se requiere sincronizar la carga de datos (fetch inicial) en el momento del montaje y al cambiar el filtro.

---
## Navbar (componente global)
- **Qué hace:** Barra de navegación global montada una sola vez en `App.tsx`, fuera de `<AppRoutes />`, así que aparece en las 13 pantallas -- incluidas 404/403, que no pasan por `AuthGuard`/`RoleGuard`. Cubre los 5 requisitos del enunciado: logo (link a `/`), dropdown de categorías, búsqueda global con debounce, toggle de tema claro/oscuro, y login/registro o menú de perfil/logout según haya sesión. Responsive mobile-first, con menú hamburguesa en mobile que apila las mismas secciones.
- **Endpoints del API que usa:** `GET /api/categories` (a través de `categoriasService.listCategories`, mismo patrón stale-while-revalidate que `TableroPage.tsx`: muestra el cache de inmediato y refresca en segundo plano).
- **Decisiones de diseño y por qué:**
  - **Cambio de estrategia de Tailwind para el tema (`text-gray-400 dark:text-gray-500` → clase, no media query)**: antes de este componente, el tema de toda la app "seguía" solo al sistema operativo -- el variant `dark:` de Tailwind v4 usaba por default `prefers-color-scheme`, sin ningún botón ni persistencia (`lasdoscaras_theme` estaba declarada en `cacheService.ts` pero nunca se leía ni escribía, verificado con grep en todo `src/`). Para que un toggle manual pudiera anular la preferencia del SO, hubo que agregar `@custom-variant dark (&:where(.dark, .dark *));` en `src/index.css`, para que los cientos de `dark:` ya escritos en las 13 pantallas respondan a la clase `.dark` en `<html>` en vez de solo al media query.
  - **`cacheService.getTheme()`/`setTheme()`**: única vía permitida para tocar `localStorage` (regla del proyecto), agregadas como infraestructura compartida antes del componente en sí.
  - **Toggle de tema en 3 pasos**: estado inicial = preferencia guardada, o si `getTheme()` devuelve `null` (el usuario nunca tocó el botón), la del sistema operativo vía `window.matchMedia('(prefers-color-scheme: dark)')`; un `useEffect` aplica/quita la clase `dark` en `document.documentElement` cada vez que cambia el estado; y el toggle persiste el nuevo valor con `setTheme()`.
  - **Cierre de dropdowns por `onBlur` + `relatedTarget`, no por click-afuera con listener global**: mismo patrón que se corrigió en el autocomplete de hashtags de `TableroPage.tsx` (evita la trampa de foco de un `setTimeout` que cierra el menú aunque el foco siga adentro por haber tabulado a un ítem).
  - **Búsqueda navega dos veces (Enter y debounce)**: el submit del formulario (Enter) y el `useEffect` que depende del valor debounced navegan ambos a `/search?q=...` -- es intencional y redundante mas no problemático (React Router no re-navega si la URL no cambió), cubre tanto al usuario que espera el debounce como al que aprieta Enter de inmediato.
- **Puntos donde podrían preguntarme algo tricky:**
  - *¿Por qué hizo falta tocar `index.css` para un botón de tema?* Porque agregar/quitar una clase en el DOM no alcanza si Tailwind no está configurado para reaccionar a esa clase -- sin el `@custom-variant`, todos los `dark:` de la app seguían ignorando la clase y solo mirando el SO.
  - *¿Qué pasa si el usuario nunca tocó el toggle?* `cacheService.getTheme()` devuelve `null` (no `'light'` por default), y ahí se cae a `prefers-color-scheme` -- no se asume un tema fijo para quien nunca eligió.
  - *¿Por qué el Navbar está fuera de `<AppRoutes />` en vez de ser parte de cada pantalla?* Para que aparezca en TODAS las rutas con un solo punto de montaje, incluidas las páginas de error (404/403) que existen justamente porque la ruta pedida no coincidió con ninguna pantalla real -- si el Navbar viviera dentro de cada página, esas dos quedarían sin barra de navegación.

---
## Accesibilidad (WCAG 2.1 AA)
- Auditoría completa hecha sobre src/pages/ y src/components/, encontró y corrigió: modal sin role="dialog"/foco/Escape (Admin-Categorías), formulario más largo de la app sin labels asociados (LadoFormulario en Crear/Editar Publicación), trampa de foco en dropdown de hashtags, falta de aria-live en 4 formularios, contraste insuficiente en 4 ubicaciones (patrón text-gray-400 invertido por error), y semántica de combobox en autocompletes.
- Decisión consciente: el combobox de hashtags no soporta navegación por flechas -- sería cambiar el comportamiento del componente, no solo su accesibilidad. Sigue siendo 100% operable por teclado vía Tab.
  - *¿Por qué `publish`/`unpublish` no se pueden usar como los demás endpoints de `views`?* Porque devuelven un shape distinto y más chico que `GET`/`POST`/`PUT /views`. Hay que tratarlos como una señal de éxito + el nuevo `status`, nunca como reemplazo completo de una vista en el estado local -- si a futuro se necesita mostrar más datos tras publicar/despublicar, hace falta un GET adicional o pedirle al backend que incluya las relaciones en esa respuesta.

  ---
  ## Sistema de Notificaciones y Confirmaciones
- ToastContext centralizado: role="alert" (aria-live="assertive") solo 
  para errores -- interrumpe al lector de pantalla porque requiere 
  atención inmediata. role="status" (aria-live="polite") para éxito/
  advertencia/info -- no interrumpe la tarea en curso del usuario.
- ConfirmModal.tsx extrae la lógica de accesibilidad (focus trap, 
  Escape, foco inicial/retorno) del modal de Admin-Categorías a un 
  componente reutilizable. Para acciones destructivas, el foco inicial 
  va al botón "Cancelar" (no "Confirmar") -- convención estándar para 
  que un Enter accidental no confirme algo irreversible como banear 
  a un usuario.

---
## Favoritos y Compartir (TarjetaPublicacion / Detalle)
- **Favoritos:** hook `useFavorite` separado de `useSideReactions` -- favorito es un flag por vista completa, sin relación con los lados que maneja ese otro hook. Mismo patrón optimista que like/dislike: el corazón cambia de estado antes de que responda el servidor, y se revierte si falla. Solo visible si `isAuthenticated`.
- **Decisión consciente:** el estado del corazón se lee de `cacheService.getFavoriteIds()` (el caché local), no del campo `view.isFavorite` que también devuelve la API. Trade-off aceptado: en un refresh de página, como la sincronización de favoritos es en segundo plano (no bloquea el render, mismo patrón que categorías/hashtags), una tarjeta ya montada puede alcanzar a leer el caché antes de que la sincronización termine y no autocorregirse hasta el próximo montaje. Se aceptó por ser consistente con cómo ya se maneja el resto del caché stale-while-revalidate en toda la app.
- **Sincronización de favoritos al login (antes pospuesta):** `CLAUDE.md` documentaba que sincronizar `lasdoscaras_favorites` en el login se pospuso porque `TarjetaPublicacion` no tenía ningún ícono de favorito -- esa razón ya no aplica. Ahora `AuthContext.tsx` sincroniza en segundo plano (fire-and-forget, sin bloquear el login) en dos puntos: al hacer login explícito, y al restaurar sesión (refresh de página) -- verificado en vivo que en ambos casos el corazón ya aparece lleno sin visitar `/profile`. También se agregó `cacheService.clearFavoriteIds()` en `logout()`, para no dejar favoritos de un usuario visibles para otro en una máquina compartida.
- **Compartir:** hook `useShare` compartido entre `TarjetaPublicacion` y el header de `DetallePublicacionPage`. Usa `navigator.share` (Web Share API) si el navegador la soporta; si no, copia el link al portapapeles y muestra un toast de confirmación (`useToast`, ya construido). Si el usuario cierra el diálogo nativo de compartir sin elegir nada (`AbortError`), no se muestra ningún error -- no es una falla real.
- **Puntos donde podrían preguntarme algo tricky:**
  - *¿Por qué no se usó `view.isFavorite` en vez del caché?* Fue una decisión explícita para tener una única fuente de verdad consistente durante toda la sesión, en vez de depender de que cada respuesta de la API (que no siempre incluye `isFavorite`, como en Búsqueda) traiga el dato actualizado.
  - *¿Qué pasa si falla el toggle de favorito?* Se revierte el estado optimista del corazón (mismo patrón que like/dislike en `useSideReactions`), sin recargar la tarjeta ni interrumpir la pantalla.
  - *¿Por qué el botón de compartir en Detalle no depende de ser autor/superadmin?* Porque compartir es una acción pública -- cualquiera que vea la publicación (incluso sin sesión) debería poder compartirla, a diferencia de Editar/Publicar que sí son acciones de dueño/admin.

