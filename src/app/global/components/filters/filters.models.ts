/** Types de filtres renvoyés par l’API — à compléter selon le contrat backend. */

export type FilterType =
  | 'lookup'
  | 'autocomplete'
  | 'select'
  | 'date'
  | 'range'
  | 'select_multiple'
  | 'form_value'
  | 'bool';

export interface FilterChoiceModel {
  title: string;
  value: string;
}

export interface FilterDataModel {
  url?: string;
  choices?: FilterChoiceModel[];
  min?: number;
  max?: number;
  step?: number;
  field_type?: string;
}

export interface FilterDefinitionModel {
  name: string;
  title: string;
  type: FilterType;
  data?: FilterDataModel;
}

export interface FiltersModel {
  filters: FilterDefinitionModel[];
  ordering: string[];
}

export type { AutocompleteModel, LookupModel } from '../lookup/lookup.models';

/** Valeur booléenne avec état neutre (filtre non appliqué). */
export type BoolFilterValue = boolean | null;

export interface RangeFilterValue {
  min: string;
  max: string;
}
