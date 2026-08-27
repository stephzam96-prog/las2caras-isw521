import { useState } from 'react';
import type { ReactionType, View, ViewSide } from '../types';
import { publicacionesService, toSideLetter } from '../services/publicacionesService';
import { useAuth } from './useAuth';

// Logica de reaccion (like/dislike) extraida de TarjetaPublicacion para que
// DetallePublicacionPage la reutilice sin duplicar el POST-y-merge del
// estado local. Mismo comportamiento de siempre: copia local de `sides`
// que se actualiza con la respuesta del POST, sin refetchear ni avisarle
// a quien renderiza (Tablero/Categoria/Detalle no necesitan saber que
// reaccionaste).
export function useSideReactions(view: View) {
  const { isAuthenticated } = useAuth();
  const [sides, setSides] = useState<ViewSide[]>(view.sides);
  const [reactingSideId, setReactingSideId] = useState<string | null>(null);

  async function react(side: ViewSide, type: ReactionType) {
    if (!isAuthenticated || reactingSideId) return;
    setReactingSideId(side.id);
    try {
      const result = await publicacionesService.reactToSide(view.id, toSideLetter(side.type), type);
      setSides((prev) =>
        prev.map((s) =>
          s.id === side.id
            ? { ...s, likeCount: result.likeCount, dislikeCount: result.dislikeCount, myReaction: result.myReaction }
            : s,
        ),
      );
    } catch {
      // Errores de red/servidor en una reaccion no ameritan interrumpir la
      // pantalla entera; el usuario puede reintentar con otro clic.
    } finally {
      setReactingSideId(null);
    }
  }

  return { sides, react, reactingSideId, isAuthenticated };
}
