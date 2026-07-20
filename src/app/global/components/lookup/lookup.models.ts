/** Modèles lookup / autocomplete — champs normalisés pour l’affichage. */

export interface LookupItemModel {
  id: string | number;
  lookup_title: string;
  lookup_subtitle?: string;
  lookup_image?: string;
}

export type LookupModel = LookupItemModel;
export type AutocompleteModel = LookupItemModel;

/** Extrait la liste depuis `objects` ou `object` (si tableau). */
export function extractLookupItems(response: unknown): unknown[] {
  if (!response || typeof response !== 'object') {
    return [];
  }

  const record = response as Record<string, unknown>;
  const objects = record['objects'];
  if (Array.isArray(objects)) {
    return objects;
  }

  const object = record['object'];
  if (Array.isArray(object)) {
    return object;
  }

  return [];
}

export function extractLookupCount(response: unknown): number {
  if (!response || typeof response !== 'object') {
    return 0;
  }

  const count = (response as Record<string, unknown>)['count'];
  return typeof count === 'number' ? count : 0;
}
