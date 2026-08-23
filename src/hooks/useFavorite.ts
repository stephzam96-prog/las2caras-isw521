import { useState } from 'react';
import type { View } from '../types';
import { publicacionesService } from '../services/publicacionesService';
import { cacheService } from '../services/cacheService';
import { useAuth } from './useAuth';

// Estado de favorito extraido a su propio hook (no a useSideReactions):
// favorito es un flag por vista completa, sin relacion con los lados que
// maneja ese otro hook. Mismo patron optimista que useSideReactions: se
// actualiza el estado local antes de que responda el servidor, y se
// revierte si falla.
//
// El estado inicial sale de cacheService.getFavoriteIds() (sincronizado
// en AuthContext.tsx al login/restaurar sesion), no de view.isFavorite.
export function useFavorite(view: View) {
  const { isAuthenticated } = useAuth();
  const [isFavorite, setIsFavorite] = useState(() => cacheService.getFavoriteIds().includes(view.id));
  const [isToggling, setIsToggling] = useState(false);

  async function toggleFavorite() {
    if (!isAuthenticated || isToggling) return;
    const next = !isFavorite;
    setIsFavorite(next);
    setIsToggling(true);
    try {
      if (next) {
        await publicacionesService.favoriteView(view.id);
      } else {
        await publicacionesService.unfavoriteView(view.id);
      }
      const current = cacheService.getFavoriteIds();
      const updated = next ? [...current, view.id] : current.filter((id) => id !== view.id);
      cacheService.setFavoriteIds(updated);
    } catch {
      // Revertimos el optimismo: no interrumpimos la pantalla por un
      // fallo de red/servidor en un toggle, el usuario puede reintentar.
      setIsFavorite(!next);
    } finally {
      setIsToggling(false);
    }
  }

  return { isFavorite, toggleFavorite, isToggling, isAuthenticated };
}
