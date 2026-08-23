import { useToast } from './useToast';

// Compartido entre TarjetaPublicacion.tsx y DetallePublicacionPage.tsx:
// usa la Web Share API nativa si el navegador la soporta (mobile,
// mayoria de browsers modernos), y si no, copia el link al portapapeles
// y avisa con un toast -- no hay tercera opcion silenciosa, el usuario
// siempre se entera de qué pasó.
export function useShare() {
  const { showToast } = useToast();

  async function share(url: string, title: string) {
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch (err) {
        // El usuario cerró el diálogo nativo de compartir sin elegir nada
        // -- AbortError, no es un error real, no hace falta avisar nada.
        if (err instanceof Error && err.name !== 'AbortError') {
          console.error('Error al compartir', err);
        }
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(url);
      showToast('Enlace copiado.', 'success');
    } catch (err) {
      console.error('No se pudo copiar el enlace', err);
      showToast('No se pudo copiar el enlace.', 'error');
    }
  }

  return { share };
}
