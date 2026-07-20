import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';

import { ApiError } from '@services/api/api-error';
import { ClientService } from '@services/clients/client.service';
import { ScheduledService } from '@services/scheduled/scheduled.service';
import { ClientModel, ClientType } from '@components/clients/client.models';
import { NotificationChannel } from '@components/notifications/notification.models';
import {
  CreateScheduledBodyModel,
  ScheduledChannel,
  ScheduledTargetType,
} from '../scheduled.models';

@Component({
  selector: 'app-scheduled-form',
  imports: [RouterLink],
  templateUrl: './scheduled-form.html',
})
export class ScheduledForm {
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly clientService = inject(ClientService);
  private readonly scheduledService = inject(ScheduledService);

  protected readonly clients = signal<ClientModel[]>([]);

  protected readonly channel = signal<ScheduledChannel>('email');
  protected readonly sendAt = signal('');
  protected readonly minSendAt = toLocalDateTimeInput(new Date(Date.now() + 5 * 60 * 1000));

  protected readonly targetType = signal<ScheduledTargetType>('all');
  protected readonly targetClientId = signal('');
  protected readonly targetFilterType = signal<ClientType | ''>('');

  protected readonly emailSubject = signal('');
  protected readonly emailHtml = signal('');
  protected readonly emailText = signal('');
  protected readonly smsBody = signal('');
  protected readonly whatsappContentSid = signal('');
  protected readonly multiChannels = signal<NotificationChannel[]>([]);

  protected readonly submitLoading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  constructor() {
    this.clientService
      .list({ limit: 200 })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => this.clients.set(response.objects),
        error: () => undefined,
      });
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
      this.errorMessage.set(validationError);
      return;
    }

    this.errorMessage.set(null);
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
          this.errorMessage.set(err instanceof ApiError ? err.message : 'Une erreur est survenue.');
        },
      });
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
        if (!this.whatsappContentSid().trim()) {
          return 'Le SID du modèle WhatsApp est requis.';
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

  private buildPayload(): Record<string, unknown> {
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
        return { contentSid: this.whatsappContentSid().trim() };
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
          contentSid: this.multiChannels().includes('whatsapp')
            ? this.whatsappContentSid().trim()
            : undefined,
        };
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
