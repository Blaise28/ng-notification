import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';

import { ApiError } from '@services/api/api-error';
import { ClientService } from '@services/clients/client.service';
import { DialogService } from '@services/dialog/dialog.service';
import { ScheduledService } from '@services/scheduled/scheduled.service';
import { TemplateService } from '@services/templates/template.service';
import { ClientModel, ClientType } from '@components/clients/client.models';
import { NotificationChannel } from '@components/notifications/notification.models';
import { TemplatePreview } from '@components/templates/template-preview/template-preview';
import { TEMPLATE_PREVIEW_SAMPLE_VARS } from '@components/templates/template.utils';
import {
  TEMPLATE_VARIABLE_LABELS,
  TemplateModel,
  TemplateVariableToken,
} from '@components/templates/template.models';
import { HugeiconsIconComponent } from '@hugeicons/angular';
import {
  ArrowLeft02Icon,
  Calendar01Icon,
  CheckmarkCircle02Icon,
  Clock01Icon,
  Comment01Icon,
  EyeIcon,
  FilterIcon,
  Mail01Icon,
  Megaphone02Icon,
  UserGroupIcon,
  WhatsappIcon,
} from '@hugeicons/core-free-icons';

import { Lookup } from '@globals/components/lookup/lookup';
import type { AutocompleteModel, LookupModel } from '@globals/components/lookup/lookup.models';
import {
  CreateScheduledBodyModel,
  ScheduledChannel,
  ScheduledTargetType,
} from '../scheduled.models';

type ContentSource = 'template' | 'custom';

@Component({
  selector: 'app-scheduled-form',
  imports: [RouterLink, TemplatePreview, Lookup, HugeiconsIconComponent],
  templateUrl: './scheduled-form.html',
})
export class ScheduledForm {
  protected readonly Megaphone02Icon = Megaphone02Icon;
  protected readonly Calendar01Icon = Calendar01Icon;
  protected readonly Clock01Icon = Clock01Icon;
  protected readonly UserGroupIcon = UserGroupIcon;
  protected readonly FilterIcon = FilterIcon;
  protected readonly Mail01Icon = Mail01Icon;
  protected readonly Comment01Icon = Comment01Icon;
  protected readonly WhatsappIcon = WhatsappIcon;
  protected readonly EyeIcon = EyeIcon;
  protected readonly CheckmarkCircle02Icon = CheckmarkCircle02Icon;
  protected readonly ArrowLeft02Icon = ArrowLeft02Icon;
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly clientService = inject(ClientService);
  private readonly scheduledService = inject(ScheduledService);
  private readonly templateService = inject(TemplateService);
  private readonly dialogService = inject(DialogService);

  protected readonly clients = signal<ClientModel[]>([]);
  protected readonly templates = signal<TemplateModel[]>([]);

  protected readonly channel = signal<ScheduledChannel>('email');
  protected readonly sendAt = signal('');
  protected readonly minSendAt = toLocalDateTimeInput(new Date(Date.now() + 5 * 60 * 1000));

  protected readonly targetType = signal<ScheduledTargetType>('all');
  protected readonly targetClientId = signal('');
  protected readonly targetFilterType = signal<ClientType | ''>('');

  protected readonly contentSource = signal<ContentSource>('template');
  protected readonly templateId = signal('');
  protected readonly variables = signal<Record<string, string>>({});
  protected readonly variableLabels = TEMPLATE_VARIABLE_LABELS;

  protected readonly emailSubject = signal('');
  protected readonly emailHtml = signal('');
  protected readonly emailText = signal('');
  protected readonly smsBody = signal('');
  protected readonly whatsappTemplateName = signal('');
  protected readonly whatsappTemplateLanguage = signal('fr_FR');
  protected readonly multiChannels = signal<NotificationChannel[]>([]);

  protected readonly templatesForChannel = computed(() => {
    const channel = this.channel();
    if (channel === 'multi') {
      return this.templates();
    }
    return this.templates().filter((template) => template.channel === channel);
  });

  protected readonly selectedTemplate = computed(() => {
    const id = this.templateId();
    return this.templates().find((template) => template.id === id) ?? null;
  });

