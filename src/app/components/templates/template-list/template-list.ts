import { Component, DestroyRef, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';

import type { ListAction, ListHeaderModel } from '@globals/models/list.models';
import { List } from '@globals/components/list/list';
import { ApiError } from '@services/api/api-error';
import { DialogService } from '@services/dialog/dialog.service';
import { TemplateService } from '@services/templates/template.service';
import { TemplateChannel, TemplateModel } from '../template.models';

@Component({
  selector: 'app-template-list',
  imports: [List],
  templateUrl: './template-list.html',
})
export class TemplateList {
  private readonly destroyRef = inject(DestroyRef);
  private readonly templateService = inject(TemplateService);
  private readonly dialogService = inject(DialogService);
  private readonly router = inject(Router);
  private readonly list = viewChild(List);

  protected readonly channelFilter = signal<TemplateChannel | ''>('');
  protected readonly listUrl = signal('/api/v1/templates/');

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
      },
    },
    {
      label: 'Défaut',
      field: ['isDefault'],
      format: 'boolean',
      boolean: { type: 'badge', trueLabel: 'Défaut', falseLabel: '—' },
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
      name: 'Dupliquer',
      callback: (line) => this.duplicateTemplate(line as TemplateModel),
    },
    {
      name: 'Supprimer',
      callback: (line) => this.confirmDelete(line as TemplateModel),
    },
  ];

  setChannelFilter(channel: TemplateChannel | ''): void {
    this.channelFilter.set(channel);
    const base = '/api/v1/templates';
    this.listUrl.set(channel ? `${base}?channel=${channel}` : base);
    this.list()?.reloadList();
  }

  private duplicateTemplate(template: TemplateModel): void {
    this.templateService
      .duplicate(template.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: async (response) => {
          await this.router.navigate(['/templates', response.object.id, 'edit']);
        },
        error: (err: unknown) => {
          this.dialogService.showToast({
            type: 'error',
            message: err instanceof ApiError ? err.message : 'Une erreur est survenue.',
          });
        },
      });
  }

  private confirmDelete(template: TemplateModel): void {
    this.dialogService.showConfirmDialog({
      type: 'error',
      title: 'Supprimer le modèle',
      description: `Supprimer le modèle « ${template.name} » ?`,
      onConfirm: () => {
        this.templateService
          .remove(template.id)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.list()?.reloadList();
              this.dialogService.showToast({
                type: 'success',
                message: 'Modèle supprimé',
              });
            },
            error: (err: unknown) => {
              this.dialogService.showToast({
                type: 'error',
                message: err instanceof ApiError ? err.message : 'Une erreur est survenue.',
              });
            },
          });
      },
    });
  }
}
