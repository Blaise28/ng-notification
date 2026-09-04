import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { Subject, catchError, debounceTime, distinctUntilChanged, of, switchMap } from 'rxjs';

import { HugeiconsIconComponent } from '@hugeicons/angular';
import {
  Alert02Icon,
  ArrowLeft02Icon,
  ArrowRight01Icon,
  Building01Icon,
  Cancel01Icon,
  CheckmarkCircleIcon,
  Comment01Icon,
  EyeIcon,
  FilterIcon,
  Mail01Icon,
  Megaphone02Icon,
  Message02Icon,
  Search01Icon,
  UserGroupIcon,
  UserIcon,
  WhatsappIcon,
  ZapIcon,
} from '@hugeicons/core-free-icons';

import { ApiError } from '@services/api/api-error';
import { ClientService } from '@services/clients/client.service';
import { DialogService } from '@services/dialog/dialog.service';
import { NotificationService } from '@services/notifications/notification.service';
import { TemplateService } from '@services/templates/template.service';
import { ClientModel, ClientType } from '@components/clients/client.models';
import { TemplatePreview } from '@components/templates/template-preview/template-preview';
import { TEMPLATE_PREVIEW_SAMPLE_VARS } from '@components/templates/template.utils';
import { Lookup } from '@globals/components/lookup/lookup';
import type { AutocompleteModel, LookupModel } from '@globals/components/lookup/lookup.models';
import {
  TEMPLATE_VARIABLE_LABELS,
  TEMPLATE_VARIABLE_TOKENS,
  TemplateModel,
  TemplateVariableToken,
} from '@components/templates/template.models';
import {
  ChannelContentModel,
  NotificationChannel,
  SendToClientsBodyModel,
  TemplateIdsModel,
} from '../notification.models';

type TargetMode = 'clients' | 'filter' | 'broadcast';
type ContentSource = 'template' | 'custom';
type ComposeStep = 1 | 2 | 3;

const CLIENT_SEARCH_LIMIT = 50;

@Component({
  selector: 'app-notification-compose',
  imports: [RouterLink, TemplatePreview, Lookup, HugeiconsIconComponent],
  templateUrl: './notification-compose.html',
})
export class NotificationCompose {
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly clientService = inject(ClientService);
  private readonly templateService = inject(TemplateService);
  private readonly notificationService = inject(NotificationService);
  private readonly dialogService = inject(DialogService);
  private readonly clientSearch$ = new Subject<string>();
  private readonly selectedClientsById = signal<Record<string, ClientModel>>({});

  // Hugeicons
  protected readonly Megaphone02Icon = Megaphone02Icon;
  protected readonly UserGroupIcon = UserGroupIcon;
  protected readonly FilterIcon = FilterIcon;
  protected readonly Mail01Icon = Mail01Icon;
  protected readonly Comment01Icon = Comment01Icon;
  protected readonly WhatsappIcon = WhatsappIcon;
  protected readonly Search01Icon = Search01Icon;
  protected readonly CheckmarkCircleIcon = CheckmarkCircleIcon;
  protected readonly Alert02Icon = Alert02Icon;
  protected readonly Message02Icon = Message02Icon;
  protected readonly UserIcon = UserIcon;
  protected readonly Building01Icon = Building01Icon;
  protected readonly ZapIcon = ZapIcon;
  protected readonly EyeIcon = EyeIcon;
  protected readonly ArrowRight01Icon = ArrowRight01Icon;
  protected readonly ArrowLeft02Icon = ArrowLeft02Icon;
  protected readonly Cancel01Icon = Cancel01Icon;

  // Wizard state
  protected readonly currentStep = signal<ComposeStep>(1);

  // Client search & selection state
  protected readonly clientSearchLimit = CLIENT_SEARCH_LIMIT;
  protected readonly clients = signal<ClientModel[]>([]);
  protected readonly clientsLoading = signal(false);
  protected readonly clientsLoadingMore = signal(false);
  protected readonly clientsTotal = signal(0);
  protected readonly templates = signal<TemplateModel[]>([]);

