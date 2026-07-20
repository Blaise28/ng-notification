import { Component, computed, effect, ElementRef, inject, input, output, signal } from '@angular/core';
import { HugeiconsIconComponent } from '@hugeicons/angular';
import { FilterIcon, Sad01Icon } from '@hugeicons/core-free-icons';

import { ERROR_MESSAGE } from '@globals/constants';
import { Api } from '@services/api/api';
import { Lookup } from '../lookup/lookup';
import type {
  AutocompleteModel,
  BoolFilterValue,
  FilterDefinitionModel,
  FiltersModel,
  LookupModel,
  RangeFilterValue,
} from './filters.models';

type FilterAlign = 'center' | 'end' | 'start';

interface FiltersApiResponse {
  object: FiltersModel;
}

interface FilterStateSnapshot {
  values: Record<string, string>;
  multi: Record<string, string[]>;
  ranges: Record<string, RangeFilterValue>;
  bools: Record<string, BoolFilterValue>;
}

@Component({
  selector: 'app-filters',
  imports: [Lookup, HugeiconsIconComponent],
  templateUrl: './filters.html',
  styleUrl: './filters.scss',
    host: {
    class: 'relative inline-block',
    '(document:click)': 'onDocumentClick($event)',
  },
})
export class Filters {
  private readonly api = inject(Api);
  private readonly elementRef = inject(ElementRef);

  readonly url = input.required<string>();
  readonly align = input<FilterAlign>('end');
  readonly filtersEvent = output<string>();

  protected readonly FilterIcon = FilterIcon;
  protected readonly Sad01Icon = Sad01Icon;

  protected readonly showFiltersCard = signal(false);
  private readonly filterStateInitialized = signal(false);
  private readonly initialFilterSnapshot = signal<FilterStateSnapshot | null>(null);

  protected readonly filterValues = signal<Record<string, string>>({});
  protected readonly multiSelectValues = signal<Record<string, string[]>>({});
  protected readonly rangeValues = signal<Record<string, RangeFilterValue>>({});
  protected readonly boolValues = signal<Record<string, BoolFilterValue>>({});

  private readonly filtersRequestUrl = computed(() => this.formatUrlToFilters());

  protected readonly filtersResource = this.api.getResource<FiltersApiResponse>(
    () => this.filtersRequestUrl(),
  );

  protected readonly isLoading = computed(() => this.filtersResource.isLoading());

  protected readonly filtersError = computed(() =>
    this.filtersResource.error() ? ERROR_MESSAGE : null,
  );

  protected readonly filtersData = computed((): FiltersModel => {
    if (!this.filtersResource.hasValue()) {
      return { filters: [], ordering: [] };
    }

    const data = structuredClone(this.filtersResource.value().object);
    for (const filter of data.filters) {
      if (filter.data?.url) {
        filter.data.url = this.stripApiPrefix(filter.data.url);
      }
    }
    return data;
  });

  protected readonly activeFilterCount = computed(() => {
    let count = 0;

    for (const value of Object.values(this.filterValues())) {
      if (value !== '') {
        count++;
      }
    }

    for (const range of Object.values(this.rangeValues())) {
      if (range.min !== '' || range.max !== '') {
        count++;
      }
    }

    for (const value of Object.values(this.boolValues())) {
      if (value !== null) {
        count++;
      }
    }

    for (const values of Object.values(this.multiSelectValues())) {
      if (values.length > 0) {
        count++;
      }
    }

    return count;
  });

  protected readonly panelPositionClass = computed(() => {
    switch (this.align()) {
      case 'center':
        return 'filters-panel--center';
      case 'start':
        return 'filters-panel--start';
      default:
        return 'filters-panel--end';
    }
  });

  constructor() {
    effect(() => {
      this.url();
      this.filterStateInitialized.set(false);
      this.initialFilterSnapshot.set(null);
    });

    effect(() => {
      if (this.filterStateInitialized() || !this.filtersResource.hasValue()) {
        return;
      }
      const filters = this.filtersData().filters;
      if (filters.length > 0) {
        this.initFilterState(filters);
        this.filterStateInitialized.set(true);
      }
    });
  }

  protected toggleFilterCard(): void {
    if (this.isLoading()) {
      return;
    }
    this.showFiltersCard.update((open) => !open);
  }

  protected retryLoadFilters(): void {
    this.filtersResource.reload();
  }

  reset(): void {
    const snapshot = this.initialFilterSnapshot();
    if (!snapshot) {
      return;
    }
    this.filterValues.set(structuredClone(snapshot.values));
    this.multiSelectValues.set(structuredClone(snapshot.multi));
    this.rangeValues.set(structuredClone(snapshot.ranges));
    this.boolValues.set(structuredClone(snapshot.bools));
  }

  protected resetFilters(): void {
    this.reset();
  }

