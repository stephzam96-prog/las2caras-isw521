import { useParams } from 'react-router-dom';

// TODO (equipo): PerfilAutorPage -- fetch completo pendiente.
//
// 1. Traer los datos publicos del autor:
//      authorsService.getAuthor(id)
//      (services/authorsService.ts, ya armado, mismo patron que
//      categoriasService.ts) -- devuelve
//      { author: { id, name, createdAt, publishedViewsCount } }.
//
// 2. Traer sus publicaciones:
//      publicacionesService.listViews({ autorId: id, limit: 50 })
//      (sin "Cargar mas" -- un fetch simple alcanza, ya acordado con el
//      equipo). El resultado (`views: View[]`) se pasa directo a
//      <GridPublicaciones views={views} />
//      (components/publicaciones/GridPublicaciones.tsx) -- se reutiliza
//      tal cual, sin transformar nada (a diferencia de Busqueda, /views
//      ya devuelve el View completo).
//
// Guiate por CategoriaPage.tsx (src/pages/categoria/CategoriaPage.tsx)
// como referencia de patron: dos fetches independientes (autor y
// publicaciones), cada uno con su propio estado de loading/error, usando
// components/ui/Spinner.tsx y components/ui/EmptyState.tsx para esos
// estados.
//
// 404: si el autor no existe, authorsService.getAuthor tira un ApiError
// con kind === 'not_found' (importalo de services/httpClient.ts).
// Mostralo con EmptyState inline, mismo patron que usa
// DetallePublicacionPage.tsx para "esta publicacion no existe" (no
// redirijas a /404).
//
// Header sugerido una vez que `author` este cargado: nombre, fecha de
// registro (author.createdAt) y author.publishedViewsCount. Mira el
// estilo de header que usa DetallePublicacionPage.tsx para mantener
// consistencia visual.
//
// Estados sugeridos:
//   authorStatus: 'loading' | 'success' | 'notfound' | 'error'
//   viewsStatus: 'loading' | 'success' | 'empty' | 'error' (independiente
//   del estado del autor -- si una de las dos falla, la otra puede seguir
//   mostrando lo suyo)

export default function PerfilAutorPage() {
  const { id } = useParams<{ id: string }>();

  // TODO (equipo): reemplazar este placeholder por la implementacion real
  // (los dos fetches + los estados de arriba). Esto solo existe para que
  // el archivo compile y la ruta no rompa mientras no este terminado.
  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <p className="text-gray-500 dark:text-gray-400">TODO: perfil del autor {id}</p>
    </div>
  );
}