  protected readonly targetMode = signal<TargetMode>('clients');
  protected readonly clientSearch = signal('');
  protected readonly selectedClientIds = signal<string[]>([]);
  protected readonly filterType = signal<ClientType | ''>('');
  protected readonly filterOptInSmsOnly = signal(false);
  protected readonly filterOptInEmailOnly = signal(false);
  protected readonly filterOptInWhatsappOnly = signal(false);
  protected readonly broadcastConfirmed = signal(false);

  // Selected client objects computed
  protected readonly selectedClientObjects = computed(() => {
    const selectedById = this.selectedClientsById();
    return this.selectedClientIds()
      .map((id) => selectedById[id])
      .filter((client): client is ClientModel => !!client);
  });

  protected readonly displayedClients = computed(() => {
    const results = this.clients();
    const selectedIds = this.selectedClientIds();
    const selectedById = this.selectedClientsById();
    const resultIds = new Set(results.map((client) => client.id));
    const selectedOutsideResults = selectedIds
      .filter((id) => !resultIds.has(id) && selectedById[id])
      .map((id) => selectedById[id]);
    return [...selectedOutsideResults, ...results];
  });

  protected readonly hasMoreClients = computed(() => this.clients().length < this.clientsTotal());

  // AudienceReach computation (for 1000+ scalability estimation)
  protected readonly estimatedAudienceCount = computed(() => {
    if (this.targetMode() === 'clients') {
      return this.selectedClientIds().length;
    }
    if (this.targetMode() === 'filter') {
      return this.clientsTotal();
    }
    return this.clientsTotal();
  });

  protected readonly selectedClientOptInStats = computed(() => {
    const selected = this.selectedClientObjects();
    if (this.targetMode() !== 'clients' || selected.length === 0) {
      return {
        email: this.estimatedAudienceCount(),
        sms: this.estimatedAudienceCount(),
        whatsapp: this.estimatedAudienceCount(),
      };
    }
    return {
      email: selected.filter((c) => c.optInEmail && c.email).length,
      sms: selected.filter((c) => c.optInSms && c.phoneE164).length,
      whatsapp: selected.filter((c) => c.optInWhatsapp && c.phoneE164).length,
    };
  });

  // Channel & Content State
  protected readonly selectedChannels = signal<NotificationChannel[]>(['email']);
  protected readonly sendStrategy = signal<'parallel' | 'waterfall'>('parallel');
  protected readonly contentSource = signal<ContentSource>('template');
  protected readonly templateIds = signal<TemplateIdsModel>({});
  protected readonly variableLabels = TEMPLATE_VARIABLE_LABELS;

  // Active preview tab for channel
  protected readonly activePreviewChannel = signal<NotificationChannel>('email');

  protected readonly templatesByChannel = computed(() => {
    const map: Record<NotificationChannel, TemplateModel[]> = {
      email: [],
      sms: [],
      whatsapp: [],
    };
    for (const template of this.templates()) {
      map[template.channel].push(template);
    }
    return map;
  });

  protected readonly selectedTemplates = computed(() => {
    const ids = this.templateIds();
    const all = this.templates();
    return this.selectedChannels()
      .map((channel) => {
        const id = ids[channel];
        return id ? (all.find((template) => template.id === id) ?? null) : null;
      })
      .filter((template): template is TemplateModel => !!template);
  });

  protected readonly templateVariableTokens = computed(() => {
    const tokens = new Set<string>();
    for (const template of this.selectedTemplates()) {
      for (const token of template.variables ?? []) {
        tokens.add(token);
      }
      if (template.channel === 'whatsapp') {
        for (const token of template.whatsappVariableKeys ?? []) {
          tokens.add(token);
        }
      }
    }
    return Array.from(tokens);
  });

  protected readonly customVariableTokens = computed(() =>
    this.templateVariableTokens().filter(
      (token) => !(TEMPLATE_VARIABLE_TOKENS as readonly string[]).includes(token),
    ),
  );

  protected readonly variables = signal<Record<string, string>>({});

