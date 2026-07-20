import { DecimalPipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { Component, computed, DestroyRef, effect, ElementRef, inject, input, output, signal, untracked, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HugeiconsIconComponent } from '@hugeicons/angular';
import {
  Add01Icon,
  Analytics01Icon,
  ArrowLeft01Icon,
  ArrowLeftDoubleIcon,
  ArrowRight01Icon,
  ArrowRightDoubleIcon,
  LeftToRightListDashIcon,
  MoreHorizontalIcon,
  RefreshIcon,
  Search01Icon,
} from '@hugeicons/core-free-icons';
import { debounceTime, distinctUntilChanged } from 'rxjs';

import { ERROR_MESSAGE } from '@globals/constants';
import type {
  ListAction,
  ListAddButtonLink,
  ListCell,
  ListDetailLink,
  ListHeaderModel,
  ListResponseConfig,
  ListRowSelect,
  OverviewItem,
} from '@globals/models/list.models';
import { ApiError } from '@services/api/api-error';
import { Api } from '@services/api/api';
import { DialogService } from '@services/dialog/dialog.service';
import { Filters } from '../filters/filters';
import { ListCellView } from './list-cell/list-cell';

interface OverviewApiResponse {
  object: OverviewItem[];
  count?: number;
}

@Component({
  selector: 'app-list',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    HugeiconsIconComponent,
    Filters,
    ListCellView,
    DecimalPipe,
  ],
  templateUrl: './list.html',
    host: {
    class: 'block h-full',
    '(document:click)': 'onDocumentClick()',
    '(document:keydown.escape)': 'onEscapeKey()',
  },
})
export class List<T extends object = object> {
  private readonly api = inject(Api);
  private readonly dialogService = inject(DialogService);
  private readonly destroyRef = inject(DestroyRef);

  readonly headers = input.required<ListHeaderModel[]>();
  readonly url = input.required<string>();
  readonly limit = input(20);
  readonly action = input<ListAction[]>();
  readonly addButtonLink = input<ListAddButtonLink>({ url: '', fragment: '' });
  readonly listTitle = input('');
  readonly responseConfig = input<ListResponseConfig>({
    dataKey: 'objects',
    countKey: 'count',
  });
  readonly detailLink = input<ListDetailLink>();
  readonly rowSelect = input<ListRowSelect>();
  readonly trackField = input('id');

  readonly showSearch = input(true);
  readonly showRefresh = input(true);
  readonly showOverview = input(true);
  readonly showFilters = input(true);
  readonly showPagination = input(true);
  readonly showPageSizeSelector = input(false);
  readonly showAddButton = input(false);
  readonly pageSizeOptions = input<number[]>([10, 20, 50, 100]);

  readonly emptyTitle = input('La liste est vide.');
  readonly emptyDescription = input('Ajoutez des éléments pour la remplir.');
  readonly noResultsTitle = input('Aucun résultat.');
  readonly noResultsDescription = input('Modifiez votre recherche ou vos filtres.');

  readonly addButtonAction = output<void>();

  protected readonly Add01Icon = Add01Icon;
  protected readonly Search01Icon = Search01Icon;
  protected readonly RefreshIcon = RefreshIcon;
  protected readonly Analytics01Icon = Analytics01Icon;
  protected readonly ArrowLeftDoubleIcon = ArrowLeftDoubleIcon;
  protected readonly ArrowLeft01Icon = ArrowLeft01Icon;
  protected readonly ArrowRight01Icon = ArrowRight01Icon;
  protected readonly ArrowRightDoubleIcon = ArrowRightDoubleIcon;
  protected readonly MoreHorizontalIcon = MoreHorizontalIcon;
  protected readonly EmptyListIcon = LeftToRightListDashIcon;
  protected readonly EmptyOverviewIcon = Analytics01Icon;
  protected readonly NoResultsIcon = Search01Icon;

  protected readonly searchControl = new FormControl('', { nonNullable: true });
  protected readonly searchTerm = signal('');
  protected readonly filterQuery = signal('');
  protected readonly currentPage = signal(1);
  protected readonly openDropdownIndex = signal<number | null>(null);
  protected readonly overviewFetchUrl = signal<string | undefined>(undefined);

  protected readonly overviewDialog =
    viewChild<ElementRef<HTMLDialogElement>>('overviewDialog');
  private readonly filtersComponent = viewChild(Filters);

  private readonly pageOffset = signal(0);
  protected readonly pageLimit = signal(20);
  private readonly lastReportedError = signal<unknown>(null);

  protected readonly listRequestUrl = computed(() => this.buildListUrl());

