import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { form, FormField, pattern, required } from '@angular/forms/signals';

import { ApiError } from '@services/api/api-error';
import { OrganizationService } from '@services/organizations/organization.service';
import { readableTextColor } from '@utils/readable-text-color';
import { slugify } from '@utils/slugify';
import { CreateOrganizationBodyModel } from '../organization.models';

interface OrganizationFormValue {
  name: string;
  slug: string;
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
  supportEmail: string;
  websiteUrl: string;
}

const EMPTY_FORM_VALUE: OrganizationFormValue = {
  name: '',
  slug: '',
  logoUrl: '',
  primaryColor: '#2563eb',
  secondaryColor: '#1e40af',
  supportEmail: '',
  websiteUrl: '',
};

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

@Component({
  selector: 'app-organization-form',
  imports: [RouterLink, FormField],
  templateUrl: './organization-form.html',
})
export class OrganizationForm {
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly organizationService = inject(OrganizationService);
  private slugTouched = false;

  protected readonly organizationId = signal(this.route.snapshot.paramMap.get('id'));
  protected readonly isEdit = computed(() => this.organizationId() !== null);

  protected readonly organizationForm = form(
    signal<OrganizationFormValue>({ ...EMPTY_FORM_VALUE }),
    (schema) => {
      required(schema.name);
      required(schema.slug);
      pattern(schema.slug, SLUG_PATTERN);
    },
  );

  protected readonly previewTextColor = computed(() =>
    readableTextColor(this.organizationForm.primaryColor().value()),
  );

  protected readonly loading = signal(false);
  protected readonly submitLoading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  constructor() {
    const id = this.organizationId();
    if (id) {
      this.slugTouched = true;
      this.loading.set(true);
      this.organizationService
        .getById(id)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (response) => {
            this.loading.set(false);
            const organization = response.object;
            this.organizationForm().value.set({
              name: organization.name,
              slug: organization.slug,
              logoUrl: organization.logoUrl ?? '',
              primaryColor: organization.primaryColor,
              secondaryColor: organization.secondaryColor,
              supportEmail: organization.supportEmail ?? '',
              websiteUrl: organization.websiteUrl ?? '',
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
    this.organizationForm.name().value.set(value);
    if (!this.slugTouched) {
      this.organizationForm.slug().value.set(slugify(value));
    }
  }

  onSlugInput(value: string): void {
    this.slugTouched = true;
    this.organizationForm.slug().value.set(value);
  }

  submit(event: SubmitEvent): void {
    event.preventDefault();
    this.errorMessage.set(null);
    this.submitLoading.set(true);

    const body = toBody(this.organizationForm().value());
    const id = this.organizationId();
    const request = id
      ? this.organizationService.update(id, body)
      : this.organizationService.create(body);

    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: async (response) => {
        this.submitLoading.set(false);
        await this.router.navigate(['/organizations', response.object.id]);
      },
      error: (err: unknown) => {
        this.submitLoading.set(false);
        this.errorMessage.set(err instanceof ApiError ? err.message : 'Une erreur est survenue.');
      },
    });
  }
}

function toBody(value: OrganizationFormValue): CreateOrganizationBodyModel {
  return {
    name: value.name.trim(),
    slug: value.slug.trim(),
    logoUrl: value.logoUrl.trim() || undefined,
    primaryColor: value.primaryColor.trim() || undefined,
    secondaryColor: value.secondaryColor.trim() || undefined,
    supportEmail: value.supportEmail.trim() || undefined,
    websiteUrl: value.websiteUrl.trim() || undefined,
  };
}