  protected readonly emailSubject = signal('');
  protected readonly emailHtml = signal('');
  protected readonly emailText = signal('');
  protected readonly smsBody = signal('');
  protected readonly whatsappTemplateName = signal('');
  protected readonly whatsappTemplateLanguage = signal('fr_FR');

  protected readonly previewVariables = computed(() => {
    const vars: Record<string, string> = { ...TEMPLATE_PREVIEW_SAMPLE_VARS };
    const selected = this.selectedClientObjects();
    if (selected.length > 0) {
      Object.assign(vars, this.clientVariables(selected[0]));
    }
    for (const [key, value] of Object.entries(this.variables())) {
      if (value.trim()) {
        vars[key] = value;
      }
    }
    return vars;
  });

  // Modal / Confirm state
  protected readonly showConfirmModal = signal(false);
  protected readonly submitLoading = signal(false);

  constructor() {
    this.clientSearch$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((term) => {
          this.clientsLoading.set(true);
          const search = term.trim();
          return this.clientService
            .list({
              limit: CLIENT_SEARCH_LIMIT,
              ...(search ? { search } : {}),
            })
            .pipe(catchError(() => of({ objects: [] as ClientModel[], count: 0 })));
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((response) => {
        this.clients.set(response.objects);
        this.clientsTotal.set(response.count);
        this.clientsLoading.set(false);
      });

    this.clientSearch$.next('');

    this.templateService
      .list({ limit: 100 })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => this.templates.set(response.objects),
        error: () => undefined,
      });
  }

  setStep(step: ComposeStep): void {
    if (step > this.currentStep()) {
      const error = this.validateStep(this.currentStep());
      if (error) {
        this.dialogService.showToast({ type: 'error', message: error });
        return;
      }
    }
    this.currentStep.set(step);
  }

  nextStep(): void {
    const next = (this.currentStep() + 1) as ComposeStep;
    if (next <= 3) {
      this.setStep(next);
    }
  }

  prevStep(): void {
    const prev = (this.currentStep() - 1) as ComposeStep;
    if (prev >= 1) {
      this.currentStep.set(prev);
    }
  }

  onClientSearch(value: string): void {
    this.clientSearch.set(value);
    this.clientSearch$.next(value);
  }

