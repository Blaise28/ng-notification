import {
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  OnInit,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { HugeiconsIconComponent } from '@hugeicons/angular';
import { CancelCircleIcon, Image01Icon, Search01Icon } from '@hugeicons/core-free-icons';

import { ERROR_MESSAGE } from '@globals/constants';
import { Api } from '@services/api/api';
import { DialogService } from '@services/dialog/dialog.service';
import type { AutocompleteModel, LookupModel } from './lookup.models';
import { extractLookupCount, extractLookupItems } from './lookup.models';

export type LookupOption = 'lookup' | 'autocomplete';

const SCROLL_LOAD_THRESHOLD_PX = 48;

@Component({
  selector: 'app-lookup',
  imports: [HugeiconsIconComponent],
  templateUrl: './lookup.html',
  styleUrl: './lookup.scss',
  host: {
    class: 'block w-full',
    '(document:click)': 'onDocumentClick($event)',
  },
})
export class Lookup implements OnInit {
  private readonly api = inject(Api);
  private readonly dialogService = inject(DialogService);

  readonly url = input.required<string>();
  readonly label = input.required<string>();
  readonly option = input.required<LookupOption>();
  readonly selectedId = input<string | number | null>(null);
  readonly showProfile = input(true);
  readonly lookupDefaultSearch = input('');
  readonly radiusClass = input('rounded-box');
  readonly enableLeftBorder = input(false);
  readonly isRequired = input(false);
  readonly pageSize = input(20);
  readonly minSearchLength = input(0);
  // NOUVEAU : quand un selectedId est fourni et que l'item correspondant a été
  // trouvé, la valeur reste verrouillée (non modifiable/déselectionnable) par défaut.
  readonly lockValueWhenFound = input(true);

  readonly selectedItemEvent = output<LookupModel | AutocompleteModel | null>();

  protected readonly Search01Icon = Search01Icon;
  protected readonly CancelCircleIcon = CancelCircleIcon;
  protected readonly Image01Icon = Image01Icon;

  protected readonly lookupContainer =
    viewChild.required<ElementRef<HTMLElement>>('lookupContainer');
  protected readonly autocompleteDropdown =
    viewChild<ElementRef<HTMLElement>>('autocompleteDropdown');
  protected readonly autocompleteInput =
    viewChild<ElementRef<HTMLInputElement>>('autocompleteInput');

  protected readonly selectedItem = signal<LookupModel | AutocompleteModel | null>(null);
  protected readonly lookupTerm = signal('');
  protected readonly searchTerm = signal('');
  protected readonly debouncedSearch = signal('');
  protected readonly showAutoComplete = signal(false);
  protected readonly activeOptionIndex = signal(-1);

  private readonly lookupSearchTerm = signal<string | undefined>(undefined);
  private readonly lookupSearchGeneration = signal(0);
  private readonly lookupHandledGeneration = signal(-1);

  private readonly autocompletePage = signal(0);
  private readonly autocompleteAllItems = signal<AutocompleteModel[]>([]);
  private readonly autocompleteTotalCount = signal(0);

  // NOUVEAU : mémorise le selectedId déjà demandé en mode lookup, pour éviter
  // de relancer la requête en boucle une fois qu'elle a été envoyée.
  private readonly lookupSelectedIdRequestedFor = signal<string | number | null>(null);

  protected readonly lookupResource = this.api.getResource<Record<string, unknown>>(() => {
    if (this.option() !== 'lookup') {
      return undefined;
    }
    const term = this.lookupSearchTerm();
    if (!term) {
      return undefined;
    }
    this.lookupSearchGeneration();
    return `${this.url()}${term}`;
  });

  // NOUVEAU : indique qu'une résolution est nécessaire pour retrouver l'item
  // correspondant à selectedId, même si l'utilisateur n'a pas encore donné le
  // focus au champ (donc showAutoComplete() encore à false).
  private readonly pendingSelectedIdResolution = computed(
    () =>
      this.option() === 'autocomplete' && this.selectedId() != null && this.selectedItem() == null,
  );

  protected readonly autocompleteResource = this.api.getResource<Record<string, unknown>>(() => {
    if (this.option() !== 'autocomplete') {
      return undefined;
    }
    // Se déclenche soit à l'ouverture normale du dropdown, soit automatiquement
    // quand un selectedId doit être résolu (sans attendre le focus).
    if (!this.showAutoComplete() && !this.pendingSelectedIdResolution()) {
      return undefined;
    }
    const term = this.debouncedSearch();
    if (term.length < this.minSearchLength() && !this.pendingSelectedIdResolution()) {
      return undefined;
    }
    const page = this.autocompletePage();
    const offset = page * this.pageSize();
    const base = `${this.url()}${term}`;
    const separator = base.includes('?') ? '&' : '?';
    return `${base}${separator}offset=${offset}&limit=${this.pageSize()}`;
  });

  protected readonly loadingLookup = computed(() => this.lookupResource.isLoading());

  protected readonly isLoading = computed(
    () => this.autocompleteResource.isLoading() && this.autocompletePage() === 0,
  );

  protected readonly loadingMore = computed(
    () => this.autocompleteResource.isLoading() && this.autocompletePage() > 0,
  );

  protected readonly autocompleteItems = this.autocompleteAllItems.asReadonly();

  protected readonly hasMoreAutocomplete = computed(
    () => this.autocompleteAllItems().length < this.autocompleteTotalCount(),
  );

  protected readonly autocompleteError = computed(() => {
    if (!this.autocompleteResource.error()) {
      return null;
    }
    return this.extractErrorMessage(this.autocompleteResource.error());
  });

  protected readonly showMinLengthHint = computed(
    () =>
      this.showAutoComplete() &&
      this.debouncedSearch().length < this.minSearchLength() &&
      this.minSearchLength() > 0,
  );

  // NOUVEAU : true quand la valeur doit être figée (selectedId fourni, item
  // trouvé et verrouillage activé). À utiliser dans le template pour désactiver
  // l'input et/ou masquer le bouton d'annulation.
  protected readonly isValueLocked = computed(
    () => this.selectedId() != null && this.selectedItem() != null && this.lockValueWhenFound(),
  );

  protected readonly selectedCardClass = computed(() => {
    const radius = this.radiusClass();
    const border = this.enableLeftBorder() ? 'border-s-4 border-s-primary ps-2' : '';
    return `flex items-center justify-between gap-2 border border-base-300 bg-base-100 p-2 w-full ${radius} ${border}`;
  });

  constructor() {
    effect((onCleanup) => {
      const term = this.searchTerm();
      const timer = setTimeout(() => {
        const previous = untracked(() => this.debouncedSearch());
        this.debouncedSearch.set(term);
        if (term !== previous) {
          this.resetAutocompletePagination();
        }
      }, 400);
      onCleanup(() => clearTimeout(timer));
    });

    effect(() => {
      if (this.option() !== 'lookup' || this.lookupResource.isLoading()) {
        return;
      }
      if (!this.lookupSearchTerm()) {
        return;
      }
      const generation = this.lookupSearchGeneration();
      if (generation === this.lookupHandledGeneration()) {
        return;
      }

      if (this.lookupResource.error()) {
        this.lookupHandledGeneration.set(generation);
        this.onLookupError(this.lookupResource.error());
        return;
      }
      if (!this.lookupResource.hasValue()) {
        return;
      }

      this.lookupHandledGeneration.set(generation);
      const items = extractLookupItems(this.lookupResource.value()) as LookupModel[];
      const first = items[0];
      if (first) {
        this.setSelectedItem(first);
      } else {
        this.dialogService.showToast({
          type: 'error',
          message: 'Aucun résultat trouvé',
        });
      }
    });

    effect(() => {
      if (this.option() !== 'autocomplete' || !this.autocompleteResource.hasValue()) {
        return;
      }
      if (this.autocompleteResource.isLoading()) {
        return;
      }

      const response = this.autocompleteResource.value();
      const items = extractLookupItems(response) as AutocompleteModel[];
      const count = extractLookupCount(response);
      const page = untracked(() => this.autocompletePage());

      if (page === 0) {
        this.autocompleteAllItems.set(items);
      } else {
        this.autocompleteAllItems.update((current) => this.mergeItems(current, items));
      }
      this.autocompleteTotalCount.set(count);
      this.activeOptionIndex.set(-1);
    });

    effect(() => {
      if (this.option() !== 'autocomplete' || !this.autocompleteResource.hasValue()) {
        return;
      }

      const selectedId = this.selectedId();
      if (selectedId == null) {
        return;
      }

      const found = this.autocompleteAllItems().find((item) => item.id === selectedId);
      if (found && !this.selectedItem()) {
        this.setSelectedItem(found);
      }
    });

    // NOUVEAU : en mode lookup, si un selectedId est fourni et qu'aucun item
    // n'est encore sélectionné, on lance automatiquement la recherche avec
    // l'id comme terme — sans attendre une saisie ou un Enter de l'utilisateur.
    effect(() => {
      if (this.option() !== 'lookup') {
        return;
      }

      const selectedId = this.selectedId();
      if (selectedId == null || this.selectedItem() != null) {
        return;
      }

      const alreadyRequested = untracked(() => this.lookupSelectedIdRequestedFor()) === selectedId;
      if (alreadyRequested) {
        return;
      }

      this.lookupSelectedIdRequestedFor.set(selectedId);
      this.lookupTerm.set(String(selectedId));
      this.doLookup();
    });
  }

  ngOnInit(): void {
    if (this.option() === 'lookup' && this.lookupDefaultSearch()) {
      this.lookupTerm.set(this.lookupDefaultSearch());
      this.doLookup();
    }
  }

  protected onLookupInput(event: Event): void {
    this.lookupTerm.set((event.target as HTMLInputElement).value);
  }

  protected onSearchInput(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }

  protected onAutocompleteKeydown(event: KeyboardEvent): void {
    const items = this.autocompleteItems();
    if (!this.showAutoComplete() || items.length === 0) {
      if (event.key === 'Escape') {
        this.closeAutocompleteDropdown();
      }
      return;
    }

    switch (event.key) {
      case 'ArrowDown': {
        event.preventDefault();
        const next = Math.min(this.activeOptionIndex() + 1, items.length - 1);
        this.activeOptionIndex.set(next);
        this.scrollActiveOptionIntoView();
        break;
      }
      case 'ArrowUp': {
        event.preventDefault();
        const prev = Math.max(this.activeOptionIndex() - 1, 0);
        this.activeOptionIndex.set(prev);
        this.scrollActiveOptionIntoView();
        break;
      }
      case 'Enter': {
        const index = this.activeOptionIndex();
        if (index >= 0 && index < items.length) {
          event.preventDefault();
          this.setSelectedItem(items[index]);
        }
        break;
      }
      case 'Escape':
        event.preventDefault();
        this.closeAutocompleteDropdown();
        break;
    }
  }

  protected onLookupKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.doLookup();
    }
  }

  protected onDropdownScroll(event: Event): void {
    const el = event.target as HTMLElement;
    const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - SCROLL_LOAD_THRESHOLD_PX;
    if (nearBottom) {
      this.loadMoreAutocomplete();
    }
  }

  protected doLookup(): void {
    const term = this.lookupTerm().trim();
    if (!term) {
      return;
    }
    this.lookupSearchTerm.set(term);
    this.lookupSearchGeneration.update((n) => n + 1);
  }

  protected loadMoreAutocomplete(): void {
    if (
      !this.showAutoComplete() ||
      !this.hasMoreAutocomplete() ||
      this.autocompleteResource.isLoading()
    ) {
      return;
    }
    this.autocompletePage.update((page) => page + 1);
  }

  protected isActiveOption(index: number): boolean {
    return this.activeOptionIndex() === index;
  }

  protected setSelectedItem(item: LookupModel | AutocompleteModel): void {
    this.selectedItem.set(item);
    this.selectedItemEvent.emit(item);
    this.showAutoComplete.set(false);
    this.activeOptionIndex.set(-1);
  }

  protected deselect(): void {
    // NOUVEAU : on empêche la déselection si la valeur doit rester verrouillée.
    if (this.isValueLocked()) {
      return;
    }
    this.selectedItem.set(null);
    this.lookupTerm.set('');
    this.searchTerm.set('');
    this.debouncedSearch.set('');
    this.resetAutocompletePagination();
    this.showAutoComplete.set(this.option() === 'autocomplete');
    this.selectedItemEvent.emit(null);
  }

  protected onDocumentClick(event: MouseEvent): void {
    const container = this.lookupContainer().nativeElement;
    if (!container.contains(event.target as Node)) {
      this.closeAutocompleteDropdown();
    }
  }

  protected closeAutocompleteDropdown(): void {
    this.showAutoComplete.set(false);
    this.activeOptionIndex.set(-1);
  }

  protected showAutocompleteDropdown(): void {
    // NOUVEAU : si la valeur est verrouillée, on n'ouvre pas le dropdown.
    if (this.isValueLocked()) {
      return;
    }
    this.showAutoComplete.set(true);
    if (
      this.debouncedSearch().length >= this.minSearchLength() &&
      this.autocompleteAllItems().length === 0 &&
      !this.autocompleteResource.isLoading()
    ) {
      this.autocompletePage.set(0);
    }
  }

  protected trackItem(item: LookupModel | AutocompleteModel): string | number {
    return item.id;
  }

  private resetAutocompletePagination(): void {
    this.autocompletePage.set(0);
    this.autocompleteAllItems.set([]);
    this.autocompleteTotalCount.set(0);
    this.activeOptionIndex.set(-1);
  }

  private mergeItems(
    current: AutocompleteModel[],
    incoming: AutocompleteModel[],
  ): AutocompleteModel[] {
    const seen = new Set(current.map((item) => item.id));
    const merged = [...current];
    for (const item of incoming) {
      if (!seen.has(item.id)) {
        merged.push(item);
        seen.add(item.id);
      }
    }
    return merged;
  }

  private scrollActiveOptionIntoView(): void {
    const index = this.activeOptionIndex();
    if (index < 0) {
      return;
    }
    queueMicrotask(() => {
      const dropdown = this.autocompleteDropdown()?.nativeElement;
      const option = dropdown?.querySelector(`[data-option-index="${index}"]`);
      option?.scrollIntoView({ block: 'nearest' });
    });
  }

  private onLookupError(error: unknown): void {
    this.dialogService.showToast({
      type: 'error',
      message: this.extractErrorMessage(error),
    });
  }

  private extractErrorMessage(error: unknown): string {
    const payload =
      error && typeof error === 'object' && 'error' in error && (error as { error: unknown }).error;
    const message =
      payload &&
      typeof payload === 'object' &&
      payload !== null &&
      'object' in payload &&
      (payload as { object: { response_message?: string } }).object?.response_message;

    return typeof message === 'string' ? message : ERROR_MESSAGE;
  }
}
