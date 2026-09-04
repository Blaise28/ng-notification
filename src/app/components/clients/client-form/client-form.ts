import { Component, computed, DestroyRef, inject, OnDestroy, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { form, FormField, required } from '@angular/forms/signals';
import { FormsModule } from '@angular/forms';
import { HugeiconsIconComponent } from '@hugeicons/angular';
import {
  Alert02Icon,
  ArrowLeft02Icon,
  Cancel01Icon,
  CheckmarkCircle02Icon,
  Download01Icon,
  FileUploadIcon,
  InformationCircleIcon,
  RefreshIcon,
  UserIcon,
} from '@hugeicons/core-free-icons';

import { PhoneNumberFieldComponent } from '@globals/components/phone-number-field/phone-number-field.component';
import { ApiError } from '@services/api/api-error';
import { ClientService } from '@services/clients/client.service';
import { DialogService } from '@services/dialog/dialog.service';
import {
  ClientImportJobModel,
  ClientImportRowDataModel,
  ClientImportRowResultModel,
  ClientType,
  CreateClientBodyModel,
} from '../client.models';

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
  subscriptionEndAt: string;
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
  subscriptionEndAt: '',
  optInSms: false,
  optInWhatsapp: false,
  optInEmail: false,
};

@Component({
  selector: 'app-client-form',
  imports: [RouterLink, FormField, FormsModule, PhoneNumberFieldComponent, HugeiconsIconComponent],
  templateUrl: './client-form.html',
})
export class ClientForm implements OnDestroy {
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly clientService = inject(ClientService);
  private readonly dialogService = inject(DialogService);

  // Icon declarations
  protected readonly FileUploadIcon = FileUploadIcon;
  protected readonly Download01Icon = Download01Icon;
  protected readonly CheckmarkCircle02Icon = CheckmarkCircle02Icon;
  protected readonly Cancel01Icon = Cancel01Icon;
  protected readonly RefreshIcon = RefreshIcon;
  protected readonly UserIcon = UserIcon;
  protected readonly Alert02Icon = Alert02Icon;
  protected readonly ArrowLeft02Icon = ArrowLeft02Icon;
  protected readonly InformationCircleIcon = InformationCircleIcon;

  // Single vs Excel mode tab
  protected readonly activeTab = signal<'single' | 'excel'>('single');

  // Single form signals
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

  // Excel Import signals
  protected readonly selectedFile = signal<File | null>(null);
  protected readonly isDragging = signal(false);
  protected readonly uploading = signal(false);
  protected readonly currentJob = signal<ClientImportJobModel | null>(null);
  protected readonly retryingRow = signal<number | null>(null);
  protected readonly retryingAll = signal(false);
  protected readonly errorFilter = signal<'all' | 'errors_only'>('all');

  // Mutable row data state for inline error editing
  protected readonly editedRowDataMap = signal<Record<number, ClientImportRowDataModel>>({});