  protected readonly listResource = httpResource<Record<string, unknown>>(() => {
    const requestUrl = this.listRequestUrl();
    if (!requestUrl) {
      return undefined;
    }
    return this.api.buildUrl(requestUrl);
  });

  protected readonly overviewResource = httpResource<OverviewApiResponse>(() => {
    const requestUrl = this.overviewFetchUrl();
    if (!requestUrl) {
      return undefined;
    }
    return this.api.buildUrl(requestUrl);
  });

  protected readonly isLoading = computed(() => this.listResource.isLoading());

  protected readonly loadingOverview = computed(() => this.overviewResource.isLoading());

  protected readonly count = computed(() => this.extractCount(this.listResource.value()));

  protected readonly pages = computed(() => {
    const total = this.count();
    const pageLimit = this.pageLimit();
    if (!pageLimit || total <= 0) {
      return 0;
    }
    return Math.ceil(total / pageLimit);
  });

  protected readonly pageRange = computed(() => {
    const total = this.count();
    if (total <= 0) {
      return null;
    }
    const start = this.pageOffset() + 1;
    const end = Math.min(this.pageOffset() + this.pageLimit(), total);
    return { start, end, total };
  });

  protected readonly hasActiveQuery = computed(
    () => this.searchTerm().trim() !== '' || this.filterQuery().replace(/&+$/, '').trim() !== '',
  );

  protected readonly hasData = computed(() => this.count() > 0);

  protected readonly isNoResults = computed(() => !this.hasData() && this.hasActiveQuery());

  protected readonly showAddControl = computed(
    () => this.showAddButton() || Boolean(this.addButtonLink().url),
  );

  protected readonly rawData = computed((): T[] => this.extractData(this.listResource.value()));

  protected readonly formattedRows = computed((): ListCell[][] =>
    this.rawData().map((row) =>
      this.headers().map((header) => this.formatCellData(header, row)),
    ),
  );

  protected readonly allDetailLinks = computed((): (string | null)[] => {
    if (!this.detailLink()) {
      return [];
    }
    return this.rawData().map((row) => this.calculateDetailLink(row));
  });

  protected readonly overViewData = computed((): OverviewItem[] => {
    if (!this.overviewResource.hasValue()) {
      return [];
    }
    return this.overviewResource.value().object ?? [];
  });

