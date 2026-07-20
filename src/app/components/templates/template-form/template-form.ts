import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { form, FormField, required } from '@angular/forms/signals';

import { ApiError } from '@services/api/api-error';
import { OrganizationService } from '@services/organizations/organization.service';
import { TemplateService } from '@services/templates/template.service';
import { slugify } from '@utils/slugify';
import { OrganizationModel } from '@components/organizations/organization.models';
import {
  CreateTemplateBodyModel,
  TEMPLATE_VARIABLE_TOKENS,
  TemplateChannel,
  UpdateTemplateBodyModel,
} from '../template.models';

interface TemplateFormValue {
  organizationId: string;
  name: string;
  slug: string;
  channel: TemplateChannel;
  subject: string;
  htmlBody: string;
  textBody: string;
  smsBody: string;
  whatsappContentSid: string;
  isDefault: boolean;
}

const EMPTY_FORM_VALUE: TemplateFormValue = {
  organizationId: '',
  name: '',
  slug: '',
  channel: 'email',
  subject: '',
  htmlBody: '',
  textBody: '',
  smsBody: '',
  whatsappContentSid: '',
  isDefault: false,
};

const SAMPLE_VARIABLES: Record<string, string> = {
  displayName: 'Camille Dupont',
  firstName: 'Camille',
  lastName: 'Dupont',
  companyName: 'Acme SAS',
  phone: '+33612345678',
  email: 'camille.dupont@example.com',
  organizationName: 'Nightbird',
};

@Component({
  selector: 'app-template-form',
  imports: [RouterLink, FormField],
  templateUrl: './template-form.html',
})
export class TemplateForm {
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly templateService = inject(TemplateService);
  private readonly organizationService = inject(OrganizationService);
  private slugTouched = false;

  protected readonly templateId = signal(this.route.snapshot.paramMap.get('id'));
  protected readonly isEdit = computed(() => this.templateId() !== null);

  protected readonly organizations = signal<OrganizationModel[]>([]);
  protected readonly variableTokens = TEMPLATE_VARIABLE_TOKENS;

  protected readonly selectedOrganizationName = computed(() => {
    const id = this.templateForm.organizationId().value();
    if (!id) {
      return 'Aucune';
    }
    return this.organizations().find((organization) => organization.id === id)?.name ?? '—';
  });

  protected readonly templateForm = form(
    signal<TemplateFormValue>({ ...EMPTY_FORM_VALUE }),
    (schema) => {
      required(schema.name);
      required(schema.slug);
      required(schema.channel);
    },
  );

  protected readonly previewSubject = computed(() =>
    interpolate(this.templateForm.subject().value(), SAMPLE_VARIABLES),
  );
  protected readonly previewHtmlBody = computed(() =>
    interpolate(this.templateForm.htmlBody().value(), SAMPLE_VARIABLES),
  );
  protected readonly previewSmsBody = computed(() =>
    interpolate(this.templateForm.smsBody().value(), SAMPLE_VARIABLES),
  );

  protected readonly loading = signal(false);
  protected readonly submitLoading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  constructor() {
    this.organizationService
      .list({ limit: 100 })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => this.organizations.set(response.objects),
        error: () => undefined,
      });

    const id = this.templateId();
    if (id) {
      this.slugTouched = true;
      this.loading.set(true);
      this.templateService
        .getById(id)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (response) => {
            this.loading.set(false);
            const template = response.object;
            this.templateForm().value.set({
              organizationId: template.organizationId ?? '',
              name: template.name,
              slug: template.slug,
              channel: template.channel,
              subject: template.subject ?? '',
              htmlBody: template.htmlBody ?? '',
              textBody: template.textBody ?? '',
              smsBody: template.smsBody ?? '',
              whatsappContentSid: template.whatsappContentSid ?? '',
              isDefault: template.isDefault,
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

  onNameInput(value: string): void {
    this.templateForm.name().value.set(value);
    if (!this.slugTouched) {
      this.templateForm.slug().value.set(slugify(value));
    }
  }

  onSlugInput(value: string): void {
    this.slugTouched = true;
    this.templateForm.slug().value.set(value);
  }

  submit(event: SubmitEvent): void {
    event.preventDefault();
    this.errorMessage.set(null);
    this.submitLoading.set(true);

    const value = this.templateForm().value();
    const id = this.templateId();
    const request = id
      ? this.templateService.update(id, toUpdateBody(value))
      : this.templateService.create(toBody(value));

    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: async (response) => {
        this.submitLoading.set(false);
        await this.router.navigate(['/templates', response.object.id]);
      },
      error: (err: unknown) => {
        this.submitLoading.set(false);
        this.errorMessage.set(err instanceof ApiError ? err.message : 'Une erreur est survenue.');
      },
    });
  }
}

function interpolate(source: string, variables: Record<string, string>): string {
  return source.replace(
    /\{\{\s*(\w+)\s*\}\}/g,
    (match, token: string) => variables[token] ?? match,
  );
}

function toBody(value: TemplateFormValue): CreateTemplateBodyModel {
  return {
    organizationId: value.organizationId.trim() || undefined,
    name: value.name.trim(),
    slug: value.slug.trim(),
    channel: value.channel,
    subject: value.subject.trim() || undefined,
    htmlBody: value.htmlBody.trim() || undefined,
    textBody: value.textBody.trim() || undefined,
    smsBody: value.smsBody.trim() || undefined,
    whatsappContentSid: value.whatsappContentSid.trim() || undefined,
    isDefault: value.isDefault,
  };
}

function toUpdateBody(value: TemplateFormValue): UpdateTemplateBodyModel {
  const body = { ...toBody(value) };
  delete body.organizationId;
  return body;
}