  private pollIntervalId: ReturnType<typeof setInterval> | null = null;

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
            const client = response.object;
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
              subscriptionEndAt: toDateInputValue(client.subscriptionEndAt),
              optInSms: client.optInSms,
              optInWhatsapp: client.optInWhatsapp,
              optInEmail: client.optInEmail,
            });
          },
          error: (err: unknown) => {
            this.loading.set(false);
            this.dialogService.showToast({
              type: 'error',
              message: err instanceof ApiError ? err.message : 'Une erreur est survenue.',
            });
          },
        });
    }
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }

  // --- Single Form Submission ---
  onPhoneNumber(phone: string | null): void {
    this.clientForm.phoneE164().value.set(phone ?? '');
  }

  submitSingle(event: SubmitEvent): void {
    event.preventDefault();

    const value = this.clientForm().value();
    if (value.type === 'individual' && (!value.firstName.trim() || !value.lastName.trim())) {
      this.dialogService.showToast({
        type: 'error',
        message: 'Le prénom et le nom sont requis pour un client particulier.',
      });
      return;
    }
    if (value.type === 'business' && !value.companyName.trim()) {
      this.dialogService.showToast({
        type: 'error',
        message: "Le nom de l'entreprise est requis pour un client entreprise.",
      });
      return;
    }
    if (!value.phoneE164.trim()) {
      this.dialogService.showToast({
        type: 'error',
        message: 'Un numéro de téléphone valide est requis.',
      });
      return;
    }

    this.submitLoading.set(true);

    const body = toBody(value);
    const id = this.clientId();
    const request = id ? this.clientService.update(id, body) : this.clientService.create(body);

    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: async (response) => {
        this.submitLoading.set(false);
        await this.router.navigate(['/clients', response.object.id]);
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

  // --- Excel Import Handlers ---
  downloadTemplate(): void {
    this.clientService.downloadTemplate().subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'modele_import_clients.xlsx';
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (err: unknown) => {
        this.dialogService.showToast({
          type: 'error',
          message: err instanceof ApiError ? err.message : 'Échec du téléchargement du modèle.',
        });
      },
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile.set(input.files[0]);
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(false);
    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      const file = event.dataTransfer.files[0];
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv')) {
        this.selectedFile.set(file);
      } else {
        this.dialogService.showToast({
          type: 'error',
          message: 'Veuillez déposer un fichier Excel (.xlsx, .xls) ou CSV.',
        });
      }
    }
  }

  startImport(): void {
    const file = this.selectedFile();
    if (!file) return;

    this.uploading.set(true);
    this.clientService
      .uploadExcelImport(file)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.uploading.set(false);
          const job = response.object;
          this.currentJob.set(job);
          this.initEditedRowData(job.results);
          this.startPolling(job.id);
          this.dialogService.showToast({
            type: 'info',
            message: "Importation démarrée en arrière-plan. Suivi de l'avancement...",
          });
        },
        error: (err: unknown) => {
          this.uploading.set(false);
          this.dialogService.showToast({
            type: 'error',
            message: err instanceof ApiError ? err.message : "Échec du démarrage de l'importation.",
          });
        },
      });
  }

  private startPolling(jobId: string): void {
    this.stopPolling();
    this.pollIntervalId = setInterval(() => {
      this.clientService.getImportJob(jobId).subscribe({
        next: (response) => {
          const job = response.object;
          this.currentJob.set(job);
          this.initEditedRowData(job.results);

          if (job.status === 'completed' || job.status === 'failed') {
            this.stopPolling();
            if (job.errorCount === 0) {
              this.dialogService.showToast({
                type: 'success',
                message: `Importation terminée ! ${job.successCount} créés, ${job.updatedCount} mis à jour.`,
              });
            } else {
              this.dialogService.showToast({
                type: 'warning',
                message: `Importation terminée avec ${job.errorCount} erreur(s). Vous pouvez les corriger ci-dessous.`,
              });
            }
          }
        },
        error: () => this.stopPolling(),
      });
    }, 1500);
  }

  private stopPolling(): void {
    if (this.pollIntervalId) {
      clearInterval(this.pollIntervalId);
      this.pollIntervalId = null;
    }
  }

  private initEditedRowData(results: ClientImportRowResultModel[]): void {
    const map = { ...this.editedRowDataMap() };
    for (const res of results) {
      if (res.status === 'error' && !map[res.row]) {
        map[res.row] = {
          ...res.data,
          phoneE164: res.data.phoneE164 ?? '',
        };
      }
    }
    this.editedRowDataMap.set(map);
  }

  updateRowField(rowNum: number, field: keyof ClientImportRowDataModel, value: unknown): void {
    const current = { ...this.editedRowDataMap() };
    const rowData = { ...current[rowNum] };
    (rowData as Record<string, unknown>)[field] = value;
    current[rowNum] = rowData as ClientImportRowDataModel;
    this.editedRowDataMap.set(current);
  }

  retrySingleRow(rowResult: ClientImportRowResultModel): void {
    const job = this.currentJob();
    if (!job) return;

    const rowData = this.editedRowDataMap()[rowResult.row] ?? rowResult.data;
    this.retryingRow.set(rowResult.row);

    this.clientService
      .retryImportRows(job.id, [{ row: rowResult.row, data: rowData }])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.retryingRow.set(null);
          this.currentJob.set(response.object);
          const updatedRow = response.object.results.find((r) => r.row === rowResult.row);
          if (updatedRow?.status !== 'error') {
            this.dialogService.showToast({
              type: 'success',
              message: `Ligne ${rowResult.row} corrigée et enregistrée !`,
            });
          } else {
            this.dialogService.showToast({
              type: 'error',
              message: `Ligne ${rowResult.row}: ${updatedRow.message}`,
            });
          }
        },
        error: (err: unknown) => {
          this.retryingRow.set(null);
          this.dialogService.showToast({
            type: 'error',
            message: err instanceof ApiError ? err.message : 'Échec du réessai.',
          });
        },
      });
  }

  retryAllErrors(): void {
    const job = this.currentJob();
    if (!job) return;

    const errorRows = job.results.filter((r) => r.status === 'error');
    if (errorRows.length === 0) return;

    this.retryingAll.set(true);

    const payload = errorRows.map((r) => ({
      row: r.row,
      data: this.editedRowDataMap()[r.row] ?? r.data,
    }));

    this.clientService
      .retryImportRows(job.id, payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.retryingAll.set(false);
          this.currentJob.set(response.object);
          if (response.object.errorCount === 0) {
            this.dialogService.showToast({
              type: 'success',
              message: 'Toutes les erreurs ont été corrigées avec succès !',
            });
          } else {
            this.dialogService.showToast({
              type: 'warning',
              message: `${response.object.errorCount} erreur(s) subsistent encore.`,
            });
          }
        },
        error: (err: unknown) => {
          this.retryingAll.set(false);
          this.dialogService.showToast({
            type: 'error',
            message: err instanceof ApiError ? err.message : 'Échec de la ré-exécution globale.',
          });
        },
      });
  }

  resetImport(): void {
    this.stopPolling();
    this.selectedFile.set(null);
    this.currentJob.set(null);
    this.editedRowDataMap.set({});
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
    subscriptionEndAt: value.subscriptionEndAt.trim() || undefined,
    optInSms: value.optInSms,
    optInWhatsapp: value.optInWhatsapp,
    optInEmail: value.optInEmail,
  };
}

function toDateInputValue(value: string | null | undefined): string {
  return value ? value.slice(0, 10) : '';
}
