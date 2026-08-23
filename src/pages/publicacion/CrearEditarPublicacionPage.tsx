import { useCallback, useEffect, useId, useState, type FormEvent, type KeyboardEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Category, CreateViewInput, Hashtag, SideInput, SourceType, ViewSide } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { useDebounce } from '../../hooks/useDebounce';
import { publicacionesService } from '../../services/publicacionesService';
import { categoriasService } from '../../services/categoriasService';
import { hashtagsService } from '../../services/hashtagsService';
import { cacheService, type DraftPublicacion, type DraftSideForm } from '../../services/cacheService';
import { ApiError } from '../../services/httpClient';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';

const SOURCE_TYPES: SourceType[] = ['LINK', 'YOUTUBE', 'DOCUMENT'];

function emptySide(): DraftSideForm {
  return { title: '', description: '', sources: [{ type: 'LINK', url: '', label: '' }] };
}

function emptyDraft(): DraftPublicacion {
  return { categoryId: '', side: emptySide(), counterpart: emptySide(), hashtags: [] };
}

function toDraftSide(side: ViewSide | undefined): DraftSideForm {
  if (!side) return emptySide();
  return {
    title: side.title,
    description: side.description,
    sources: side.sources.map((s) => ({ type: s.type, url: s.url, label: s.label ?? '' })),
  };
}

type LoadStatus = 'idle' | 'loading' | 'success' | 'notfound' | 'error';
type SideKey = 'side' | 'counterpart';

