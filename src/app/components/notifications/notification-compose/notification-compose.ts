import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { Subject, catchError, debounceTime, distinctUntilChanged, of, switchMap } from 'rxjs';

import { ApiError } from '@services/api/api-error';
import { ClientService } from '@services/clients/client.service';
import { DialogService } from '@services/dialog/dialog.service';
import { NotificationService } from '@services/notifications/notification.service';
import { TemplateService } from '@services/templates/template.service';
import { ClientModel, ClientType } from '@components/clients/client.models';
import { TemplatePreview } from '@components/templates/template-preview/template-preview';
import { TEMPLATE_PREVIEW_SAMPLE_VARS } from '@components/templates/template.utils';
import {
  TEMPLATE_VARIABLE_LABELS,
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

const CLIENT_SEARCH_LIMIT = 50;

@Component({
  selector: 'app-notification-compose',
  imports: [RouterLink, TemplatePreview],
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

  protected readonly clients = signal<ClientModel[]>([]);
  protected readonly clientsLoading = signal(false);
  protected readonly templates = signal<TemplateModel[]>([]);

  protected readonly targetMode = signal<TargetMode>('clients');
  protected readonly clientSearch = signal('');
  protected readonly selectedClientIds = signal<string[]>([]);
  protected readonly filterType = signal<ClientType | ''>('');
  protected readonly broadcastConfirmed = signal(false);

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

  protected readonly selectedChannels = signal<NotificationChannel[]>([]);
  protected readonly contentSource = signal<ContentSource>('template');
  protected readonly templateIds = signal<TemplateIdsModel>({});
  protected readonly variableLabels = TEMPLATE_VARIABLE_LABELS;

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

  protected readonly variables = signal<Record<string, string>>({});

  protected readonly emailSubject = signal('');
  protected readonly emailHtml = signal('');
  protected readonly emailText = signal('');
  protected readonly smsBody = signal('');
  protected readonly whatsappTemplateName = signal('');
  protected readonly whatsappTemplateLanguage = signal('fr_FR');

  protected readonly previewVariables = computed(() => {
    const vars: Record<string, string> = { ...TEMPLATE_PREVIEW_SAMPLE_VARS };
    for (const [key, value] of Object.entries(this.variables())) {
      if (value.trim()) {
        vars[key] = value;
      }
    }
    return vars;
  });

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

  onClientSearch(value: string): void {
    this.clientSearch.set(value);
    this.clientSearch$.next(value);
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
    this.prefillVariablesFromClients();
  }

  toggleChannel(channel: NotificationChannel): void {
    const isRemoving = this.selectedChannels().includes(channel);
    const nextChannels = isRemoving
      ? this.selectedChannels().filter((c) => c !== channel)
      : [...this.selectedChannels(), channel];
    this.selectedChannels.set(nextChannels);

    if (!isRemoving) {
      const defaultTemplate = this.templatesByChannel()[channel].find((t) => t.isDefault);
      if (defaultTemplate) {
        this.templateIds.update((current) => ({
          ...current,
          [channel]: defaultTemplate.id,
        }));
        this.prefillVariablesFromClients();
      }
    } else {
      this.templateIds.update((current) => {
        const next: TemplateIdsModel = { ...current };
        delete next[channel];
        return next;
      });
    }
  }

  setTemplateForChannel(channel: NotificationChannel, templateId: string): void {
    this.templateIds.update((current) => ({
      ...current,
      [channel]: templateId || undefined,
    }));
    this.prefillVariablesFromClients();
  }

  setVariable(token: string, value: string): void {
    this.variables.update((current) => ({ ...current, [token]: value }));
  }

  labelFor(token: string): string {
    return this.variableLabels[token as TemplateVariableToken] ?? token;
  }

  private prefillVariablesFromClients(): void {
    const tokens = this.templateVariableTokens();
    if (tokens.length === 0) {
      return;
    }
    const selectedIds = this.selectedClientIds();
    if (selectedIds.length !== 1) {
      return;
    }
    const client = this.selectedClientsById()[selectedIds[0]];
    if (!client) {
      return;
    }
    const fromClient: Record<string, string> = {
      displayName: client.displayName,
      firstName: client.firstName ?? '',
      lastName: client.lastName ?? '',
      companyName: client.companyName ?? '',
      phone: client.phoneE164,
      email: client.email ?? '',
    };
    this.variables.update((current) => {
      const next = { ...current };
      for (const token of tokens) {
        if (!next[token]) {
          next[token] = fromClient[token] ?? '';
        }
      }
      return next;
    });
  }

  submit(event: SubmitEvent): void {
    event.preventDefault();

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
          await this.router.navigate(['/notifications', response.object.id]);
        },
        error: (err: unknown) => {
          this.submitLoading.set(false);
          this.dialogService.showToast({
            type: 'error',
            message: err instanceof ApiError ? err.message : 'Une erreur est survenue.',
          });
        },
      });
  }

  private validate(): string | null {
    if (this.selectedChannels().length === 0) {
      return 'Sélectionnez au moins un canal.';
    }
    if (this.targetMode() === 'clients' && this.selectedClientIds().length === 0) {
      return 'Sélectionnez au moins un client.';
    }
    if (this.targetMode() === 'filter' && !this.filterType()) {
      return 'Sélectionnez un type de client pour le filtre.';
    }
    if (this.targetMode() === 'broadcast' && !this.broadcastConfirmed()) {
      return 'Confirmez la diffusion à tous les clients.';
    }
    if (this.contentSource() === 'template') {
      for (const channel of this.selectedChannels()) {
        if (!this.templateIds()[channel]) {
          return `Sélectionnez un modèle pour le canal ${channel}.`;
        }
      }
    }
    if (this.contentSource() === 'custom') {
      if (
        this.selectedChannels().includes('email') &&
        (!this.emailSubject().trim() || !this.emailHtml().trim())
      ) {
        return "Le sujet et le contenu HTML de l'e-mail sont requis.";
      }
      if (this.selectedChannels().includes('sms') && !this.smsBody().trim()) {
        return 'Le contenu du SMS est requis.';
      }
      if (this.selectedChannels().includes('whatsapp') && !this.whatsappTemplateName().trim()) {
        return 'Le nom du modèle WhatsApp Meta est requis.';
      }
    }
    return null;
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
}
