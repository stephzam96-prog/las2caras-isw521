// El backend devuelve los nombres de categoría en inglés (seed de la
// cátedra) y no se puede tocar (ver CLAUDE.md). Este mapeo es solo para
// mostrarlos en español en la UI -- todo lo que filtra/crea/edita sigue
// usando category.id o el nombre real tal cual lo devuelve el API, nunca
// esta traducción (por eso NO se usa en AdminCategoriasPage: ahí se está
// editando/creando el valor real que se manda al backend).
const CATEGORY_LABELS_ES: Record<string, string> = {
  'Civil Rights': 'Derechos Civiles',
  Economy: 'Economía',
  Education: 'Educación',
  Environment: 'Medio Ambiente',
  'Foreign Policy': 'Política Exterior',
  Healthcare: 'Salud',
  Immigration: 'Inmigración',
};

export function translateCategoryName(name: string): string {
  return CATEGORY_LABELS_ES[name] ?? name;
}