export default function CrearEditarPublicacionPage() {
  const { id } = useParams<{ id: string }>();
  const isEditMode = Boolean(id);
  const navigate = useNavigate();
  const { user } = useAuth();

  const [form, setForm] = useState<DraftPublicacion>(emptyDraft());

  // --- Modo edición: cargar la vista existente y precargar el formulario.
  // El PUT es un reemplazo completo (verificado en views.service.js), así
  // que necesitamos TODO el estado actual, no un diff.
  const [loadStatus, setLoadStatus] = useState<LoadStatus>(isEditMode ? 'loading' : 'idle');
  const [forbidden, setForbidden] = useState(false);

  const fetchExistingView = useCallback(() => {
    if (!id) return;
    setLoadStatus('loading');
    setForbidden(false);
    publicacionesService
      .getView(id)
      .then(({ view }) => {
        // Ownership separado de RoleGuard: autor o superadmin. AuthGuard ya
        // garantiza que hay sesión a nivel de ruta; esto es el chequeo
        // "¿sos vos el dueño de esto?" que solo se puede hacer una vez que
        // la vista está cargada.
        if (!user || (user.id !== view.authorId && user.role !== 'SUPERADMIN')) {
          setForbidden(true);
          setLoadStatus('success');
          return;
        }
        const sideA = view.sides.find((s) => s.type === 'SIDE');
        const sideB = view.sides.find((s) => s.type === 'COUNTERPART');
        setForm({
          categoryId: view.categoryId,
          side: toDraftSide(sideA),
          counterpart: toDraftSide(sideB),
          hashtags: view.hashtags.map((h) => h.name),
        });
        setLoadStatus('success');
      })
      .catch((err) => {
        if (err instanceof ApiError && err.kind === 'not_found') {
          setLoadStatus('notfound');
        } else {
          console.error('No se pudo cargar la publicación', err);
          setLoadStatus('error');
        }
      });
  }, [id, user]);

  useEffect(() => {
    if (!isEditMode) return;
    fetchExistingView();
  }, [isEditMode, fetchExistingView]);

  // --- Borrador (solo modo creación, según CLAUDE.md: "borrador de
  // publicación nueva"). No se autoguarda hasta que el usuario decide qué
  // hacer con un borrador preexistente -- si arrancáramos a autoguardar de
  // entrada, pisaríamos el borrador viejo con el formulario vacío antes de
  // que el usuario pueda restaurarlo.
  const [draftPrompt, setDraftPrompt] = useState(false);
  const [autosaveEnabled, setAutosaveEnabled] = useState(isEditMode);

  useEffect(() => {
    if (isEditMode) return;
    const draft = cacheService.getDraft();
    if (draft) {
      setDraftPrompt(true);
    } else {
      setAutosaveEnabled(true);
    }
  }, [isEditMode]);

  useEffect(() => {
    if (!autosaveEnabled || isEditMode) return;
    cacheService.setDraft(form);
  }, [form, autosaveEnabled, isEditMode]);

  function handleRestoreDraft() {
    const draft = cacheService.getDraft();
    if (draft) setForm(draft);
    setDraftPrompt(false);
    setAutosaveEnabled(true);
  }

  function handleDiscardDraft() {
    cacheService.clearDraft();
    setDraftPrompt(false);
    setAutosaveEnabled(true);
  }

  // --- Categorías (stale-while-revalidate, mismo patrón que TableroPage) ---
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    const cached = cacheService.getCategories();
    if (cached) setCategories(cached);
    categoriasService
      .listCategories()
      .then(({ categories }) => {
        setCategories(categories);
        cacheService.setCategories(categories);
      })
      .catch((err) => console.error('No se pudieron cargar las categorías', err));
  }, []);

  // --- Hashtags: autocomplete + chips, hasta 10. Acepta texto libre nuevo
  // (el backend crea el hashtag automáticamente si no existe -- upsert). ---
  const [hashtagQuery, setHashtagQuery] = useState('');
  const debouncedHashtagQuery = useDebounce(hashtagQuery, 300);
  const [hashtagSuggestions, setHashtagSuggestions] = useState<Hashtag[]>([]);

  useEffect(() => {
    const q = debouncedHashtagQuery.trim();
    if (!q) {
      setHashtagSuggestions([]);
      return;
    }
    hashtagsService
      .searchHashtags(q)
      .then(({ hashtags }) => setHashtagSuggestions(hashtags))
      .catch((err) => console.error('No se pudieron buscar hashtags', err));
  }, [debouncedHashtagQuery]);

  function addHashtag(name: string) {
    const normalized = name.trim().toLowerCase();
    if (!normalized || form.hashtags.includes(normalized) || form.hashtags.length >= 10) return;
    setForm((prev) => ({ ...prev, hashtags: [...prev.hashtags, normalized] }));
    setHashtagQuery('');
    setHashtagSuggestions([]);
  }

  function removeHashtag(name: string) {
    setForm((prev) => ({ ...prev, hashtags: prev.hashtags.filter((h) => h !== name) }));
  }

  function handleHashtagKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault();
      addHashtag(hashtagQuery);
    }
  }

  // --- Edición de los dos lados ---
  function updateSide(which: SideKey, patch: Partial<DraftSideForm>) {
    setForm((prev) => ({ ...prev, [which]: { ...prev[which], ...patch } }));
  }

  function updateSource(which: SideKey, index: number, patch: Partial<DraftSideForm['sources'][number]>) {
    setForm((prev) => ({
      ...prev,
      [which]: {
        ...prev[which],
        sources: prev[which].sources.map((s, i) => (i === index ? { ...s, ...patch } : s)),
      },
    }));
  }

  function addSource(which: SideKey) {
    setForm((prev) => ({
      ...prev,
      [which]: { ...prev[which], sources: [...prev[which].sources, { type: 'LINK', url: '', label: '' }] },
    }));
  }

  function removeSource(which: SideKey, index: number) {
    setForm((prev) => ({
      ...prev,
      [which]: { ...prev[which], sources: prev[which].sources.filter((_, i) => i !== index) },
    }));
  }

  // --- Validación y envío ---
  const [validationMessages, setValidationMessages] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function validateClientSide(): string[] {
    const errors: string[] = [];
    if (!form.categoryId) errors.push('Seleccioná una categoría.');
    for (const [label, side] of [
      ['Lado A', form.side],
      ['Lado B', form.counterpart],
    ] as const) {
      if (!side.title.trim()) errors.push(`${label}: el título es obligatorio.`);
      if (!side.description.trim()) errors.push(`${label}: la descripción es obligatoria.`);
      if (!side.sources.some((s) => s.url.trim())) errors.push(`${label}: agregá al menos una fuente con URL.`);
    }
    return errors;
  }

  function buildPayload(): CreateViewInput {
    function toSideInput(side: DraftSideForm): SideInput {
      return {
        title: side.title.trim(),
        description: side.description.trim(),
        sources: side.sources
          .filter((s) => s.url.trim())
          .map((s) => ({
            type: s.type,
            url: s.url.trim(),
            ...(s.label.trim() ? { label: s.label.trim() } : {}),
          })),
      };
    }
    return {
      categoryId: form.categoryId,
      side: toSideInput(form.side),
      counterpart: toSideInput(form.counterpart),
      hashtags: form.hashtags.length > 0 ? form.hashtags : undefined,
    };
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);

    const clientErrors = validateClientSide();
    if (clientErrors.length > 0) {
      setValidationMessages(clientErrors);
      return;
    }
    setValidationMessages([]);
    setIsSubmitting(true);

    try {
      const payload = buildPayload();
      const { view } = isEditMode && id
        ? await publicacionesService.updateView(id, payload)
        : await publicacionesService.createView(payload);
      cacheService.clearDraft();
      navigate(`/views/${view.id}`, { replace: true });
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.kind === 'validation' && error.validationMessages) {
          setValidationMessages(error.validationMessages);
        } else if (error.kind === 'forbidden') {
          setFormError('No tenés permiso para realizar esta acción.');
        } else {
          setFormError(error.message);
        }
      } else {
        setFormError('Ocurrió un error inesperado.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  // --- Estados de carga/permiso en modo edición ---
  if (isEditMode && loadStatus === 'loading') {
    return <Spinner label="Cargando publicación…" />;
  }

  if (isEditMode && loadStatus === 'notfound') {
    return (
      <EmptyState
        title="Esta publicación no existe o fue eliminada"
        message="Puede que el link esté roto."
      />
    );
  }

  if (isEditMode && loadStatus === 'error') {
    return (
      <EmptyState
        title="No pudimos cargar la publicación"
        message="Revisá tu conexión e intentá de nuevo."
        actionLabel="Reintentar"
        onAction={fetchExistingView}
      />
    );
  }

  if (isEditMode && forbidden) {
    return (
      <EmptyState
        title="No tenés permiso"
        message="Solo el autor o un superadmin pueden editar esta publicación."
      />
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <h1 className="mb-4 text-2xl font-bold text-gray-900 dark:text-gray-100">
        {isEditMode ? 'Editar publicación' : 'Crear publicación'}
      </h1>

      {draftPrompt && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-md bg-yellow-100 px-4 py-2 text-sm text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
          <span>Tenés un borrador guardado de una publicación sin terminar.</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleRestoreDraft}
              className="rounded-md bg-yellow-600 px-3 py-1 text-white"
            >
              Restaurar
            </button>
            <button
              type="button"
              onClick={handleDiscardDraft}
              className="rounded-md border border-yellow-600 px-3 py-1"
            >
              Descartar
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div>
          <label htmlFor="categoria" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Categoría
          </label>
          <select
            id="categoria"
            value={form.categoryId}
            onChange={(e) => setForm((prev) => ({ ...prev, categoryId: e.target.value }))}
            required
            className="w-full max-w-sm rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
          >
            <option value="">Seleccioná una categoría</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <LadoFormulario
            label="Lado A"
            value={form.side}
            onChange={(patch) => updateSide('side', patch)}
            onAddSource={() => addSource('side')}
            onRemoveSource={(index) => removeSource('side', index)}
            onSourceChange={(index, patch) => updateSource('side', index, patch)}
          />
          <LadoFormulario
            label="Lado B"
            value={form.counterpart}
            onChange={(patch) => updateSide('counterpart', patch)}
            onAddSource={() => addSource('counterpart')}
            onRemoveSource={(index) => removeSource('counterpart', index)}
            onSourceChange={(index, patch) => updateSource('counterpart', index, patch)}
          />
        </div>

        <div>
          <label htmlFor="hashtags" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Hashtags (máx. 10)
          </label>
          {form.hashtags.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {form.hashtags.map((h) => (
                <span
                  key={h}
                  className="flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                >
                  #{h}
                  <button type="button" onClick={() => removeHashtag(h)} aria-label={`Quitar #${h}`}>
                    ✕
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="relative max-w-sm">
            <input
              id="hashtags"
              type="text"
              value={hashtagQuery}
              onChange={(e) => setHashtagQuery(e.target.value)}
              onKeyDown={handleHashtagKeyDown}
              placeholder="Escribí y presioná Enter…"
              disabled={form.hashtags.length >= 10}
              className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
            />
            {hashtagSuggestions.length > 0 && (
              <ul className="absolute z-10 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
                {hashtagSuggestions.map((h) => (
                  <li key={h.id}>
                    <button
                      type="button"
                      onMouseDown={() => addHashtag(h.name)}
                      className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      #{h.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {validationMessages.length > 0 && (
          <ul className="list-disc pl-5 text-sm text-red-600">
            {validationMessages.map((msg) => (
              <li key={msg}>{msg}</li>
            ))}
          </ul>
        )}
        {formError && <p className="text-sm text-red-600">{formError}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="self-start rounded-md bg-blue-600 px-6 py-2 font-medium text-white disabled:opacity-50"
        >
          {isSubmitting ? 'Guardando…' : isEditMode ? 'Guardar cambios' : 'Publicar'}
        </button>
      </form>
    </div>
  );
}

function LadoFormulario({
  label,
  value,
  onChange,
  onAddSource,
  onRemoveSource,
  onSourceChange,
}: {
  label: string;
  value: DraftSideForm;
  onChange: (patch: Partial<DraftSideForm>) => void;
  onAddSource: () => void;
  onRemoveSource: (index: number) => void;
  onSourceChange: (index: number, patch: Partial<DraftSideForm['sources'][number]>) => void;
}) {
  // Prefijo único por instancia (Lado A / Lado B comparten este mismo
  // componente) para que los id de los campos no choquen entre sí.
  const uid = useId();
  const tituloId = `${uid}-titulo`;
  const descripcionId = `${uid}-descripcion`;

  return (
    <fieldset className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
      <legend className="px-1 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {label}
      </legend>

      <div className="flex flex-col gap-3">
        <div>
          <label htmlFor={tituloId} className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Título
          </label>
          <input
            id={tituloId}
            type="text"
            required
            value={value.title}
            onChange={(e) => onChange({ title: e.target.value })}
            className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
          />
        </div>

        <div>
          <label htmlFor={descripcionId} className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Descripción
          </label>
          <textarea
            id={descripcionId}
            required
            rows={4}
            value={value.description}
            onChange={(e) => onChange({ description: e.target.value })}
            className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
          />
        </div>

        <div>
          <p id={`${uid}-fuentes-label`} className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
            Fuentes
          </p>
          <div role="group" aria-labelledby={`${uid}-fuentes-label`} className="flex flex-col gap-2">
            {value.sources.map((source, index) => (
              <div key={index} className="flex flex-wrap items-center gap-2">
                <select
                  aria-label={`Tipo de fuente ${index + 1} (${label})`}
                  value={source.type}
                  onChange={(e) => onSourceChange(index, { type: e.target.value as SourceType })}
                  className="rounded-md border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800"
                >
                  {SOURCE_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <input
                  type="url"
                  aria-label={`URL de la fuente ${index + 1} (${label})`}
                  placeholder="https://..."
                  value={source.url}
                  onChange={(e) => onSourceChange(index, { url: e.target.value })}
                  className="min-w-40 flex-1 rounded-md border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800"
                />
                <input
                  type="text"
                  aria-label={`Etiqueta de la fuente ${index + 1} (${label}), opcional`}
                  placeholder="Etiqueta (opcional)"
                  value={source.label}
                  onChange={(e) => onSourceChange(index, { label: e.target.value })}
                  className="w-40 rounded-md border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800"
                />
                <button
                  type="button"
                  onClick={() => onRemoveSource(index)}
                  disabled={value.sources.length <= 1}
                  aria-label={`Quitar fuente ${index + 1} (${label})`}
                  className="text-sm text-red-600 hover:underline disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Quitar
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={onAddSource}
            aria-label={`Agregar fuente (${label})`}
            className="mt-2 text-sm text-blue-600 hover:underline"
          >
            + Agregar fuente
          </button>
        </div>
      </div>
    </fieldset>
  );
}
