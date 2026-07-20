import { Component, DestroyRef, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';

import type { ListAction, ListHeaderModel } from '@globals/models/list.models';
import { List } from '@globals/components/list/list';
import { ApiError } from '@services/api/api-error';
import { TemplateService } from '@services/templates/template.service';
import { TemplateModel } from '../template.models';

@Component({
  selector: 'app-template-list',
  imports: [List],
  templateUrl: './template-list.html',
})
export class TemplateList {
  private readonly destroyRef = inject(DestroyRef);
  private readonly templateService = inject(TemplateService);
  private readonly router = inject(Router);
  private readonly list = viewChild(List);

  protected readonly headers: ListHeaderModel[] = [
    { label: 'Nom', field: ['name'] },
    { label: 'Slug', field: ['slug'] },
    {
      label: 'Canal',
      field: ['channel'],
      format: 'badge',
      valueLabels: {
        email: 'E-mail',
        sms: 'SMS',
        whatsapp: 'WhatsApp',
        multi: 'Multi',
      },
    },
    {
      label: 'Défaut',
      field: ['isDefault'],
      format: 'boolean',
      boolean: { type: 'badge', trueLabel: 'Oui', falseLabel: 'Non' },
    },
  ];

  protected readonly actions: ListAction[] = [
    {
      name: 'Modifier',
      callback: (line) => {
        void this.router.navigate(['/templates', (line as TemplateModel).id, 'edit']);
      },
    },
    {
      name: 'Supprimer',
      callback: (line) => this.confirmDelete(line as TemplateModel),
    },
  ];

  protected readonly errorMessage = signal<string | null>(null);

  private confirmDelete(template: TemplateModel): void {
    if (!confirm(`Supprimer le modèle « ${template.name} » ?`)) {
      return;
    }
    this.templateService
      .remove(template.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.list()?.reloadList(),
        error: (err: unknown) => {
          this.errorMessage.set(err instanceof ApiError ? err.message : 'Une erreur est survenue.');
        },
      });
  }
}
