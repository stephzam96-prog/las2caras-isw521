// Extrae el video ID de una URL de YouTube en cualquiera de sus formatos
// comunes (watch?v=, youtu.be/, embed/). Devuelve null si no matchea
// ninguno -- quien lo use debe caer al link simple en ese caso.
export function extractYoutubeId(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === 'youtu.be') {
      return parsed.pathname.slice(1) || null;
    }
    if (parsed.hostname.includes('youtube.com')) {
      if (parsed.pathname === '/watch') {
        return parsed.searchParams.get('v');
      }
      if (parsed.pathname.startsWith('/embed/')) {
        return parsed.pathname.replace('/embed/', '') || null;
      }
    }
    return null;
  } catch {
    return null;
  }
}