  constructor() {
    effect(() => {
      this.pageLimit.set(this.limit());
    });

    this.searchControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        this.searchTerm.set(value);
        this.currentPage.set(1);
        this.pageOffset.set(0);
      });

    effect(() => {
      this.url();
      untracked(() => {
        this.currentPage.set(1);
        this.pageOffset.set(0);
        this.filterQuery.set('');
        this.searchControl.setValue('', { emitEvent: false });
        this.searchTerm.set('');
        this.filtersComponent()?.reset();
      });
    });

    effect(() => {
      if (this.listResource.hasValue()) {
        untracked(() => this.lastReportedError.set(null));
      }
    });

    effect(() => {
      const error = this.listResource.error();
      if (!error || error === this.lastReportedError()) {
        return;
      }
      this.lastReportedError.set(error);
      this.dialogService.showToast({
        type: 'error',
        message: this.resolveErrorMessage(error),
      });
    });
  }

  reloadList(): void {
    this.listResource.reload();
  }

  protected onSearchSubmit(): void {
    this.searchTerm.set(this.searchControl.value);
    this.currentPage.set(1);
    this.pageOffset.set(0);
  }

  protected getActiveFilters(filters: string): void {
    this.filterQuery.set(filters);
    this.currentPage.set(1);
    this.pageOffset.set(0);
  }

  protected onPageSizeChange(event: Event): void {
    const value = Number((event.target as HTMLSelectElement).value);
    if (Number.isNaN(value) || value <= 0) {
      return;
    }
    this.pageLimit.set(value);
    this.currentPage.set(1);
    this.pageOffset.set(0);
  }

  protected onAddButtonClick(): void {
    this.addButtonAction.emit();
  }

  protected doListMove(action: 'next' | 'prev' | 'first' | 'last'): void {
    if (this.isLoading()) {
      return;
    }

    const totalPages = this.pages();
    let nextPage = this.currentPage();

    switch (action) {
      case 'next':
        nextPage = Math.min(nextPage + 1, totalPages);
        break;
      case 'prev':
        nextPage = Math.max(nextPage - 1, 1);
        break;
      case 'first':
        nextPage = 1;
        break;
      case 'last':
        nextPage = totalPages;
        break;
    }

    this.currentPage.set(nextPage);
    this.pageOffset.set(this.pageLimit() * (nextPage - 1));
  }

  protected toggleDropdown(index: number, event: MouseEvent): void {
    event.stopPropagation();
    this.openDropdownIndex.update((current) => (current === index ? null : index));
  }

  protected handleAction(item: ListAction, line: T): void {
    item.callback(line);
    this.openDropdownIndex.set(null);
  }

  protected handleRowClick(line: T, rowIdx: number): void {
    if (!this.getDetailLinkForRow(rowIdx)) {
      this.rowSelect()?.callback(line);
    }
  }

  protected onRowKeydown(event: KeyboardEvent, line: T, rowIdx: number): void {
    if (!this.rowSelect() || this.getDetailLinkForRow(rowIdx)) {
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.handleRowClick(line, rowIdx);
    }
  }

  protected getDetailLinkForRow(rowIdx: number): string | null {
    return this.allDetailLinks()[rowIdx] ?? null;
  }

  protected getRowTrackId(rowIdx: number): string | number {
    const row = this.rawData()[rowIdx] as Record<string, unknown>;
    const field = this.trackField();
    const id = this.extractNestedValue(row, field);
    if (id !== undefined && id !== null && id !== '') {
      return typeof id === 'string' || typeof id === 'number' ? id : String(id);
    }
    return rowIdx;
  }

  protected isRowClickable(): boolean {
    return Boolean(this.detailLink() || this.rowSelect());
  }

  protected openOverviewModal(): void {
    this.overviewFetchUrl.set(this.buildOverviewUrl());
    this.overviewResource.reload();
    this.overviewDialog()?.nativeElement.showModal();
  }

  protected closeOverviewModal(): void {
    this.overviewDialog()?.nativeElement.close();
    this.overviewFetchUrl.set(undefined);
  }

  protected onDocumentClick(): void {
    if (this.openDropdownIndex() !== null) {
      this.openDropdownIndex.set(null);
    }
  }

  protected onEscapeKey(): void {
    if (this.openDropdownIndex() !== null) {
      this.openDropdownIndex.set(null);
    }
  }

  protected isFirstPageDisabled(): boolean {
    return this.currentPage() < 2 || this.pages() <= 1 || this.isLoading();
  }

  protected isPrevPageDisabled(): boolean {
    return this.currentPage() === 1 || this.pages() <= 1 || this.isLoading();
  }

  protected isNextPageDisabled(): boolean {
    return this.currentPage() >= this.pages() || this.isLoading();
  }

  protected isLastPageDisabled(): boolean {
    return this.pages() <= 1 || this.pages() === this.currentPage() || this.isLoading();
  }

  private buildListUrl(): string {
    const baseUrl = this.url();
    if (!baseUrl) {
      return '';
    }

    const queryParts = [
      `limit=${this.pageLimit()}`,
      `offset=${this.pageOffset()}`,
      ...this.buildSearchAndFilterParams(),
    ];

    return this.appendQueryParams(baseUrl, queryParts);
  }

  private buildOverviewUrl(): string {
    const base = this.url();
    const [basePart, queryPart = ''] = base.split('?');
    let overviewBase: string;

    if (!queryPart && (base.endsWith('?') || base.endsWith('&'))) {
      const trimmed = base.slice(0, -1);
      overviewBase = trimmed.endsWith('/') ? `${trimmed}objects_overview/` : `${trimmed}/objects_overview/`;
    } else {
      const normalizedBase = basePart.endsWith('/') ? basePart : `${basePart}/`;
      overviewBase = `${normalizedBase}objects_overview/`;
    }

    const contextParams = this.buildSearchAndFilterParams();
    if (queryPart) {
      contextParams.unshift(queryPart.replace(/&+$/, ''));
    }

    return contextParams.length > 0
      ? this.appendQueryParams(overviewBase, contextParams)
      : overviewBase;
  }

  private buildSearchAndFilterParams(): string[] {
    const params: string[] = [];
    const search = this.searchTerm().trim();
    if (search) {
      params.push(`search=${encodeURIComponent(search)}`);
    }

    const filters = this.filterQuery().replace(/&+$/, '').trim();
    if (filters) {
      params.push(filters.startsWith('&') ? filters.slice(1) : filters);
    }

    return params;
  }

  private appendQueryParams(baseUrl: string, queryParts: string[]): string {
    const filtered = queryParts.filter((part) => part.trim() !== '');
    if (filtered.length === 0) {
      return baseUrl;
    }
    const separator = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${separator}${filtered.join('&')}`;
  }

  private formatCellData(header: ListHeaderModel, row: T): ListCell {
    const rawValue = this.extractFieldRawValue(header.field, row);
    let value: string | null =
      rawValue !== undefined && rawValue !== null && rawValue !== ''
        ? String(rawValue)
        : null;

    if (header.format === 'date' && !this.isValidDateValue(value)) {
      value = null;
    }

    if (header.valueLabels && value !== null) {
      value = header.valueLabels[value] ?? value;
    }

    let cssClass = header.staticClass ?? '';
    const dynamicClassPath = header.dynamicClass;
    if (dynamicClassPath) {
      const dynamicValue = this.extractNestedValue(row, dynamicClassPath);
      if (dynamicValue && header.format === 'badge') {
        cssClass += ` badge badge-${dynamicValue === 'failed' ? 'error' : String(dynamicValue)}`;
      } else if (dynamicValue) {
        cssClass += String(dynamicValue);
      }
    }

    let booleanLabel: string | undefined;
    let booleanBadgeClass: string | undefined;
    let booleanType: 'check' | 'badge' = 'check';

    if (typeof header.boolean === 'object' && header.boolean !== null) {
      booleanType = header.boolean.type ?? 'check';
      if (booleanType === 'badge') {
        const isTrue = this.isTruthy(rawValue);
        booleanLabel = isTrue
          ? (header.boolean.trueLabel ?? 'Oui')
          : (header.boolean.falseLabel ?? 'Non');
        booleanBadgeClass = isTrue
          ? (header.boolean.trueBadgeClass ?? 'badge-success')
          : (header.boolean.falseBadgeClass ?? 'badge-ghost');
      }
    }

    return {
      value,
      size: header.size ?? '',
      format: header.format,
      allClasses: cssClass.trim(),
      booleanLabel,
      booleanBadgeClass,
      booleanType,
      currencyCode: header.currency?.code ?? 'BIF',
      currencyDigitsInfo: header.currency?.digitsInfo ?? '1.0-0',
    };
  }

  private extractFieldRawValue(fields: string[], row: T): unknown {
    for (const field of fields) {
      const value = this.extractNestedValue(row, field);
      if (value !== undefined && value !== null && value !== '') {
        return value;
      }
    }
    return null;
  }

  private isTruthy(value: unknown): boolean {
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'string') {
      return value.toLocaleLowerCase().trim() === 'true';
    }
    return Boolean(value);
  }

  private calculateDetailLink(row: T): string | null {
    const detailConfig = this.detailLink();
    if (!detailConfig) {
      return null;
    }

    const fieldValue = this.extractNestedValue(row, detailConfig.field);
    if (fieldValue === undefined || fieldValue === null || fieldValue === '') {
      return null;
    }

    let link = `${detailConfig.link}${String(fieldValue)}`;
    if (detailConfig.fragment) {
      link += `#${detailConfig.fragment}`;
    }
    return link;
  }

  private extractData(response: Record<string, unknown> | undefined): T[] {
    if (!response) {
      return [];
    }

    const dataKey = this.responseConfig().dataKey ?? 'objects';

    if (dataKey.includes('.')) {
      const extracted = this.extractNestedValue(response, dataKey);
      return Array.isArray(extracted) ? (extracted as T[]) : [];
    }

    if (dataKey === '') {
      return Array.isArray(response) ? (response as unknown as T[]) : [];
    }

    const extracted =
      response[dataKey] ?? response['response_data'] ?? response['objects'];
    return Array.isArray(extracted) ? (extracted as T[]) : [];
  }

  private extractCount(response: Record<string, unknown> | undefined): number {
    if (!response) {
      return 0;
    }
    const countKey = this.responseConfig().countKey ?? 'count';
    const countValue = this.extractNestedValue(response, countKey);
    return typeof countValue === 'number' ? countValue : 0;
  }

  private isValidDateValue(value: string | null): boolean {
    if (!value) {
      return false;
    }

    const normalizedValue = value.trim();
    if (!normalizedValue || /^-+$/.test(normalizedValue)) {
      return false;
    }

    return !Number.isNaN(Date.parse(normalizedValue));
  }

  private extractNestedValue(obj: unknown, path: string): unknown {
    if (!path) {
      return obj;
    }

    return path.split('.').reduce((curr: unknown, key: string) => {
      if (curr === undefined || curr === null) {
        return undefined;
      }
      if (key === 'length' && Array.isArray(curr)) {
        return curr.length;
      }
      if (Array.isArray(curr)) {
        const index = Number(key);
        if (!Number.isNaN(index)) {
          return curr[index];
        }
      }
      if (this.isObject(curr)) {
        return curr[key];
      }
      return undefined;
    }, obj);
  }

  private isObject(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  private resolveErrorMessage(error: unknown): string {
    if (error instanceof ApiError) {
      return error.message || ERROR_MESSAGE;
    }
    return ERROR_MESSAGE;
  }
}
