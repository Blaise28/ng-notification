import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { form, FormField, required } from '@angular/forms/signals';

import { ApiError } from '@services/api/api-error';
import { ClientService } from '@services/clients/client.service';
import { ClientType, CreateClientBodyModel } from '../client.models';

interface ClientFormValue {
  type: ClientType;
  firstName: string;
  lastName: string;
  companyName: string;
  taxId: string;
  contactPersonName: string;
  phoneE164: string;
  email: string;
  locale: string;
  externalRef: string;
  optInSms: boolean;
  optInWhatsapp: boolean;
  optInEmail: boolean;
}

const EMPTY_FORM_VALUE: ClientFormValue = {
  type: 'individual',
  firstName: '',
  lastName: '',
  companyName: '',
  taxId: '',
  contactPersonName: '',
  phoneE164: '',
  email: '',
  locale: 'fr',
  externalRef: '',
  optInSms: false,
  optInWhatsapp: false,
  optInEmail: false,
};

@Component({
  selector: 'app-client-form',
  imports: [RouterLink, FormField],
  templateUrl: './client-form.html',
})
export class ClientForm {
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly clientService = inject(ClientService);

  protected readonly clientId = signal(this.route.snapshot.paramMap.get('id'));
  protected readonly isEdit = computed(() => this.clientId() !== null);

  protected readonly clientForm = form(
    signal<ClientFormValue>({ ...EMPTY_FORM_VALUE }),
    (schema) => {
      required(schema.type);
      required(schema.phoneE164);
    },
  );

  protected readonly loading = signal(false);
  protected readonly submitLoading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  constructor() {
    const id = this.clientId();
    if (id) {
      this.loading.set(true);
      this.clientService
        .getById(id)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (response) => {
            this.loading.set(false);
            const client = response.object.client;
            this.clientForm().value.set({
              type: client.type,
              firstName: client.firstName ?? '',
              lastName: client.lastName ?? '',
              companyName: client.companyName ?? '',
              taxId: client.taxId ?? '',
              contactPersonName: client.contactPersonName ?? '',
              phoneE164: client.phoneE164,
              email: client.email ?? '',
              locale: client.locale,
              externalRef: client.externalRef ?? '',
              optInSms: client.optInSms,
              optInWhatsapp: client.optInWhatsapp,
              optInEmail: client.optInEmail,
            });
          },
          error: (err: unknown) => {
            this.loading.set(false);
            this.errorMessage.set(
              err instanceof ApiError ? err.message : 'Une erreur est survenue.',
            );
          },
        });
    }
  }

  submit(event: SubmitEvent): void {
    event.preventDefault();

    const value = this.clientForm().value();
    if (value.type === 'individual' && (!value.firstName.trim() || !value.lastName.trim())) {
      this.errorMessage.set('Le prénom et le nom sont requis pour un client particulier.');
      return;
    }
    if (value.type === 'business' && !value.companyName.trim()) {
      this.errorMessage.set("Le nom de l'entreprise est requis pour un client entreprise.");
      return;
    }

    this.errorMessage.set(null);
    this.submitLoading.set(true);

    const body = toBody(value);
    const id = this.clientId();
    const request = id ? this.clientService.update(id, body) : this.clientService.create(body);

    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: async (response) => {
        this.submitLoading.set(false);
        await this.router.navigate(['/clients', response.object.client.id]);
      },
      error: (err: unknown) => {
        this.submitLoading.set(false);
        this.errorMessage.set(err instanceof ApiError ? err.message : 'Une erreur est survenue.');
      },
    });
  }
}

function toBody(value: ClientFormValue): CreateClientBodyModel {
  return {
    type: value.type,
    firstName: value.firstName.trim() || undefined,
    lastName: value.lastName.trim() || undefined,
    companyName: value.companyName.trim() || undefined,
    taxId: value.taxId.trim() || undefined,
    contactPersonName: value.contactPersonName.trim() || undefined,
    phoneE164: value.phoneE164.trim(),
    email: value.email.trim() || undefined,
    locale: value.locale.trim() || undefined,
    externalRef: value.externalRef.trim() || undefined,
    optInSms: value.optInSms,
    optInWhatsapp: value.optInWhatsapp,
    optInEmail: value.optInEmail,
  };
}
