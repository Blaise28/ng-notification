import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';

import { ApiError } from '@services/api/api-error';
import { ClientService } from '@services/clients/client.service';
import { NotificationService } from '@services/notifications/notification.service';
import { OrganizationService } from '@services/organizations/organization.service';
import { TemplateService } from '@services/templates/template.service';
import { ClientModel, ClientType } from '@components/clients/client.models';
import { OrganizationModel } from '@components/organizations/organization.models';
import { TemplateModel } from '@components/templates/template.models';
import {
  ChannelContentModel,
  NotificationChannel,
  SendToClientsBodyModel,
} from '../notification.models';

type TargetMode = 'clients' | 'filter' | 'broadcast';
type ContentSource = 'template' | 'custom';

@Component({
  selector: 'app-notification-compose',
  imports: [RouterLink],
  templateUrl: './notification-compose.html',
})
export class NotificationCompose {
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly clientService = inject(ClientService);
  private readonly organizationService = inject(OrganizationService);
  private readonly templateService = inject(TemplateService);
  private readonly notificationService = inject(NotificationService);

  protected readonly clients = signal<ClientModel[]>([]);
  protected readonly organizations = signal<OrganizationModel[]>([]);
  protected readonly templates = signal<TemplateModel[]>([]);

  protected readonly targetMode = signal<TargetMode>('clients');
  protected readonly clientSearch = signal('');
  protected readonly selectedClientIds = signal<string[]>([]);
  protected readonly filterType = signal<ClientType | ''>('');
  protected readonly broadcastConfirmed = signal(false);

  protected readonly filteredClients = computed(() => {
    const search = this.clientSearch().trim().toLowerCase();
    if (!search) {
      return this.clients();
    }
    return this.clients().filter((client) => client.displayName.toLowerCase().includes(search));
  });

  protected readonly selectedChannels = signal<NotificationChannel[]>([]);
  protected readonly contentSource = signal<ContentSource>('template');
  protected readonly organizationId = signal('');
  protected readonly templateId = signal('');

  protected readonly filteredTemplates = computed(() => {
    const organizationId = this.organizationId();
    return this.templates().filter(
      (template) => !organizationId || template.organizationId === organizationId,
    );
  });

  protected readonly selectedTemplate = computed(
    () => this.templates().find((template) => template.id === this.templateId()) ?? null,
  );

  protected readonly templateVariableTokens = computed(() => {
    const template = this.selectedTemplate();
    if (!template) {
      return [];
    }
    const source = [template.subject, template.htmlBody, template.textBody, template.smsBody]
      .filter((value): value is string => !!value)
      .join(' ');
    const tokens = new Set<string>();
    for (const match of source.matchAll(/\{\{\s*(\w+)\s*\}\}/g)) {
      tokens.add(match[1]);
    }
    return Array.from(tokens);
  });

  protected readonly variables = signal<Record<string, string>>({});

  protected readonly emailSubject = signal('');
  protected readonly emailHtml = signal('');
  protected readonly emailText = signal('');
  protected readonly smsBody = signal('');
  protected readonly whatsappContentSid = signal('');

  protected readonly submitLoading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  constructor() {
    this.clientService
      .list({ limit: 200 })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => this.clients.set(response.object.items),
        error: () => undefined,
      });

    this.organizationService
      .list()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => this.organizations.set(response.object.items),
        error: () => undefined,
      });

    this.templateService
      .list()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => this.templates.set(response.object.items),
        error: () => undefined,
      });
  }

  toggleClient(clientId: string): void {
    this.selectedClientIds.update((ids) =>
      ids.includes(clientId) ? ids.filter((id) => id !== clientId) : [...ids, clientId],
    );
  }

  toggleChannel(channel: NotificationChannel): void {
    this.selectedChannels.update((channels) =>
      channels.includes(channel) ? channels.filter((c) => c !== channel) : [...channels, channel],
    );
  }

  setVariable(token: string, value: string): void {
    this.variables.update((current) => ({ ...current, [token]: value }));
  }

  submit(event: SubmitEvent): void {
    event.preventDefault();

    const validationError = this.validate();
    if (validationError) {
      this.errorMessage.set(validationError);
      return;
    }

    this.errorMessage.set(null);
    this.submitLoading.set(true);

    const body = this.buildBody();
    this.notificationService
      .send(body)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: async (response) => {
          this.submitLoading.set(false);
          await this.router.navigate(['/notifications', response.object.notification.id]);
        },
        error: (err: unknown) => {
          this.submitLoading.set(false);
          this.errorMessage.set(err instanceof ApiError ? err.message : 'Une erreur est survenue.');
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
    if (this.contentSource() === 'template' && !this.templateId()) {
      return 'Sélectionnez un modèle.';
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
      if (this.selectedChannels().includes('whatsapp') && !this.whatsappContentSid().trim()) {
        return 'Le SID du modèle WhatsApp est requis.';
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
      content.whatsapp = { contentSid: this.whatsappContentSid().trim() };
    }
    return content;
  }

  private buildBody(): SendToClientsBodyModel {
    return {
      channels: this.selectedChannels(),
      clientIds: this.targetMode() === 'clients' ? this.selectedClientIds() : undefined,
      filter: this.targetMode() === 'filter' ? { type: this.filterType() || undefined } : undefined,
      broadcastAll: this.targetMode() === 'broadcast' ? true : undefined,
      organizationId: this.organizationId() || undefined,
      templateId: this.contentSource() === 'template' ? this.templateId() || undefined : undefined,
      variables:
        this.contentSource() === 'template' && Object.keys(this.variables()).length > 0
          ? this.variables()
          : undefined,
      content: this.contentSource() === 'custom' ? this.buildContent() : undefined,
    };
  }
}
