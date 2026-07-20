import {
  AfterViewInit,
  Component,
  effect,
  ElementRef,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';

import intlTelInput from 'intl-tel-input';

@Component({
  selector: 'app-phone-number-field',
  imports: [],
  templateUrl: './phone-number-field.component.html',
  styleUrl: './phone-number-field.component.scss',
})
export class PhoneNumberFieldComponent implements AfterViewInit {
  readonly phoneInput = viewChild.required<ElementRef<HTMLInputElement>>('phoneInput');
  iti!: ReturnType<typeof intlTelInput>;

  readonly initialValue = input<string | null>(null);
  readonly phoneNumberEvent = output<string | null>();
  phoneInvalid = signal(false);

  private initialized = false;

  constructor() {
    effect(() => {
      const value = this.initialValue();
      if (!this.initialized || !this.iti) {
        return;
      }
      if (value) {
        this.iti.setNumber(value);
      } else {
        this.iti.setNumber('');
      }
    });
  }

  ngAfterViewInit(): void {
    const options = {
      initialCountry: 'bi',
      placeholderNumberType: 'MOBILE' as const,
      nationalMode: false,
      formatOnDisplay: true,
      strictMode: true,
      separateDialCode: true,
      autoPlaceholder: 'polite' as const,
      loadUtils: () => import('intl-tel-input/utils'),
    };

    const phoneInput = this.phoneInput().nativeElement;
    this.iti = intlTelInput(phoneInput, options);
    this.initialized = true;

    const initial = this.initialValue();
    if (initial) {
      this.iti.setNumber(initial);
    }

    phoneInput.addEventListener('utilsLoaded', () => {
      this.iti.setCountry('bi');
      const value = this.initialValue();
      if (value) {
        this.iti.setNumber(value);
      }
    });
  }

  emitPhoneNumber() {
    const phoneInput = this.phoneInput();
    if (this.iti && phoneInput) {
      const number = this.iti.getNumber();
      if (this.iti.isValidNumber() && number) {
        this.phoneNumberEvent.emit(number);
        this.phoneInvalid.set(false);
      } else {
        this.phoneNumberEvent.emit(null);
        this.phoneInvalid.set(!!phoneInput.nativeElement.value);
      }
    }
  }

  reset() {
    const phoneInput = this.phoneInput();
    if (this.iti && phoneInput) {
      phoneInput.nativeElement.value = '';
      this.phoneInvalid.set(false);
      this.phoneNumberEvent.emit(null);
    }
  }
}
