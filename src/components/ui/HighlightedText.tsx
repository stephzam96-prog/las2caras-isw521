interface HighlightedTextProps {
  text: string;
  query: string;
}

// Resalta (case-insensitive) todas las apariciones de `query` dentro de
// `text`, envueltas en <mark>. Puramente client-side -- el backend de
// busqueda no devuelve posiciones de match, asi que se busca de nuevo
// acá con un regex simple. Si `query` esta vacio, devuelve el texto tal
// cual (sin <mark>).
export default function HighlightedText({ text, query }: HighlightedTextProps) {
  const trimmed = query.trim();
  if (!trimmed) return <>{text}</>;

  // Escapa caracteres especiales de regex para que el termino se trate
  // como texto literal, no como patron.
  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'));

  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === trimmed.toLowerCase() ? (
          <mark key={i} className="rounded bg-yellow-200 px-0.5 dark:bg-yellow-700 dark:text-gray-100">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}
