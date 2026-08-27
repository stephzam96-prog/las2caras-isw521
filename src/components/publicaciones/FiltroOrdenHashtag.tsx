import { useEffect, useState } from 'react';
import type { Hashtag } from '../../types';
import { hashtagsService } from '../../services/hashtagsService';
import { cacheService } from '../../services/cacheService';
import { useDebounce } from '../../hooks/useDebounce';
import type { ViewSort } from '../../services/publicacionesService';

const SORT_OPTIONS: { value: ViewSort; label: string }[] = [
  { value: 'recent', label: 'Más recientes' },
  { value: 'likes', label: 'Más likes' },
  { value: 'dislikes', label: 'Más dislikes' },
];

interface FiltroOrdenHashtagProps {
  sort: ViewSort;
  onSortChange: (sort: ViewSort) => void;
  hashtag: string;
  onHashtagChange: (hashtag: string) => void;
}

// Selector de orden + autocomplete de hashtag, extraídos de TableroPage.tsx
// para reutilizar el mismo patrón en CategoriaPage.tsx (mismo criterio de
// orden, mismo autocomplete, sin duplicar la lógica de fetch/debounce/
// dropdown). El filtro de categoría NO vive acá a propósito -- en
// CategoriaPage la categoría ya está fija por la URL (/categories/:id),
// no es un filtro que el usuario elija.
//
// NOTA sobre "orden por lado" (enunciado original): el backend de
// GET /views solo acepta sort: 'likes' | 'dislikes' | 'recent', y ordena
// por la SUMA de ambos lados (verificado en views.service.js), no por
// lado individual -- no existe forma de pedir "más likes del Lado A" al
// servidor. Por eso estas 3 opciones (no 5) son las únicas reales.
export default function FiltroOrdenHashtag({ sort, onSortChange, hashtag, onHashtagChange }: FiltroOrdenHashtagProps) {
  const [hashtagQuery, setHashtagQuery] = useState('');
  const debouncedHashtagQuery = useDebounce(hashtagQuery, 300);
  const [hashtagSuggestions, setHashtagSuggestions] = useState<Hashtag[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    const q = debouncedHashtagQuery.trim();

    if (q === '') {
      const cached = cacheService.getHashtags();
      if (cached) setHashtagSuggestions(cached);
    }

    hashtagsService
      .searchHashtags(q || undefined)
      .then(({ hashtags }) => {
        setHashtagSuggestions(hashtags);
        if (q === '') cacheService.setHashtags(hashtags);
      })
      .catch((err) => console.error('No se pudieron cargar los hashtags', err));
  }, [debouncedHashtagQuery]);

  function handleSelectHashtag(h: Hashtag) {
    onHashtagChange(h.name);
    setHashtagQuery(h.name);
    setIsDropdownOpen(false);
  }

  return (
    <>
      <div>
        <label htmlFor="filtro-orden" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Ordenar por
        </label>
        <select
          id="filtro-orden"
          value={sort}
          onChange={(e) => onSortChange(e.target.value as ViewSort)}
          className="rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div
        className="relative"
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
            setIsDropdownOpen(false);
          }
        }}
      >
        <label htmlFor="filtro-hashtag" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Hashtag
        </label>
        {hashtag ? (
          <span className="flex items-center gap-2 rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600">
            #{hashtag}
            <button
              type="button"
              onClick={() => {
                onHashtagChange('');
                setHashtagQuery('');
              }}
              aria-label="Quitar filtro de hashtag"
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              ✕
            </button>
          </span>
        ) : (
          <>
            <input
              id="filtro-hashtag"
              type="text"
              role="combobox"
              aria-expanded={isDropdownOpen && hashtagSuggestions.length > 0}
              aria-controls="filtro-hashtag-listbox"
              aria-autocomplete="list"
              placeholder="Buscar hashtag…"
              value={hashtagQuery}
              onChange={(e) => setHashtagQuery(e.target.value)}
              onFocus={() => setIsDropdownOpen(true)}
              className="w-48 rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
            />
            {isDropdownOpen && hashtagSuggestions.length > 0 && (
              <ul
                id="filtro-hashtag-listbox"
                role="listbox"
                className="absolute z-10 mt-1 w-48 rounded-md border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800"
              >
                {hashtagSuggestions.map((h) => (
                  <li key={h.id} role="presentation">
                    <button
                      type="button"
                      role="option"
                      aria-selected={false}
                      onMouseDown={() => handleSelectHashtag(h)}
                      className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      #{h.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </>
  );
}
