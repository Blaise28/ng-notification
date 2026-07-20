import { afterNextRender, Component, computed, inject, input, OnInit, output, signal } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';

@Component({
    selector: 'app-otp',
  imports: [FormsModule, ReactiveFormsModule],
  templateUrl: './otp.html',
  styleUrl: './otp.scss',
})
export class Otp implements OnInit {
  private fb = inject(FormBuilder);

  readonly length = input(6);
  readonly inputType = input<'tel' | 'text'>('text');
  readonly otpInputMode = computed(() => (this.isNumericOtpType() ? 'numeric' : 'text'));
  readonly otpValueChange = output<string | null>();

  readonly displayValues = signal<string[]>([]);
  readonly focusedIndex = signal<number | null>(null);

  readonly isNumericOtpType = computed(() => this.inputType() === 'tel');

  readonly otpValue = computed(() => this.displayValues().join(''));

  readonly isFullyFilled = computed(() => {
    const numeric = this.isNumericOtpType();
    const values = this.displayValues();
    return (
      values.length === this.length() &&
      values.every((val) => {
        if (!val) return false;
        return numeric ? /^\d$/.test(val) : val.length === 1;
      })
    );
  });

  pinForm: FormGroup;

  /** Expose index arrays for the template */
  readonly firstGroup = computed(() =>
    Array.from({ length: Math.ceil(this.length() / 2) }, (_, i) => i),
  );
  readonly secondGroup = computed(() =>
    Array.from(
      { length: Math.floor(this.length() / 2) },
      (_, i) => Math.ceil(this.length() / 2) + i,
    ),
  );

  constructor() {
    this.pinForm = this.buildForm(this.length());
    this.displayValues.set(Array(this.length()).fill(''));
    afterNextRender(() => {
      document.getElementById('otp-pin-0')?.focus();
    });
  }

  private buildForm(len: number): FormGroup {
    const controls: Record<string, FormControl> = {};
    for (let i = 0; i < len; i++) {
      controls[`pin${i}`] = new FormControl('');
    }
    return this.fb.group(controls);
  }

  ngOnInit(): void {
    const len = this.length();
    if (Object.keys(this.pinForm.controls).length !== len) {
      this.pinForm = this.buildForm(len);
      this.displayValues.set(Array(len).fill(''));
    }
  }

  getValue(): string {
    return Object.values(this.pinForm.value).join('');
  }

  reset(): void {
    this.pinForm.reset();
    const empty = Array(this.length()).fill('');
    this.displayValues.set(empty);
    this.focusedIndex.set(null);
    this.otpValueChange.emit(null);
  }

  onFocus(index: number): void {
    this.focusedIndex.set(index);
  }

  onBlur(): void {
    this.focusedIndex.set(null);
  }

  onInput(event: Event, index: number): void {
    const target = event.target as HTMLInputElement;
    let value = target.value;
    if (this.isNumericOtpType()) {
      if (!/^\d$/.test(value)) {
        target.value = '';
        return;
      }
    } else {
      if (value === '') {
        this.pinForm.get(`pin${index}`)?.setValue('');
        this.displayValues.update((arr) => {
          const next = [...arr];
          next[index] = '';
          return next;
        });
        this.updateFullyFilled();
        return;
      }
      value = value.slice(-1);
      target.value = value;
    }
    this.pinForm.get(`pin${index}`)?.setValue(value);
    this.displayValues.update((arr) => {
      const next = [...arr];
      next[index] = value;
      return next;
    });
    this.updateFullyFilled();
    if (index < this.length() - 1) {
      const nextInput = document.getElementById(`otp-pin-${index + 1}`);
      nextInput?.focus();
    }
  }

  onPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const len = this.length();
    const raw = event.clipboardData?.getData('text') ?? '';
    const chars = this.isNumericOtpType()
      ? raw.replace(/\D/g, '').slice(0, len).split('')
      : Array.from(raw).slice(0, len);
    if (chars.length === 0) return;
    const updates: Record<string, string> = {};
    for (let i = 0; i < len; i++) {
      updates[`pin${i}`] = chars[i] ?? '';
    }
    this.pinForm.patchValue(updates);
    this.displayValues.set(
      Array(len)
        .fill('')
        .map((_, i) => chars[i] ?? ''),
    );
    this.updateFullyFilled();
    const nextIndex = Math.min(chars.length, len) - 1;
    const nextInput = document.getElementById(`otp-pin-${nextIndex}`);
    nextInput?.focus();
  }



  onKeyDown(event: KeyboardEvent, index: number): void {
    const key = event.key;
    if (key === 'Backspace') {
      event.preventDefault();
      this.pinForm.get(`pin${index}`)?.setValue('');
      this.displayValues.update((arr) => {
        const next = [...arr];
        next[index] = '';
        return next;
      });
      this.updateFullyFilled();
      if (index > 0) {
        const prevInput = document.getElementById(`otp-pin-${index - 1}`);
        prevInput?.focus();
      }
      return;
    }
    if (this.isNumericOtpType() && /^\d$/.test(key)) {
      event.preventDefault();
      this.pinForm.get(`pin${index}`)?.setValue(key);
      this.displayValues.update((arr) => {
        const next = [...arr];
        next[index] = key;
        return next;
      });
      this.updateFullyFilled();
      if (index < this.length() - 1) {
        const nextInput = document.getElementById(`otp-pin-${index + 1}`);
        nextInput?.focus();
      }
      return;
    }
    if (!this.isNumericOtpType() && key.length === 1 && !event.ctrlKey && !event.metaKey) {
      event.preventDefault();
      this.pinForm.get(`pin${index}`)?.setValue(key);
      this.displayValues.update((arr) => {
        const next = [...arr];
        next[index] = key;
        return next;
      });
      this.updateFullyFilled();
      if (index < this.length() - 1) {
        const nextInput = document.getElementById(
          `otp-pin-${index + 1}`,
        ) as HTMLInputElement | null;
        nextInput?.focus();
        nextInput?.select();
      }
      return;
    }
  }

  private updateFullyFilled(): void {
    this.otpValueChange.emit(this.isFullyFilled() ? this.otpValue() : null);
  }
}