  protected onDocumentClick(event: MouseEvent): void {
    const target = event.target as Node | null;
    if (!target) {
      return;
    }
    const isInside = this.elementRef.nativeElement.contains(target);
    if (!isInside && this.showFiltersCard()) {
      this.showFiltersCard.set(false);
    }
  }

  protected applyFilters(): void {
    let query = '';

    for (const [key, value] of Object.entries(this.filterValues())) {
      if (value !== '' && value !== undefined && value !== null) {
        query += `${key}=${encodeURIComponent(value)}&`;
      }
    }

    for (const [key, range] of Object.entries(this.rangeValues())) {
      if (range.min !== '') {
        query += `${key}_min=${encodeURIComponent(range.min)}&`;
      }
      if (range.max !== '') {
        query += `${key}_max=${encodeURIComponent(range.max)}&`;
      }
    }

    for (const [key, value] of Object.entries(this.boolValues())) {
      if (value !== null) {
        query += `${key}=${value}&`;
      }
    }

    for (const [key, values] of Object.entries(this.multiSelectValues())) {
      for (const item of values) {
        if (item !== undefined && item !== null && item !== '') {
          query += `${key}=${encodeURIComponent(item)}&`;
        }
      }
    }

    this.filtersEvent.emit(query);
    this.showFiltersCard.set(false);
  }

  protected getFilterValue(name: string): string {
    return this.filterValues()[name] ?? '';
  }

  protected setFilterValue(name: string, value: string): void {
    this.filterValues.update((current) => ({ ...current, [name]: value }));
  }

  protected getSelectedIdForLookup(name: string): string | number | null {
    const value = this.getFilterValue(name);
    if (!value) {
      return null;
    }
    const asNumber = Number(value);
    return Number.isNaN(asNumber) ? value : asNumber;
  }

  protected getRangeValue(name: string): RangeFilterValue {
    return this.rangeValues()[name] ?? { min: '', max: '' };
  }

  protected setRangeValue(name: string, part: 'min' | 'max', value: string): void {
    this.rangeValues.update((current) => ({
      ...current,
      [name]: { ...this.getRangeValue(name), [part]: value },
    }));
  }

  protected getBoolValue(name: string): BoolFilterValue {
    return this.boolValues()[name] ?? null;
  }

  protected setBoolValue(name: string, value: BoolFilterValue): void {
    this.boolValues.update((current) => ({ ...current, [name]: value }));
  }

  protected isMultiSelected(name: string, value: string): boolean {
    return (this.multiSelectValues()[name] ?? []).includes(value);
  }

  protected toggleMultiSelect(name: string, value: string): void {
    this.multiSelectValues.update((current) => {
      const selected = current[name] ?? [];
      const next = selected.includes(value)
        ? selected.filter((item) => item !== value)
        : [...selected, value];
      return { ...current, [name]: next };
    });
  }

  protected onLookupSelected(
    response: LookupModel | AutocompleteModel | null,
    controlName: string,
  ): void {
    const id = response?.id;
    this.setFilterValue(controlName, id != null ? String(id) : '');
  }

  protected lookupUrl(filter: FilterDefinitionModel): string {
    const base = filter.data?.url ?? '';
    if (filter.type === 'autocomplete') {
      return `${base}?search=`;
    }
    return base;
  }

  protected trackFilter(_index: number, filter: FilterDefinitionModel): string {
    return filter.name;
  }

  protected trackChoice(_index: number, choice: { value: string }): string {
    return choice.value;
  }

  private initFilterState(filters: FilterDefinitionModel[]): void {
    const values: Record<string, string> = {};
    const multi: Record<string, string[]> = {};
    const ranges: Record<string, RangeFilterValue> = {};
    const bools: Record<string, BoolFilterValue> = {};

    for (const filter of filters) {
      switch (filter.type) {
        case 'select_multiple':
          multi[filter.name] = [];
          break;
        case 'range':
          ranges[filter.name] = { min: '', max: '' };
          break;
        case 'bool':
          bools[filter.name] = null;
          break;
        default:
          values[filter.name] = '';
          break;
      }
    }

    this.filterValues.set(values);
    this.multiSelectValues.set(multi);
    this.rangeValues.set(ranges);
    this.boolValues.set(bools);

    this.initialFilterSnapshot.set({
      values: structuredClone(values),
      multi: structuredClone(multi),
      ranges: structuredClone(ranges),
      bools: structuredClone(bools),
    });
  }

  private stripApiPrefix(url: string): string {
    return url.replace('/api/v1', '');
  }

  private formatUrlToFilters(): string {
    const [basePart, queryPart = ''] = this.url().split('?');
    let base = basePart;

    if (queryPart === '') {
      if (base.endsWith('?')) {
        base = base.slice(0, -1);
        if (!base.endsWith('/')) {
          base = `${base}/`;
        }
      }
    }

    return `${base}objects_filtering_data/?${queryPart}`;
  }
}