  protected readonly templateVariableTokens = computed(() => {
    const template = this.selectedTemplate();
    if (!template) {
      return [];
    }
    const tokens = new Set<string>(template.variables ?? []);
    for (const key of template.whatsappVariableKeys ?? []) {
      tokens.add(key);
    }
    return Array.from(tokens);
  });

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
    this.clientService
      .list({ limit: 200 })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => this.clients.set(response.objects),
        error: () => undefined,
      });

    this.templateService
      .list({ limit: 100 })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.templates.set(response.objects);
          this.selectDefaultTemplate('email');
        },
        error: () => undefined,
      });
  }

  onChannelChange(value: ScheduledChannel): void {
    this.channel.set(value);
    if (value !== 'multi') {
      this.selectDefaultTemplate(value);
    }
  }

  setTemplateId(id: string): void {
    this.templateId.set(id);
  }

  setVariable(token: string, value: string): void {
    this.variables.update((current) => ({ ...current, [token]: value }));
  }

  labelFor(token: string): string {
    return this.variableLabels[token as TemplateVariableToken] ?? token;
  }

  toggleMultiChannel(value: NotificationChannel): void {
    this.multiChannels.update((channels) =>
      channels.includes(value) ? channels.filter((c) => c !== value) : [...channels, value],
    );
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
    this.scheduledService
      .create(body)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: async (response) => {
          this.submitLoading.set(false);
          await this.router.navigate(['/scheduled', response.object.id]);
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

  private selectDefaultTemplate(channel: ScheduledChannel | NotificationChannel): void {
    if (channel === 'multi') {
      return;
    }
    const defaultTemplate = this.templates().find(
      (template) => template.channel === channel && template.isDefault,
    );
    this.templateId.set(defaultTemplate?.id ?? '');
  }

  private validate(): string | null {
    if (!this.sendAt()) {
      return "Choisissez une date et heure d'envoi.";
    }
    if (this.targetType() === 'clientId' && !this.targetClientId()) {
      return 'Sélectionnez un client.';
    }
    if (this.targetType() === 'filter' && !this.targetFilterType()) {
      return 'Sélectionnez un type de client pour le filtre.';
    }

    if (this.contentSource() === 'template') {
      if (!this.templateId()) {
        return 'Sélectionnez un modèle.';
      }
      return null;
    }

    switch (this.channel()) {
      case 'email':
        if (!this.emailSubject().trim() || !this.emailHtml().trim()) {
          return "Le sujet et le contenu HTML de l'e-mail sont requis.";
        }
        break;
      case 'sms':
        if (!this.smsBody().trim()) {
          return 'Le contenu du SMS est requis.';
        }
        break;
      case 'whatsapp':
        if (!this.whatsappTemplateName().trim()) {
          return 'Le nom du modèle WhatsApp Meta est requis.';
        }
        break;
      case 'multi':
        if (this.multiChannels().length === 0) {
          return 'Sélectionnez au moins un canal pour un envoi multi-canal.';
        }
        break;
    }
    return null;
  }

  private buildUsedVariables(): Record<string, string> {
    return Object.fromEntries(
      Object.entries(this.variables()).filter(
        ([key, value]) => this.templateVariableTokens().includes(key) && value.trim() !== '',
      ),
    );
  }

  private buildPayload(): Record<string, unknown> {
    if (this.contentSource() === 'template') {
      const payload: Record<string, unknown> = {
        templateId: this.templateId(),
      };
      const vars = this.buildUsedVariables();
      if (Object.keys(vars).length > 0) {
        payload['variables'] = vars;
      }
      if (this.channel() === 'multi') {
        payload['channels'] = this.multiChannels();
      }
      return payload;
    }

    switch (this.channel()) {
      case 'email':
        return {
          subject: this.emailSubject().trim(),
          html: this.emailHtml().trim(),
          text: this.emailText().trim() || undefined,
        };
      case 'sms':
        return { body: this.smsBody().trim() };
      case 'whatsapp':
        return {
          templateName: this.whatsappTemplateName().trim(),
          language: this.whatsappTemplateLanguage().trim() || undefined,
        };
      case 'multi':
        return {
          channels: this.multiChannels(),
          email: this.multiChannels().includes('email')
            ? {
                subject: this.emailSubject().trim(),
                html: this.emailHtml().trim(),
                text: this.emailText().trim() || undefined,
              }
            : undefined,
          smsBody: this.multiChannels().includes('sms') ? this.smsBody().trim() : undefined,
          templateName: this.multiChannels().includes('whatsapp')
            ? this.whatsappTemplateName().trim()
            : undefined,
          language: this.multiChannels().includes('whatsapp')
            ? this.whatsappTemplateLanguage().trim()
            : undefined,
        };
    }
  }

  protected readonly clientAutocompleteUrl = '/api/v1/clients/autocomplete?search=';

  protected getTemplateAutocompleteUrl(channel: ScheduledChannel): string {
    if (channel === 'multi') {
      return '/api/v1/templates/autocomplete?search=';
    }
    return `/api/v1/templates/autocomplete?channel=${channel}&search=`;
  }

  protected onClientAutocompleteSelected(item: AutocompleteModel | LookupModel | null): void {
    if (item) {
      this.targetClientId.set(String(item.id));
    } else {
      this.targetClientId.set('');
    }
  }

  protected onTemplateAutocompleteSelected(item: AutocompleteModel | LookupModel | null): void {
    if (item) {
      this.setTemplateId(String(item.id));
    } else {
      this.setTemplateId('');
    }
  }

  private buildBody(): CreateScheduledBodyModel {
    return {
      channel: this.channel(),
      sendAt: new Date(this.sendAt()).toISOString(),
      payload: this.buildPayload(),
      target: {
        type: this.targetType(),
        clientId: this.targetType() === 'clientId' ? this.targetClientId() : undefined,
        filterType:
          this.targetType() === 'filter' ? this.targetFilterType() || undefined : undefined,
      },
    };
  }
}

function toLocalDateTimeInput(date: Date): string {
  const pad = (value: number): string => value.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
