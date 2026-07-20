import { Component, computed, effect, input, output, signal } from '@angular/core';
import { FieldTree, FormField, form } from '@angular/forms/signals';

export interface PasswordStrength {
  score: number;
  label: string;
}

export type PasswordAutocomplete =
  | 'current-password'
  | 'new-password'
  | 'off'
  | 'on'
  | (string & {});

@Component({
  selector: 'app-password',
  imports: [FormField],
  templateUrl: './password.html',
  styleUrl: './password.scss',
  })
export class Password {
  label = input<string>('Mot de passe');
  placeholder = input<string>('Mot de passe');
  required = input<boolean>(false);
  helperText = input<string>('');
  autocomplete = input<PasswordAutocomplete>('current-password');
  mode = input<'simple' | 'create'>('simple');
  field = input<FieldTree<string>>();

  strengthChange = output<PasswordStrength>();
  valueChange = output<string>();

  private readonly internalField = form(signal(''));

  readonly effectiveField = computed<FieldTree<string>>(
    () => this.field() ?? this.internalField
  );

  readonly visible = signal(false);
  readonly uid = `pwd-${Math.random().toString(36).slice(2, 8)}`;

  private readonly node = computed(() => this.effectiveField()());

  readonly currentValue = computed(() => this.node().value());
  readonly hasValue = computed(() => !!this.currentValue());
  readonly isInvalid = computed(() => this.node().invalid());

  readonly rules = computed(() => {
    const v = this.currentValue() ?? '';
    return [
      { label: 'Au moins 8 caractères', met: v.length >= 8 },
      { label: 'Au moins une lettre majuscule', met: /[A-Z]/.test(v) },
      { label: 'Au moins un chiffre', met: /[0-9]/.test(v) },
      { label: 'Au moins un caractère spécial', met: /[^A-Za-z0-9]/.test(v) },
    ];
  });

  readonly strength = computed<PasswordStrength>(() => {
    const score = this.rules().filter((r) => r.met).length;
    const labels = ['', 'Faible', 'Moyen', 'Fort', 'Excellent'];
    return { score, label: labels[score] || '' };
  });

  readonly bars = computed(() => {
    const score = this.strength().score;
    const colors = [
      'bg-base-300',
      'bg-error',
      'bg-warning',
      'bg-info',
      'bg-success'
    ];
    const color = colors[score] || 'bg-base-300';
    return Array.from({ length: 4 }, (_, i) => ({
      active: i < score,
      colorClass: color,
    }));
  });

  constructor() {
    effect(() => {
      const val = this.currentValue();
      if (val !== undefined) {
        this.valueChange.emit(val);
      }
    });

    effect(() => {
      this.strengthChange.emit(this.strength());
    });
  }
}