  loadMoreClients(): void {
    if (this.clientsLoadingMore() || !this.hasMoreClients()) {
      return;
    }
    this.clientsLoadingMore.set(true);
    const search = this.clientSearch().trim();
    this.clientService
      .list({
        limit: CLIENT_SEARCH_LIMIT,
        offset: this.clients().length,
        ...(search ? { search } : {}),
      })
      .pipe(
        catchError(() => of({ objects: [] as ClientModel[], count: this.clientsTotal() })),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((response) => {
        this.clients.update((current) => [...current, ...response.objects]);
        this.clientsTotal.set(response.count);
        this.clientsLoadingMore.set(false);
      });
  }

  selectAllDisplayed(): void {
    const selectedIds = new Set(this.selectedClientIds());
    const toAdd = this.clients().filter((client) => !selectedIds.has(client.id));
    if (toAdd.length === 0) {
      return;
    }
    this.selectedClientIds.update((ids) => [...ids, ...toAdd.map((client) => client.id)]);
    this.selectedClientsById.update((current) => {
      const next = { ...current };
      for (const client of toAdd) {
        next[client.id] = client;
      }
      return next;
    });
  }

  clearSelectedClients(): void {
    this.selectedClientIds.set([]);
    this.selectedClientsById.set({});
  }

  toggleClient(client: ClientModel): void {
    const isSelected = this.selectedClientIds().includes(client.id);
    this.selectedClientIds.update((ids) =>
      isSelected ? ids.filter((id) => id !== client.id) : [...ids, client.id],
    );
    this.selectedClientsById.update((current) => {
      if (isSelected) {
        const rest = { ...current };
        delete rest[client.id];
        return rest;
      }
      return { ...current, [client.id]: client };
    });
  }

  toggleChannel(channel: NotificationChannel): void {
    const isRemoving = this.selectedChannels().includes(channel);
    const nextChannels = isRemoving
      ? this.selectedChannels().filter((c) => c !== channel)
      : [...this.selectedChannels(), channel];

    if (nextChannels.length === 0) {
      this.dialogService.showToast({ type: 'warning', message: 'Au moins un canal est requis.' });
      return;
    }

    this.selectedChannels.set(nextChannels);

    if (!isRemoving) {
      this.activePreviewChannel.set(channel);
      const defaultTemplate = this.templatesByChannel()[channel].find((t) => t.isDefault);
      if (defaultTemplate) {
        this.templateIds.update((current) => ({
          ...current,
          [channel]: defaultTemplate.id,
        }));
      }
    } else {
      this.templateIds.update((current) => {
        const next: TemplateIdsModel = { ...current };
        delete next[channel];
        return next;
      });
      if (this.activePreviewChannel() === channel && nextChannels.length > 0) {
        this.activePreviewChannel.set(nextChannels[0]);
      }
    }
  }

  setTemplateForChannel(channel: NotificationChannel, templateId: string): void {
    this.templateIds.update((current) => ({
      ...current,
      [channel]: templateId || undefined,
    }));
  }

  setVariable(token: string, value: string): void {
    this.variables.update((current) => ({ ...current, [token]: value }));
  }

  labelFor(token: string): string {
    return this.variableLabels[token as TemplateVariableToken] ?? token;
  }

  openConfirmModal(): void {
    const error = this.validate();
    if (error) {
      this.dialogService.showToast({ type: 'error', message: error });
      return;
    }
    this.showConfirmModal.set(true);
  }

  closeConfirmModal(): void {
    this.showConfirmModal.set(false);
  }

  private clientVariables(client: ClientModel): Record<string, string> {
    return {
      displayName: client.displayName,
      firstName: client.firstName ?? '',
      lastName: client.lastName ?? '',
      companyName: client.companyName ?? '',
      phone: client.phoneE164,
      email: client.email ?? '',
    };
  }

  submit(): void {
    const validationError = this.validate();
    if (validationError) {
      this.dialogService.showToast({ type: 'error', message: validationError });
      return;
    }

    this.submitLoading.set(true);

    const body = this.buildBody();
    this.notificationService
      .send(body)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: async (response) => {
          this.submitLoading.set(false);
          this.showConfirmModal.set(false);
          this.dialogService.showToast({
            type: 'success',
            message: 'Campagne de notification lancée avec succès en arrière-plan !',
          });
          await this.router.navigate(['/notifications', response.object.id]);
        },
        error: (err: unknown) => {
          this.submitLoading.set(false);
          this.dialogService.showToast({
            type: 'error',
            message:
              err instanceof ApiError ? err.message : 'Une erreur est survenue lors de l’envoi.',
          });
        },
      });
  }

  private validateStep(step: ComposeStep): string | null {
    if (step === 1) {
      if (this.targetMode() === 'clients' && this.selectedClientIds().length === 0) {
        return 'Veuillez sélectionner au moins un client destinataire.';
      }
      if (this.targetMode() === 'filter' && !this.filterType()) {
        return 'Veuillez sélectionner un type de client pour le filtre.';
      }
      if (this.targetMode() === 'broadcast' && !this.broadcastConfirmed()) {
        return 'Veuillez confirmer la diffusion globale à tous les clients.';
      }
    }
    if (step === 2) {
      if (this.selectedChannels().length === 0) {
        return 'Sélectionnez au moins un canal de diffusion.';
      }
      if (this.contentSource() === 'template') {
        for (const channel of this.selectedChannels()) {
          if (!this.templateIds()[channel]) {
            return `Veuillez sélectionner un modèle pour le canal ${channel.toUpperCase()}.`;
          }
        }
      }
      if (this.contentSource() === 'custom') {
        if (
          this.selectedChannels().includes('email') &&
          (!this.emailSubject().trim() || !this.emailHtml().trim())
        ) {
          return "Le sujet et le contenu HTML de l'e-mail sont obligatoires.";
        }
        if (this.selectedChannels().includes('sms') && !this.smsBody().trim()) {
          return 'Le contenu du message SMS est obligatoire.';
        }
        if (this.selectedChannels().includes('whatsapp') && !this.whatsappTemplateName().trim()) {
          return 'Le nom du modèle Meta WhatsApp est obligatoire.';
        }
      }
    }
    return null;
  }

  private validate(): string | null {
    return this.validateStep(1) || this.validateStep(2);
  }

  private buildContent(): ChannelContentModel {
    const content: ChannelContentModel = {};
    if (this.selectedChannels().includes('email')) {
      content.email = {
        subject: this.emailSubject().trim(),
        html: this.emailHtml().trim(),
        text: this.emailText().trim() || undefined,
      };
    }
    if (this.selectedChannels().includes('sms')) {
      content.sms = { body: this.smsBody().trim() };
    }
    if (this.selectedChannels().includes('whatsapp')) {
      content.whatsapp = {
        templateName: this.whatsappTemplateName().trim(),
        language: this.whatsappTemplateLanguage().trim() || undefined,
        variables: this.buildUsedVariables(),
      };
    }
    return content;
  }

  private buildUsedVariables(): Record<string, string> {
    return Object.fromEntries(
      Object.entries(this.variables()).filter(
        ([key, value]) => this.templateVariableTokens().includes(key) && value.trim() !== '',
      ),
    );
  }

  private buildBody(): SendToClientsBodyModel {
    const usedVariables = this.buildUsedVariables();

    return {
      channels: this.selectedChannels(),
      strategy: this.sendStrategy(),
      clientIds: this.targetMode() === 'clients' ? this.selectedClientIds() : undefined,
      filter: this.targetMode() === 'filter' ? { type: this.filterType() || undefined } : undefined,
      broadcastAll: this.targetMode() === 'broadcast' ? true : undefined,
      templateIds:
        this.contentSource() === 'template'
          ? Object.fromEntries(
              this.selectedChannels().map((channel) => [channel, this.templateIds()[channel]!]),
            )
          : undefined,
      variables: Object.keys(usedVariables).length > 0 ? usedVariables : undefined,
      content: this.contentSource() === 'custom' ? this.buildContent() : undefined,
    };
  }

  protected readonly clientAutocompleteUrl = '/api/v1/clients/autocomplete?search=';

  protected getTemplateAutocompleteUrl(channel: NotificationChannel): string {
    return `/api/v1/templates/autocomplete?channel=${channel}&search=`;
  }

  protected removeClient(clientId: string): void {
    this.selectedClientIds.update((ids) => ids.filter((id) => id !== clientId));
  }

  protected onClientAutocompleteSelected(item: AutocompleteModel | LookupModel | null): void {
    if (!item) return;
    const clientId = String(item.id);
    if (!this.selectedClientIds().includes(clientId)) {
      this.clientService.getById(clientId).subscribe({
        next: (res) => {
          this.selectedClientsById.update((curr) => ({
            ...curr,
            [res.object.id]: res.object,
          }));
          this.selectedClientIds.update((ids) => [...ids, clientId]);
        },
        error: () => {
          const [firstName = '', lastName = ''] = (item.lookup_title || '').split(' ');
          const placeholder: ClientModel = {
            id: clientId,
            type: 'individual',
            firstName,
            lastName,
            companyName: null,
            taxId: null,
            contactPersonName: null,
            phoneE164: item.lookup_subtitle || '',
            email: null,
            locale: 'fr',
            optInSms: true,
            optInWhatsapp: true,
            optInEmail: true,
            isActive: true,
            subscriptionEndAt: null,
            metadata: {},
            displayName: item.lookup_title,
            createdAt: '',
            updatedAt: '',
          };
          this.selectedClientsById.update((curr) => ({
            ...curr,
            [clientId]: placeholder,
          }));
          this.selectedClientIds.update((ids) => [...ids, clientId]);
        },
      });
    }
  }

  protected onTemplateAutocompleteSelected(
    channel: NotificationChannel,
    item: AutocompleteModel | LookupModel | null,
  ): void {
    if (item) {
      this.setTemplateForChannel(channel, String(item.id));
    } else {
      this.setTemplateForChannel(channel, '');
    }
  }
}
